// src/data/aiPromptTemplates.ts
import { AiPromptConfig } from '@/types/curation';

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  config: AiPromptConfig;
}

export const AIPromptPresets: PromptPreset[] = [
  // ==========================================
  // KELOMPOK 1: BISNIS, STARTUP & KOMERSIAL
  // ==========================================
  {
    id: 'preset-umkm-retail',
    name: '1. UMKM & Produk Fisik (Retail & F&B)',
    description: 'Fokus pada evaluasi rantai pasok, margin keuntungan, dan strategi pemasaran produk.',
    config: {
      aiPersona: 'Konsultan Bisnis UMKM & Spesialis Rantai Pasok',
      assessmentGoal: 'Mengevaluasi kelayakan operasional, kesehatan finansial, dan potensi skalabilitas bisnis UMKM produk fisik.',
      gradingStrictness: 'supportive',
      reportTone: 'consultative',
      mediaAnalysisFocus: 'ui-ux-design',
      customReadinessTiers: [
        'Usaha Rintisan (Mikro)',
        'Berkembang (Kecil)',
        'Siap Skalasi (Menengah)',
        'Corporate Ready'
      ],
      expectedAnalysisBlocks: [
        'Kualitas Produk & Keunggulan Komparatif',
        'Kesehatan Finansial & Operasional',
        'Strategi Pemasaran & Saluran Distribusi',
        'Legalitas & Kesiapan Skalasi'
      ],
      expectedMetrics: [
        'Daya Saing Produk: Keunikan, USP, dan kesesuaian dengan target pasar.',
        'Kesiapan Produksi: Kapasitas produksi dan keamanan rantai pasok.',
        'Kesehatan Keuangan: Omset, manajemen margin, pencatatan finansial.',
        'Penetrasi Pasar: Efektivitas kanal penjualan dan promosi.',
        'Kepatuhan: Kepemilikan izin edar (BPOM/Halal/PIRT) dan legalitas.'
      ],
      expectedRecommendations: [
        'Strategi Optimasi Produk & Kemasan',
        'Peta Jalan Ekspansi Penjualan (Omnichannel)',
        'Pembenahan Manajemen Operasional & Pasokan',
        'Prioritas Pemenuhan Legalitas'
      ],
      riskFramework: 'Fokus pada risiko fluktuasi harga bahan baku, perizinan edar yang belum tuntas, dan manajemen arus kas.'
    }
  },
  {
    id: 'preset-startup-pitch',
    name: '2. Kompetisi / Pitching Startup Tech',
    description: 'Sangat ketat. Gaya Venture Capital. Fokus pada Product-Market Fit, skalabilitas, dan traksi.',
    config: {
      aiPersona: 'Venture Capitalist Senior & Juri Kompetisi Pitching',
      assessmentGoal: 'Melakukan due diligence awal untuk menilai Product-Market Fit, traksi, skalabilitas teknologi, dan kelayakan pendanaan (investability).',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      mediaAnalysisFocus: 'pitch-delivery',
      customReadinessTiers: [
        'Idea / Problem-Solution Fit',
        'MVP / Pre-Seed Readiness',
        'Early Traction / Seed Stage',
        'Growth / Series A Ready'
      ],
      expectedAnalysisBlocks: [
        'Problem-Solution Fit & Validasi Pasar',
        'Kekuatan Traksi & Unit Economics',
        'Unfair Advantage & Posisi Kompetitif',
        'Kapabilitas Tim & Eksekusi'
      ],
      expectedMetrics: [
        'Market Size (TAM/SAM/SOM): Skala peluang pasar.',
        'Inovasi Teknologi: Kedalaman teknologi dan skalabilitas.',
        'Traksi & Monetisasi: Metrik pengguna, MRR, dan validasi.',
        'Kapabilitas Founder: Kombinasi keahlian tim.',
        'Moat / Defensibility: Benteng pertahanan dari kompetitor.'
      ],
      expectedRecommendations: [
        'Taktik Go-to-Market (GTM)',
        'Strategi Penggalangan Dana (Fundraising)',
        'Perbaikan Metrik Utama (North Star Metric)'
      ],
      riskFramework: 'Fokus tinggi pada burn rate/runway keuangan, ancaman kompetitor raksasa, dan risiko internal tim founder.'
    }
  },
  {
    id: 'preset-kesiapan-ekspor',
    name: '3. Asesmen Kesiapan Ekspor (Export Readiness)',
    description: 'Fokus pada standardisasi mutu internasional, kapasitas volume, dan legalitas lintas negara.',
    config: {
      aiPersona: 'Konsultan Perdagangan Internasional & Ahli Ekspor',
      assessmentGoal: 'Menilai kesiapan produk, legalitas, dan kapasitas rantai pasok untuk menembus dan bertahan di pasar global.',
      gradingStrictness: 'standard',
      reportTone: 'academic',
      customReadinessTiers: [
        'Fokus Pasar Lokal',
        'Persiapan Ekspor Dasar',
        'Ekspor Insidental (Terkualifikasi)',
        'Eksportir Berkelanjutan (Global)'
      ],
      expectedAnalysisBlocks: [
        'Standar Kualitas & Sertifikasi Internasional',
        'Kapasitas Produksi & Logistik Ekspor',
        'Pemahaman Pasar Tujuan & Harga Global',
        'Kepatuhan Dokumen Bea Cukai & Legal'
      ],
      expectedMetrics: [
        'Sertifikasi Mutu: ISO, HACCP, atau standar negara tujuan.',
        'Kapasitas Volume: Kesanggupan memenuhi Minimum Order Quantity (MOQ).',
        'Pricing Strategy: Daya saing harga FOB/CIF di pasar luar negeri.',
        'Kelengkapan Dokumen: Kesiapan NIB Ekspor, COO, dll.'
      ],
      expectedRecommendations: [
        'Peta Jalan Pemenuhan Standar Internasional',
        'Strategi Kemitraan Buyer Luar Negeri',
        'Pembenahan Logistik & Packaging Ekspor'
      ],
      riskFramework: 'Fokus pada risiko penolakan bea cukai negara tujuan, kerusakan barang saat pengiriman (shipping hazard), dan fluktuasi kurs mata uang.'
    }
  },
  {
    id: 'preset-franchise-waralaba',
    name: '4. Kelayakan Franchise / Waralaba',
    description: 'Fokus pada standarisasi SOP, profitabilitas, kekuatan merek, dan dukungan ke mitra.',
    config: {
      aiPersona: 'Konsultan Waralaba Senior & Auditor Standarisasi Bisnis',
      assessmentGoal: 'Mengevaluasi kelayakan model bisnis untuk direplikasi dan difranchise-kan secara massal.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Belum Layak Franchise',
        'Tahap Standardisasi SOP',
        'Franchise Lokal (Siap Jual)',
        'Franchise Skala Nasional'
      ],
      expectedAnalysisBlocks: [
        'Standardisasi Operasional & SOP',
        'Kekuatan Brand & HAKI',
        'Proyeksi ROI & Payback Period Mitra',
        'Sistem Dukungan Pusat (Supply & Training)'
      ],
      expectedMetrics: [
        'Duplikabilitas: Seberapa mudah bisnis ditiru oleh mitra.',
        'Perlindungan Merek: Status sertifikat Merek/HAKI dari DJKI.',
        'Unit Economics: Waktu balik modal (BEP) yang realistis untuk mitra.',
        'Central Supply: Keandalan pasokan bahan baku dari pusat.'
      ],
      expectedRecommendations: [
        'Penyempurnaan Buku SOP Operasional',
        'Penyesuaian Paket Kemitraan (Pricing)',
        'Strategi Penawaran & Rekrutmen Mitra'
      ],
      riskFramework: 'Fokus pada risiko sengketa merek, kegagalan mitra (franchisee) karena SOP yang rumit, dan kebocoran resep rahasia.'
    }
  },

  // ==========================================
  // KELOMPOK 2: PENILAIAN B2B, LEMBAGA & KORPORASI
  // ==========================================
  {
    id: 'preset-kurasi-vendor',
    name: '5. Kurasi Vendor / Kemitraan Industri (B2B)',
    description: 'Fokus pada kepatuhan legal, kapasitas SLA, standar mutu, dan manajemen mutu ISO.',
    config: {
      aiPersona: 'Auditor Procurement Corporate & Manajer Rantai Pasok',
      assessmentGoal: 'Melakukan audit kepatuhan, keandalan operasional, dan kapasitas produksi untuk memastikan entitas layak menjadi mitra/vendor B2B korporasi.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Tingkat Risiko Tinggi (Ditolak)',
        'Lulus Bersyarat (Probation)',
        'Vendor Terkualifikasi (Qualified)',
        'Mitra Strategis (Strategic Partner)'
      ],
      expectedAnalysisBlocks: [
        'Legalitas & Kepatuhan Korporasi',
        'Kapasitas Produksi & Penjaminan Mutu (QA/QC)',
        'Kesehatan Finansial & Kapasitas Modal',
        'Track Record & Referensi Klien'
      ],
      expectedMetrics: [
        'Kepatuhan Legal & Pajak: Kelengkapan perizinan perusahaan.',
        'Sertifikasi & Manajemen Mutu: Kepemilikan ISO, SNI, atau standar setara.',
        'Kapasitas & SLA: Kemampuan memenuhi Service Level Agreement.',
        'Stabilitas Keuangan: Likuiditas pembiayaan (Term of Payment).'
      ],
      expectedRecommendations: [
        'Tindakan Korektif Kepatuhan (Corrective Actions)',
        'Peningkatan Kapasitas & Standar Mutu',
        'Rekomendasi Plafon Kemitraan B2B'
      ],
      riskFramework: 'Fokus mendeteksi risiko cacat hukum/pajak, ketidakmampuan cashflow menghadapi sistem pembayaran tempo (TOP), dan risiko gagal kirim.'
    }
  },
  {
    id: 'preset-audit-koperasi',
    name: '6. Evaluasi Kelembagaan Multi-Koperasi',
    description: 'Fokus pada kesehatan NPL, tata kelola pengurus, partisipasi anggota, dan digitalisasi.',
    config: {
      aiPersona: 'Auditor Keuangan Koperasi & Ahli Pemberdayaan Ekonomi',
      assessmentGoal: 'Menganalisis kesehatan finansial, tata kelola (Good Corporate Governance), dan partisipasi anggota dari entitas koperasi.',
      gradingStrictness: 'standard',
      reportTone: 'academic',
      customReadinessTiers: [
        'Koperasi Kurang Sehat',
        'Dalam Pengawasan / Transisi',
        'Koperasi Sehat & Berjalan',
        'Koperasi Skala Mandiri (Sangat Sehat)'
      ],
      expectedAnalysisBlocks: [
        'Kesehatan Finansial & Likuiditas (NPL)',
        'Tata Kelola & Transparansi Pengurus',
        'Tingkat Partisipasi & Kesejahteraan Anggota',
        'Adaptasi Digital & Model Bisnis Baru'
      ],
      expectedMetrics: [
        'Rasio NPL (Non-Performing Loan): Tingkat kredit macet anggota.',
        'Likuiditas: Ketersediaan dana tunai untuk penarikan anggota.',
        'RAT & Transparansi: Kedisiplinan penyelenggaraan Rapat Anggota Tahunan.',
        'Digitalisasi: Penggunaan aplikasi/Sistem Informasi Koperasi.'
      ],
      expectedRecommendations: [
        'Langkah Penyehatan Rasio Keuangan',
        'Strategi Rekrutmen & Engagement Anggota',
        'Peta Jalan Integrasi Sistem Digital (Core Banking)'
      ],
      riskFramework: 'Fokus pada risiko *rush money* (penarikan dana massal), fraud oleh pengurus (fraudulent practices), dan kredit macet beruntun.'
    }
  },
  {
    id: 'preset-bank-sampah',
    name: '7. Audit Unit Pengelola Bank Sampah',
    description: 'Fokus pada efisiensi tonase sirkular, partisipasi warga, dan nilai ekonomi limbah.',
    config: {
      aiPersona: 'Pakar Ekonomi Sirkular & Fasilitator Lingkungan Hidup',
      assessmentGoal: 'Mengevaluasi efisiensi operasional pengolahan limbah (terutama anorganik/plastik), partisipasi masyarakat, dan viabilitas ekonomi unit bank sampah.',
      gradingStrictness: 'supportive',
      reportTone: 'consultative',
      customReadinessTiers: [
        'Unit Pemula (Skala RT/RW)',
        'Aktif Berkembang (Skala Kelurahan)',
        'Unit Mandiri (Terintegrasi Pengepul)',
        'Skala Industri (Pusat Daur Ulang)'
      ],
      expectedAnalysisBlocks: [
        'Efisiensi Pengumpulan & Tonase',
        'Partisipasi & Edukasi Warga/Nasabah',
        'Manajemen Pencatatan & Keuangan Unit',
        'Nilai Tambah & Kemitraan Offtaker (Pengepul)'
      ],
      expectedMetrics: [
        'Volume Reduksi: Jumlah tonase sampah terkelola per bulan.',
        'Active Rate Nasabah: Persentase warga yang rutin menyetor.',
        'Akuntabilitas Tabungan: Transparansi saldo warga.',
        'Nilai Ekonomi (Sirkular): Profitabilitas penjualan ke industri daur ulang.'
      ],
      expectedRecommendations: [
        'Strategi Peningkatan Tonase & Nasabah Baru',
        'Optimalisasi Tata Letak Gudang Sortir',
        'Pengembangan Produk Turunan (Upcycling)'
      ],
      riskFramework: 'Risiko pembukuan tabungan nasabah yang defisit, penumpukan stok yang tidak laku dijual (dead stock), dan komplain kebersihan lingkungan sekitar.'
    }
  },
  {
    id: 'preset-properti-fasilitas',
    name: '8. Audit Manajemen Gedung (Facility Management)',
    description: 'Fokus pada kelayakan operasional gedung (MEP), keamanan, efisiensi energi, dan tenant.',
    config: {
      aiPersona: 'Building Manager Senior & Auditor Fasilitas',
      assessmentGoal: 'Melakukan audit kelayakan operasional gedung, pemeliharaan sistem Mekanikal Elektrikal Plumbing (MEP), serta pengelolaan hubungan dengan penyewa (tenant).',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Kurang Terawat (Risiko Operasional)',
        'Standar Minimum Terpenuhi',
        'Gedung Terkelola Baik',
        'Grade-A Premium Facility'
      ],
      expectedAnalysisBlocks: [
        'Pemeliharaan MEP & Utilitas Gedung',
        'Housekeeping, K3 & Keamanan (Security)',
        'Tingkat Okupansi & Kepuasan Tenant',
        'Efisiensi Energi & Green Building'
      ],
      expectedMetrics: [
        'Response Time Keluhan: Kecepatan menangani masalah tenant.',
        'Jadwal PM (Preventive Maintenance): Kedisiplinan servis lift/AC/Genset.',
        'Konsumsi Energi: Indeks Konsumsi Energi (IKE) gedung per m2.',
        'Safety & Fire System: Kesiapan sistem hidran, APAR, dan jalur evakuasi.'
      ],
      expectedRecommendations: [
        'Jadwal Overhaul Sistem Utama',
        'Strategi Retensi Tenant & Peningkatan Okupansi',
        'Efisiensi Penggunaan Energi & Air'
      ],
      riskFramework: 'Risiko kerusakan fatal pada fasilitas utama (lift mati, genset gagal), bahaya kebakaran akibat korsleting, dan eksodus tenant akibat ketidaknyamanan.'
    }
  },

  // ==========================================
  // KELOMPOK 3: PENDIDIKAN, SDM, RISET & INOVASI
  // ==========================================
  {
    id: 'preset-hilirisasi-riset',
    name: '9. Hilirisasi Riset & Inovasi (Technopark / Kampus)',
    description: 'Fokus pada TRL (Kesiapterapan Teknologi), HAKI, dan potensi adopsi industri.',
    config: {
      aiPersona: 'Pakar Komersialisasi Teknologi & Reviewer Inovasi',
      assessmentGoal: 'Menganalisis tingkat kesiapterapan teknologi (TRL), kebaruan inovasi, validasi paten, serta potensi hilirisasi riset ke industri manufaktur/komersial.',
      gradingStrictness: 'standard',
      reportTone: 'academic',
      mediaAnalysisFocus: 'product-demo',
      customReadinessTiers: [
        'TRL 1-3 (Riset Dasar Lab)',
        'TRL 4-6 (Prototipe Teruji Terbatas)',
        'TRL 7-8 (Prototipe Lingkungan Nyata)',
        'TRL 9 (Komersialisasi Siap Adopsi)'
      ],
      expectedAnalysisBlocks: [
        'Kebaruan (Novelty) & Validasi Saintifik',
        'Status Kekayaan Intelektual (Paten/HAKI)',
        'Kesiapan Skalasi Pabrikasi (MRL)',
        'Potensi Serapan Industri (Offtaker/Komersial)'
      ],
      expectedMetrics: [
        'Tingkat Inovasi & Novelty: Posisi dibanding *state-of-the-art*.',
        'Kematangan Teknologi (TRL): Bukti pengujian riil.',
        'Kekayaan Intelektual: Status perlindungan hukum.',
        'Kelayakan Komersial: Valuasi dan potensi pasar dari inovasi.'
      ],
      expectedRecommendations: [
        'Peta Jalan Kematangan Teknologi & Standarisasi',
        'Strategi Percepatan Dokumen Paten',
        'Model Kemitraan Lisensi / Spin-off Bisnis'
      ],
      riskFramework: 'Fokus pada risiko *Valley of Death* (kegagalan prototipe saat dinaikkan ke skala industri), pelanggaran paten pihak lain, dan ketidakcocokan dengan kebutuhan pasar nyata.'
    }
  },
  {
    id: 'preset-lomba-karya-tulis',
    name: '10. Penilaian Lomba Karya Tulis Ilmiah (KTI)',
    description: 'Fokus pada kebaruan gagasan, ketepatan metodologi, kedalaman analisis, dan tata tulis.',
    config: {
      aiPersona: 'Reviewer Jurnal Akademik Senior & Peneliti Ahli',
      assessmentGoal: 'Menilai kualitas naskah karya tulis ilmiah berdasarkan orisinalitas gagasan, ketepatan metodologi, dan signifikansi hasil penelitian.',
      gradingStrictness: 'strict',
      reportTone: 'academic',
      customReadinessTiers: [
        'Gugur (Tidak Sesuai Standar/Plagiasi)',
        'Lolos Bersyarat (Revisi Mayor)',
        'Layak Dipublikasikan (Revisi Minor)',
        'Karya Terbaik (Nominee Unggulan)'
      ],
      expectedAnalysisBlocks: [
        'Orisinalitas & Signifikansi Topik (Novelty)',
        'Ketepatan Metodologi & Desain Riset',
        'Kedalaman Analisis & Pembahasan',
        'Tata Tulis & Kekayaan Tinjauan Pustaka'
      ],
      expectedMetrics: [
        'Kebaruan (Novelty): Gap penelitian yang diisi oleh naskah.',
        'Validitas Metode: Kesesuaian teknik pengumpulan dan analisis data.',
        'Logika Konklusi: Apakah kesimpulan menjawab rumusan masalah secara logis.',
        'Kaidah Selingkung: Kerapian format dan penggunaan referensi terkini.'
      ],
      expectedRecommendations: [
        'Saran Perbaikan Metodologi Riset',
        'Arahan Pendalaman Analisis Data',
        'Rekomendasi Publikasi Jurnal'
      ],
      riskFramework: 'Mendeteksi indikasi plagiarisme, pemalsuan data riset (fabrication), metodologi yang cacat, dan referensi yang usang.'
    }
  },
  {
    id: 'preset-seleksi-beasiswa',
    name: '11. Seleksi Kandidat / Beasiswa Unggulan',
    description: 'Fokus pada motivasi, prestasi akademik, kepemimpinan, dan visi masa depan.',
    config: {
      aiPersona: 'Komite Seleksi Beasiswa Independen & Akademisi Senior',
      assessmentGoal: 'Menilai profil kandidat secara komprehensif berdasarkan kelayakan akademik, karakter kepemimpinan, dan potensi kontribusi di masa depan.',
      gradingStrictness: 'standard',
      reportTone: 'academic',
      customReadinessTiers: [
        'Tidak Memenuhi Kualifikasi',
        'Kandidat Cadangan (Waitlist)',
        'Lolos Bersyarat',
        'Kandidat Utama (Top Priority)'
      ],
      expectedAnalysisBlocks: [
        'Rekam Jejak Akademik & Intelegensi',
        'Motivasi & Keselarasan Visi',
        'Pengalaman Organisasi & Kepemimpinan',
        'Dampak Sosial & Rencana Kontribusi'
      ],
      expectedMetrics: [
        'Konsistensi Akademik: Nilai dan penghargaan relevan.',
        'Kejernihan Tujuan (Purpose): Seberapa jelas rencana masa depan kandidat.',
        'Problem Solving: Cara kandidat mengatasi tantangan di masa lalu.',
        'Engagement Sosial: Keterlibatan di masyarakat atau proyek relawan.'
      ],
      expectedRecommendations: [
        'Pengembangan Kompetensi Spesifik (Upskilling)',
        'Saran Pemilihan Program Studi / Mentor',
        'Fokus Proyek Pengabdian'
      ],
      riskFramework: 'Fokus mendeteksi ketidakkonsistenan esai (risiko plagiasi/AI generated), motivasi yang dangkal, dan ketidakmampuan beradaptasi pada tekanan.'
    }
  },
  {
    id: 'preset-rekrutmen-sdm',
    name: '12. Talent Acquisition & Fit Proper Test (HRD)',
    description: 'Fokus pada hard skill, soft skill, kecocokan budaya kerja, dan ekspektasi kandidat.',
    config: {
      aiPersona: 'Senior HR Manager & Psikolog Organisasi',
      assessmentGoal: 'Menyeleksi kandidat karyawan berdasarkan kompetensi teknis, kecerdasan emosional, dan kecocokan dengan budaya perusahaan (culture fit).',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Tidak Direkomendasikan (Not Fit)',
        'Dipertimbangkan (Keep in View)',
        'Direkomendasikan (Qualified)',
        'Sangat Direkomendasikan (Top Talent)'
      ],
      expectedAnalysisBlocks: [
        'Kompetensi Teknis & Pengalaman (Hard Skills)',
        'Kecerdasan Emosional & Soft Skills',
        'Kesesuaian Budaya (Culture Fit)',
        'Motivasi Kerja & Rencana Jangka Panjang'
      ],
      expectedMetrics: [
        'Relevansi Pengalaman: Kesesuaian portofolio dengan posisi yang dilamar.',
        'Problem Solving: Kemampuan analisis kasus dan pengambilan keputusan.',
        'Leadership / Teamwork: Sikap dalam kolaborasi dan memimpin proyek.',
        'Stabilitas: Histori perpindahan kerja (turnover rate).'
      ],
      expectedRecommendations: [
        'Saran Penempatan Peran (Role Assignment)',
        'Area Kebutuhan Pelatihan Tambahan (Training Needs)',
        'Pertimbangan Ekspektasi Gaji vs Kompetensi'
      ],
      riskFramework: 'Risiko kandidat kutu loncat (job hopper), culture clash dengan tim saat ini, serta *overqualified* atau *underqualified*.'
    }
  },
  {
    id: 'preset-edtech-readiness',
    name: '13. Transformasi Digital Sekolah/Kampus (EdTech)',
    description: 'Fokus pada infrastruktur IT, literasi guru, adopsi LMS, dan keamanan data.',
    config: {
      aiPersona: 'Konsultan Teknologi Pendidikan (EdTech) & Arsitek Sistem Digital',
      assessmentGoal: 'Menilai kesiapan infrastruktur IT, kapasitas pendidik, dan efektivitas manajemen sistem digitalisasi di institusi pendidikan.',
      gradingStrictness: 'standard',
      reportTone: 'academic',
      customReadinessTiers: [
        'Tahap Konvensional',
        'Digitalisasi Dasar',
        'Hibrida Terintegrasi',
        'Smart School / Kampus Cerdas'
      ],
      expectedAnalysisBlocks: [
        'Infrastruktur Jaringan & Perangkat Keras',
        'Kapasitas & Literasi Digital Pendidik',
        'Tata Kelola LMS & Kurikulum Digital',
        'Keamanan Data & Kebijakan Privasi'
      ],
      expectedMetrics: [
        'Kesiapan Infrastruktur: Rasio bandwidth dan perangkat per siswa.',
        'Adopsi Platform: Persentase penggunaan LMS (E-Learning) secara aktif.',
        'Literasi Guru: Kemampuan guru merancang materi digital interaktif.',
        'Keamanan Data: Perlindungan sistem informasi akademik dari kebocoran.'
      ],
      expectedRecommendations: [
        'Peta Jalan Upgrade Infrastruktur',
        'Program Upskilling Literasi Pendidik',
        'Penyusunan SOP Keamanan Cyber Sekolah'
      ],
      riskFramework: 'Risiko proyek infrastruktur mangkrak (tidak dipakai), resistensi perubahan dari guru senior, dan kebocoran data nilai/pribadi siswa.'
    }
  },

  // ==========================================
  // KELOMPOK 4: PEMERINTAHAN & PELAYANAN PUBLIK
  // ==========================================
  {
    id: 'preset-skp-kinerja-asn',
    name: '14. Evaluasi Kinerja Pegawai / ASN (SKP)',
    description: 'Fokus pada realisasi target, inovasi layanan, dan kompetensi manajerial.',
    config: {
      aiPersona: 'Asesor SDM Pemerintahan & Auditor Kinerja Organisasi',
      assessmentGoal: 'Mengukur secara objektif capaian Sasaran Kinerja Pegawai (SKP), inisiatif inovasi layanan publik, dan perilaku kepemimpinan.',
      gradingStrictness: 'standard',
      reportTone: 'academic',
      customReadinessTiers: [
        'Kurang (Underperform)',
        'Cukup (Memenuhi Standar Minimal)',
        'Baik (Sesuai Ekspektasi)',
        'Sangat Baik (Outstanding / Role Model)'
      ],
      expectedAnalysisBlocks: [
        'Realisasi Target Utama (Kuantitatif)',
        'Kualitas Output & Efisiensi Waktu (Kualitatif)',
        'Inisiatif Inovasi & Pemecahan Masalah',
        'Perilaku Kerja & Kompetensi Manajerial'
      ],
      expectedMetrics: [
        'Capaian Indikator Kinerja: Persentase penyelesaian tugas sesuai matriks.',
        'Kualitas Kerja: Akurasi dan minimnya revisi pekerjaan.',
        'Problem Solving: Solusi atas hambatan di lapangan.',
        'Teamwork & Pelayanan: Orientasi pelayanan dan Core Values ASN.'
      ],
      expectedRecommendations: [
        'Rekomendasi Area Pelatihan (Diklat/TNA)',
        'Target Perbaikan Kinerja Periode Depan',
        'Usulan Rotasi atau Penugasan Strategis'
      ],
      riskFramework: 'Fokus pada risiko *bottleneck* birokrasi, resistensi terhadap teknologi baru, dan ketidakselarasan target individu dengan instansi.'
    }
  },
  {
    id: 'preset-inovasi-publik',
    name: '15. Lomba Inovasi Pelayanan Publik (Pemerintah Daerah)',
    description: 'Fokus pada efektivitas layanan, replikabilitas, dan nilai tambah bagi masyarakat luas.',
    config: {
      aiPersona: 'Juri Senior Inovasi Pelayanan Publik Kemenpan-RB',
      assessmentGoal: 'Mengevaluasi desain, implementasi, dan dampak dari program inovasi layanan masyarakat yang digagas oleh instansi pemerintah.',
      gradingStrictness: 'strict',
      reportTone: 'academic',
      customReadinessTiers: [
        'Tahap Gagasan (Ideation)',
        'Uji Coba Terbatas (Pilot Project)',
        'Implementasi Berhasil (Terbukti Meringankan)',
        'Inovasi Skala Luas (Siap Direplikasi)'
      ],
      expectedAnalysisBlocks: [
        'Signifikansi Masalah & Kebaruan Inovasi',
        'Efektivitas Solusi & Dampak ke Masyarakat',
        'Keberlanjutan Program (Sustainability)',
        'Potensi Replikasi ke Daerah/Instansi Lain'
      ],
      expectedMetrics: [
        'Dampak Nyata: Penurunan waktu antrean, efisiensi anggaran, dll.',
        'Keterlibatan Eksternal: Kolaborasi dengan swasta atau komunitas.',
        'Dukungan Regulasi: Adanya dasar hukum daerah yang mengikat inovasi.',
        'Efisiensi Sistem: Pemanfaatan teknologi secara tepat guna.'
      ],
      expectedRecommendations: [
        'Penyempurnaan Arsitektur Sistem Layanan',
        'Strategi Sosialisasi ke Masyarakat Luas',
        'Penyusunan Modul Replikasi Inovasi'
      ],
      riskFramework: 'Mendeteksi risiko inovasi yang bergantung pada satu figur (tidak sistemik), anggaran *maintenance* yang membebani, dan serapan pengguna yang rendah.'
    }
  },
  {
    id: 'preset-lomba-desa',
    name: '16. Penilaian Lomba Desa / Kelurahan Inovatif',
    description: 'Fokus pada tata kelola, kemandirian BUMDes, keamanan, dan digitalisasi.',
    config: {
      aiPersona: 'Asesor Kementerian Dalam Negeri & Pakar Pemerintahan Desa',
      assessmentGoal: 'Menilai tata kelola administrasi, inovasi pemberdayaan masyarakat, dan kemandirian ekonomi desa (BUMDes).',
      gradingStrictness: 'supportive',
      reportTone: 'consultative',
      customReadinessTiers: [
        'Desa Tertinggal',
        'Desa Berkembang',
        'Desa Maju',
        'Desa Mandiri (Percontohan)'
      ],
      expectedAnalysisBlocks: [
        'Bidang Pemerintahan & Digitalisasi Layanan',
        'Kewilayahan, Keamanan & Trantibum',
        'Pemberdayaan Masyarakat & Ekonomi (BUMDes)',
        'Kesehatan, Pendidikan & Inovasi Desa'
      ],
      expectedMetrics: [
        'Kemandirian Ekonomi: Pendapatan Asli Desa (PADes) dari BUMDes.',
        'Layanan Publik: Digitalisasi surat menyurat dan keterbukaan informasi.',
        'Kualitas Hidup: Penurunan angka stunting dan partisipasi pendidikan.',
        'Keamanan: Sistem siskamling dan resolusi konflik warga.'
      ],
      expectedRecommendations: [
        'Strategi Ekspansi Bisnis BUMDes',
        'Penguatan Infrastruktur Digital Desa',
        'Program Pemberdayaan Kelompok Rentan & PKK'
      ],
      riskFramework: 'Risiko inefisiensi Dana Desa, tata kelola BUMDes yang merugi, serta potensi konflik horizontal di masyarakat.'
    }
  },
  {
    id: 'preset-desa-wisata',
    name: '17. Evaluasi Kelayakan Desa Wisata',
    description: 'Fokus pada Sapta Pesona, CHSE, daya tarik alam/budaya, dan kelembagaan Pokdarwis.',
    config: {
      aiPersona: 'Asesor Pariwisata & Pengembang Destinasi (Kemenparekraf)',
      assessmentGoal: 'Mengevaluasi kelayakan, daya tarik komersial, dan tata kelola destinasi/desa wisata agar memenuhi standar Sapta Pesona.',
      gradingStrictness: 'standard',
      reportTone: 'consultative',
      mediaAnalysisFocus: 'ui-ux-design', // Difokuskan untuk evaluasi visual/foto destinasi
      customReadinessTiers: [
        'Desa Wisata Rintisan',
        'Desa Wisata Berkembang',
        'Desa Wisata Maju',
        'Desa Wisata Mandiri & Berkelanjutan'
      ],
      expectedAnalysisBlocks: [
        'Daya Tarik & Keunikan Destinasi (Alam/Budaya)',
        'Amenitas, Infrastruktur & Aksesibilitas',
        'Tata Kelola Kelembagaan (Pokdarwis)',
        'Dampak Sosial-Ekonomi & CHSE'
      ],
      expectedMetrics: [
        'Daya Tarik: Keunikan atraksi dibanding destinasi lain.',
        'Kesiapan Fasilitas: Ketersediaan toilet bersih, homestay, dan jalan.',
        'Tata Kelola: Keaktifan Pokdarwis (Kelompok Sadar Wisata).',
        'Keberlanjutan: Kebersihan, Keamanan, Kelestarian Lingkungan (CHSE).'
      ],
      expectedRecommendations: [
        'Pengembangan Paket Wisata & Storytelling',
        'Strategi Promosi Digital',
        'Peningkatan Fasilitas & Sapta Pesona'
      ],
      riskFramework: 'Fokus pada risiko over-tourism, kerusakan lingkungan akibat wisata, konflik pembagian hasil dengan warga, dan kurangnya standar kebersihan.'
    }
  },

  // ==========================================
  // KELOMPOK 5: TEKNOLOGI, DIGITAL & SIBER
  // ==========================================
  {
    id: 'preset-software-audit',
    name: '18. Kurasi Aplikasi / Software (Web & Mobile Apps)',
    description: 'Fokus pada UI/UX, stabilitas arsitektur, keamanan, dan retensi pengguna.',
    config: {
      aiPersona: 'Tech Lead Engineer & UI/UX Evaluator Senior',
      assessmentGoal: 'Melakukan peninjauan teknis terhadap produk digital dari segi skalabilitas arsitektur server, fungsionalitas fitur, keamanan, dan User Experience.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      mediaAnalysisFocus: 'ui-ux-design',
      customReadinessTiers: [
        'Alpha (Masih Banyak Bug / Prototyping)',
        'Beta (Layak Uji Coba Terbatas / UAT)',
        'Production Ready (Stabil di Publik)',
        'Enterprise Grade (Skala Masif / Secure)'
      ],
      expectedAnalysisBlocks: [
        'Fungsionalitas Utama & UI/UX Design',
        'Arsitektur Teknologi & Stabilitas Server',
        'Manajemen Keamanan Data (Data Privacy)',
        'Model Akuisisi & Retensi Pengguna'
      ],
      expectedMetrics: [
        'Kenyamanan Pengguna: Kemudahan navigasi dan desain yang intuitif.',
        'Performa Aplikasi: Kecepatan muat dan responsivitas basis data.',
        'Keamanan: Enkripsi, protokol login, perlindungan data pribadi.',
        'Traction: Jumlah unduhan, active users, dan rasio un-install (churn rate).'
      ],
      expectedRecommendations: [
        'Prioritas Perbaikan Bug & Refactoring Kode',
        'Penyempurnaan Alur UI/UX (User Journey)',
        'Peta Jalan Penambahan Fitur Baru (Product Roadmap)'
      ],
      riskFramework: 'Risiko kebocoran data pengguna (data breach), arsitektur yang tidak sanggup menahan lonjakan trafik (server down), dan UI yang membingungkan.'
    }
  },
  {
    id: 'preset-cyber-security',
    name: '19. Audit Keamanan Siber (Cybersecurity Readiness)',
    description: 'Sangat Kritis. Fokus pada kerentanan server, kepatuhan ISO 27001, dan mitigasi.',
    config: {
      aiPersona: 'Auditor Keamanan Informasi Siber (CISO) Profesional',
      assessmentGoal: 'Menilai profil risiko keamanan jaringan, perlindungan data, dan kesiapan sistem organisasi menghadapi ancaman siber (cyber threats).',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Sangat Rentan (Critical Risk)',
        'Kepatuhan Dasar (Basic Firewall/Antivirus)',
        'Kesiapan Menengah (Active Monitoring)',
        'Resilien Tinggi (Enterprise/ISO Compliant)'
      ],
      expectedAnalysisBlocks: [
        'Infrastruktur Keamanan Jaringan & Cloud',
        'Manajemen Akses & Autentikasi Pengguna',
        'Perlindungan & Enkripsi Data Sensitif',
        'Protokol Tanggap Insiden (Incident Response)'
      ],
      expectedMetrics: [
        'Vulnerability Management: Frekuensi penetration testing/patching.',
        'Access Control: Penggunaan otentikasi multi-faktor (MFA) dan enkripsi.',
        'Backup & Recovery: Sistem pemulihan bencana (Disaster Recovery Plan).',
        'Kepatuhan: Adopsi standar ISO 27001, PDP (Pelindungan Data Pribadi).'
      ],
      expectedRecommendations: [
        'Langkah Penambalan Kerentanan Kritis (Patching)',
        'Implementasi Infrastruktur Keamanan Lanjutan',
        'Rencana Pelatihan Kesadaran Siber Pegawai (Security Awareness)'
      ],
      riskFramework: 'FOKUS MUTLAK pada risiko serangan ransomware, serangan phishing pada karyawan, kehilangan kredensial admin, dan pelanggaran undang-undang privasi data.'
    }
  },

  // ==========================================
  // KELOMPOK 6: SPESIFIK & REGULASI (K3, HALAL, KONSTRUKSI)
  // ==========================================
  {
    id: 'preset-audit-k3',
    name: '20. Audit Kepatuhan K3 (Keselamatan Kerja)',
    description: 'Fokus pada SMK3, Zero Accident, APD, SOP Keselamatan, dan mitigasi bahaya.',
    config: {
      aiPersona: 'Auditor K3 (HSE Inspector) Senior',
      assessmentGoal: 'Melakukan audit Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3) serta kesiapsiagaan menghadapi kondisi darurat.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Bahaya Kritis (Stop Work / Risiko Fatal)',
        'Kurang Patuh (Warning / Perlu Perbaikan)',
        'Patuh Standar Minimum',
        'Budaya K3 Unggul (Zero Accident Target)'
      ],
      expectedAnalysisBlocks: [
        'Komitmen & Kebijakan K3 Organisasi',
        'Identifikasi Bahaya & Mitigasi (HIRADC)',
        'Fasilitas, Ergonomi & Kepatuhan APD',
        'Kesiapsiagaan & Tanggap Darurat'
      ],
      expectedMetrics: [
        'Penilaian Risiko: Kelengkapan dokumen JSA (Job Safety Analysis).',
        'Kepatuhan APD: Persentase penggunaan Alat Pelindung Diri oleh pekerja.',
        'Frekuensi Inspeksi: Rutinitas safety patrol dan safety briefing.',
        'Insiden: Rasio LTI (Lost Time Injury) atau kecelakaan kerja.'
      ],
      expectedRecommendations: [
        'Tindakan Korektif Pengadaan APD & Rambu',
        'Perbaikan Layout Produksi yang Aman',
        'Pelatihan Simulasi Tanggap Darurat'
      ],
      riskFramework: 'Risiko kecelakaan fatal (fatality), bahaya kebakaran/ledakan mesin, penyakit akibat kerja jangka panjang, dan sanksi pidana ketenagakerjaan.'
    }
  },
  {
    id: 'preset-sertifikasi-halal',
    name: '21. Pre-Assessment Sertifikasi Halal (SJPH)',
    description: 'Fokus pada bahan baku, traceability, fasilitas, dan dokumen Sistem Jaminan Produk Halal.',
    config: {
      aiPersona: 'Auditor Halal LPPOM MUI & Pendamping Halal Spesialis',
      assessmentGoal: 'Melakukan audit pre-assessment untuk mengevaluasi kesiapan Sistem Jaminan Produk Halal (SJPH) sebelum diajukan ke BPJPH/LPPOM.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Belum Memenuhi Syarat Halal',
        'Perlu Perbaikan Mayor SJPH',
        'Siap Audit (Hanya Kekurangan Minor)',
        'Sangat Siap / Layak Sertifikasi Halal'
      ],
      expectedAnalysisBlocks: [
        'Komitmen Manajemen & Tim Manajemen Halal',
        'Kritisitas Bahan Baku & Bahan Tambahan',
        'Fasilitas & Proses Produksi Bebas Najis',
        'Kemampuan Telusur (Traceability) & Edukasi'
      ],
      expectedMetrics: [
        'Legalitas Bahan: Ketersediaan sertifikat halal/surat pernyataan bebas babi untuk semua bahan.',
        'Pemisahan Fasilitas: Jaminan tidak ada kontaminasi silang (cross-contamination) dengan bahan haram.',
        'Ketertelusuran: Sistem pencatatan pembelian bahan dan produksi.',
        'Komitmen: Adanya penyelia halal internal yang bersertifikat.'
      ],
      expectedRecommendations: [
        'Penyusunan Manual SJPH & Matriks Bahan',
        'Substitusi Bahan Baku Kritis',
        'Pemisahan Layout Alat Produksi/Penyimpanan'
      ],
      riskFramework: 'Fokus mendeteksi risiko kontaminasi silang dari alat masak/kuas bulu babi, bahan titipan (khamr/alkohol), dan ketiadaan nota pembelian bahan.'
    }
  },
  {
    id: 'preset-kelayakan-konstruksi',
    name: '22. Evaluasi Kelayakan Proyek / Konstruksi',
    description: 'Fokus pada RAB, timeline (Kurva S), kapasitas kontraktor, dan mitigasi penyimpangan.',
    config: {
      aiPersona: 'Project Manager Senior & Ahli Quantity Surveyor (QS)',
      assessmentGoal: 'Menilai kelayakan perancangan, kewajaran Rencana Anggaran Biaya (RAB), jadwal pengerjaan, dan spesifikasi proyek konstruksi/infrastruktur.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Proyek Berisiko Tinggi (Gagal)',
        'Perlu Restrukturisasi RAB / Jadwal',
        'Layak Eksekusi Terbatas',
        'Sangat Layak & Terstruktur (Bankable)'
      ],
      expectedAnalysisBlocks: [
        'Kelayakan Finansial & Akurasi RAB',
        'Manajemen Waktu & Penjadwalan (Kurva S)',
        'Kualifikasi & Kapasitas Kontraktor/Vendor',
        'Manajemen Risiko Konstruksi & Spesifikasi'
      ],
      expectedMetrics: [
        'Kewajaran Harga: Deviasi anggaran terhadap standar harga pasar.',
        'Timeline: Realistisnya alokasi durasi setiap tahap pekerjaan.',
        'Kapasitas Vendor: Pengalaman kontraktor dalam proyek sejenis.',
        'Pengendalian Mutu: Ketegasan spesifikasi material (BoQ).'
      ],
      expectedRecommendations: [
        'Value Engineering (Optimalisasi Biaya)',
        'Revisi Penjadwalan (Kurva S)',
        'Pengaturan Skema Pembayaran (Termin)'
      ],
      riskFramework: 'Risiko utama adalah *cost overrun* (pembengkakan biaya), keterlambatan serah terima (memicu penalti), dan kegagalan struktur akibat material *downgrade*.'
    }
  },

  // ==========================================
  // KELOMPOK 7: LAIN-LAIN (GREEN ECONOMY, KREDIT, SENI)
  // ==========================================
  {
    id: 'preset-green-economy',
    name: '23. Keberlanjutan Lingkungan (ESG & Green Economy)',
    description: 'Fokus pada dampak sosial, sirkular ekonomi, jejak karbon, dan kepatuhan ramah lingkungan.',
    config: {
      aiPersona: 'Pakar Ekonomi Sirkular & Auditor Keberlanjutan (ESG)',
      assessmentGoal: 'Menilai seberapa dalam integrasi prinsip Ekonomi Hijau, pengurangan limbah karbon, dan dampak sosial yang dihasilkan oleh entitas bisnis.',
      gradingStrictness: 'standard',
      reportTone: 'consultative',
      customReadinessTiers: [
        'Konvensional (Belum Peduli Lingkungan)',
        'Transisi Keberlanjutan (Mulai Sadar)',
        'Ekonomi Sirkular Terintegrasi',
        'Role Model ESG & Dampak Masif'
      ],
      expectedAnalysisBlocks: [
        'Dampak Lingkungan & Jejak Karbon',
        'Sirkularitas Rantai Pasok (Reduce/Reuse/Recycle)',
        'Dampak Sosial & Pemberdayaan Komunitas',
        'Viabilitas Bisnis (Impact vs Profitability)'
      ],
      expectedMetrics: [
        'Efisiensi Sumber Daya: Penggunaan bahan baku ramah lingkungan dan energi terbarukan.',
        'Pengelolaan Limbah: Praktik zero-waste atau sistem daur ulang.',
        'Social Impact: Penciptaan lapangan kerja bagi kelompok rentan.',
        'Sertifikasi Hijau: Kepemilikan label ramah lingkungan atau sertifikat B-Corp.'
      ],
      expectedRecommendations: [
        'Strategi Pengurangan Jejak Karbon',
        'Inovasi Desain Produk Sirkular',
        'Peluang Akses Pendanaan Hijau (Green Financing)'
      ],
      riskFramework: 'Fokus mengidentifikasi risiko greenwashing (klaim palsu ramah lingkungan), biaya operasional yang tidak sustain, dan ketidakpatuhan regulasi limbah B3.'
    }
  },
  {
    id: 'preset-kelayakan-kredit',
    name: '24. Kelayakan Pembiayaan / Kredit UMKM Bank (5C)',
    description: 'Ketat. Fokus pada analisis prinsip 5C (Character, Capacity, Capital, Collateral, Condition).',
    config: {
      aiPersona: 'Credit Analyst Perbankan Senior',
      assessmentGoal: 'Menganalisis kapasitas pembayaran utang (repayment capacity) dan risiko gagal bayar (NPL) untuk menentukan kelayakan pinjaman permodalan.',
      gradingStrictness: 'strict',
      reportTone: 'investigative',
      customReadinessTiers: [
        'Ditolak (Risiko Gagal Bayar Tinggi)',
        'Disetujui Bersyarat (Membutuhkan Penjamin)',
        'Disetujui (Plafon Terbatas)',
        'Disetujui (Plafon Maksimal / Prime Customer)'
      ],
      expectedAnalysisBlocks: [
        'Karakter & Histori Kredit (Character)',
        'Kapasitas Arus Kas (Capacity / Cashflow)',
        'Struktur Permodalan Sendiri (Capital)',
        'Kondisi Bisnis & Agunan (Condition & Collateral)'
      ],
      expectedMetrics: [
        'Rasio DSCR (Debt Service Coverage Ratio): Kemampuan kas menutupi cicilan.',
        'Rekam Jejak BI Checking / SLIK: Kedisiplinan pembayaran masa lalu.',
        'Valuasi Agunan: Nilai pasar aset jaminan dibanding nominal pinjaman.',
        'Ketahanan Bisnis: Resiliensi industri terhadap guncangan ekonomi makro.'
      ],
      expectedRecommendations: [
        'Saran Penetapan Plafon & Tenor Maksimal',
        'Syarat Pencairan Kredit Tambahan (Covenant)',
        'Pembenahan Administrasi Buku Keuangan'
      ],
      riskFramework: 'Fokus mutlak pada risiko pembukuan palsu (window dressing), kredit macet (NPL), pencampuran dana pribadi dan usaha, serta penyusutan nilai agunan.'
    }
  },
  {
    id: 'preset-kurasi-seni',
    name: '25. Kurasi Pameran Seni & Karya Kreatif',
    description: 'Fokus pada orisinalitas, nilai estetika, portofolio, dan daya tarik pameran.',
    config: {
      aiPersona: 'Kurator Seni Independen & Direktur Kreatif',
      assessmentGoal: 'Mengevaluasi nilai estetika, keunikan gagasan, orisinalitas portofolio, dan kelayakan karya untuk dipamerkan atau didanai.',
      gradingStrictness: 'standard',
      reportTone: 'consultative',
      mediaAnalysisFocus: 'product-demo',
      customReadinessTiers: [
        'Karya Amatir / Tidak Lolos',
        'Karya Potensial (Memerlukan Mentoring)',
        'Karya Standar Pameran (Lolos Kurasi)',
        'Karya Utama (Masterpiece / Unggulan)'
      ],
      expectedAnalysisBlocks: [
        'Konsep Gagasan & Pesan Karya (Storytelling)',
        'Orisinalitas & Kekuatan Identitas Artistik',
        'Teknik Eksekusi & Kualitas Material (Craftsmanship)',
        'Daya Tarik Publik & Potensi Komersial'
      ],
      expectedMetrics: [
        'Kedalaman Konsep: Narasi latar belakang penciptaan karya.',
        'Keunikan (Uniqueness): Sejauh mana karya berbeda dari tren *mainstream*.',
        'Konsistensi Portofolio: Rekam jejak kekaryaan di masa lalu.',
        'Kesiapan Pameran: Kelengkapan presentasi visual dan *packaging* karya.'
      ],
      expectedRecommendations: [
        'Arahan Pengembangan Konsep Lanjutan',
        'Saran Pemilihan Material & Teknik Eksekusi',
        'Strategi *Pricing* & *Branding* Karya'
      ],
      riskFramework: 'Fokus mendeteksi risiko plagiarisme/pelanggaran hak cipta, isu sensitif (SARA) yang tidak terkonsep baik, dan karya yang rapuh secara fisik untuk dipamerkan jangka panjang.'
    }
  }
];