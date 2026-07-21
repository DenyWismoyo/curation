// functions/src/outputService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateTemplateSellingPoints = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { trackName, trackDescription, aiPromptConfig } = request.data;
    if (!aiPromptConfig) throw new HttpsError("invalid-argument", "Konfigurasi Otak AI tidak ditemukan.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: "Anda adalah Copywriter Senior spesialis konversi penjualan (Sales Copy). Tugas Anda merumuskan 4 poin keuntungan (Benefit & Output) yang akan didapatkan user setelah mereka menggunakan modul asesmen ini. Fokus pada hasil akhir: Mitigasi, Rekomendasi, Action Plan, dan Insight Matrix.",
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["title", "description"],
              properties: {
                title: { type: SchemaType.STRING, description: "Judul output (misal: 'Rencana Aksi Harian', 'Peta Mitigasi Risiko')" },
                description: { type: SchemaType.STRING, description: "Penjelasan copywriting 1 kalimat mengenai manfaat dari output ini." }
              }
            }
          }
        }
      });

      const prompt = `
        Konteks Modul: "${trackName}"
        Deskripsi: "${trackDescription}"
        
        Kerangka yang akan dianalisis AI:
        - Metrik yang dinilai: ${JSON.stringify(aiPromptConfig.expectedMetrics)}
        - Fokus Risiko: ${aiPromptConfig.riskFramework || 'Risiko umum'}
        - Target Rekomendasi: ${JSON.stringify(aiPromptConfig.expectedRecommendations)}

        Buatlah TEPAT 4 poin benefit output yang memikat dalam bahasa Indonesia.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const sellingPoints = JSON.parse(rawText);

      return { success: true, sellingPoints };
    } catch (error: any) {
      console.error("Gagal generate copywriting:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI.");
    }
  }
);