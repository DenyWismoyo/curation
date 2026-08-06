import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const processVoiceInput = onCall({
  memory: "1GiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true
},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Harus login.");

    const data = request.data as any;
    if (!data || !data.audioBase64) throw new HttpsError("invalid-argument", "Data audio kosong.");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    // We can use InlineData for short audio clips with Gemini 2.5 Flash
    // For very long clips we would need File API, but base64 inline is fine for standard voice input.
    const audioPart = {
      inlineData: {
        data: data.audioBase64,
        mimeType: data.mimeType || "audio/webm"
      }
    };

    const context = data.context || "Tolong transkripsi audio ini.";

    const prompt = `
      Anda adalah AI Assistant pengisi form profesional. 
      KONTEKS INPUT: ${context}
      
      TUGAS ANDA:
      1. Dengarkan audio dari pengguna.
      2. Berdasarkan audio, hasilkan Teks Transkripsi yang rapi dan pantas untuk diisikan ke dalam form (betulkan ejaan/tata bahasa tanpa menghilangkan makna).
      3. Hasilkan juga satu kalimat singkat (Teks Respons AI) untuk menjawab atau mengonfirmasi pengguna (misal: "Baik, catatan Anda tentang penjualan telah saya isi.").
      
      OUTPUT FORMAT (JSON MURNI):
      {
        "transcribedText": "teks hasil transkripsi rapi...",
        "aiResponseText": "Teks balasan yang ramah..."
      }
    `;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      });

      const result = await model.generateContent([prompt, audioPart]);
      const text = result.response.text();
      const json = JSON.parse(text);

      return {
        transcribedText: json.transcribedText || "",
        aiResponseText: json.aiResponseText || "Pesan telah diterima."
      };

    } catch (error: any) {
      console.error("Error processing voice:", error);
      throw new HttpsError("internal", "Gagal memproses audio dengan AI.");
    }
  }
);
