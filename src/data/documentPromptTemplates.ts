// src/data/documentPromptTemplates.ts

export interface DocumentPreset {
  id: string;
  name: string;
  iconType: 'finance' | 'briefcase' | 'building' | 'document' | 'target' | 'shield';
  prompt: string;
}

export const DocumentPresets: DocumentPreset[] = [
  // ==========================================
  // KELOMPOK 1: BISNIS, STARTUP & KOMERSIAL
  // ==========================================
  {
    id: 'doc-rencana-bisnis-umkm',
    name: 'Rencana Bisnis UMKM (Business Plan)',
    iconType: 'building',
    prompt: `Tulis dokumen Rencana Bisnis dengan kerangka baku berikut:
    <h1>RENCANA BISNIS (BUSINESS PLAN) UMKM</h1>
    <h2>BAB I. RINGKASAN EKSEKUTIF</h2>
    (Tuliskan narasi profesional berdasarkan [AI_SUMMARY]. Sebutkan [AI_SCORE] entitas di sini).
    <h2>BAB II. PROFIL & IDENTITAS USAHA</h2>
    (Jabarkan data dari [FORM_DATA] dalam bentuk paragraf naratif, bukan sekadar list).
    <h2>BAB III. ANALISIS KUALITAS PRODUK & OPERASIONAL</h2>
    (Ekstrak dan jabarkan indikator dari [AI_BLOCKS] dan [AI_METRICS] yang berkaitan dengan produk, kapasitas, dan operasional).
    <h2>BAB IV. PEMETAAN SWOT & RISIKO BISNIS</h2>
    (Tuliskan analisis [AI_SWOT]. Setelah itu jabarkan risiko kritis dan mitigasinya dari [AI_RISKS]).
    <h2>BAB V. PETA JALAN & REKOMENDASI PENGEMBANGAN</h2>
    (Uraikan langkah strategis (Action Plan) berdasarkan [AI_ACTIONS] dan [nextActionSteps]).`
  },
  {
    id: 'doc-proposal-investor',
    name: 'Pitch Deck / Proposal Investor Narrative',
    iconType: 'briefcase',
    prompt: `Tulis narasi Proposal Investor (Venture Capital Style) dengan kerangka baku berikut:
    <h1>PROPOSAL INVESTASI (PITCH DECK NARRATIVE)</h1>
    <h2>BAB I. EXECUTIVE SUMMARY</h2>
    (Rangkum daya tarik utama entitas berdasarkan [AI_SUMMARY] dan [AI_SCORE]).
    <h2>BAB II. PROBLEM & SOLUTION</h2>
    (Gunakan data [FORM_DATA] terkait masalah dan solusi untuk menjabarkan validasi pasar).
    <h2>BAB III. UNFAIR ADVANTAGE & TRAKSI METRIK</h2>
    (Jadikan setiap item di [AI_BLOCKS] dan [AI_METRICS] sebagai sub-bab <h3> untuk membedah potensi pasar, keuangan, dan skalabilitas).
    <h2>BAB IV. RISIKO INVESTASI & MITIGASI</h2>
    (Sajikan data [AI_RISKS] sebagai jaminan kepada investor bahwa founder sadar akan risiko bisnisnya).
    <h2>BAB V. ROADMAP & KEBUTUHAN PENDANAAN</h2>
    (Rangkum [AI_ACTIONS] sebagai strategi penggunaan dana dan target pertumbuhan di masa depan).`
  },
  {
    id: 'doc-persiapan-ekspor',
    name: 'Dokumen Rencana Kesiapan Ekspor',
    iconType: 'target',
    prompt: `Tulis Dokumen Rencana Ekspor dengan kerangka baku berikut:
    <h1>RENCANA KESIAPAN EKSPOR (EXPORT READINESS PLAN)</h1>
    <h2>BAB I. PENDAHULUAN & STATUS KESIAPAN</h2>
    (Tuliskan narasi dari [AI_SUMMARY]. Sebutkan level kesiapan ekspor berdasarkan [AI_SCORE]).
    <h2>BAB II. PROFIL PERUSAHAAN & KAPASITAS PRODUKSI</h2>
    (Jabarkan data [FORM_DATA] khususnya terkait sistem produksi dan kapasitas).
    <h2>BAB III. EVALUASI STANDAR MUTU & LEGALITAS INTERNASIONAL</h2>
    (Gunakan data dari [AI_BLOCKS] dan [AI_METRICS] untuk menilai kepatuhan sertifikasi dan daya saing harga).
    <h2>BAB IV. ANALISIS RISIKO RANTAI PASOK GLOBAL</h2>
    (Jabarkan [AI_SWOT] dan fokus pada [AI_RISKS] terkait kendala bea cukai atau logistik lintas negara).
    <h2>BAB V. STRATEGI PENETRASI PASAR GLOBAL</h2>
    (Susun [AI_ACTIONS] menjadi langkah-langkah konkret menuju pengiriman ekspor pertama/lanjutan).`
  },

  // ==========================================
  // KELOMPOK 2: PENILAIAN B2B, LEMBAGA & KORPORASI
  // ==========================================
  {
    id: 'doc-company-profile-b2b',
    name: 'Company Profile B2B & Penawaran Vendor',
    iconType: 'building',
    prompt: `Tulis Company Profile formal untuk pengadaan B2B dengan kerangka baku berikut:
    <h1>PROFIL PERUSAHAAN & PENAWARAN KEMITRAAN</h1>
    <h2>BAB I. TENTANG PERUSAHAAN</h2>
    (Tulis sejarah singkat dan visi misi berdasarkan [FORM_DATA] dengan gaya Corporate Storytelling).
    <h2>BAB II. KEUNGGULAN KOMPETITIF & LAYANAN</h2>
    (Ekstrak data [AI_SWOT] bagian Strengths dan uraikan keunggulan operasional).
    <h2>BAB III. KAPASITAS & STANDAR MUTU (SLA)</h2>
    (Gunakan [AI_BLOCKS] dan [AI_METRICS] untuk membuktikan bahwa entitas patuh standar korporasi).
    <h2>BAB IV. MANAJEMEN RISIKO MITRA B2B</h2>
    (Tunjukkan profesionalitas dengan menjabarkan [AI_RISKS] beserta strategi mitigasinya).
    <h2>BAB V. PENUTUP & RENCANA KERJASAMA</h2>
    (Sajikan [AI_ACTIONS] sebagai komitmen *continuous improvement* kepada calon klien korporat).`
  },
  {
    id: 'doc-laporan-koperasi',
    name: 'Draf Laporan Kinerja Koperasi (RAT)',
    iconType: 'finance',
    prompt: `Tulis Draf Laporan Kinerja Koperasi untuk RAT dengan kerangka baku berikut:
    <h1>LAPORAN EVALUASI KINERJA KOPERASI</h1>
    <h2>BAB I. RINGKASAN KINERJA TAHUNAN</h2>
    (Tuliskan rangkuman [AI_SUMMARY]. Cantumkan status kesehatan koperasi berdasarkan [AI_SCORE]).
    <h2>BAB II. PROFIL & TATA KELOLA KOPERASI</h2>
    (Tulis narasi dari [FORM_DATA] tentang identitas pengurus dan badan hukum).
    <h2>BAB III. EVALUASI KESEHATAN FINANSIAL & NPL</h2>
    (Uraikan secara detail [AI_BLOCKS] dan [AI_METRICS] yang berfokus pada likuiditas, partisipasi anggota, dan digitalisasi).
    <h2>BAB IV. ANALISIS SWOT & RISIKO KELEMBAGAAN</h2>
    (Petakan [AI_SWOT]. Jabarkan [AI_RISKS] khususnya terkait potensi kredit macet atau fraud).
    <h2>BAB V. RENCANA STRATEGIS KEDEPAN</h2>
    (Uraikan [AI_ACTIONS] sebagai usulan program kerja kepada anggota di tahun mendatang).`
  },
  {
    id: 'doc-evaluasi-bank-sampah',
    name: 'Laporan Kinerja Unit Bank Sampah',
    iconType: 'target',
    prompt: `Tulis Laporan Evaluasi Bank Sampah dengan kerangka baku berikut:
    <h1>LAPORAN KINERJA & EVALUASI UNIT BANK SAMPAH</h1>
    <h2>BAB I. RINGKASAN EKSEKUTIF</h2>
    (Sintesiskan [AI_SUMMARY] dan capaian skor [AI_SCORE]).
    <h2>BAB II. PROFIL UNIT & MANAJEMEN NASABAH</h2>
    (Gunakan [FORM_DATA] untuk menjelaskan skala operasional unit saat ini).
    <h2>BAB III. EVALUASI TONASE & NILAI EKONOMI SIRKULAR</h2>
    (Pecah [AI_BLOCKS] dan [AI_METRICS] menjadi sub-bab yang membahas partisipasi warga, omset limbah, dan efisiensi).
    <h2>BAB IV. TANTANGAN OPERASIONAL (RISK & SWOT)</h2>
    (Tuliskan [AI_SWOT] dan mitigasi masalah teknis di lapangan dari [AI_RISKS]).
    <h2>BAB V. REKOMENDASI PENGEMBANGAN UNIT</h2>
    (Uraikan usulan [AI_ACTIONS] untuk meningkatkan kapasitas tonase dan kemitraan pengepul).`
  },

  // ==========================================
  // KELOMPOK 3: PENDIDIKAN, SDM, RISET & INOVASI
  // ==========================================
  {
    id: 'doc-proposal-hilirisasi',
    name: 'Proposal Komersialisasi & Hilirisasi Riset',
    iconType: 'document',
    prompt: `Tulis Proposal Hilirisasi Riset dengan kerangka baku berikut:
    <h1>PROPOSAL HILIRISASI RISET & INOVASI TEKNOLOGI</h1>
    <h2>BAB I. LATAR BELAKANG INOVASI</h2>
    (Ambil dari [AI_SUMMARY] mengenai kebaruan/novelty inovasi ini. Sebutkan [AI_SCORE]).
    <h2>BAB II. PROFIL PENELITI & IDENTITAS RISET</h2>
    (Jabarkan data dari [FORM_DATA]).
    <h2>BAB III. KESIAPAN TEKNOLOGI (TRL) & POTENSI INDUSTRI</h2>
    (Gunakan [AI_BLOCKS] dan [AI_METRICS] untuk mengulas kedalaman paten, MRL, dan daya tarik komersial).
    <h2>BAB IV. PEMETAAN RISIKO KOMERSIALISASI</h2>
    (Bahas [AI_SWOT] dan urai hambatan *Valley of Death* berdasarkan [AI_RISKS]).
    <h2>BAB V. PETA JALAN MENUJU SPIN-OFF / LISENSI</h2>
    (Rangkum strategi hilirisasi berdasarkan [AI_ACTIONS] dan timeline pengembangannya).`
  },
  {
    id: 'doc-profil-kandidat',
    name: 'Laporan Fit & Proper Test Kandidat (HRD)',
    iconType: 'briefcase',
    prompt: `Tulis Laporan Asesmen SDM dengan kerangka baku berikut:
    <h1>LAPORAN EVALUASI & PROFIL KANDIDAT</h1>
    <h2>BAB I. KESIMPULAN REKOMENDASI REKRUTMEN</h2>
    (Tuliskan kesimpulan [AI_SUMMARY] dan Rekomendasi/Level Kesiapan [AI_SCORE]).
    <h2>BAB II. DATA DEMOGRAFI & PENGALAMAN KANDIDAT</h2>
    (Ekstrak ringkasan dari [FORM_DATA]).
    <h2>BAB III. EVALUASI KOMPETENSI (HARD SKILL & SOFT SKILL)</h2>
    (Gunakan [AI_BLOCKS] dan [AI_METRICS] untuk menilai kemampuan teknis, leadership, dan culture fit).
    <h2>BAB IV. ANALISIS SWOT KANDIDAT</h2>
    (Tulis kekuatan dan kelemahan dari [AI_SWOT]. Jabarkan profil risiko kandidat dari [AI_RISKS]).
    <h2>BAB V. RENCANA PENGEMBANGAN (TRAINING NEEDS)</h2>
    (Gunakan [AI_ACTIONS] untuk menyarankan penempatan posisi yang tepat dan pelatihan yang dibutuhkan).`
  },

  // ==========================================
  // KELOMPOK 4: PEMERINTAHAN & PELAYANAN PUBLIK
  // ==========================================
  {
    id: 'doc-laporan-kinerja-asn',
    name: 'Draf Laporan Capaian Kinerja ASN (SKP)',
    iconType: 'document',
    prompt: `Tulis Laporan Kinerja ASN dengan kerangka baku berikut:
    <h1>LAPORAN EVALUASI CAPAIAN KINERJA PEGAWAI (SKP)</h1>
    <h2>BAB I. RINGKASAN CAPAIAN KINERJA</h2>
    (Tulis rangkuman penilaian berdasarkan [AI_SUMMARY] dan predikat skor akhir [AI_SCORE]).
    <h2>BAB II. IDENTITAS PEGAWAI & UNIT KERJA</h2>
    (Ambil data dari [FORM_DATA] untuk profil ASN).
    <h2>BAB III. EVALUASI REALISASI TARGET & INOVASI</h2>
    (Jabarkan secara detail [AI_BLOCKS] dan [AI_METRICS] mengenai penyelesaian tugas, kualitas output, dan inisiatif pemecahan masalah).
    <h2>BAB IV. EVALUASI PERILAKU KERJA & RISIKO MANAJERIAL</h2>
    (Tuliskan [AI_SWOT] pegawai. Jabarkan hambatan di lapangan berdasarkan [AI_RISKS]).
    <h2>BAB V. REKOMENDASI PENGEMBANGAN KAPASITAS</h2>
    (Tuliskan usulan [AI_ACTIONS] terkait rotasi, promosi, atau diklat kepemimpinan).`
  },
  {
    id: 'doc-proposal-inovasi-publik',
    name: 'Proposal Lomba Inovasi Pelayanan Publik',
    iconType: 'building',
    prompt: `Tulis Proposal Inovasi Pelayanan Publik Daerah dengan kerangka baku berikut:
    <h1>PROPOSAL INOVASI PELAYANAN PUBLIK</h1>
    <h2>BAB I. RINGKASAN INOVASI</h2>
    (Deskripsikan kebaruan inovasi dari [AI_SUMMARY] dan tingkat kelayakan [AI_SCORE]).
    <h2>BAB II. LATAR BELAKANG & DESKRIPSI INOVASI</h2>
    (Narasikan masalah dan solusi dari [FORM_DATA]).
    <h2>BAB III. DAMPAK, EFEKTIVITAS & IMPLEMENTASI</h2>
    (Gunakan [AI_BLOCKS] dan [AI_METRICS] untuk memvalidasi seberapa besar manfaat bagi masyarakat dan efisiensi sistem).
    <h2>BAB IV. ANALISIS KEBERLANJUTAN (SUSTAINABILITY) & RISIKO</h2>
    (Bahas potensi replikasi dari [AI_SWOT] dan mitigasi masalah anggaran/teknis dari [AI_RISKS]).
    <h2>BAB V. PETA JALAN PENGEMBANGAN KE DEPAN</h2>
    (Rangkum [AI_ACTIONS] menjadi langkah nyata penyempurnaan inovasi di tahun mendatang).`
  },
  {
    id: 'doc-profil-kemajuan-desa',
    name: 'Dokumen Evaluasi Kemajuan Tata Kelola Kelurahan/Desa',
    iconType: 'building',
    prompt: `Tulis Laporan Evaluasi Kelurahan/Desa dengan kerangka baku berikut:
    <h1>LAPORAN EVALUASI TATA KELOLA KELURAHAN / DESA</h1>
    <h2>BAB I. EXECUTIVE OVERVIEW</h2>
    (Sintesiskan [AI_SUMMARY]. Cantumkan level tipologi kemajuan desa berdasarkan [AI_SCORE]).
    <h2>BAB II. MONOGRAFI & IDENTITAS WILAYAH</h2>
    (Ekstrak data demografi/profil wilayah dari [FORM_DATA]).
    <h2>BAB III. MATRIKS KAPABILITAS (PEMERINTAHAN, EKONOMI & SOSIAL)</h2>
    (Pecah [AI_BLOCKS] dan [AI_METRICS] menjadi sub-bab: 1. Digitalisasi Layanan, 2. BUMDes/Ekonomi, 3. Trantibum, 4. Kesehatan/Stunting).
    <h2>BAB IV. PEMETAAN SWOT & MITIGASI RISIKO WILAYAH</h2>
    (Sajikan data [AI_SWOT]. Jabarkan potensi konflik/hambatan dari [AI_RISKS]).
    <h2>BAB V. STRATEGIC ACTION PLAN PENGEMBANGAN DESA</h2>
    (Uraikan [AI_ACTIONS] sebagai blueprint rekomendasi musrenbangdes/pembangunan selanjutnya).`
  },

  // ==========================================
  // KELOMPOK 5: TEKNOLOGI, DIGITAL & SIBER
  // ==========================================
  {
    id: 'doc-laporan-audit-software',
    name: 'Laporan Audit Arsitektur Perangkat Lunak',
    iconType: 'shield',
    prompt: `Tulis Laporan Audit Software dengan kerangka baku berikut:
    <h1>LAPORAN TEKNIS AUDIT PERANGKAT LUNAK (SOFTWARE)</h1>
    <h2>BAB I. RINGKASAN EKSEKUTIF TEKNIS</h2>
    (Tuliskan [AI_SUMMARY] dan tingkat stabilitas Production Readiness [AI_SCORE]).
    <h2>BAB II. PROFIL APLIKASI & STACK TEKNOLOGI</h2>
    (Ambil data dari [FORM_DATA]).
    <h2>BAB III. EVALUASI ARSITEKTUR, UI/UX & STABILITAS SERVER</h2>
    (Bedah tuntas [AI_BLOCKS] dan [AI_METRICS] untuk menganalisis kode, database, dan pengalaman pengguna).
    <h2>BAB IV. PEMETAAN KERENTANAN (VULNERABILITY RISKS)</h2>
    (Tuliskan [AI_SWOT] teknis. Wajib menjabarkan [AI_RISKS] terkait server down, kebocoran data, atau bug kritis).
    <h2>BAB V. ROADMAP REFACTORING & PENGEMBANGAN FITUR</h2>
    (Uraikan [AI_ACTIONS] sebagai backlog prioritas bagi tim developer).`
  },
  {
    id: 'doc-laporan-cybersecurity',
    name: 'Laporan Asesmen Keamanan Siber (CISO)',
    iconType: 'shield',
    prompt: `Tulis Laporan Keamanan Siber dengan kerangka baku berikut:
    <h1>LAPORAN ASESMEN KERENTANAN KEAMANAN SIBER</h1>
    <h2>BAB I. RINGKASAN RISIKO (EXECUTIVE RISK SUMMARY)</h2>
    (Tulis temuan kritis dari [AI_SUMMARY] dan level kepatuhan keamanan [AI_SCORE]).
    <h2>BAB II. PROFIL INFRASTRUKTUR SISTEM ORGANISASI</h2>
    (Ekstrak arsitektur jaringan/server dari [FORM_DATA]).
    <h2>BAB III. EVALUASI PROTEKSI DATA & MANAJEMEN AKSES</h2>
    (Gunakan [AI_BLOCKS] dan [AI_METRICS] untuk menilai enkripsi, firewall, ISO 27001, dan otentikasi).
    <h2>BAB IV. THREAT INTELLIGENCE & MITIGASI INSIDEN</h2>
    (FOKUS UTAMA: Jabarkan [AI_SWOT] dan seluruh ancaman siber (ransomware, phishing) dari [AI_RISKS]).
    <h2>BAB V. REKOMENDASI PATCHING & KEPATUHAN (SLA)</h2>
    (Berikan instruksi teknis langsung berdasarkan [AI_ACTIONS] untuk menutup celah keamanan).`
  },

  // ==========================================
  // KELOMPOK 6: SPESIFIK & REGULASI (K3, HALAL, KONSTRUKSI)
  // ==========================================
  {
    id: 'doc-manual-k3',
    name: 'Draf Ringkasan Manual K3 (HSE Plan)',
    iconType: 'shield',
    prompt: `Tulis Draf HSE Plan dengan kerangka baku berikut:
    <h1>RENCANA KESELAMATAN & KESEHATAN KERJA (HSE PLAN)</h1>
    <h2>BAB I. KOMITMEN & KEBIJAKAN K3 ORGANISASI</h2>
    (Ambil sari pati [AI_SUMMARY] dan skor kepatuhan [AI_SCORE]).
    <h2>BAB II. PROFIL & LOKASI OPERASIONAL KERJA</h2>
    (Tulis kondisi lapangan berdasarkan [FORM_DATA]).
    <h2>BAB III. EVALUASI KEPATUHAN APD & TANGGAP DARURAT</h2>
    (Jabarkan secara ketat [AI_BLOCKS] dan [AI_METRICS] terkait prosedur SMK3 dan inspeksi rutin).
    <h2>BAB IV. IDENTIFIKASI BAHAYA & PENILAIAN RISIKO (HIRADC)</h2>
    (FOKUS UTAMA: Bedah [AI_RISKS] terkait risiko fatality, kebakaran, atau kecelakaan kerja dari data yang ada).
    <h2>BAB V. PROGRAM KERJA K3 TAHUNAN</h2>
    (Uraikan [AI_ACTIONS] menjadi langkah preventif seperti simulasi darurat dan pembaruan rambu).`
  },
  {
    id: 'doc-studi-kelayakan-konstruksi',
    name: 'Studi Kelayakan Proyek Konstruksi',
    iconType: 'building',
    prompt: `Tulis Studi Kelayakan Konstruksi dengan kerangka baku berikut:
    <h1>STUDI KELAYAKAN (FEASIBILITY STUDY) PROYEK KONSTRUKSI</h1>
    <h2>BAB I. RINGKASAN KELAYAKAN PROYEK</h2>
    (Rangkum kelayakan teknis/finansial dari [AI_SUMMARY]. Sebutkan predikat kelayakan [AI_SCORE]).
    <h2>BAB II. DESKRIPSI & SPESIFIKASI PROYEK</h2>
    (Narasikan [FORM_DATA] terkait detail bangunan, vendor, dan lokasi).
    <h2>BAB III. EVALUASI RAB, KURVA S, & KAPASITAS KONTRAKTOR</h2>
    (Pecah [AI_BLOCKS] dan [AI_METRICS] menjadi analisis BoQ/Harga, ketepatan timeline, dan mutu material).
    <h2>BAB IV. MANAJEMEN RISIKO KONSTRUKSI (CONSTRUCTION RISKS)</h2>
    (Jabarkan [AI_SWOT]. Wajib merinci [AI_RISKS] seperti cost-overrun, cuaca ekstrim, atau gagal struktur).
    <h2>BAB V. VALUE ENGINEERING & REKOMENDASI KEPUTUSAN</h2>
    (Berikan kesimpulan operasional dari [AI_ACTIONS] terkait persetujuan tender atau revisi anggaran).`
  },

  // ==========================================
  // KELOMPOK 7: UMUM & LAINNYA
  // ==========================================
  {
    id: 'doc-pengajuan-kredit-5c',
    name: 'Proposal Pengajuan Pembiayaan Bank (5C)',
    iconType: 'finance',
    prompt: `Tulis Proposal Kredit Bank dengan kerangka baku berikut:
    <h1>PROPOSAL PENGAJUAN PEMBIAYAAN KREDIT USAHA</h1>
    <h2>BAB I. RINGKASAN KELAYAKAN KREDIT</h2>
    (Tulis [AI_SUMMARY] dan potensi persetujuan plafon berdasarkan [AI_SCORE]).
    <h2>BAB II. PROFIL & LEGALITAS PEMOHON</h2>
    (Rangkum data [FORM_DATA] dengan gaya formal perbankan).
    <h2>BAB III. ANALISIS KELAYAKAN PRINSIP 5C</h2>
    (Jabarkan [AI_BLOCKS] dan [AI_METRICS] secara spesifik ke dalam: Character, Capacity (Cashflow), Capital, Collateral, Condition).
    <h2>BAB IV. MITIGASI RISIKO KREDIT MACET (NPL)</h2>
    (Tunjukkan analisis tajam dari [AI_SWOT] dan langkah mitigasi gagal bayar dari [AI_RISKS]).
    <h2>BAB V. RINCIAN PENGGUNAAN DANA & REKOMENDASI</h2>
    (Gunakan [AI_ACTIONS] untuk memperjelas tujuan pembiayaan dan struktur tenor yang disarankan).`
  },
  {
    id: 'doc-sustainability-report',
    name: 'Laporan Keberlanjutan (ESG / Sustainability)',
    iconType: 'target',
    prompt: `Tulis Laporan ESG dengan kerangka baku berikut:
    <h1>LAPORAN KEBERLANJUTAN LINGKUNGAN & SOSIAL (ESG)</h1>
    <h2>BAB I. KOMITMEN KEBERLANJUTAN ORGANISASI</h2>
    (Tulis narasi inspiratif dari [AI_SUMMARY] dan skor hijau [AI_SCORE]).
    <h2>BAB II. PROFIL ENTITAS & RANTAI PASOK</h2>
    (Ambil identitas operasi dari [FORM_DATA]).
    <h2>BAB III. EVALUASI DAMPAK LINGKUNGAN & PEMBERDAYAAN SOSIAL</h2>
    (Bedah [AI_BLOCKS] dan [AI_METRICS] terkait jejak karbon, limbah, efisiensi energi, dan CSR).
    <h2>BAB IV. TANTANGAN EKONOMI SIRKULAR (RISK & SWOT)</h2>
    (Sajikan [AI_SWOT]. Wajib menguraikan potensi risiko greenwashing atau pelanggaran regulasi limbah dari [AI_RISKS]).
    <h2>BAB V. PETA JALAN MASA DEPAN BUMI (ACTION PLAN)</h2>
    (Rangkum inisiatif berkelanjutan selanjutnya dari [AI_ACTIONS]).`
  }
];