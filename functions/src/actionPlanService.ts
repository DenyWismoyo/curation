// functions/src/actionPlanService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { withRetry } from "./utils/retry";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
import OpenAI from "openai";

// 1. FUNGSI EKSISTING (JANGAN DIHAPUS, BIARKAN SEPERTI INI)
export const generateActionPlanChecklist = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { assessmentId, aiResult } = request.data;
    if (!assessmentId || !aiResult) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    try {
      const DEEPSEEK_KEY = deepseekApiKeySecret.value();
      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: DEEPSEEK_KEY,
      });
      
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

        ATURAN WAJIB TAMBAHAN:
        - Setiap item wajib memiliki 3 sampai 5 subTasks yang sangat praktis dan berurutan.
        - Setiap item wajib memiliki rekomendasi konten YouTube dalam format query (2 sampai 3 rekomendasi).
        - Gunakan judul rekomendasi yang jelas agar user paham harus menonton apa.

        Output WAJIB JSON murni dengan format berikut:
        {
          "tasks": [
            {
              "id": "task-1",
              "task": "...",
              "description": "...",
              "timeframe": "Harian",
              "isCompleted": false,
              "contextualTip": "...",
              "searchKeyword": "...",
              "subTasks": [
                { "id": "sub-1-1", "text": "...", "isCompleted": false }
              ],
              "youtubeRecommendations": [
                { "title": "...", "query": "..." }
              ]
            }
          ]
        }
      `;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: personaInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }));

      let rawText = result.choices[0]?.message?.content || '{}';
      rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const parsedData = JSON.parse(rawText);
      const generatedChecklistRaw = Array.isArray(parsedData)
        ? parsedData
        : (Array.isArray(parsedData?.tasks) ? parsedData.tasks : []);

      const generatedChecklist = generatedChecklistRaw.map((item: any, index: number) => {
        const fallbackQuery = typeof item?.searchKeyword === 'string' && item.searchKeyword.trim().length > 0
          ? item.searchKeyword.trim()
          : `${item?.task || `langkah ${index + 1}`} tutorial Indonesia`;

        const subTasksRaw = Array.isArray(item?.subTasks) ? item.subTasks : [];
        const subTasks = subTasksRaw
          .filter((sub: any) => sub && typeof sub === 'object')
          .slice(0, 5)
          .map((sub: any, subIdx: number) => ({
            id: typeof sub?.id === 'string' && sub.id.trim().length > 0 ? sub.id : `sub-${index + 1}-${subIdx + 1}`,
            text: typeof sub?.text === 'string' && sub.text.trim().length > 0
              ? sub.text.trim()
              : `Lakukan langkah kecil ${subIdx + 1} untuk menjalankan tugas ini.`,
            isCompleted: false,
          }));

        const safeSubTasks = subTasks.length > 0
          ? subTasks
          : [
              { id: `sub-${index + 1}-1`, text: 'Tentukan target kecil yang ingin diselesaikan hari ini.', isCompleted: false },
              { id: `sub-${index + 1}-2`, text: 'Siapkan bahan atau alat yang diperlukan.', isCompleted: false },
              { id: `sub-${index + 1}-3`, text: 'Eksekusi dan catat hasilnya secara singkat.', isCompleted: false },
            ];

        const youtubeRaw = Array.isArray(item?.youtubeRecommendations) ? item.youtubeRecommendations : [];
        const youtubeRecommendations = youtubeRaw
          .filter((rec: any) => rec && typeof rec === 'object')
          .slice(0, 3)
          .map((rec: any, recIdx: number) => ({
            title: typeof rec?.title === 'string' && rec.title.trim().length > 0
              ? rec.title.trim()
              : `Rekomendasi Video ${recIdx + 1}`,
            query: typeof rec?.query === 'string' && rec.query.trim().length > 0
              ? rec.query.trim()
              : fallbackQuery,
          }));

        return {
          id: typeof item?.id === 'string' && item.id.trim().length > 0 ? item.id : `task-${index + 1}`,
          task: typeof item?.task === 'string' && item.task.trim().length > 0 ? item.task.trim() : `Langkah Strategis ${index + 1}`,
          description: typeof item?.description === 'string' && item.description.trim().length > 0
            ? item.description.trim()
            : 'Fokus pada eksekusi sederhana namun konsisten.',
          timeframe: typeof item?.timeframe === 'string' && item.timeframe.trim().length > 0 ? item.timeframe.trim() : 'Mingguan',
          isCompleted: false,
          contextualTip: typeof item?.contextualTip === 'string' && item.contextualTip.trim().length > 0
            ? item.contextualTip.trim()
            : 'Mulai dari tindakan kecil agar progres terasa ringan.',
          searchKeyword: fallbackQuery,
          subTasks: safeSubTasks,
          youtubeRecommendations,
        };
      });

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

// 3. FUNGSI BARU: MEMBUAT ACTION PLAN PERSONAL VIA DEEPSEEK
export const generatePersonalActionPlan = onCall({
    memory: "512MiB",
    region: "asia-southeast2",
    secrets: [deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { assessmentId, aiResult, formData, aiPromptConfig } = request.data;
    if (!assessmentId || !aiResult) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    try {
      const DEEPSEEK_KEY = deepseekApiKeySecret.value();
      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: DEEPSEEK_KEY,
      });

      const tone = aiPromptConfig?.toneAndStyle || "Mentor / Coach Personal yang suportif namun asertif";
      const audience = aiPromptConfig?.targetAudience || formData?.corporateEntity || "Individu";
      
      const systemInstruction = `Anda adalah Pakar Eksekutor. Tugas Anda menyintesis laporan analitik menjadi TEPAT 5 langkah eksekusi utama yang sangat terperinci dan aplikatif.
