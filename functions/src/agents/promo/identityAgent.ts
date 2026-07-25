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
        temperature: 0.8, // Sedikit dinaikkan agar AI lebih kreatif dalam memilih kata-kata marketing
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            trackName: { type: SchemaType.STRING, description: "Judul program yang sangat memikat, berkelas, profesional, dan click-worthy (Maksimal 6-8 kata)" },
            trackDescription: { type: SchemaType.STRING, description: "Deskripsi 2-3 kalimat yang persuasif, menjelaskan rasa sakit (pain point) audiens, dan memberikan gambaran solusi jika mengikuti asesmen ini." },
            trackIcon: { type: SchemaType.STRING, description: "Satu nama icon dari Lucide React yang paling merepresentasikan topik (Gunakan PascalCase murni)." }
          },
          required: ["trackName", "trackDescription", "trackIcon"]
        }
      }
    });

    const prompt = `
      Anda adalah Expert Copywriter B2B/B2C dan UI/UX Designer Tingkat Enterprise.
      Tugas Anda: Mempercantik Judul dan Deskripsi Modul Asesmen agar lebih 'menjual', profesional, serta memilihkan 1 (satu) ikon yang paling relevan.

      DATA MENTAH SAAT INI:
      - Judul Asli: "${trackName || 'Modul Asesmen'}"
      - Deskripsi Asli: "${trackDescription || 'Evaluasi dan pemetaan kompetensi peserta.'}"
      - Target Audiens: "${targetAudience || 'Umum'}"

      ATURAN MUTLAK:
      1. trackName: Buat lebih 'punchy', elegan, dan premium (contoh: "Technopreneur Blueprint: Temukan DNA Inovasimu", "Navigasi Tantrum & Golden Age", "Executive Leadership Radar").
      2. trackDescription: Gunakan gaya bahasa yang menggugah empati audiens, menyentuh pain point, dan menjanjikan kejelasan (clarity) setelah mengisi form ini.
      3. trackIcon: ANDA WAJIB HANYA MENGELUARKAN NAMA ICON YANG ADA DI LIBRARY 'lucide-react'.
         (Pilih salah satu dari ini atau yang serupa: Rocket, Target, Brain, Shield, Zap, TrendingUp, Compass, Lightbulb, Users, Briefcase, Activity, Radar, Microscope, Gem, Anchor, Crown, BarChart). Tulis dalam format PascalCase (cth: Rocket).
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});