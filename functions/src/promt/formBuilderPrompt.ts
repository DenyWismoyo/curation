// functions/src/promt/formBuilderPrompt.ts

export interface FormBuilderPromptParams {
  trackName: string;
  config: any; 
  archetypeInstruction: string;
}

export const buildMegaAgentPrompt = (params: FormBuilderPromptParams): string => {
  const { trackName, config, archetypeInstruction } = params;
  
  const metrics = config.expectedMetrics?.join(', ') || 'Metrik standar kelayakan bisnis';
  const analysisBlocks = config.expectedAnalysisBlocks?.join(' | ') || '';
  const risks = config.riskFramework || 'Deteksi potensi kegagalan operasional';
  const sources = config.researchSourcesCited?.join(', ') || 'Standar industri global terbaik';

  // AMBIL PURPOSE AGAR AI TAHU CONTEXT PEMBUATAN FORM
  const purpose = config.formPurpose || 'assessment';
  const purposeContext = 
     purpose === 'counseling' ? "KUESIONER PSIKOLOGI / HR / KONSELING (Fokus pada empati, perilaku, dan mental)" :
     purpose === 'monitoring' ? "FORMULIR MONITORING / MONEV PROYEK (Fokus pada metrik progres, angka target, dan hambatan logistik)" :
     purpose === 'consultation' ? "FORMULIR KONSULTASI PAKAR (Fokus pada identifikasi akar masalah dan pengumpulan fakta spesifik)" : 
     "KUESIONER AUDIT BISNIS & STANDAR MUTU (Due Diligence)";
     
  // PERBAIKAN: Deteksi Audiens yang Lebih Kaya & Dinamis
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

  return `
 Anda adalah entitas super gabungan dari [Profesor Riset Standar Global] dan [Chief Information Architect]. Tugas Anda merancang instrumen asesmen tingkat Enterprise untuk program: "${trackName}".

 DOMAIN & FOKUS SISTEM INI ADALAH:
 ${purposeContext}
 ${targetAudience}

 Tujuan Asesmen Utama: "${config.assessmentGoal || 'Evaluasi mendalam pemetaan kualitas.'}"
 Target Metrik Radar yang Harus Diukur: [${metrics}]
 Fokus Blok Analisis: [${analysisBlocks}]
 Fokus Deteksi Risiko (Red Flags): [${risks}]
 Standar Referensi Kredibel yang Wajib Diadopsi: [${sources}]

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
 1. Langkah 1 WAJIB memiliki 2 field pertama dengan urutan ID: "namaUsaha", "namaPengisi".
 2. SINERGI TIPE INPUT (WAJIB DITERAPKAN): Anda memiliki senjata input ("text", "textarea", "number", "date", "select", "radio", "checkbox", "file"). Anda WAJIB menggabungkan mereka secara cerdas!
    - Gunakan "checkbox" untuk menanyakan kelengkapan (contoh: "Pilih instrumen legalitas yang sudah Anda miliki").
    - Gunakan "number" khusus untuk data kuantitatif presisi (contoh: Omzet, Jumlah Pengguna, Kapasitas Produksi).
    - Gunakan "radio" atau "select" untuk pilihan tunggal tingkat kematangan (maturity level).
 3. SECRET SCORING MATRIX: Untuk tipe 'radio', 'checkbox', atau 'select', array "options" WAJIB berupa objek: {"label": "Teks", "weight": angka_bobot_0_hingga_100}. Berikan bobot skor yang ketat dan selaras dengan Rubrik Klien berikut: "${config.customScoringRubric}".
 4. AGGRESSIVE CONDITIONAL LOGIC (INVESTIGASI FORENSIK): Gunakan properti "showIf": {"fieldId": "id_pemicu", "equals": "opsi_pemicu"} untuk membuat form yang reaktif dan cerdas:
    - Skenario Pembuktian: Jika peserta merespon positif/klaim besar di pertanyaan 'radio'/'select' (misal: "Sudah memiliki sertifikasi"), WAJIB pancing pertanyaan baru bertipe "file" untuk menagih bukti dokumennya menggunakan showIf.
    - Skenario Justifikasi: Jika peserta memilih opsi berisiko tinggi atau menjawab "Belum ada", pancing pertanyaan baru bertipe "textarea" menggunakan showIf untuk meminta alasan/justifikasi mereka.
    - ATURAN MUTLAK KONDISIONAL: Nilai properti "equals" WAJIB diisi dan SAMA PERSIS dengan string "label" pada opsi jawaban yang memicunya.
 5. SKALA ENTERPRISE: Rangkai 10 hingga 15 pertanyaan berbobot dan tajam secara leluasa khusus untuk seksi ini. Tidak perlu menahan diri, gali informasi target sedalam-dalamnya.

 ==================================================
 FORMAT KELUARAN (MUTLAK)
 ==================================================
 Keluarkan HANYA format JSON murni TANPA markdown block, TANPA teks pengantar apapun. Tiru persis struktur JSON berikut (termasuk cara penerapan showIf dan file):

 {
   "researchNotes": "Tuliskan ringkasan riset dalam satu paragraf lurus menggunakan Bahasa Indonesia tanpa enter.",
   "steps": [
     {
       "stepNumber": 1,
       "title": "Identitas Dasar",
       "description": "Lengkapi data dasar penanggung jawab",
       "fields": [
         {
           "id": "namaUsaha", "label": "${namaLabel}", "type": "text", "required": true, "gridSpan": 2
         },
         {
           "id": "namaPengisi", "label": "Nama Pengisi Form", "type": "text", "required": true, "gridSpan": 2
         },
         {
           "id": "statusSertifikasi",
           "label": "Status Sertifikasi",
           "type": "radio",
           "required": true,
           "gridSpan": 2,
           "options": [
             {"label": "Belum Memiliki", "weight": 0},
             {"label": "Sudah Memiliki", "weight": 100}
           ]
         },
         {
           "id": "buktiSertifikasi",
           "label": "Unggah Dokumen Sertifikasi Anda",
           "type": "file",
           "required": true,
           "gridSpan": 2,
           "fileAccept": ".pdf",
           "showIf": { "fieldId": "statusSertifikasi", "equals": "Sudah Memiliki" }
         }
       ]
     }
   ]
 }
  `.trim();
};