AUDIENS: ${audience}
NADA BAHASA: ${tone}

PERINGATAN MUTLAK:
1. Hasil WAJIB berformat JSON murni bertipe Object dengan key "tasks" yang berisi Array.
2. Setiap tugas utama HARUS memiliki 3 hingga 5 sub-tugas (micro-steps).
3. Berikan saran/tips praktis (contextualTip).`;

      const prompt = `
        Kompilasi dan ekstrak poin-poin dari laporan berikut:
        1. Ringkasan: ${aiResult.executiveSummary}
        2. Fokus Utama / Aksi AI: ${aiResult.nextActionSteps ? JSON.stringify(aiResult.nextActionSteps) : '-'}
        
        Buat TEPAT 5 item checklist.
        Gunakan struktur JSON persis seperti berikut (Hanya kembalikan JSON Object murni, tanpa teks lain):
        {
          "tasks": [
            {
              "id": "task-1",
              "task": "Judul tugas utama",
              "description": "Deskripsi maksimal 2 kalimat",
              "timeframe": "Harian / Mingguan / Bulanan",
              "isCompleted": false,
              "contextualTip": "Tips praktis / motivasi",
              "searchKeyword": "Kata kunci pencarian",
              "subTasks": [
                { "id": "sub-1-1", "text": "Sub-langkah aksi 1", "isCompleted": false },
                { "id": "sub-1-2", "text": "Sub-langkah aksi 2", "isCompleted": false }
              ]
            }
          ]
        }
      `;

      const response = await deepseekClient.chat.completions.create({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      let rawText = response.choices[0].message.content || "{}";
      rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const parsedData = JSON.parse(rawText);
      const generatedChecklist = parsedData.tasks || [];

      const db = getFirestore(admin.app(), "curation");
      await db.collection("assessments").doc(assessmentId).update({
        "aiResult.personalActionPlan": generatedChecklist,
        personalActionPlanGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, actionPlan: generatedChecklist };

    } catch (error: any) {
      console.error("Gagal membuat Personal Action Plan:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses Personal Action Plan.");
    }
  }
);