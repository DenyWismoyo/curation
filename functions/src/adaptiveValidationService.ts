// functions/src/adaptiveValidationService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateAdaptiveQuestions = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { formData, trackName, aiPromptConfig } = request.data;
    if (!formData) throw new HttpsError("invalid-argument", "Data formulir tidak ditemukan.");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const persona = aiPromptConfig?.aiPersona || "Auditor Profesional & Psikolog Analitis";
      const strictness = aiPromptConfig?.gradingStrictness || "standard";

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", // Gunakan flash-lite untuk kecepatan instan
        systemInstruction: `Anda adalah ${persona}. Tugas Anda menganalisis input data pengguna, menemukan 1 hingga 2 celah, inkonsistensi, klaim yang berlebihan, atau argumen yang lemah, lalu membuat pertanyaan interogasi/klarifikasi lanjutan. Output WAJIB berupa array JSON berformat 'FormField'.`,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ["id", "label", "type", "required", "gridSpan", "description"],
              properties: {
                id: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING, description: "Pertanyaan klarifikasi yang tajam dan menantang." },
                description: { type: SchemaType.STRING, description: "Konteks mengapa AI menanyakan hal ini berdasarkan jawaban pengguna sebelumnya." },
                type: { type: SchemaType.STRING, description: "Wajib diisi 'textarea'" },
                required: { type: SchemaType.BOOLEAN, description: "Wajib diisi true" },
                gridSpan: { type: SchemaType.INTEGER, description: "Wajib diisi 2" }
              }
            }
          }
        }
      });

      // Filter hanya data teks penting untuk dianalisis
      const textData: Record<string, any> = {};
      for (const key in formData) {
        if (typeof formData[key] !== 'string' || !formData[key].startsWith('http')) {
          textData[key] = formData[key];
        }
      }

      const prompt = `
        Konteks Program: ${trackName}
        Tingkat Keketatan: ${strictness}
        
        Berikut adalah data sementara dari entitas/peserta:
        ${JSON.stringify(textData)}

        Instruksi Mutlak:
        1. Analisis jawaban di atas. Cari 1 atau maksimal 2 klaim yang menurut Anda paling butuh pembuktian/klarifikasi mendalam.
        2. Buatkan pertanyaan untuk menginterogasi klaim tersebut.
        3. Field "id" wajib unik (misal: "ai_clarification_1").
        4. Tipe input "type" WAJIB "textarea".
        5. Jika data terlihat sangat sempurna dan jujur, Anda tetap harus membuat 1 pertanyaan untuk menguji kedalaman strategi mereka.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      }
      
      const dynamicFields = JSON.parse(rawText);
      return { success: true, fields: dynamicFields };

    } catch (error: any) {
      console.error("Gagal men-generate pertanyaan adaptif:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI.");
    }
  }
);