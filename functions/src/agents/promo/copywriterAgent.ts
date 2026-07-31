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

  const platformGuidelines: Record<string, string> = {
    instagram: "Gaya copywriting persuasif (AIDA/PAS), emosional, dan relatable. Pancing interaksi, berikan solusi elegan, akhiri dengan Call to Action yang kuat. Wajib 5-10 HASHTAG.",
    tiktok: "Skrip/caption dinamis, penuh energi, relate dengan audiens, langsung 'menggigit' di 3 detik pertama. Wajib 5-8 HASHTAG.",
    threads: "Teks tajam, opini mindblowing, memancing diskusi audiens agar berhenti scrolling. Wajib 3-5 HASHTAG.",
    facebook: "Gaya edukatif namun hangat, menonjolkan kredibilitas dan solusi nyata dari masalah audiens. Wajib 5-8 HASHTAG."
  };

  const currentGuideline = platformGuidelines[platform];

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash", // Menggunakan model mutakhir untuk copywriting
      systemInstruction: "Anda adalah Expert Social Media Copywriter dengan spesialisasi konversi tinggi. Anda SANGAT PINTAR memainkan emosi audiens, menggunakan bahasa yang hangat, relatable, dan TIDAK KAKU/AKADEMIS. Anda paham cara merangkai kalimat persuasif tanpa terlihat seperti robot.",
      generationConfig: {
        temperature: 0.8, // Suhu dinaikkan agar hasil lebih kreatif, emosional, dan 'menjual'
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
                  textOnImage: { 
                    type: SchemaType.STRING, 
                    description: "Judul utama/kesimpulan singkat dari slide tersebut (Bahasa Indonesia). Maksimal 3-4 kata." 
                  },
                  imagePrompt: { 
                    type: SchemaType.STRING, 
                    description: "Instruksi visual EXTREMELY DETAILED berbahasa INGGRIS, dengan instruksi penulisan teks berbahasa INDONESIA di dalam tanda kutip ganda." 
                  }
                }
              }
            }
          }
        }
      }
    });

    const prompt = `
      IDENTITAS KAMPANYE:
      Brand: "Omnifit"
      Program: "${trackName}"
      Deskripsi: "${trackDescription || '-'}"
      Target Audiens: "${targetAudience || 'Profesional'}" (Sesuaikan gaya bahasa sapaan dengan audiens ini. Misal: jika orang tua, gunakan sapaan 'Ayah/Bunda' atau 'Moms').
      Output Program: ${JSON.stringify(expectedOutputs || [])}
      Tahapan Form: ${stepsContext}
      Platform: ${platform}
      
      TUGAS 1: Buat "copywriting" (caption) Bahasa Indonesia yang SANGAT MENJUAL.
      Aturan Platform: ${currentGuideline}. 
      
      ATURAN KETAT FORMAT & COPYWRITING (WAJIB DIPATUHI 100%):
      1. TONE & EMOSI: Jangan kaku atau menggunakan istilah akademis/robotik (seperti 'kesenjangan literasi' atau 'pemetaan presisi'). Ubah menjadi bahasa sehari-hari yang menyentuh 'pain point' audiens.
      2. KETERBACAAN (SCANNABLE): JANGAN BUAT ESAI! Pecah teks menjadi paragraf-paragraf pendek (maksimal 2-3 kalimat per paragraf).
      3. SPASI GANDA MUTLAK: WAJIB gunakan spasi (\\n\\n) antar paragraf agar caption memiliki ruang bernapas (white space) dan enak dibaca.
      4. ANTI-MARKDOWN BULLET: DILARANG KERAS menggunakan tanda bintang (* atau **) untuk membuat list. Jika ingin menjabarkan poin, WAJIB gunakan EMOJI di awal baris (contoh: ✅ Poin 1, 💡 Poin 2, 🚀 Poin 3).
      5. CALL TO ACTION (CTA): Berikan CTA yang memicu urgensi atau FOMO di akhir teks.
      6. HASHTAGS: Di baris paling bawah, berikan jarak (\\n\\n), lalu susun hashtag relevan (JANGAN DIHILANGKAN).
      
      TUGAS 2: Buatkan 4 "carouselSlides".
      
      ATURAN MENULIS "imagePrompt" UNTUK MESIN GAMBAR (TIDAK BOLEH BERUBAH):
      Mesin AI Gambar tidak bisa membaca paragraf panjang. Anda WAJIB menggunakan bahasa INGGRIS untuk mendeskripsikan gambar, TETAPI teks yang dicetak di gambar WAJIB disisipkan dengan bahasa INDONESIA di dalam tanda kutip ("..."). Teks TIDAK BOLEH PANJANG (maks 3 kata per elemen)!
      
      CONTOH PENULISAN "imagePrompt" PER SLIDE:
      
      - SLIDE 1 (HOOK/ATTENTION): 
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, corporate minimalist, Teal and Vibrant Orange on clean white background. A stylized visual of [Metafora Emosi/Masalah]. In the center, write the large, bold text "[ISI textOnImage DI SINI]". No 3D, no photorealism."
      
      - SLIDE 2 (BENEFIT/INTEREST): 
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, clean modern UI aesthetic, Teal and Vibrant Orange on white background. Draw a dashboard UI with 3 floating cards. On the first card, write the text "[BENEFIT 1]". On the second card, write the text "[BENEFIT 2]". On the third card, write the text "[BENEFIT 3]". No 3D, no photorealism."
      
      - SLIDE 3 (TAHAPAN/DESIRE): 
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, infographic style, Teal and Vibrant Orange on white background. A step-by-step winding roadmap with 3 nodes. Next to node 1, write the text "[TAHAP 1]". Next to node 2, write the text "[TAHAP 2]". Next to node 3, write the text "[TAHAP 3]". No 3D, no photorealism."
        
      - SLIDE 4 (KESIMPULAN/ACTION): 
        Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, corporate minimalist, Teal and Vibrant Orange on white background. A visual of a successful person matching the target audience. On a clipboard, write the large text "[KESIMPULAN SINGKAT]". No 3D, no photorealism."
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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      generationConfig: { temperature: 0.8 } // Suhu tinggi agar luwes saat revisi
    });

    const prompt = `Anda Expert Social Media Copywriter. Revisi caption ${platform} ini: 
    
    Teks Awal: "${originalText}"
    
    Instruksi Klien: "${instruction}"
    
    ATURAN MUTLAK REVISI:
    1. Jadikan bahasanya lebih emosional, relatable, dan 'menjual' (tidak kaku/akademis).
    2. JANGAN PANJANG seperti esai! Maksimal 3 kalimat per paragraf.
    3. WAJIB pertahankan spasi ganda (\\n\\n) antar paragraf.
    4. DILARANG pakai asterisk (*) untuk list. WAJIB pakai Emoji di awal kalimat jika ada list/poin.
    5. WAJIB sertakan/pertahankan HASHTAG di akhir caption. 
    
    Berikan HANYA teks hasil revisi tanpa basa-basi.`;

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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash", 
      generationConfig: { temperature: 0.5 } // Suhu dijaga sedikit lebih rendah untuk prompt gambar agar konsisten
    });

    const prompt = `Anda AI Art Director. Revisi prompt gambar ini: "${originalPrompt}"\nInstruksi klien: "${instruction}"\nATURAN MUTLAK:\n1. Prompt bahasa Inggris, teks tipografi di dalam prompt WAJIB bahasa Indonesia dan diapit tanda kutip ("..."). Teks maksimal 3 kata!\n2. Pertahankan Aspect Ratio 3:4, warna Teal/Orange/Yellow, gaya Flat Vector. No 3D.\nBerikan HANYA teks prompt hasil revisinya tanpa basa-basi.`;
    const result = await model.generateContent(prompt);
    return { success: true, revisedPrompt: result.response.text().trim() };
  } catch (error: any) { throw new HttpsError("internal", error.message); }
});