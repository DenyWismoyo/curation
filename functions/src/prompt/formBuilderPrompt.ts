// functions/src/promt/formBuilderPrompt.ts

export interface FormBuilderPromptParams {
  trackName: string;
  config: any; 
  archetypeInstruction: string;
  specificTargetContext?: string;
  methodologyContext?: string;
}

export const buildMegaAgentPrompt = (params: FormBuilderPromptParams): string => {
  const { trackName, config, archetypeInstruction, specificTargetContext, methodologyContext } = params;

   const promptImpactMode = config.promptImpactMode || 'bold';
   const impactGuidance = promptImpactMode === 'soft'
      ? 'Gunakan gaya bahasa halus, empatik, aman, dan tetap profesional.'
      : promptImpactMode === 'aggressive'
         ? 'Gunakan gaya bahasa sangat tajam, direct, high-impact, dan memicu sense of urgency.'
         : 'Gunakan gaya bahasa tegas, menjual, dan berenergi dengan keseimbangan kredibilitas.';
  
  const metrics = config.expectedMetrics?.join(', ') || 'Metrik standar kelayakan bisnis';
  const analysisBlocks = config.expectedAnalysisBlocks?.join(' | ') || '';
  const risks = config.riskFramework || 'Deteksi potensi kegagalan operasional';
  const sources = config.researchSourcesCited?.join(', ') || 'Standar industri global terbaik';

  const purpose = config.formPurpose || 'assessment';
  let purposeContext = "";

  if (purpose === 'counseling') {
     purposeContext = "KUESIONER PSIKOLOGI / HR / KONSELING (Fokus pada empati, perilaku, dan mental)";
  } else if (purpose === 'monitoring') {
     purposeContext = "FORMULIR MONITORING / MONEV PROYEK (Fokus pada metrik progres, angka target, dan hambatan logistik)";
  } else if (purpose === 'consultation') {
     purposeContext = "FORMULIR KONSULTASI PAKAR (Fokus pada identifikasi akar masalah dan pengumpulan fakta spesifik)";
  } else if (purpose === 'custom') {
     purposeContext = `FORMULIR KUSTOM DINAMIS: "${trackName}" (Fokus evaluasi disesuaikan dengan konteks program ini)`;
  } else {
     purposeContext = "KUESIONER AUDIT BISNIS & STANDAR MUTU (Due Diligence)";
  }
     
  const audienceType = config.targetAudience || 'company';
  let targetAudience = "";
  let namaLabel = "Nama Entitas/Perusahaan";
  
  if (audienceType === 'individual' || audienceType === 'student') {
     targetAudience = "TARGET: INDIVIDU / PERSONAL. Gunakan sapaan langsung (Anda, Bapak/Ibu). DILARANG KERAS menanyakan legalitas PT, entitas organisasi, atau omzet bisnis B2B.";
     namaLabel = "Nama Lengkap Anda";
  } else if (audienceType === 'government') {
     targetAudience = "TARGET: INSTANSI PEMERINTAH / PUBLIK. Gunakan bahasa tata kelola birokrasi, transparansi, dan pelayanan masyarakat.";
     namaLabel = "Nama Instansi / Dinas / Desa";
  } else if (audienceType === 'community') {
     targetAudience = "TARGET: KOMUNITAS / NGO / YAYASAN. Fokus pada manajemen relawan, dampak sosial masyarakat, dan program nirlaba.";
     namaLabel = "Nama Komunitas / Yayasan";
  } else if (audienceType === 'startup') {
     targetAudience = "TARGET: STARTUP TEKNOLOGI. Fokus pada inovasi, kecocokan produk dengan pasar (product-market fit), dan traksi pertumbuhan.";
     namaLabel = "Nama Startup / Usaha";
  } else if (audienceType === 'umkm') {
     targetAudience = "TARGET: UMKM / BISNIS MENENGAH. Fokus pada manajemen operasional, penjualan (sales), dan rencana pengembangan usaha.";
     namaLabel = "Nama Usaha / Toko / Perusahaan";
  } else {
     targetAudience = "TARGET: PERUSAHAAN / ORGANISASI B2B. Gunakan bahasa profesional korporat dan metrik skala bisnis enterprise.";
     namaLabel = "Nama Entitas / Perusahaan / PT";
  }

  const aiPersona = config.aiPersona || "Pakar Asesmen & Auditor Senior";

  return `
 Anda adalah entitas super beridentitas: [${aiPersona}]. Tugas Anda merancang instrumen asesmen tingkat Enterprise untuk program: "${trackName}".

 DOMAIN & FOKUS SISTEM INI ADALAH:
 ${purposeContext}
 ${targetAudience}

 PROFIL SUBJEK ASESMEN (WAJIB MENJADI ACUAN PERTANYAAN):
 ${specificTargetContext || 'Sesuai dengan target audiens.'}
 
 METODOLOGI YANG DIADOPSI:
 ${methodologyContext || 'Standar industri terbaik yang relevan.'}

 Tujuan Asesmen Utama: "${config.assessmentGoal || 'Evaluasi mendalam pemetaan kualitas.'}"
 Target Metrik Radar yang Harus Diukur: [${metrics}]
 Fokus Blok Analisis: [${analysisBlocks}]
 Fokus Deteksi Risiko (Red Flags): [${risks}]
 Standar Referensi Kredibel yang Wajib Diadopsi: [${sources}]
 Tingkatan Kematangan (Tiers): [${config.customReadinessTiers?.join(' | ') || 'Default Tiers'}]
 Target Rekomendasi: [${config.expectedRecommendations?.join(', ') || 'Rekomendasi Umum'}]

 KEKETATAN PENILAIAN (Grading Strictness): ${config.gradingStrictness || 'standard'}
 ${config.gradingStrictness === 'strict' ? '→ Rancang pertanyaan yang menggali secara forensik, tagih bukti, dan ungkap red flag.' : ''}
 ${config.gradingStrictness === 'supportive' ? '→ Rancang pertanyaan yang memberdayakan, suportif, dan menggali potensi.' : ''}

 GAYA BAHASA (Report Tone): ${config.reportTone || 'consultative'}

 MODE KUALITAS PROMPT (Prompt Impact Mode): ${promptImpactMode}
 ${impactGuidance}

 ATURAN KHUSUS (Custom System Rules):
 ${config.customSystemPrompt || 'Tidak ada aturan khusus tambahan.'}

 PANTANGAN MUTLAK (Negative Prompts):
 ${config.negativePrompts || 'Tidak ada pantangan khusus.'}

 ==================================================
 TAHAP 1: THE SCRATCHPAD (RISET & PEMETAAN WAJIB)
 ==================================================
 Lakukan penelusuran (Search Grounding) terhadap standar referensi di atas. Anda WAJIB memastikan bahwa SETIAP "Target Metrik Radar" dan "Fokus Deteksi Risiko" yang disebutkan di atas memiliki MINIMAL 1 hingga 2 pertanyaan spesifik di dalam formulir.

 ==================================================
 TAHAP 2: PEMBUATAN FORMULIR (STEPS)
 ==================================================
 Berdasarkan pemetaan di atas, buatlah struktur formulir secara presisi. 

 GUARDRAILS AUDIT (MUTLAK):
 1. ANTI-LEAK: DILARANG menggunakan kata "Skor", "Bobot", "Nilai" pada label/deskripsi pertanyaan. Peserta tidak boleh tahu bobot di balik pilihan mereka.
 2. LOKALISASI BAHASA: Seluruh teks, label pertanyaan, deskripsi, hingga opsi jawaban WAJIB MENGGUNAKAN BAHASA INDONESIA YANG FORMAL DAN MUDAH DIPAHAMI. Nominal angka WAJIB menggunakan mata uang Rupiah (Rp).
 3. JSON STRING SAFETY: DILARANG KERAS menggunakan ENTER atau NEWLINE harfiah (\\n) di dalam teks value JSON. Gunakan spasi biasa untuk memisahkan kalimat.

 ATURAN STRUKTUR & GAYA (ARCHETYPE):
 ${archetypeInstruction}

 INSTRUKSI TEKNIS STRUKTUR JSON & "POWERFUL MIXING":
 1. SINERGI TIPE INPUT (WAJIB DITERAPKAN): Anda memiliki senjata input ("text", "textarea", "number", "date", "select", "radio", "checkbox", "file"). Anda WAJIB menggabungkan mereka secara cerdas!
    - Gunakan "checkbox" untuk menanyakan kelengkapan.
    - Gunakan "number" khusus untuk data kuantitatif presisi (contoh: Omzet, Jumlah Pengguna, Umur).
    - Gunakan "radio" atau "select" untuk pilihan tunggal tingkat kematangan (maturity level).
 2. SECRET SCORING MATRIX: Untuk tipe 'radio', 'checkbox', atau 'select', array "options" WAJIB berupa objek: {"label": "Teks", "weight": angka_bobot_0_hingga_100}. Berikan bobot skor yang ketat dan selaras dengan Rubrik Klien berikut: "${config.customScoringRubric}".
 3. AGGRESSIVE CONDITIONAL LOGIC (INVESTIGASI FORENSIK): Gunakan properti "showIf": {"fieldId": "id_pemicu", "equals": "opsi_pemicu"} untuk membuat form yang reaktif dan cerdas:
    - Skenario Pembuktian: Jika peserta merespon positif/klaim besar di pertanyaan 'radio'/'select' (misal: "Sudah memiliki sertifikasi"), WAJIB pancing pertanyaan baru bertipe "file" untuk menagih bukti dokumennya menggunakan showIf.
    - Skenario Justifikasi: Jika peserta memilih opsi berisiko tinggi atau menjawab "Belum ada", pancing pertanyaan baru bertipe "textarea" menggunakan showIf untuk meminta alasan/justifikasi mereka.
    - ATURAN MUTLAK KONDISIONAL: Nilai properti "equals" WAJIB diisi dan SAMA PERSIS dengan string "label" pada opsi jawaban yang memicunya.
 4. SKALA ENTERPRISE: Rangkai pertanyaan berbobot dan tajam secara leluasa khusus untuk seksi ini. Tidak perlu menahan diri, gali informasi target sedalam-dalamnya.
  `.trim();
};