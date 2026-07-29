// functions/src/actionPlanService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { withRetry } from "./utils/retry";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// 1. FUNGSI EKSISTING (JANGAN DIHAPUS, BIARKAN SEPERTI INI)
export const generateActionPlanChecklist = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { assessmentId, aiResult } = request.data;
    if (!assessmentId || !aiResult) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      // LOGIKA ANCHOR ACTION PLAN:
      const targetAudience = aiResult.targetAudience || 'company';
      const customBehavior = aiResult.actionPlanBehavior;
      
      let personaInstruction = "";
      if (customBehavior) {
          // Jika Admin mendefinisikan custom behavior, paksa AI mengikuti aturan tersebut
          personaInstruction = `Anda adalah Pakar Eksekutor. Tugas Anda menyintesis laporan analitik menjadi TEPAT 10 langkah eksekusi. \nPERINGATAN SUDUT PANDANG MUTLAK: Langkah-langkah ini WAJIB ditujukan LANGSUNG KEPADA SUBJEK YANG DINILAI (baik itu Perusahaan, Institusi Publik, NGO, Individu, atau Pelajar) agar mereka bisa mengeksekusinya sendiri. DILARANG KERAS membuat langkah yang ditujukan untuk Auditor atau Tim Penilai. \nATURAN MUTLAK GAYA BAHASA & KONTEKS TUGAS: ${customBehavior}`;
      } else {
          // Fallback ke logika universal adaptif
          personaInstruction = `Anda adalah Pakar Konsultan. Tugas Anda merumuskan 10 langkah eksekusi yang DITUJUKAN LANGSUNG KEPADA SUBJEK ASESMEN YANG DINILAI (bisa berupa Organisasi, Bisnis, Instansi Pemerintah, Komunitas, atau Individu - sesuaikan dengan konteks ringkasan laporan). Gunakan sudut pandang direktif ke subjek ("Organisasi harus...", "Anda perlu..."), DILARANG KERAS membuat instruksi untuk auditor/penilai melakukan audit/verifikasi. Langkah ini adalah panduan bagi subjek untuk berkembang.`;
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: personaInstruction,
        generationConfig: {
          temperature: 0.1, 
          maxOutputTokens: 3000, 
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "task", "description", "timeframe", "isCompleted", "contextualTip", "searchKeyword"],
              properties: {
                id: { type: SchemaType.STRING },
                task: { type: SchemaType.STRING, description: "Maksimal 6-8 kata. Wajib berupa kata kerja perintah taktis (atau ajakan refleksi jika individu)." },
                description: { type: SchemaType.STRING, description: "Penjelasan eksekusi maksimal 2 kalimat padat dan jelas." },
                timeframe: { type: SchemaType.STRING, description: "WAJIB pilih salah satu: 'Harian', 'Mingguan', atau 'Bulanan'." },
                isCompleted: { type: SchemaType.BOOLEAN, description: "Wajib diset false" },
                contextualTip: { type: SchemaType.STRING, description: "Satu kalimat singkat tips praktis, panduan kecil, atau motivasi untuk mengeksekusi tugas ini." },
                searchKeyword: { type: SchemaType.STRING, description: "Satu frasa kata kunci YouTube/Google. Jika audiens individu/konseling, arahkan ke teknik psikologi/habit. Jika bisnis, arahkan ke strategi/SOP." }
              }
            }
          }
        }
      });

      const prompt = `
        Tugas Anda adalah merumuskan TEPAT 10 item checklist (tidak boleh kurang atau lebih).
        Kompilasi dan ekstrak poin-poin dari 4 dimensi laporan berikut:
        1. Ringkasan: ${aiResult.executiveSummary}
        2. Risiko: ${JSON.stringify(aiResult.riskAssessment?.mitigationStrategies)}
        3. Rekomendasi: ${JSON.stringify(aiResult.recommendations)}
        4. Aksi AI: ${JSON.stringify(aiResult.nextActionSteps)}

        ATURAN DISTRIBUSI TIMEFRAME:
        - Minimal 2-3 tugas "Harian".
        - Minimal 3-4 tugas "Mingguan".
        - Sisanya "Bulanan".
        
        ATURAN MUTLAK: Bahasa Indonesia asertif, profesional, dilarang mengulang.
      `;

      const result = await withRetry(() => model.generateContent(prompt));
      let rawText = result.response.text().trim();
      rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const generatedChecklist = JSON.parse(rawText);

      const db = getFirestore(admin.app(), "curation");
      await db.collection("assessments").doc(assessmentId).update({
        "aiResult.customActionPlan": generatedChecklist,
        actionPlanGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, actionPlan: generatedChecklist };

    } catch (error: any) {
      console.error("Gagal membedah Action Plan:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI Action Plan.");
    }
  }
);

// 2. FUNGSI BARU: MEMBEDAH 1 TUGAS MENJADI SUB-CHECKLIST
export const generateSubTaskChecklist = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { taskName, taskDescription } = request.data;
    if (!taskName) throw new HttpsError("invalid-argument", "Nama tugas diperlukan.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", // Pakai versi yang ringan dan cepat
        systemInstruction: "Anda adalah Life Coach/Project Manager yang asertif. Tugas Anda adalah memecah sebuah tugas makro menjadi 3 hingga 5 sub-tugas (micro-steps) yang sangat praktis, bisa langsung dikerjakan (actionable) oleh Subjek Asesmen (Organisasi, Instansi, atau Individu) untuk menyelesaikan tantangan mereka sendiri. DILARANG instruksi bagi auditor.",
        generationConfig: {
          temperature: 0.2, 
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "text", "isCompleted"],
              properties: {
                id: { type: SchemaType.STRING },
                text: { type: SchemaType.STRING, description: "Instruksi tindakan spesifik, maks 1 kalimat (misal: 'Siapkan draf kerangka dokumen di Microsoft Word')." },
                isCompleted: { type: SchemaType.BOOLEAN, description: "Wajib diset false" }
              }
            }
          }
        }
      });

      const prompt = `
        Tugas Utama: "${taskName}"
        Konteks Tugas: "${taskDescription || '-'}"

        Pecah tugas utama di atas menjadi 3 hingga 5 langkah kecil berurutan agar pengguna lebih mudah mengeksekusinya tanpa merasa kewalahan. Gunakan Bahasa Indonesia yang ringkas dan memotivasi.
      `;

      const result = await withRetry(() => model.generateContent(prompt));
      let rawText = result.response.text().trim();
      rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      const subTasks = JSON.parse(rawText);

      return { success: true, subTasks };
    } catch (error: any) {
      console.error("Gagal membuat Sub-Task:", error);
      throw new HttpsError("internal", error.message || "Gagal menyusun Sub-Checklist.");
    }
  });