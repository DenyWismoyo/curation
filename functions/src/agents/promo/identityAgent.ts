// functions/src/agents/promo/identityAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateProgramIdentity = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { trackName, trackDescription, targetAudience } = request.data;

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite", 
      generationConfig: {
        // Suhu diturunkan ke 0.6 agar AI tetap rasional, elegan, dan berpijak pada konteks asli
        temperature: 0.6, 
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            trackName: { type: SchemaType.STRING, description: "Judul program yang disempurnakan. Menarik, profesional, tapi TETAP SESUAI KONTEKS ASLINYA." },
            trackDescription: { type: SchemaType.STRING, description: "Deskripsi 2-3 kalimat yang memikat, elegan, namun realistis dan jelas." },
            trackIcon: { type: SchemaType.STRING, description: "Nama icon murni dari Lucide React (PascalCase)" }
          },
          required: ["trackName", "trackDescription", "trackIcon"]
        }
      }
    });

    const prompt = `
      Anda adalah "Senior Product Marketer" dan "Expert UI/UX Copywriter" tingkat Enterprise.
      Tugas Anda: Memoles dan mempercantik Judul (Naming) serta Deskripsi Modul Asesmen agar lebih memikat, premium, dan elegan, NAMUN ANDA WAJIB MEMPERTAHANKAN MAKNA DAN KONTEKS ASLINYA. Dilarang keras membuat judul yang terlalu fiksi, hiperbola, atau berlebihan (over-promise).

      DATA MENTAH SAAT INI:
      - Judul Asli: "${trackName || 'Modul Asesmen'}"
      - Deskripsi Asli: "${trackDescription || 'Evaluasi dan pemetaan kompetensi peserta.'}"
      - Target Audiens: "${targetAudience || 'Umum'}"

      ATURAN MERACIK JUDUL (trackName):
      1. PERTAHANKAN KONTEKS: Jika judul asli tentang "Kesehatan Mental Pegawai", JANGAN diubah menjadi sesuatu yang tidak nyambung seperti "Quantum Leap". Ubah menjadi versi lebih elegan, contoh: "Indeks Kesejahteraan Mental Pegawai" atau "Pemetaan Resiliensi Profesional".
      2. GUNAKAN KATA PREMIUM: Ganti kata kaku dengan istilah yang lebih berkelas (misal: "Asesmen" bisa diperhalus menjadi "Pemetaan", "Indeks", "Radar", "Blueprint", "Navigasi", "Evaluasi Strategis").
      3. ANTI-HIPERBOLA: Jangan gunakan bahasa motivator murahan atau fiksi ilmiah. Tetap berpijak pada realitas bisnis/psikologi/akademik yang berkelas dan kredibel.

      ATURAN DESKRIPSI (trackDescription):
      1. Buat dalam 2-3 kalimat yang mengalir dan mudah dipahami.
      2. Kalimat 1: Validasi kebutuhan atau masalah (pain point) audiens dengan bahasa yang elegan dan empatik.
      3. Kalimat 2/3: Jelaskan bagaimana modul ini memberikan solusi, pemetaan, atau kejelasan (clarity) yang mereka butuhkan.
      4. Hindari klaim berlebihan seperti "menghancurkan hambatan" atau "mendominasi dunia". Gunakan bahasa yang objektif, terukur, dan kredibel.

      ATURAN IKON (trackIcon):
      Pilih 1 nama ikon yang BENAR-BENAR ADA di library 'lucide-react' yang paling relevan dengan konteks aslinya. Tulis dalam format PascalCase murni (Contoh: Target, Brain, LineChart, ShieldCheck, Compass, Microscope, Users, Briefcase, Heart, Activity).
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});