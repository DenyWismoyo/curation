import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRetry } from "../../../shared/utils/retry";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const analyzeMicroIdea = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  secrets: [geminiApiKeySecret],
}, async (request) => {
  const { idea } = request.data;
  
  if (!idea || typeof idea !== 'string' || idea.length < 5) {
    throw new HttpsError("invalid-argument", "Ide bisnis terlalu pendek atau tidak valid.");
  }

  const apiKey = geminiApiKeySecret.value();
  if (!apiKey) throw new HttpsError("internal", "API Key tidak dikonfigurasi.");

  const genAI = new GoogleGenerativeAI(apiKey);
  // Menggunakan model Flash-Lite agar respons sangat cepat untuk simulator landing page
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

  const prompt = `
    Anda adalah AI Asesor Bisnis Enterprise. Pengguna sedang mencoba fitur "Micro-Simulator" di landing page.
    Ide bisnis/program mereka: "${idea}"
    
    Berikan analisis SANGAT SINGKAT (maksimal 3 kalimat total).
    Kembalikan dalam format JSON murni TANPA markdown block, dengan struktur:
    {
      "kekuatan": "1 kalimat kekuatan utama",
      "kelemahan": "1 kalimat potensi blind spot",
      "skor": Angka 0-100 merepresentasikan kelayakan ide
    }
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    let rawText = result.response.text().trim();
    rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    const analysis = JSON.parse(rawText);
    return { success: true, data: analysis };
  } catch (error: any) {
    console.error("MicroSimulator Error:", error);
    throw new HttpsError("internal", "Gagal menganalisis ide saat ini.");
  }
});
