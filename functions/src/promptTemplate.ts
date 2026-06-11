// functions/src/promptTemplate.ts

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
  fewShotContext?: string; // Tambahan dinamis untuk RAG
}

export const buildAssessmentPrompt = (params: PromptParams) => {
  return `
ANDA ADALAH: ${params.aiPersona}.
Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${params.trackContext}".

TUJUAN UTAMA: ${params.assessmentGoal}
ATURAN PENILAIAN (SKOR): ${params.strictnessInstruction} ${params.fewShotContext || ''}
ATURAN GAYA BAHASA: ${params.toneInstruction}

DATA TEKS FORM:
${params.dataString}

${params.storageFilePaths && params.storageFilePaths.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA DAN MENYILANGKAN DATANYA DENGAN TEKS FORM." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. BERIKAN PENILAIAN BERDASARKAN TEKS SAJA."}

INSTRUKSI FORMAT ANALISIS:
1. EXECUTIVE SUMMARY: Buat ringkasan padat dan analitis tentang entitas ini sesuai tujuan asesmen. (Hasilkan dalam bentuk kalimat-kalimat yang dipisahkan MURNI dengan enter/newline, TANPA simbol bullet seperti • / - / *).
2. FILE ANALYSIS: Nilai validitas dokumen ataupun lampiran media. Catat jika ada ketidaksesuaian dengan isi formulir. (Pisahkan dengan enter/newline, TANPA simbol bullet). ${params.mediaFocus}
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis dengan MERUJUK SANGAT KETAT pada daftar berikut.
Pastikan Anda menjabarkan nilai indikator (label) secara mendetail dan analitis. (Hasilkan DALAM BENTUK 2-3 KALIMAT SINGKAT. Pisahkan setiap kalimat MURNI dengan enter/newline, TANPA simbol bullet).
${params.targetAnalysisBlocks}
4. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${params.targetMetrics.join(", ")}]. (Deskripsi alasan wajib disajikan dalam kalimat yang dipisahkan enter/newline, TANPA simbol bullet).
5. SWOT & RISKS: Petakan SWOT. Buat daftar 'Critical Risks' dan 'Mitigation Strategies' yang berpasangan. ${params.riskInstruction} (Pisahkan dengan newline, TANPA simbol bullet).
6. ACTION PLAN: Buat rekomendasi strategis HANYA UNTUK AREA BERIKUT dengan Timeframe spesifik. (Konten rekomendasi wajib dipisahkan newline, TANPA simbol bullet):
${params.targetRecommendations}
7. SCORING & TIERING: 
   - Berikan "totalScore" (0-100) sesuai aturan penilaian di atas.
   - Penentuan "readinessLevel" WAJIB memilih HANYA DARI SALAH SATU STATUS BERIKUT: [${params.tiersString}].
   - Tentukan "incubationRoute".

ATURAN MUTLAK: 
- Output MURNI dalam format JSON. 
- JAWABAN WAJIB BERBAHASA INDONESIA. 
- DILARANG KERAS MENGGUNAKAN SIMBOL BULLET POINT (seperti •, -, *) ATAU ANGKA LISTING DI AWAL KALIMAT PADA STRING MANAPUN.
- GUNAKAN HANYA NEWLINE (\\n) SEBAGAI PEMISAH ANTAR POIN/KALIMAT.
`;
};

export const getSystemPrompt = (isPro: boolean) => {
  return isPro 
    ? "Anda adalah AI Evaluator Premium. Lakukan analisis mendalam, kritis, deteksi celah logika. Format output terstruktur menggunakan pemisah baris baru (newline) murni. DILARANG KERAS menggunakan simbol bullet (•/ - / *) di awal kalimat. Format output hanya JSON berbahasa Indonesia." 
    : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, dan akurat. Berikan narasi rapi dengan pemisah baris baru (newline) murni. DILARANG KERAS menggunakan simbol bullet (•/ - / *) di awal kalimat. Format output JSON berbahasa Indonesia.";
};