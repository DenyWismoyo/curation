import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const analyzeEvidence = onCall({
  memory: "2GiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true
},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Harus login.");

    const data = request.data as any;
    if (!data || !data.fileBase64) throw new HttpsError("invalid-argument", "Data file kosong.");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const filePart = {
      inlineData: {
        data: data.fileBase64,
        mimeType: data.mimeType || "application/pdf"
      }
    };

    const context = data.context || "Tolong analisis dokumen ini.";

    const prompt = `
      Anda adalah AI Document Analyzer profesional.
      KONTEKS PERTANYAAN/FORM: ${context}
      
      TUGAS ANDA:
      Analisis bukti dokumen/gambar yang dilampirkan ini.
      Berikan ulasan singkat mengenai:
      1. Apakah dokumen/gambar ini valid dan relevan dengan konteks?
      2. Apa temuan kunci (key findings) dari dokumen ini?
      
      Gunakan format Markdown agar mudah dibaca oleh pengguna. Jangan terlalu panjang, maksimal 3 paragraf.
    `;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
      });

      const result = await model.generateContent([prompt, filePart]);
      const text = result.response.text();

      return { analysisResult: text };

    } catch (error: any) {
      console.error("Error analyzing evidence:", error);
      throw new HttpsError("internal", "Gagal menganalisis dokumen dengan AI.");
    }
  }
);
