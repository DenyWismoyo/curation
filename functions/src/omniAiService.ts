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

      // PERBAIKAN: Instruksi dibuat lebih luwes agar mau menjawab konsultasi umum
      let sysInstruction = `Anda adalah "Omni AI", asisten cerdas di platform Omnifit. Tugas utama Anda: 
      1. Jika pengguna bertanya tentang cara menggunakan platform, jawab berdasarkan [MANUAL HALAMAN].
      2. Jika pengguna meminta bantuan untuk MENGEKSEKUSI TUGAS / ACTION PLAN, JAWAB DENGAN MENDETIL DAN PRAKTIS. Anda BOLEH memberikan draf SOP, ide konten, langkah teknis, atau saran bisnis/psikologi yang relevan dengan pertanyaan mereka.
      3. Jika pengguna ingin pindah halaman, berikan tautan dengan format Markdown: [Nama Halaman](/rute-url).
      4. Gunakan bahasa Indonesia yang profesional, memotivasi, dan tidak kaku.`;

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