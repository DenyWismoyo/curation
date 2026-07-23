// functions/src/outputService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// 1. FUNGSI EKSISTING: Generate Selling Points (Output)
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

// 2. FUNGSI BARU: Auto-Generate Prompt Anchors (Profil & Metodologi)
export const generatePromptAnchors = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { trackName, trackDescription, targetAudience } = request.data;

    if (!trackName) throw new HttpsError("invalid-argument", "Nama Program wajib diisi untuk merumuskan konteks.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", // Cepat dan efisien untuk teks pendek
        systemInstruction: "Anda adalah AI Architect dan Pakar Asesmen Global. Tugas Anda merumuskan profil target spesifik dan metodologi asesmen terbaik berdasarkan judul dan deskripsi program.",
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["specificTargetContext", "methodologyContext"],
            properties: {
              specificTargetContext: { type: SchemaType.STRING, description: "Profil spesifik, detail demografi, atau kondisi subjek target (Maksimal 2 kalimat padat)." },
              methodologyContext: { type: SchemaType.STRING, description: "Metodologi, framework, atau standar global yang paling tepat digunakan (misal: CBT, ISO 9001, Six Sigma). Maksimal 2 kalimat padat." }
            }
          }
        }
      });

      const prompt = `
        Nama Program: "${trackName}"
        Deskripsi: "${trackDescription || '-'}"
        Target Audiens Dasar: "${targetAudience || 'Umum'}"

        Tugas: Buatkan rumusan "Profil Spesifik Subjek" dan "Metodologi / Referensi" yang paling tajam, presisi, dan relevan untuk mengunci pemahaman AI.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

      const anchors = JSON.parse(rawText);
      return { success: true, anchors };

    } catch (error: any) {
      console.error("Gagal generate anchors:", error);
      throw new HttpsError("internal", error.message || "Gagal merumuskan Konteks Anchor.");
    }
  }
);