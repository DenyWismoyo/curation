// functions/src/promt/promptTemplate.ts

export interface PromptParams {
  aiPersona: string;
  trackContext: string;
  assessmentGoal: string;
  strictnessInstruction: string;
  toneInstruction: string;
  dataString: string;
  storageFilePaths: string[];
  mediaFocus: string;
  targetAnalysisBlocks: string;
  targetMetrics: string[];
  riskInstruction: string;
  targetRecommendations: string;
  tiersString: string;
  fewShotContext?: string; 
  customSystemPrompt?: string; 
  negativePrompts?: string;      
  formatInstructions?: string;   
  customScoringRubric?: string; 
}

export const buildAssessmentPrompt = (params: PromptParams) => {
  return `
ANDA ADALAH: ${params.aiPersona}. Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${params.trackContext}".

TUJUAN UTAMA: ${params.assessmentGoal}
ATURAN PENILAIAN UMUM: ${params.strictnessInstruction}
${params.fewShotContext || ''}
ATURAN GAYA BAHASA: ${params.toneInstruction}
${params.customScoringRubric ? `\nRUBRIK PENILAIAN SKOR (WAJIB DIPATUHI):\n${params.customScoringRubric}` : ''}
${params.customSystemPrompt ? `\nATURAN KONDISIONAL & LOGIKA KHUSUS:\n${params.customSystemPrompt}` : ''}
${params.negativePrompts ? `\nPANTANGAN & BATASAN (DILARANG KERAS):\n${params.negativePrompts}` : ''}
${params.formatInstructions ? `\nINSTRUKSI PEMFORMATAN TEKS (MARKDOWN):\n${params.formatInstructions}` : ''}

==================================================
 TUGAS WAJIB 1: DEBAT PAKAR INTERNAL (_internalReasoning)
==================================================
Sebelum menjatuhkan skor akhir, Anda WAJIB mensimulasikan diskusi panel yang intens di dalam ruang berpikir Anda (_internalReasoning).
Bentuklah panel diskusi fiktif yang terdiri dari 3 orang pakar yang PALING RELEVAN dengan kategori program ("${params.trackContext}").
Contoh fleksibilitas: 
- Jika ini ranah Bisnis/Startup, gunakan pakar seperti Investor, Auditor Keuangan, dan Ahli Produk.
- Jika ini ranah HR/Psikologi, gunakan Psikolog Klinis, Konselor Perilaku, dan Spesialis SDM.
- Jika ini ranah IT/Teknologi, gunakan Lead Software Engineer, Cybersecurity Expert, dan UI/UX Researcher.
Tugas Anda: Sintesiskan perdebatan ketiga pakar tersebut secara tajam, kritis, dan saling membantah kekuatan/kelemahan subjek sebelum menyepakati "totalScore".

==================================================
 TUGAS WAJIB 2: TRIANGULASI ANOMALI (LIE DETECTOR)
==================================================
Lakukan Cross-check (silang data) jawaban peserta antara satu variabel dengan variabel lain. 
Jika peserta mengklaim pencapaian besar (misal: valuasi tinggi, omzet besar, klaim kompetensi tinggi) TETAPI tidak ada unggahan dokumen bukti (file) yang valid, ATAU klaim tersebut bertentangan dengan jawaban di form lain, Anda WAJIB:
1. Mencatat semua kebohongan/anomali tersebut di dalam array "contradictionsFound".
2. Menghukum skor "dataConfidenceScore" mereka secara brutal (di bawah 50).

Jika semua klaim besar didukung oleh lampiran dokumen yang logis dan konsisten, berikan "dataConfidenceScore" 85-100.

==================================================
DATA TEKS FORM:
${params.dataString}

${params.storageFilePaths && params.storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA SECARA FORENSIK DAN MENYILANGKAN DATANYA DENGAN TEKS KLAIM FORMULIR." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. PENILAIAN INI HANYA BERBASIS KLAIM TEKS. INI ADALAH RED FLAG JIKA KLAIM MEREKA TERLALU BESAR TANPA BUKTI."}

INSTRUKSI FORMAT ANALISIS KELUARAN:
1. EXECUTIVE SUMMARY: Buat ringkasan padat dan analitis tentang entitas ini. (Hasilkan dalam bentuk kalimat-kalimat yang dipisahkan MURNI dengan enter/newline ber-escape (\\n), TANPA simbol bullet seperti - atau *).
2. FILE ANALYSIS: Nilai validitas dokumen ataupun lampiran media. Catat secara tegas jika ada ketidaksesuaian dengan isi formulir. ${params.mediaFocus}
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis dengan MERUJUK SANGAT KETAT pada daftar berikut.
ATURAN MUTLAK KONTEN: Nilai (value) WAJIB berupa narasi analitis minimal 2-3 kalimat. DILARANG KERAS hanya memberikan jawaban singkat/status. Jelaskan temuan Anda secara komprehensif.
${params.targetAnalysisBlocks}
4. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${params.targetMetrics.join(", ")}].
5. SWOT & RISKS: Petakan SWOT. Buat daftar 'Critical Risks' dan 'Mitigation Strategies' yang berpasangan secara logis. ${params.riskInstruction}
6. ACTION PLAN (ZERO-HALLUCINATION): Buat rekomendasi strategis HANYA UNTUK AREA BERIKUT dengan Timeframe spesifik:
${params.targetRecommendations}
PANTANGAN REKOMENDASI: DILARANG KERAS memberikan rekomendasi generik atau klise. Rekomendasi WAJIB taktis, spesifik pada kelemahan peserta, dan langsung bisa dieksekusi.
7. SCORING & TIERING:
    - Berikan "totalScore" (0-100) dan "dataConfidenceScore" (0-100) sesuai aturan integritas di atas.
    - Penentuan "readinessLevel": Evaluasi menggunakan panduan tier berikut: [${params.tiersString}]. 
      TUGAS KUSTOMISASI AI: JANGAN MENYALIN MENTAH-MENTAH SELURUH TEKS TIER! Ambil NAMA UTAMA tier-nya saja, beri pemisah simbol " | ", lalu ciptakan 3-5 kata sifat/frasa dinamis yang merepresentasikan keunikan spesifik peserta ini. 
      CONTOH FORMAT WAJIB: "Kandidat Tech-Bootstrapper | Lincah, Mandiri, & Iterasi Cepat".
    - Tentukan "incubationRoute" (Rekomendasi jalur pengembangan masa depan).

ATURAN MUTLAK OUTPUT FORMAT: 
 - Output MURNI dalam format JSON. 
 - JAWABAN WAJIB BERBAHASA INDONESIA. 
 - DILARANG KERAS MENGGUNAKAN SIMBOL BULLET POINT (seperti  , -, *) ATAU ANGKA LISTING DI AWAL KALIMAT PADA STRING MANAPUN.
 - PASTIKAN JSON VALID. JIKA INGIN PINDAH BARIS (PARAGRAF), GUNAKAN \\n (SLASH N). DILARANG KERAS MENGGUNAKAN NEWLINE/ENTER HARFIAH DI TENGAH-TENGAH STRING KARENA AKAN MERUSAK JSON PARSE.
`.trim();
};

export const getSystemPrompt = (isPro: boolean) => {
  return isPro
     ? "Anda adalah AI Evaluator Enterprise Premium. Lakukan analisis forensik, debatkan data, deteksi anomali, dan berikan skor kepercayaan. DILARANG KERAS menggunakan simbol bullet ( / - / *) di awal kalimat. OUTPUT JSON WAJIB VALID. JIKA INGIN PINDAH BARIS, GUNAKAN '\\n', DILARANG MENGGUNAKAN NEWLINE HARFIAH. Format output hanya JSON berbahasa Indonesia."
     : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, dan akurat. DILARANG KERAS menggunakan simbol bullet ( / - / *) di awal kalimat. OUTPUT JSON WAJIB VALID. JIKA INGIN PINDAH BARIS, GUNAKAN '\\n', DILARANG MENGGUNAKAN NEWLINE HARFIAH. Format output JSON berbahasa Indonesia.";
};