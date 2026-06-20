// src/data/templateform.ts

export interface FormArchetype {
  id: string;
  name: string;
  description: string;
  suitableFor: string;
  aiInstruction: string;
}

export const FORM_ARCHETYPES: FormArchetype[] = [
  // ==========================================
  // KELOMPOK 1: ASESMEN & EVALUASI UMUM
  // ==========================================
  {
    id: 'hybrid-assessment',
    name: 'Asesmen Hybrid (Kombinasi Umum)',
    description: 'Kombinasi seimbang antara input angka, isian teks, dan beberapa upload file krusial.',
    suitableFor: 'Profil perusahaan, pendaftaran program umum, dan survei kelayakan standar.',
    aiInstruction: 'Gunakan kombinasi input yang seimbang. Gunakan "select" atau "radio" untuk klasifikasi. Gunakan "number" untuk metrik angka. Gunakan "file" HANYA untuk dokumen bukti yang mutlak diperlukan.'
  },
  {
    id: 'strict-audit',
    name: 'Audit Ketat (Validasi Bukti Fisik)',
    description: 'Setiap klaim data/angka wajib disertai dengan upload dokumen atau bukti fisik valid.',
    suitableFor: 'Audit ISO, verifikasi legalitas, akreditasi lembaga, dan pengajuan kredit/hibah.',
    aiInstruction: 'Ini adalah formulir AUDIT KETAT. Terapkan validasi silang secara agresif. Setiap kali meminta klaim angka (number) atau pencapaian besar, WAJIB diikuti dengan input tipe "file" (seperti Laporan/Foto/Sertifikat).'
  },
  {
    id: 'quick-survey',
    name: 'Survei Cepat (Tanpa Upload File)',
    description: 'Formulir ringan berbasis pilihan ganda dan skala untuk pengisian super cepat.',
    suitableFor: 'Survei Kepuasan Masyarakat (SKM), polling cepat, dan formulir feedback event.',
    aiInstruction: 'Ini adalah SURVEI CEPAT. DILARANG KERAS menggunakan tipe input "file" atau "textarea" yang panjang. Maksimalkan "radio", "checkbox", dan "select" agar bisa diisi dengan cepat dari HP.'
  },
  {
    id: 'psychometric-scale',
    name: 'Skala Psikometrik / Kematangan',
    description: 'Pengukuran level kematangan dengan opsi jawaban deskriptif yang bertingkat.',
    suitableFor: 'Self-assessment budaya kerja, tes kepribadian tim, dan audit psikologi/SDM.',
    aiInstruction: 'Ini adalah instrumen PENGUKURAN KEMATANGAN. Setiap pertanyaan WAJIB menggunakan tipe "radio" atau "select" berbobot dengan opsi jawaban deskriptif yang mendetail (dari level sangat buruk hingga sangat baik).'
  },

  // ==========================================
  // KELOMPOK 2: BISNIS, INOVASI & STARTUP
  // ==========================================
  {
    id: 'regional-innovation',
    name: 'Kompetisi & Inovasi Daerah (KRENOVA)',
    description: 'Fokus pada penjabaran ide, nilai kebaruan (novelty), dan dampak sosial/ekonomi.',
    suitableFor: 'Lomba kreativitas inovasi, hackathon, dan seleksi ide bisnis daerah.',
    aiInstruction: 'Ini adalah formulir SELEKSI INOVASI. Berikan ruang "textarea" yang luas untuk peserta menjelaskan Latar Belakang, Kebaruan Ide, dan Dampak. Gunakan input "file" untuk mengunggah proposal atau presentasi (Pitch Deck).'
  },
  {
    id: 'incubator-tenant',
    name: 'Seleksi Tenant Inkubator Bisnis',
    description: 'Menggali masalah, solusi, profil tim (hustler, hacker, hipster), dan traksi awal.',
    suitableFor: 'Penerimaan startup di Technopark, program inkubasi bisnis, dan bootcamp wirausaha.',
    aiInstruction: 'Ini adalah formulir PENERIMAAN INKUBATOR. Tanyakan spesifik mengenai Problem, Solution, Market Size, dan Komposisi Tim Founder. Gunakan logika bercabang (showIf) untuk memisahkan peserta yang masih "Ide" dengan yang sudah punya "Prototipe".'
  },
  {
    id: 'vc-due-diligence',
    name: 'Venture Capital Due Diligence',
    description: 'Fokus pada metrik traksi, unit economics, legalitas, dan skalabilitas ekstrim.',
    suitableFor: 'Seleksi pendanaan startup (Seed/Series A) dan sesi business matchmaking.',
    aiInstruction: 'Ini adalah formulir DUE DILIGENCE INVESTOR. Gunakan pertanyaan tajam berbasis angka (number) untuk mengukur CAC, LTV, Burn Rate, dan Traction. Gunakan logika bercabang (showIf) secara agresif jika angka traksi tinggi, minta bukti file.'
  },
  {
    id: 'franchise-operational',
    name: 'Audit Kesiapan Waralaba (Franchise)',
    description: 'Mengukur standarisasi SOP, QC, dan kesiapan replikasi sistem bisnis.',
    suitableFor: 'Quality control cabang, ekspansi bisnis ritel, dan standarisasi kemitraan.',
    aiInstruction: 'Ini adalah AUDIT KESIAPAN WARALABA. Fokus pada keberadaan SOP tertulis, standarisasi mutu, rantai pasok, dan legalitas HAKI. Gunakan pertanyaan checklist/radio berbobot tentang kedisiplinan operasional.'
  },

  // ==========================================
  // KELOMPOK 3: KORPORASI & PEMERINTAHAN (BARU)
  // ==========================================
  {
    id: 'employee-performance',
    name: 'Evaluasi e-Kinerja & Kapasitas Pegawai',
    description: 'Instrumen untuk mengukur capaian kerja, kedisiplinan, dan laporan aktivitas berkala.',
    suitableFor: 'Laporan e-Kinerja ASN/Pegawai, evaluasi KPI bulanan, dan presensi kegiatan.',
    aiInstruction: 'Ini adalah formulir EVALUASI KINERJA PEGAWAI. Fokuskan pada target kuantitatif (number), laporan realisasi (textarea), dan upload "file" bukti kegiatan lapangan atau dokumen laporan SKP. Buat kolom untuk Rencana Tindak Lanjut.'
  },
  {
    id: 'incident-report',
    name: 'Laporan Insiden & Investigasi (Ticketing)',
    description: 'Instrumen pelaporan yang fokus pada kronologi kejadian, tingkat urgensi, dan bukti visual.',
    suitableFor: 'Ticketing IT/Helpdesk, aduan masyarakat, dan pelaporan kecelakaan kerja (K3).',
    aiInstruction: 'Ini adalah formulir PELAPORAN INSIDEN. Gunakan "textarea" lebar untuk kronologi kejadian. Gunakan "select" untuk tingkat urgensi/prioritas. WAJIB sertakan tipe "file" untuk unggah bukti foto atau log kejadian.'
  },
  {
    id: 'grant-proposal',
    name: 'Pengajuan Dana & Proposal Anggaran',
    description: 'Formulir komprehensif yang menuntut rincian metrik finansial, RAB, dan justifikasi.',
    suitableFor: 'Pengajuan hibah penelitian, permintaan dana CSR, dan proposal sponsorship.',
    aiInstruction: 'Ini adalah formulir PENGAJUAN DANA. Dominasi pertanyaan dengan tipe "number" untuk metrik keuangan (RAB, target profit). Minta penjabaran naratif ("textarea") untuk justifikasi. Wajibkan upload ("file") proposal lengkap.'
  },
  {
    id: 'regulatory-compliance',
    name: 'Registrasi & Kepatuhan Regulasi (Perizinan)',
    description: 'Borang kaku berbasis daftar periksa perizinan, sertifikasi, dan surat-menyurat resmi.',
    suitableFor: 'Pendaftaran Hak Cipta/Merek (HAKI), Izin Edar BPOM/Halal, dan NIB Berbasis Risiko.',
    aiInstruction: 'Ini adalah formulir KEPATUHAN LEGAL. Hindari pertanyaan terbuka. Gunakan "radio" (Ya/Tidak) secara ketat untuk setiap syarat dokumen. JIKA "Ya", MAKA paksa peserta mengunggah ("file") dokumen legalitas yang diminta menggunakan showIf.'
  },
  
  // ==========================================
  // KELOMPOK 4: SPESIFIK & TEKNIS TINGGI (BARU)
  // ==========================================
  {
    id: 'esg-compliance',
    name: 'ESG & Sustainability Compliance',
    description: 'Audit kepatuhan Lingkungan (E), Sosial (S), dan Tata Kelola (G).',
    suitableFor: 'Audit pabrik, pelaporan keberlanjutan korporat, dan sertifikasi industri hijau.',
    aiInstruction: 'Ini adalah instrumen AUDIT ESG. Fokuskan pertanyaan pada rasio emisi, pengelolaan limbah, kesejahteraan karyawan, dan transparansi tata kelola. Setiap klaim kepatuhan WAJIB menyertakan unggahan dokumen (file).'
  },
  {
    id: 'tech-readiness-level',
    name: 'Technology Readiness Level (TRL)',
    description: 'Evaluasi tingkat kematangan teknologi (Skala 1-9 standar riset nasional).',
    suitableFor: 'Hilirisasi riset kampus, seleksi grant penelitian, dan komersialisasi paten.',
    aiInstruction: 'Ini adalah asesmen TRL. Semua pertanyaan WAJIB menggunakan format "radio" berbobot yang secara kronologis mendeskripsikan transisi dari konsep teoritis (TRL 1) hingga teknologi yang sudah teruji nyata di pasar (TRL 9).'
  },
  {
    id: 'portfolio-review',
    name: 'Kurasi Portofolio & Karya Kreatif',
    description: 'Asesmen visual yang berpusat pada unggahan karya, tautan (URL), dan deskripsi konsep.',
    suitableFor: 'Kurasi pameran seni, seleksi vendor kreatif/desainer, dan audisi bakat.',
    aiInstruction: 'Ini adalah formulir PENILAIAN PORTOFOLIO. Minimalkan input angka. Perbanyak tipe input teks pendek untuk URL portofolio, "textarea" untuk deskripsi konsep/filosofi karya, dan berikan banyak ruang untuk upload "file" visual/audio.'
  },
  {
    id: 'situational-judgment-test',
    name: 'Studi Kasus & Keputusan (Situational Judgment)',
    description: 'Kumpulan skenario krisis dengan opsi pilihan ganda berbobot untuk menguji insting dan pengambilan keputusan.',
    suitableFor: 'Pemetaan DNA Founder, rekrutmen manajerial, dan simulasi penanganan krisis.',
    aiInstruction: 'Ini adalah formulir Situational Judgment Test (SJT). Buatkan skenario studi kasus yang deskriptif pada setiap pertanyaan. Gunakan input "radio" di mana setiap pilihan jawaban mewakili profil psikologis atau tingkat toleransi risiko yang berbeda (bukan sekadar benar/salah).'
  },
  {
    id: 'founder-psychometrics',
    name: 'Psikometri & Toleransi Risiko',
    description: 'Kuesioner skala Likert untuk membedah motif, ketahanan mental, dan ambisi pertumbuhan (Lifestyle vs Hyper-growth).',
    suitableFor: 'Evaluasi kepemimpinan, audisi inkubator startup, dan asesmen psikologis.',
    aiInstruction: 'Gunakan input tipe "radio" dengan Skala Likert 1-5 atau 1-7. Hindari pertanyaan teknis; fokus pada reaksi emosional, manajemen stres, dan ambisi visi. AI harus memetakan pola inkonsistensi dari jawaban.'
  },
  {
    id: 'conflict-resolution-audit',
    name: 'Audit Resolusi Konflik Internal',
    description: 'Pemetaan cara tim atau individu menangani perselisihan, pembagian ekuitas, dan dinamika kekuasaan.',
    suitableFor: 'Evaluasi Co-Founder dispute, mediasi HRD, dan kesehatan organisasi.',
    aiInstruction: 'Gunakan kombinasi skenario "radio" dan isian "textarea" pendek. Fokuskan pertanyaan pada skenario pembagian saham (vesting), hak suara (voting rights), dan skenario founder yang tidak berkinerja.'
  },
  {
    id: 'startup-dna-mapping',
    name: 'Pemetaan DNA Ekosistem Startup',
    description: 'Audit komprehensif untuk memisahkan "Fake Tech Startup" dari startup bervaluasi eksponensial berbasis IP.',
    suitableFor: 'Due diligence Venture Capital, seleksi akselerator, dan audit model bisnis.',
    aiInstruction: 'Susun pertanyaan untuk mendeteksi Burn Rate, unit economics, dan kepemilikan Proprietary Tech. Terapkan validasi silang antara klaim valuasi dengan kondisi keuangan nyata. Wajibkan upload "file" untuk Pitch Deck dan Laporan Keuangan.'
  },
  {
    id: 'market-validation-survey',
    name: 'Validasi Pasar & Product-Market Fit',
    description: 'Survei penemuan pelanggan (Customer Discovery) untuk membuktikan traksi dan kebutuhan riil pasar.',
    suitableFor: 'Fase inkubasi ide, peluncuran fitur baru, dan riset kompetitor.',
    aiInstruction: 'Buat alur pertanyaan yang memvalidasi masalah (Pain Points) terlebih dahulu sebelum menanyakan solusi. Gunakan logika bercabang (showIf) untuk memisahkan responden yang pernah mencoba kompetitor.'
  },
  {
    id: 'mental-health-pulse',
    name: 'Survei Kesehatan Mental & Burnout (Pulse)',
    description: 'Pemetaan tingkat stres, beban kerja, dan keseimbangan hidup karyawan.',
    suitableFor: 'Program Employee Assistance (EAP), mitigasi turnover tinggi, dan audit kesejahteraan.',
    aiInstruction: 'Gunakan nada (tone) yang sangat empatik dan tidak menghakimi. Pertanyaan bersifat opsional. Gunakan rentang "radio" yang mendeskripsikan frekuensi perasaan (misal: "Sering merasa lelah", "Tidak pernah").'
  },
  {
    id: 'grant-proposal-application',
    name: 'Formulir Pengajuan Hibah & Pendanaan Bantuan',
    description: 'Evaluasi dampak program, rincian Rencana Anggaran Biaya (RAB), dan indikator keberhasilan.',
    suitableFor: 'Penyaluran dana CSR, kompetisi inovasi lembaga donor, dan NGO.',
    aiInstruction: 'Minta penjabaran "Logframe" (Logical Framework). Gunakan "textarea" terpisah untuk Latar Belakang, Tujuan, Metodologi, dan RAB ringkas. Wajibkan unggah "file" Proposal Lengkap PDF.'
  },
  {
    id: 'franchise-readiness',
    name: 'Kesiapan Ekspansi Waralaba (Franchise)',
    description: 'Mengukur standardisasi SOP, supply chain, dan profitabilitas unit tunggal sebelum dikloning.',
    suitableFor: 'Skalasi bisnis F&B, audit master franchise, dan pendaftaran HAKI.',
    aiInstruction: 'Fokus mendeteksi "founder-centricity". Gunakan pertanyaan untuk memastikan bahwa operasional tidak runtuh jika founder tidak ada di lokasi. Wajibkan upload (file) sampel SOP dan legalitas merk.'
  },
  {
    id: 'retail-store-audit',
    name: 'Audit Standar Operasional Toko (Mystery Shopper)',
    description: 'Evaluasi kebersihan, visual merchandising, dan kepatuhan kasir terhadap protokol.',
    suitableFor: 'Manajemen jaringan ritel, audit minimarket, dan evaluasi kualitas layanan (SLA).',
    aiInstruction: 'Desain untuk penggunaan mobile oleh auditor lapangan. Minta input skor kuantitatif (0-10) untuk berbagai titik periksa fisik, didukung dengan upload (file) foto temuan anomali.'
  },
  {
    id: 'supply-chain-resilience',
    name: 'Resiliensi Rantai Pasok & Vendor',
    description: 'Pemeriksaan redundansi pemasok, pengelolaan inventaris, dan mitigasi gagal pasok (stockout).',
    suitableFor: 'Bisnis manufaktur, distributor logistik, dan e-commerce gudang.',
    aiInstruction: 'Tanyakan mengenai Lead Time (number), ketergantungan pada pemasok tunggal (radio), dan frekuensi kehabisan barang. Instruksikan AI untuk mencari titik lemah (bottleneck) pasokan.'
  },
  {
    id: 'fnb-cost-control',
    name: 'Audit Cost Control & Food Waste F&B',
    description: 'Perhitungan harga pokok penjualan (COGS), penyusutan bahan, dan rasio sampah dapur.',
    suitableFor: 'Manajemen restoran, cloud kitchen, dan bisnis kuliner.',
    aiInstruction: 'Wajibkan pengisian angka persentase (number) untuk COGS dan Waste. Tanyakan metode pencatatan resep (standardized recipe). AI bertugas mendeteksi kebocoran margin finansial.'
  },
  {
    id: 'academic-research',
    name: 'Survei Riset Akademik & Pasar',
    description: 'Kuesioner dengan segmentasi demografi berlapis dan penyaringan responden (screening).',
    suitableFor: 'Penelitian skripsi/tesis, riset pasar (Product-Market Fit), dan jajak pendapat.',
    aiInstruction: 'Ini adalah SURVEI RISET. Buat logika bercabang (showIf) yang sangat rapi di awal untuk memisahkan profil responden (umur, profesi, dll). Gunakan tipe "radio" dengan skala persetujuan Likert (1-5) untuk menguji hipotesis penelitian.'
  }
];