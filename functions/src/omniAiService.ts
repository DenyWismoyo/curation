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

    if (!message) {
      throw new HttpsError("invalid-argument", "Pesan tidak boleh kosong");
    }

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);

      // PROMPT DIUBAH: HANYA FOKUS NAVIGASI & BACA DOCS
      let sysInstruction = `Anda adalah "Omni AI", asisten navigator cerdas di ekosistem platform Omnifit.
Tugas utama Anda:
1. Menjawab pertanyaan HANYA berdasarkan dokumen [BASE KNOWLEDGE] dan [MANUAL HALAMAN] yang diberikan di bawah.
2. Memandu navigasi pengguna. Jika pengguna ingin pindah halaman, Anda WAJIB memberikan tautan dengan format Markdown persis seperti ini: [Nama Halaman](/rute-url).
3. Gunakan bahasa Indonesia yang profesional, ramah, dan SANGAT SINGKAT (maksimal 1 paragraf).
4. JANGAN melayani konsultasi hasil asesmen bisnis/psikologi. Jika pengguna bertanya tentang hasil/skor asesmen mereka, informasikan dengan sopan bahwa fitur konsultasi memiliki widget terpisah di dalam dokumen Laporan. Arahkan mereka untuk menekan tombol "Brankas Modul" (/dashboard).`;

      if (context) {
        sysInstruction += `\n\n--- KONTEKS SISTEM & PENGGUNA SAAT INI ---\n${context}`;
      }

      // MENGGUNAKAN FLASH LITE 3.1 UNTUK MENGHEMAT KUOTA & MEMPERCEPAT RESPONS
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite", 
        systemInstruction: sysInstruction
      });

      // Formatting History untuk Gemini
      let formattedHistory = history ? history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })) : [];

      // Safegaurd: Gemini menuntut history wajib diawali dengan pesan dari 'user'
      while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.shift();
      }

      const chatSession = model.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: 0.1, // Dibuat sangat rendah agar AI fokus 100% pada isi dokumen (tidak berhalusinasi)
          maxOutputTokens: 256, // Dibatasi agar biaya token semakin hemat
        },
      });

      const result = await chatSession.sendMessage(message);
      const reply = result.response.text();

      return { reply: reply };
    } catch (error: any) {
      console.error("Omni AI Gateway Error:", error);
      throw new HttpsError("internal", error.message || 'Terjadi gangguan pada sirkuit kognitif Omni AI.');
    }
  }
);