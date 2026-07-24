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

  const { trackName, trackDescription, expectedOutputs, targetAudience } = request.data;
  
  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Kita gunakan model pro yang biasa Anda pakai agar hasilnya tajam
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      systemInstruction: "Anda adalah Chief Marketing Officer dan Expert Copywriter. Tugas Anda adalah membedah deskripsi kuesioner asesmen dan meraciknya menjadi aset marketing yang kuat.",
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: ["copywriting", "imagePrompt"],
          properties: {
            copywriting: { type: SchemaType.STRING, description: "Caption promosi LinkedIn/Instagram menggunakan framework AIDA, lengkap dengan emoji dan CTA." },
            imagePrompt: { type: SchemaType.STRING, description: "Prompt gambar visual berstandar Midjourney/Imagen dalam BAHASA INGGRIS. Fokus metafora visual yang estetik, profesional, 8k, cinematic. WAJIB tambahkan: 'NO TEXT, NO LETTERS, NO WORDS'." }
          }
        }
      }
    });

    const prompt = `
      Nama Program Asesmen: "${trackName}"
      Deskripsi: "${trackDescription || '-'}"
      Target Audiens: "${targetAudience || 'Profesional & Perusahaan'}"
      Output/Benefit bagi User: ${JSON.stringify(expectedOutputs || [])}
      
      Buatkan saya Copywriting (Caption) Bahasa Indonesia dan Image Prompt (Bahasa Inggris).
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