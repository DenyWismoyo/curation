import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateArticleFromTemplate = onCall({
  memory: "256MiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { templateId, trackName, trackDescription, expectedOutputs, aiPromptConfig } = request.data;
  
  if (!templateId) throw new HttpsError("invalid-argument", "Template ID diperlukan.");

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7, // Diturunkan agar mengurangi risiko halusinasi fitur B2B
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: "Judul artikel edukatif bergaya click-worthy" },
            excerpt: { type: SchemaType.STRING, description: "Ringkasan 2 kalimat tajam yang memancing rasa penasaran" },
            content: { type: SchemaType.STRING, description: "Isi artikel lengkap dalam format teks Markdown murni (##, **, -)" }
          },
          required: ["title", "excerpt", "content"]
        }
      }
    });

    const prompt = `
      Anda adalah Expert Tech Blogger dan Jurnalis Edukasi.
      Tugas Anda: Menulis artikel edukatif dan mendalam yang mengupas tuntas urgensi dari topik asesmen berikut:
      
      DATA SUMBER ASESMEN (BAHAN ARTIKEL ANDA):
      - Nama Topik: ${trackName}
      - Deskripsi Singkat: ${trackDescription || '-'}
      - Target Audiens: ${aiPromptConfig?.targetAudience || 'Umum'}
      - Tujuan Edukasi: ${aiPromptConfig?.assessmentGoal || '-'}
      - Wawasan Indikator (Bahas ini sebagai insight mahal): ${JSON.stringify(aiPromptConfig?.expectedAnalysisBlocks || [])}
      - Manfaat Pemahaman: ${JSON.stringify(expectedOutputs || [])}

      ATURAN KONTEN & FORMAT (WAJIB DIPATUHI 100%):
      1. FORMAT MARKDOWN MURNI: Output "content" WAJIB menggunakan format Markdown (## untuk Subjudul, **teks** untuk penekanan, dan - untuk list/poin). DILARANG MENGGUNAKAN HTML.
      2. MURNI EDUKASI: DILARANG menyisipkan link, tautan, atau tombol CTA di dalam artikel. Artikel harus murni berisi wawasan edukatif, cerita, pain points, dan solusi konseptual.
      3. GAYA BAHASA: Mengalir, profesional namun hangat (tidak kaku/robotik). Gunakan enter ganda (\\n\\n) antar paragraf agar mudah dibaca.
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});