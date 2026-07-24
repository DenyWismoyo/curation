// functions/src/agents/promo/copywriterAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// 1. FUNGSI UTAMA (GENERATE AWAL)
export const generateCopywriting = onCall({
  memory: "512MiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { trackName, trackDescription, expectedOutputs, targetAudience, targetPlatform, formSteps } = request.data;
  const platform = targetPlatform || 'instagram';

  let stepsContext = "Belum ada seksi formulir.";
  if (Array.isArray(formSteps) && formSteps.length > 0) {
    stepsContext = formSteps.map((step: any, index: number) => `Tahapan ${index + 1}: ${step.title}`).join("\n");
  }

  // PENAJAMAN PANDUAN COPYWRITING PER PLATFORM TERMASUK HASHTAG
  const platformGuidelines: Record<string, string> = {
    instagram: "Caption estetik bergaya storytelling/AIDA. Wajib pakai EMOJI, spasi paragraf yang rapi, dan WAJIB sertakan 5-10 HASHTAG relevan di bagian paling bawah.",
    tiktok: "Caption singkat, dinamis, gaya Gen Z/Milenial. Wajib EMOJI dan WAJIB 5-8 HASHTAG populer/spesifik di akhir.",
    threads: "Teks tajam, relatable, memancing diskusi audiens. Wajib EMOJI dan WAJIB 3-5 HASHTAG spesifik.",
    facebook: "Gaya storytelling profesional, solutif, menonjolkan kredibilitas. Wajib EMOJI dan WAJIB 5-8 HASHTAG bisnis/profesional."
  };

  const currentGuideline = platformGuidelines[platform];

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      // PENAJAMAN PERAN AI SEBAGAI EXPERT COPYWRITER
      systemInstruction: "Anda adalah Chief Marketing Officer, Expert Copywriter, dan Visual Storyteller untuk Omnifit. Tugas Anda membuat caption media sosial yang SANGAT MEMIKAT, emosional, persuasif, kaya emoji, dan WAJIB memiliki hashtag. Anda juga merancang TEPAT 4 Slide Carousel infografis dengan presisi.",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: ["copywriting", "carouselSlides"],
          properties: {
            copywriting: { type: SchemaType.STRING },
            carouselSlides: {
              type: SchemaType.ARRAY,
              description: "Daftar gambar (WAJIB 4 Slide)",
              items: {
                type: SchemaType.OBJECT,
                required: ["slideNumber", "textOnImage", "imagePrompt"],
                properties: {
                  slideNumber: { type: SchemaType.INTEGER },
                  textOnImage: { type: SchemaType.STRING, description: "Judul utama/kesimpulan singkat dari slide tersebut (Bahasa Indonesia)." },
                  imagePrompt: { type: SchemaType.STRING, description: "Instruksi visual EXTREMELY DETAILED berbahasa INGGRIS, dengan instruksi penulisan teks berbahasa INDONESIA di dalam tanda kutip ganda." }
                }
              }
            }
          }
        }
      }
    });

    const prompt = `
      IDENTITAS PLATFORM:
      Brand: "Omnifit"
      Program: "${trackName}"
      Deskripsi: "${trackDescription || '-'}"
      Audiens: "${targetAudience || 'Profesional'}"
      Output: ${JSON.stringify(expectedOutputs || [])}
      Tahapan Form: ${stepsContext}
      
      TUGAS 1: Buat "copywriting" (caption) Bahasa Indonesia. 
      Aturan Platform: ${currentGuideline}. 
      ATURAN MUTLAK COPYWRITING (WAJIB DIPATUHI):
      1. HOOK: Kalimat pertama WAJIB memancing rasa sakit (pain point) atau rasa penasaran audiens. Jangan langsung jualan.
      2. ISI: Gunakan gaya bahasa persuasif, berikan empati, lalu tawarkan program ini sebagai solusi transformasi yang nyata.
      3. EMOJI & FORMAT: WAJIB pakai EMOJI yang relevan (seperti 🚀, 💡, 🎯, 📊). Wajib beri spasi kosong ganda (\\n\\n) antar ide paragraf agar tidak menumpuk dan mudah dibaca (scannable).
      4. HASHTAGS (SANGAT PENTING!): JANGAN PERNAH MENGHILANGKAN HASHTAG. Anda WAJIB membuat barisan 5-10 hashtag yang relevan dengan topik di akhir caption (contoh: #Omnifit #NamaTopik #AsesmenAI, dll).
      
      TUGAS 2: Buatkan 4 "carouselSlides".
      
      ATURAN MENULIS "imagePrompt" UNTUK MESIN GAMBAR (SAMA SEPERTI SEBELUMNYA, WAJIB DIPATUHI 100%):
      Mesin gambar bodoh dalam menebak teks. Anda WAJIB menggunakan bahasa INGGRIS untuk mendeskripsikan gambar, TETAPI teks yang dicetak di gambar WAJIB disisipkan dengan bahasa INDONESIA di dalam tanda kutip ("..."). Teks TIDAK BOLEH PANJANG (maks 3 kata per elemen) agar tidak error!
      
      CONTOH DAN TEMPLATE PENULISAN "imagePrompt" PER SLIDE:
      
      - SLIDE 1 (HOOK): 
        Buat hook menarik di 'textOnImage'.
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, corporate minimalist, Teal and Vibrant Orange on clean white background. A stylized visual of [Metafora Masalah/Solusi]. In the center, write the large, bold text "[ISI textOnImage ANDA DI SINI]". No 3D, no photorealism."
      
      - SLIDE 2 (BENEFIT): 
        Pilih 3 Output/Benefit, ringkas jadi max 2-3 kata per poin.
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, clean modern UI aesthetic, Teal and Vibrant Orange on white background. Draw a dashboard UI with 3 floating cards. On the first card, write the text "[POIN BENEFIT 1]". On the second card, write the text "[POIN BENEFIT 2]". On the third card, write the text "[POIN BENEFIT 3]". No 3D, no photorealism."
      
      - SLIDE 3 (TAHAPAN): 
        Pilih 3-4 Tahapan Form, ringkas jadi max 2 kata per tahapan (contoh: 'Validasi', 'Pemetaan', 'Hasil').
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, infographic style, Teal and Vibrant Orange on white background. A step-by-step winding roadmap with 3 nodes. Next to node 1, write the text "[NAMA TAHAP 1]". Next to node 2, write the text "[NAMA TAHAP 2]". Next to node 3, write the text "[NAMA TAHAP 3]". No 3D, no photorealism."
        
      - SLIDE 4 (KESIMPULAN / HASIL AKHIR): 
        Ringkas hasil akhir dari form ini.
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, corporate minimalist, Teal and Vibrant Orange on white background. A visual of a successful professional holding a document. On the document, write the large text "[KESIMPULAN SINGKAT ANDA]". No 3D, no photorealism."
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    
    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    throw new HttpsError("internal", error.message || "Gagal membuat Copywriting Carousel.");
  }
});

// 2. FUNGSI REVISI COPYWRITING CAPTION
export const reviseCopywriting = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { originalText, instruction, platform } = request.data;
  
  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Anda Copywriter. Revisi caption ${platform} ini: "${originalText}"\nInstruksi: "${instruction}"\nAturan: Pertahankan spasi ganda, emoji, dan WAJIB sertakan/pertahankan HASHTAG di akhir caption. Berikan HANYA teks hasil.`;
    const result = await model.generateContent(prompt);
    return { success: true, revisedText: result.response.text().trim() };
  } catch (error: any) { throw new HttpsError("internal", error.message); }
});

// 3. FUNGSI REVISI PROMPT GAMBAR
export const reviseSlidePrompt = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { originalPrompt, instruction } = request.data;
  
  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Anda AI Art Director. Revisi prompt gambar ini: "${originalPrompt}"\nInstruksi klien: "${instruction}"\nATURAN MUTLAK:\n1. Prompt bahasa Inggris, teks tipografi di dalam prompt WAJIB bahasa Indonesia dan diapit tanda kutip ("...").\n2. Pertahankan Aspect Ratio 3:4, warna Teal/Orange/Yellow, gaya Flat Vector. No 3D.\nBerikan HANYA teks prompt hasil revisinya.`;
    const result = await model.generateContent(prompt);
    return { success: true, revisedPrompt: result.response.text().trim() };
  } catch (error: any) { throw new HttpsError("internal", error.message); }
});