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
  },
  // ==========================================
  // KELOMPOK 5: KONSELING, PSIKOLOGI & LIFE COACHING
  // ==========================================
  {
    id: 'metaphorical-projection',
    name: 'Konseling Berbasis Perumpamaan (Metaphorical Choice)',
    description: 'Menggunakan skenario metaforis (perumpamaan visual/situasi) untuk menggali kondisi bawah sadar tanpa pertanyaan langsung yang mengintimidasi.',
    suitableFor: 'Konseling kesehatan mental awal, pemetaan trauma tersembunyi, dan asesmen kepribadian proyektif.',
    aiInstruction: 'Ini adalah formulir PROYEKSI METAFORIS. Gunakan input tipe "radio" atau "select" di mana setiap pilihan jawaban berupa perumpamaan (contoh: "Jika masalah Anda adalah cuaca, cuaca apakah itu?"). Instruksikan AI untuk membaca makna psikologis di balik metafora yang dipilih peserta. Hindari input "number" atau metrik kaku.'
  },
  {
    id: 'cbt-cognitive-distortion',
    name: 'Analisis Distorsi Kognitif (Pendekatan CBT)',
    description: 'Memetakan pola pikir negatif otomatis (Automatic Negative Thoughts) melalui pilihan ganda berbasis reaksi terhadap situasi spesifik.',
    suitableFor: 'Sesi pra-konseling kecemasan (anxiety), manajemen amarah, dan terapi perilaku kognitif dasar.',
    aiInstruction: 'Ini adalah instrumen ANALISIS KOGNITIF. Berikan skenario pemicu stres, lalu gunakan "radio" berbobot dengan opsi jawaban yang mewakili distorsi kognitif berbeda (seperti *Catastrophizing*, *Black-and-White Thinking*, atau *Overgeneralization*). Gunakan "textarea" opsional jika peserta ingin menjelaskan konteks tambahan.'
  },
  {
    id: 'behavioral-frequency-scale',
    name: 'Skala Frekuensi Perilaku & Burnout',
    description: 'Mengukur intensitas dan frekuensi gejala kelelahan mental atau fisik menggunakan skala frekuensi waktu yang presisi.',
    suitableFor: 'Deteksi dini burnout karyawan, asesmen depresi situasional, dan evaluasi keseimbangan hidup (work-life balance).',
    aiInstruction: 'Gunakan input tipe "radio" dengan skala frekuensi baku (contoh: "Tidak Pernah", "Beberapa Hari", "Hampir Setiap Hari"). DILARANG menggunakan pertanyaan terbuka ("text" atau "textarea") untuk metrik utama agar AI dapat mengakumulasi skor risiko dengan akurat. Terapkan logika "showIf" untuk memunculkan pertanyaan krisis jika skor frekuensi sangat tinggi.'
  },
  {
    id: 'situational-relationship-dynamics',
    name: 'Dinamika Resolusi Konflik (Konseling Pasangan)',
    description: 'Memberikan skenario konflik domestik atau finansial dengan pilihan ganda untuk melihat gaya komunikasi dan resolusi pasangan.',
    suitableFor: 'Konseling pranikah, mediasi konflik hubungan, dan evaluasi kecocokan (compatibility test).',
    aiInstruction: 'Ini adalah formulir DINAMIKA HUBUNGAN. Pertanyaan harus berupa skenario konflik spesifik (misal: "Pasangan Anda lupa hari penting, apa respons pertama Anda?"). Opsi jawaban pada "radio" harus memetakan gaya komunikasi (Pasif-Agresif, Asertif, Menghindar, atau Meledak-ledak). Jangan gunakan unggahan "file".'
  },
  {
    id: 'values-alignment-sort',
    name: 'Penyelarasan Nilai Hidup (Core Values Sorting)',
    description: 'Memaksa pengguna memilih dan mengorbankan prioritas hidup melalui pilihan ganda yang sulit (trade-offs) untuk menemukan nilai inti sejati.',
    suitableFor: 'Pencarian jati diri (Quarter-Life Crisis), transisi karir (Career Pivot), dan life coaching.',
    aiInstruction: 'Ini adalah formulir PRIORITAS NILAI. Gunakan pertanyaan pilihan ganda ("radio") yang memaksa peserta memilih antara dua nilai positif (contoh: "Keamanan Finansial" vs "Kebebasan Waktu"). AI bertugas menganalisis pola pilihan yang mendominasi untuk merumuskan kompas moral atau tujuan karir peserta.'
  },
  {
    id: 'trauma-trigger-inventory',
    name: 'Pemetaan Pemicu Emosional (Trauma-Informed)',
    description: 'Inventarisasi kepekaan terhadap pemicu stres (triggers) sensorik atau emosional menggunakan pilihan ganda berlapis yang aman dan tidak memicu trauma ulang.',
    suitableFor: 'Persiapan sesi terapi trauma (PTSD), konseling duka (Grief), dan pendampingan psikologis intensif.',
    aiInstruction: 'Ini adalah formulir SENSITIF TRAUMA. DILARANG KERAS memaksa peserta menuliskan detail kejadian traumatis di "textarea". Gunakan "checkbox" atau "radio" berbobot rendah untuk membiarkan mereka memilih situasi apa yang memicu reaksi fisik (misal: suara keras, kritik, diabaikan). Berikan opsi "Lewati" pada setiap pertanyaan.'
  },
  {
    id: 'career-archetype-quiz',
    name: 'Kuis Pola Dasar Karir & Bakat (Archetype)',
    description: 'Kuis interaktif yang mengarahkan peserta pada profil karakter spesifik berdasarkan serangkaian keputusan insting.',
    suitableFor: 'Penjurusan minat bakat siswa, penempatan peran dalam tim (Role Fit), dan orientasi pegawai baru.',
    aiInstruction: 'Ini adalah KUIS ARCHETYPE. Susun pilihan ganda ("radio") di mana setiap jawaban memiliki bobot tersembunyi yang mengarah ke salah satu persona (misal: Sang Kreator, Sang Analis, Sang Pemimpin). AI harus mengakumulasi opsi yang paling banyak dipilih untuk merilis laporan profil persona yang komprehensif.'
  },
  {
    id: 'health-behavior-ttm',
    name: 'Asesmen Perubahan Perilaku (COM-B & TTM)',
    description: 'Pemetaan psikologis komprehensif untuk mengukur kesiapan klien merubah gaya hidup, deteksi makan emosional, dan aktivitas fisik.',
    suitableFor: 'Intervensi gaya hidup (Lifestyle Medicine), konseling gizi psikologis, personal training, dan terapi habituasi holistik.',
    aiInstruction: 'Ini adalah instrumen PERUBAHAN PERILAKU (TTM). Gunakan kombinasi tipe "radio" berskala Likert untuk mengukur tingkat kesiapan perubahan (dari Pre-kontemplasi hingga Pemeliharaan). Gunakan tipe "radio" berbasis skenario untuk mendeteksi pemicu makan emosional atau hambatan olahraga. Hindari penggunaan "text" atau "textarea" untuk opini umum; paksa peserta memilih opsi yang paling mewakili respons psikologis mereka agar AI dapat mengukur metrik TTM dan COM-B secara presisi.'
  },
  {
    id: 'pns-merit-assessment',
    name: 'Asesmen Merit & Wawancara PNS',
    description: 'Instrumen evaluasi kinerja berbasis cascading SKP, perilaku BerAKHLAK, dan pemetaan matriks talenta (9-Box Grid).',
    suitableFor: 'Evaluasi kinerja rutin ASN, wawancara promosi/mutasi, penilaian kompetensi manajerial, dan manajemen talenta di unit kerja atau UPT.',
    aiInstruction: 'Ini adalah formulir ASESMEN PNS & SISTEM MERIT. Gunakan kombinasi input "radio" berbobot (0-100) untuk mengukur implementasi Core Values BerAKHLAK dan persentase pencapaian RHK/SKP. Terapkan logika bercabang (showIf) untuk meminta justifikasi ("textarea") wajib JIKA capaian kinerja di bawah ekspektasi. Wajibkan penggunaan input unggah dokumen ("file") sebagai bukti fisik validasi SKP Tahunan dan riwayat sertifikasi Diklat kompetensi.'
  },
];