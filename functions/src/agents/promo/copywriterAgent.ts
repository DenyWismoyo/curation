// functions/src/agents/promo/copywriterAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateCopywriting = onCall({
  memory: "256MiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
  
  // TAMBAHAN: Menerima targetPlatform dari Frontend
  const { trackName, trackDescription, expectedOutputs, targetAudience, targetPlatform } = request.data;
  const platform = targetPlatform || 'instagram';

  // KAMUS GAYA BAHASA MULTI-PLATFORM
  const platformGuidelines: Record<string, string> = {
    instagram: "Caption carousel/single post dengan framework AIDA, estetik, emoji, dan hashtags.",
    tiktok: "Konsep script hook video 3 detik pertama dan narasi Voice-Over singkat yang dinamis.",
    threads: "Teks singkat, kasual, memancing diskusi/pertanyaan, maksimal 300 karakter.",
    facebook: "Gaya storytelling panjang, ramah komunitas, fokus pada klik tautan/link pendaftaran."
  };
  const currentGuideline = platformGuidelines[platform];

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash", // UPGRADE KE 3.5 FLASH
      systemInstruction: "Anda adalah Chief Marketing Officer dan Expert Copywriter untuk platform Omnifit. Tugas Anda adalah membedah deskripsi asesmen menjadi aset marketing yang kuat dan merumuskan prompt visual tipografi yang memukau.",
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: ["copywriting", "imagePrompt"],
          properties: {
            copywriting: { type: SchemaType.STRING },
            imagePrompt: { type: SchemaType.STRING }
          }
        }
      }
    });

    const prompt = `
      IDENTITAS PLATFORM MUTLAK:
      Brand: "Omnifit"
      Tagline/Konteks: Smart Assessment System berbasis Kecerdasan Buatan (AI).
      
      DATA PROGRAM ASESMEN:
      Nama Program: "${trackName}"
      Deskripsi: "${trackDescription || '-'}"
      Target Audiens: "${targetAudience || 'Profesional & Perusahaan'}"
      Output/Benefit bagi User: ${JSON.stringify(expectedOutputs || [])}
      
      TUGAS ANDA UNTUK PLATFORM "${platform.toUpperCase()}":
      1. Buatkan "copywriting" Bahasa Indonesia KHUSUS untuk ${platform.toUpperCase()}. 
         ATURAN GAYA BAHASA: ${currentGuideline}
         ATURAN FORMAT MUTLAK: Wajib gunakan spasi ganda (\\n\\n) untuk memisahkan antar paragraf! Anda HARUS memisahkan antara bagian Kalimat Pembuka (Hook), Isi/Edukasi, Bullet points/Poin Manfaat, Call-to-Action (CTA), dan barisan Hashtag agar teks memiliki jeda napas visual, sangat rapi, dan estetik saat dibaca di layar HP. JANGAN PERNAH menumpuk teks menjadi satu blok paragraf panjang.
      2. Ekstrak satu highlight/hook paling kuat dari copywriting tersebut (Maksimal 4-5 kata).
      3. Rancang "imagePrompt" (Bahasa Inggris) untuk mesin AI pembuat gambar. 
      
      ATURAN IMAGE PROMPT (Vertex AI):
      - Wajib menginstruksikan teks tipografi besar yang mencolok.
      - Wajib menampilkan tulisan "Omnifit" dan tulisan [Hook 4-5 Kata yang Anda ekstrak] dalam tanda kutip.
      - Tambahkan kata kunci deskriptif visual estetik, modern UI/UX, tech-startup vibe, 3D elements.
    `;


    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    
    const parsedData = JSON.parse(rawText);
    return {
      success: true,
      copywriting: parsedData.copywriting,
      imagePrompt: parsedData.imagePrompt
    };
  } catch (error: any) {
    console.error("Copywriter Agent Error:", error);
    throw new HttpsError("internal", error.message || "Gagal membuat Copywriting.");
  }
});