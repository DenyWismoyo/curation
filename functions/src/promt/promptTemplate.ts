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
  targetAudience?: string; 
}

export const buildAssessmentPrompt = (params: PromptParams) => {
  const audienceInstruction = params.targetAudience === 'individual' 
    ? "TARGET AUDIENS: INDIVIDU / PERSONAL. Anda wajib menggunakan sudut pandang pengembangan karir, psikologi, kompetensi personal, dan karakter. DILARANG KERAS menggunakan istilah korporat seperti B2B, omzet, valuasi, atau operasional perusahaan."
    : "TARGET AUDIENS: PERUSAHAAN / ORGANISASI / BISNIS. Gunakan bahasa profesional korporat, fokus pada metrik bisnis, skalabilitas, dan efisiensi operasional.";

  return `
 ANDA ADALAH: ${params.aiPersona}. Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${params.trackContext}".

 TUJUAN UTAMA: ${params.assessmentGoal}
 
 ${audienceInstruction}

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
 
 Tugas Anda: Sintesiskan perdebatan ketiga pakar tersebut secara tajam, kritis, dan saling membantah kekuatan/kelemahan subjek sebelum menyepakati "totalScore".

 ==================================================
  TUGAS WAJIB 2: TRIANGULASI ANOMALI (LIE DETECTOR)
 ==================================================
 Lakukan Cross-check (silang data) jawaban peserta. Catat semua anomali dan kebohongan di dalam array "contradictionsFound". Hancurkan skor "dataConfidenceScore" jika klaim besar tidak disertai bukti.

 ==================================================
 DATA TEKS FORMULIR:
 ${params.dataString}

 ${params.storageFilePaths && params.storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA SECARA FORENSIK DAN MENYILANGKAN DATANYA DENGAN TEKS KLAIM FORMULIR." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. PENILAIAN INI HANYA BERBASIS KLAIM TEKS. INI ADALAH RED FLAG JIKA KLAIM MEREKA TERLALU BESAR TANPA BUKTI."}

 ==================================================
 INSTRUKSI FORMAT ANALISIS KELUARAN & PEMBAGIAN PROPERTI JSON
 ==================================================
 PERINGATAN KERAS: Sistem kami menggunakan arsitektur Multi-Agent. JANGAN MENGGABUNGKAN SELURUH ANALISIS KE DALAM SATU PROPERTI (terutama ke dalam 'executiveSummary'). Setiap poin di bawah ini akan diproses oleh Agen AI yang berbeda sesuai porsinya!

 1. PROPERTI 'executiveSummary': Buat ringkasan padat dan analitis tentang entitas ini. DILARANG KERAS memasukkan judul/header seperti "FILE ANALYSIS", "METRICS", "CUSTOM ANALYSIS BLOCKS" atau "ACTION PLAN" ke dalam ringkasan ini! Fokus HANYA pada kesimpulan eksekutif keseluruhan.
 2. TUGAS FILE ANALYSIS: Nilai validitas dokumen. (Akan diproses khusus ke skema JSON fileAnalysisInsights). ${params.mediaFocus}
 3. TUGAS CUSTOM ANALYSIS BLOCKS: Hasilkan narasi analitis minimal 2-3 kalimat per poin. (Akan diproses khusus ke skema JSON customAnalysisBlocks).
 ${params.targetAnalysisBlocks}
 4. TUGAS METRICS ARRAY: Berikan skor objektif (0-100). (Akan diproses khusus ke skema JSON metrics) untuk indikator berikut: [${params.targetMetrics.join(", ")}].
 5. PROPERTI 'swotAnalysis' & 'riskAssessment': Petakan SWOT dan Risiko secara logis ke dalam properti JSON-nya masing-masing. ${params.riskInstruction}
 6. TUGAS ACTION PLAN & RECOMMENDATIONS: Buat rekomendasi strategis. (Akan diproses khusus ke skema JSON recommendations & nextActionSteps).
 ${params.targetRecommendations}
 7. PROPERTI SCORING & TIERING:
    - Berikan "totalScore" (0-100) dan "dataConfidenceScore" (0-100).
    - Penentuan "readinessLevel": Evaluasi menggunakan panduan tier berikut: [${params.tiersString}]. Format WAJIB: "Nama Tier | 3-5 Kata Sifat Dinamis" (Contoh: "Kandidat Unggul | Mandiri, Inovatif").
    - Tentukan "incubationRoute" (Rekomendasi jalur pengembangan masa depan).

 ATURAN MUTLAK OUTPUT FORMAT:
  - Output MURNI dalam format JSON.
  - JAWABAN WAJIB BERBAHASA INDONESIA.
  - DILARANG KERAS MENGGUNAKAN SIMBOL BULLET POINT (seperti -, *) ATAU ANGKA LISTING DI AWAL KALIMAT PADA STRING MANAPUN.
  - PASTIKAN JSON VALID. JIKA INGIN PINDAH BARIS, GUNAKAN \\n (SLASH N). DILARANG KERAS MENGGUNAKAN NEWLINE/ENTER HARFIAH.
  `.trim();
};

export const getSystemPrompt = (isPro: boolean) => {
  return isPro 
    ? "Anda adalah AI Evaluator Enterprise Premium. Lakukan analisis forensik, debatkan data, deteksi anomali, dan berikan skor kepercayaan. DILARANG KERAS menggunakan simbol bullet ( / - / *) di awal kalimat. OUTPUT JSON WAJIB VALID. JIKA INGIN PINDAH BARIS, GUNAKAN '\\n', DILARANG MENGGUNAKAN NEWLINE HARFIAH. Format output hanya JSON berbahasa Indonesia."
    : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, dan akurat. DILARANG KERAS menggunakan simbol bullet ( / - / *) di awal kalimat. OUTPUT JSON WAJIB VALID. JIKA INGIN PINDAH BARIS, GUNAKAN '\\n', DILARANG MENGGUNAKAN NEWLINE HARFIAH. Format output JSON berbahasa Indonesia.";
};