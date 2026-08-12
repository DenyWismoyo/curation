// src/features/admin/constants/marketingPrompts.ts

export const buildGenerateMarketingKitPrompt = (
  trackName: string,
  trackDescription: string,
  targetAudience: string,
  expectedOutputs: any[],
  stepsContext: string,
  activePlatform: string,
  currentGuideline: string,
  impactGuidance: string
) => {
  return `
    IDENTITAS KAMPANYE:
    Brand: "Omnifit"
    Program: "${trackName}"
    Deskripsi: "${trackDescription || '-'}"
    Target Audiens: "${targetAudience || 'Profesional'}" (Sesuaikan gaya bahasa sapaan dengan audiens ini. Misal: jika orang tua, gunakan sapaan 'Ayah/Bunda' atau 'Moms').
    Output Program: ${JSON.stringify(expectedOutputs || [])}
    Tahapan Form: ${stepsContext}
    Platform: ${activePlatform}
    
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
      Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, corporate minimalist, Teal and Vibrant Orange on clean white background. A stylized visual of [Metafora Emosi/Masalah]. In the center, write the large, bold text \\"[ISI textOnImage DI SINI]\\". No 3D, no photorealism."
    
    - SLIDE 2 (BENEFIT/INTEREST): 
      Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, clean modern UI aesthetic, Teal and Vibrant Orange on white background. Draw a dashboard UI with 3 floating cards. On the first card, write the text \\"[BENEFIT 1]\\". On the second card, write the text \\"[BENEFIT 2]\\". On the third card, write the text \\"[BENEFIT 3]\\". No 3D, no photorealism."
    
    - SLIDE 3 (TAHAPAN/DESIRE): 
      Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, infographic style, Teal and Vibrant Orange on white background. A step-by-step winding roadmap with 3 nodes. Next to node 1, write the text \\"[TAHAP 1]\\". Next to node 2, write the text \\"[TAHAP 2]\\". Next to node 3, write the text \\"[TAHAP 3]\\". No 3D, no photorealism."
      
    - SLIDE 4 (KESIMPULAN/ACTION): 
      Format imagePrompt: "Vertical Portrait Aspect Ratio 3:4. Flat vector illustration, corporate minimalist, Teal and Vibrant Orange on white background. A visual of a successful person matching the target audience. On a clipboard, write the large text \\"[KESIMPULAN SINGKAT]\\". No 3D, no photorealism."
  `;
};

export const buildReviseCaptionPrompt = (
  activePlatform: string,
  currentCaption: string,
  copyRevisionText: string,
  impactGuidance: string
) => {
  return `Anda Expert Social Media Copywriter. Revisi caption ${activePlatform} ini: 
  
  Teks Awal: "${currentCaption}"
  
  Instruksi Klien: "${copyRevisionText}"
  
  ATURAN MUTLAK REVISI:
  1. Jadikan bahasanya lebih emosional, relatable, dan 'menjual' (tidak kaku/akademis).
  2. JANGAN PANJANG seperti esai! Maksimal 3 kalimat per paragraf.
  3. WAJIB pertahankan spasi ganda (\n\n) antar paragraf.
  4. DILARANG pakai asterisk (*) untuk list. WAJIB pakai Emoji di awal kalimat jika ada list/poin.
  5. WAJIB sertakan/pertahankan HASHTAG di akhir caption. 
  6. Mode kualitas impact: ${impactGuidance}
  
  Berikan HANYA teks hasil revisi tanpa basa-basi.`;
};

export const buildReviseSlidePrompt = (
  targetSlidePrompt: string,
  instruction: string,
  impactGuidance: string
) => {
  return `Anda AI Art Director. Revisi prompt gambar ini: "${targetSlidePrompt}"\nInstruksi klien: "${instruction}"\nATURAN MUTLAK:\n1. Prompt bahasa Inggris, teks tipografi di dalam prompt WAJIB bahasa Indonesia dan diapit tanda kutip ("..."). Teks maksimal 3 kata!\n2. Pertahankan Aspect Ratio 3:4, warna Teal/Orange/Yellow, gaya Flat Vector. No 3D.\n3. Mode kualitas impact: ${impactGuidance}\nBerikan HANYA teks prompt hasil revisinya tanpa basa-basi.`;
};
