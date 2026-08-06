// functions/src/agents/promo/copywriterAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { withRetry } from "../../../shared/utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const resolveImpactGuidance = (mode: unknown): string => {
  const value = String(mode || "bold").toLowerCase();
  if (value === "soft") {
    return "Gaya halus, empatik, aman, dan hangat. Hindari nada terlalu menekan.";
  }
  if (value === "aggressive") {
    return "Gaya sangat tajam, berenergi tinggi, conversion-heavy, penuh urgensi dan FOMO.";
  }
  return "Gaya tegas, menjual, berkelas, dan tetap seimbang antara emosi dan kredibilitas.";
};

// 1. FUNGSI UTAMA (GENERATE AWAL)
export const generateCopywriting = onCall({
  memory: "512MiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { trackName, trackDescription, expectedOutputs, targetAudience, targetPlatform, formSteps, promptImpactMode } = request.data;
  const platform = targetPlatform || 'instagram';
  const impactGuidance = resolveImpactGuidance(promptImpactMode);

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
    const deepseekClient = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: deepseekApiKeySecret.value(),
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
      Mode Kualitas Impact: ${impactGuidance}
      
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

      OUTPUT WAJIB JSON murni:
      {
        "copywriting": "...",
        "carouselSlides": [
          { "slideNumber": 1, "textOnImage": "...", "imagePrompt": "..." }
        ]
      }
    `;

    const result = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: `Anda adalah social media copywriter premium. Keluarkan JSON valid saja. Buat copywriting lebih wow, emosional, dan tetap actionable. Wajib patuhi mode impact berikut: ${impactGuidance}`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.82,
      response_format: { type: "json_object" },
    }));

    let rawText = result.choices[0]?.message?.content || "{}";
    rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(rawText);

    const copywriting = typeof parsed?.copywriting === "string" && parsed.copywriting.trim().length > 0
      ? parsed.copywriting.trim()
      : "Insight tajam tanpa eksekusi tidak akan mengubah apa pun. Mulai evaluasi sekarang dan konversikan temuan menjadi langkah nyata.\n\n#Omnifit #Assessment";

    const slidesRaw = Array.isArray(parsed?.carouselSlides) ? parsed.carouselSlides : [];
    const carouselSlides = slidesRaw
      .filter((slide: any) => slide && typeof slide === "object")
      .slice(0, 4)
      .map((slide: any, idx: number) => ({
        slideNumber: typeof slide?.slideNumber === "number" ? slide.slideNumber : idx + 1,
        textOnImage: typeof slide?.textOnImage === "string" && slide.textOnImage.trim().length > 0
          ? slide.textOnImage.trim()
          : `Slide ${idx + 1}`,
        imagePrompt: typeof slide?.imagePrompt === "string" && slide.imagePrompt.trim().length > 0
          ? slide.imagePrompt.trim()
          : `Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, Teal and Vibrant Orange palette. Write bold Indonesian text \"Slide ${idx + 1}\". No 3D.`,
      }));

    while (carouselSlides.length < 4) {
      const idx = carouselSlides.length + 1;
      carouselSlides.push({
        slideNumber: idx,
        textOnImage: `Slide ${idx}`,
        imagePrompt: `Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, Teal and Vibrant Orange palette. Write bold Indonesian text \"Slide ${idx}\". No 3D.`,
      });
    }

    return { success: true, copywriting, carouselSlides };
  } catch (error: any) {
    throw new HttpsError("internal", error.message || "Gagal membuat Copywriting Carousel.");
  }
});

// 2. FUNGSI REVISI COPYWRITING CAPTION
export const reviseCopywriting = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
  region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { originalText, instruction, platform, promptImpactMode } = request.data;
  const impactGuidance = resolveImpactGuidance(promptImpactMode);
  
  try {
    const deepseekClient = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: deepseekApiKeySecret.value(),
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
    6. Mode kualitas impact: ${impactGuidance}
    
    Berikan HANYA teks hasil revisi tanpa basa-basi.`;

    const result = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "Anda adalah copywriter conversion specialist. Jawab dengan teks final saja, tanpa preface." },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
    }));

    const revisedText = result.choices[0]?.message?.content?.trim() || originalText || "";
    return { success: true, revisedText };
  } catch (error: any) { throw new HttpsError("internal", error.message); }
});

// 3. FUNGSI REVISI PROMPT GAMBAR
export const reviseSlidePrompt = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
  region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { originalPrompt, instruction, promptImpactMode } = request.data;
  const impactGuidance = resolveImpactGuidance(promptImpactMode);
  
  try {
    const deepseekClient = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: deepseekApiKeySecret.value(),
    });

    const prompt = `Anda AI Art Director. Revisi prompt gambar ini: "${originalPrompt}"\nInstruksi klien: "${instruction}"\nATURAN MUTLAK:\n1. Prompt bahasa Inggris, teks tipografi di dalam prompt WAJIB bahasa Indonesia dan diapit tanda kutip ("..."). Teks maksimal 3 kata!\n2. Pertahankan Aspect Ratio 3:4, warna Teal/Orange/Yellow, gaya Flat Vector. No 3D.\n3. Mode kualitas impact: ${impactGuidance}\nBerikan HANYA teks prompt hasil revisinya tanpa basa-basi.`;
    const result = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "Anda adalah AI Art Director. Jawab hanya 1 prompt final tanpa markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.55,
    }));

    const revisedPrompt = result.choices[0]?.message?.content?.trim() || originalPrompt || "";
    return { success: true, revisedPrompt };
  } catch (error: any) { throw new HttpsError("internal", error.message); }
});