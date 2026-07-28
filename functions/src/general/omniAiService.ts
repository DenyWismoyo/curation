// functions/src/omniAiService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const chatWithOmniAi = onCall(
  {
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    const { message, context, history } = request.data as any;
    if (!message) throw new HttpsError("invalid-argument", "Pesan tidak boleh kosong");

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);

      let sysInstruction = `Anda adalah "Omni AI", asisten konsultan cerdas & navigator di platform Omnifit.
Tugas utama Anda: 
1. MENJAWAB KONSULTASI HASIL ASESMEN: Jika terdapat [HASIL ASESMEN AKTIF USER] di dalam konteks, gunakan data tersebut (skor, level kesiapan, SWOT, risiko kritis, rekomendasi) untuk menjawab pertanyaan pengguna secara personal, mendalam, dan solutif.
2. EKSEKUSI TAKTIS & DRAF: Jika pengguna meminta bantuan mengeksekusi rekomendasi atau langkah aksi, berikan petunjuk langkah demi langkah, draf SOP, contoh penulisan, atau template praktis.
3. NAVIGASI PLATFORM: Jika pengguna bertanya tentang cara menggunakan fitur platform, jawab berdasarkan [MANUAL HALAMAN]. Jika merujuk ke rute URL internal, gunakan format Markdown: [Nama Halaman](/rute-url).
4. GAYA BAHASA: Gunakan bahasa Indonesia yang profesional, berwawasan bisnis/psikologi yang tajam, empatis, dan solutif.`;


      if (context) {
        sysInstruction += `\n\n--- KONTEKS SISTEM & PENGGUNA SAAT INI ---\n${context}`;
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", 
        systemInstruction: sysInstruction
      });

      let formattedHistory = history ? history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })) : [];

      while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.shift();
      }

      const chatSession = model.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: 0.5, // Dinaikkan sedikit agar AI bisa lebih kreatif dalam memberi solusi
          maxOutputTokens: 1024, // Dinaikkan agar jawaban solusi bisa lebih panjang
        },
      });

      const result = await chatSession.sendMessage(message);
      return { reply: result.response.text() };

    } catch (error: any) {
      console.error("Omni AI Gateway Error:", error);
      throw new HttpsError("internal", error.message || 'Terjadi gangguan pada sirkuit kognitif Omni AI.');
    }
  }
);