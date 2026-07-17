// functions/src/actionPlanService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateActionPlanChecklist = onCall(
  {
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
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: "Anda adalah Chief Operating Officer (COO) tingkat Enterprise. Tugas Anda menyintesis berbagai dimensi laporan analitik menjadi TEPAT 10 langkah eksekusi (Action Plan) yang berurutan, logis, dan mencakup rutinitas harian, target mingguan, serta pencapaian bulanan.",
        generationConfig: {
          temperature: 0.1, 
          maxOutputTokens: 2048, // Dinaikkan sedikit untuk memastikan 10 item muat tanpa terpotong
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "task", "description", "timeframe", "isCompleted"],
              properties: {
                id: { type: SchemaType.STRING },
                task: { 
                  type: SchemaType.STRING, 
                  description: "Maksimal 6-8 kata. Wajib berupa kata kerja perintah taktis." 
                },
                description: { 
                  type: SchemaType.STRING, 
                  description: "Penjelasan eksekusi maksimal 2 kalimat padat dan jelas." 
                },
                timeframe: { 
                  type: SchemaType.STRING, 
                  description: "WAJIB pilih salah satu: 'Harian', 'Mingguan', atau 'Bulanan'. DILARANG menggunakan kata lain." 
                },
                isCompleted: { 
                  type: SchemaType.BOOLEAN, 
                  description: "Wajib diset false" 
                }
              }
            }
          }
        }
      });

      const prompt = `
        Tugas Anda adalah merumuskan TEPAT 10 item checklist (tidak boleh kurang atau lebih).
        
        Kompilasi dan ekstrak poin-poin dari 4 dimensi laporan berikut ini untuk menciptakan peta eksekusi yang holistik:
        1. Ringkasan Eksekutif: ${aiResult.executiveSummary}
        2. Mitigasi Risiko: ${JSON.stringify(aiResult.riskAssessment?.mitigationStrategies)}
        3. Rekomendasi Utama: ${JSON.stringify(aiResult.recommendations)}
        4. Rencana Aksi AI: ${JSON.stringify(aiResult.nextActionSteps)}

        ATURAN DISTRIBUSI TIMEFRAME (10 Tugas):
        - Hasilkan minimal 2-3 tugas dengan timeframe "Harian" (Fokus pada rutinitas, kontrol, habit).
        - Hasilkan minimal 3-4 tugas dengan timeframe "Mingguan" (Fokus pada evaluasi, langkah taktis, perbaikan).
        - Hasilkan sisanya dengan timeframe "Bulanan" (Fokus pada milestone besar, pencapaian strategis).
        
        ATURAN MUTLAK:
        - Bahasa Indonesia yang asertif dan profesional.
        - Dilarang mengulang instruksi yang sama.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }

      const generatedChecklist = JSON.parse(rawText);

      // Simpan ke Firestore
      const db = getFirestore(admin.app());
      await db.collection("assessments").doc(assessmentId).set({
        customActionPlan: generatedChecklist,
        actionPlanGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { success: true, actionPlan: generatedChecklist };

    } catch (error: any) {
      console.error("Gagal membedah Action Plan:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI Action Plan.");
    }
  }
);