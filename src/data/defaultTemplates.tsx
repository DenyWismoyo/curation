import { FormTemplate } from "@/types/curation";

export const defaultTemplates: FormTemplate[] = [
  {
    id: "startup_tech",
    trackName: "Startup Teknologi",
    trackDescription: "Aplikasi, SaaS, atau Platform Digital.",
    trackIcon: "Rocket",
    isActive: true,
    version: 1,
    lastUpdated: new Date().toISOString(),
    steps: [
      {
        stepNumber: 1,
        title: "Identitas Startup",
        icon: "Rocket",
        fields: [
          { id: "namaUsaha", label: "Nama Startup", type: "text", required: true, gridSpan: 2 },
          { id: "namaPemilik", label: "Nama Founder/CEO", type: "text", required: true, gridSpan: 2 },
          { id: "whatsapp", label: "Nomor WhatsApp", type: "text", required: true, placeholder: "0812...", gridSpan: 1 },
          { id: "email", label: "Email Resmi", type: "text", required: true, placeholder: "halo@startup.com", gridSpan: 1 },
          { id: "masalah", label: "Problem Statement", type: "textarea", required: false, placeholder: "Masalah besar apa yang Anda selesaikan?", gridSpan: 2 },
          { id: "solusi", label: "Solusi Statement", type: "textarea", required: false, placeholder: "Bagaimana teknologinya?", gridSpan: 2 }
        ]
      },
      {
        stepNumber: 2,
        title: "Kesiapan & Moat",
        fields: [
          { id: "statusProduk", label: "Status Produk", type: "radio", required: true, options: ["Idea", "MVP", "Live", "Scaling"], gridSpan: 2 },
          { id: "unfairAdvantage", label: "Unfair Advantage", type: "checkbox", required: false, options: ["Network Effect", "IP/Patent", "Data Monopoly", "Founder Expertise"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 3,
        title: "Unit Economics",
        fields: [
          { id: "modelMonetisasi", label: "Monetisasi", type: "radio", required: true, options: ["SaaS", "Take Rate", "Freemium", "License"], gridSpan: 2 },
          { id: "mrr", label: "Pendapatan (MRR)", type: "text", required: false, placeholder: "Cth: Rp 50 Jt", gridSpan: 1 },
          { id: "activeUsers", label: "Active Users (MAU)", type: "text", required: false, placeholder: "Cth: 15.000", gridSpan: 1 },
          { id: "grossMargin", label: "Gross Margin (%)", type: "text", required: false, placeholder: "Cth: 75%", gridSpan: 1 },
          { id: "ltvCacRatio", label: "LTV to CAC Ratio", type: "text", required: false, placeholder: "Cth: 3:1", gridSpan: 1 }
        ]
      },
      {
        stepNumber: 4,
        title: "Tim Inti & Saham",
        fields: [
          { id: "capTableFounder", label: "Saham Founder", type: "radio", required: true, options: ["> 70%", "50-70%", "< 50%"], gridSpan: 2 },
          { id: "komposisiTim", label: "Komposisi Tim", type: "checkbox", required: false, options: ["Hustler", "Hacker", "Hipster"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 5,
        title: "Nafas Kas & Funding",
        fields: [
          { id: "statusPendanaan", label: "Status Pendanaan", type: "radio", required: true, options: ["Bootstrapped", "Pre-Seed", "Seed", "Series A+"], gridSpan: 2 },
          { id: "runway", label: "Runway Saat Ini", type: "radio", required: true, options: ["Kritis (< 3 Bln)", "Waspada (3-6 Bln)", "Aman (> 6 Bln)"], gridSpan: 2 },
          { id: "bentukPendanaan", label: "Instrumen Dicari", type: "radio", required: false, options: ["Equity", "Convertible", "Grant"], gridSpan: 2 },
          { id: "budgetMarketing", label: "Target Pendanaan", type: "text", required: false, placeholder: "Cth: $200k USD", gridSpan: 2 }
        ]
      },
      {
        stepNumber: 6,
        title: "Data Room",
        description: "Unggah dokumen untuk memperkuat profil di depan kurator.",
        fields: [
          { id: "pitchDeckFile", label: "Pitch Deck (PDF)", type: "file", required: false, fileAccept: ".pdf", gridSpan: 1 },
          { id: "legalitasFile", label: "Akta Pendirian (PDF)", type: "file", required: false, fileAccept: ".pdf", gridSpan: 1 }
        ]
      }
    ]
  },
  {
    id: "umkm_fisik",
    trackName: "UMKM & Produk Fisik",
    trackDescription: "F&B, Fashion, Kriya, atau Manufaktur.",
    trackIcon: "Store",
    isActive: true,
    version: 1,
    lastUpdated: new Date().toISOString(),
    steps: [
      {
        stepNumber: 1,
        title: "Identitas UMKM",
        icon: "Store",
        fields: [
          { id: "namaUsaha", label: "Nama Usaha / Brand", type: "text", required: true, gridSpan: 2 },
          { id: "namaPemilik", label: "Nama Pemilik", type: "text", required: true, gridSpan: 1 },
          { id: "tahunBerdiri", label: "Tahun Berdiri", type: "text", required: false, placeholder: "Cth: 2021", gridSpan: 1 },
          { id: "alamat", label: "Alamat Lengkap", type: "textarea", required: true, gridSpan: 2 },
          { id: "whatsapp", label: "Nomor WhatsApp", type: "text", required: true, gridSpan: 1 },
          { id: "email", label: "Email Usaha", type: "text", required: true, placeholder: "halo@brand.com", gridSpan: 1 }
        ]
      },
      {
        stepNumber: 2,
        title: "Profil Produk",
        fields: [
          { id: "jenisUsaha", label: "Kategori Usaha", type: "radio", required: true, options: ["Makanan/Minum", "Fashion", "Craft/Kriya", "Kosmetik", "Lainnya"], gridSpan: 2 },
          { id: "deskripsi", label: "Deskripsi Singkat", type: "textarea", required: false, placeholder: "Ceritakan detail produk...", gridSpan: 2 },
          { id: "keunggulan", label: "Keunggulan", type: "checkbox", required: false, options: ["Handmade", "Lokal", "Eco-Friendly", "Premium"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 3,
        title: "Kapasitas & Legalitas",
        fields: [
          { id: "kapasitas", label: "Kapasitas per Bulan", type: "radio", required: true, options: ["< 100 unit", "100 - 500 unit", "500 - 1.000 unit", "> 1.000 unit"], gridSpan: 2 },
          { id: "sistemProduksi", label: "Sistem Produksi", type: "radio", required: true, options: ["Manual", "Semi otomatis", "Otomatis"], gridSpan: 1 },
          { id: "statusMerek", label: "Status Merek (HAKI)", type: "radio", required: false, options: ["Terdaftar", "Proses", "Belum"], gridSpan: 1 },
          { id: "legalitas", label: "Sertifikasi", type: "checkbox", required: false, options: ["NIB", "PIRT", "Halal", "BPOM"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 4,
        title: "Penjualan & Kendala",
        fields: [
          { id: "omset", label: "Omset per Bulan", type: "radio", required: true, options: ["< Rp 5 juta", "Rp 5-25 juta", "Rp 25-100 juta", "> Rp 100 juta"], gridSpan: 2 },
          { id: "channels", label: "Kanal Aktif", type: "checkbox", required: false, options: ["Offline", "Instagram", "TikTok", "Shopee/Tokopedia"], gridSpan: 2 },
          { id: "kendala", label: "Kendala Utama", type: "checkbox", required: false, options: ["Branding", "Modal", "Pemasaran", "Produksi"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 5,
        title: "Dokumen Produk",
        description: "Unggah dokumen kelengkapan untuk validasi produk unggulan.",
        fields: [
          { id: "fotoProdukFile", label: "Foto Produk (JPG/PNG)", type: "file", required: false, fileAccept: "image/*", gridSpan: 1 },
          { id: "katalogFile", label: "Katalog (PDF)", type: "file", required: false, fileAccept: ".pdf", gridSpan: 1 }
        ]
      }
    ]
  },
  {
    id: "jasa_agensi",
    trackName: "Bisnis Jasa / Agensi",
    trackDescription: "Software House, Konsultan, atau Kreatif.",
    trackIcon: "Briefcase",
    isActive: true,
    version: 1,
    lastUpdated: new Date().toISOString(),
    steps: [
      {
        stepNumber: 1,
        title: "Identitas Agensi",
        icon: "Briefcase",
        fields: [
          { id: "namaUsaha", label: "Nama Agensi", type: "text", required: true, gridSpan: 2 },
          { id: "namaPemilik", label: "Nama Founder/Direktur", type: "text", required: true, gridSpan: 1 },
          { id: "tahunBerdiri", label: "Tahun Berdiri", type: "text", required: false, placeholder: "Cth: 2021", gridSpan: 1 },
          { id: "whatsapp", label: "Nomor WhatsApp", type: "text", required: true, gridSpan: 1 },
          { id: "email", label: "Email Resmi", type: "text", required: true, placeholder: "halo@agensi.com", gridSpan: 1 },
          { id: "jenisUsaha", label: "Jenis Layanan Utama", type: "text", required: true, placeholder: "Cth: Digital Marketing", gridSpan: 2 },
          { id: "website", label: "Link Portofolio/Website", type: "text", required: false, placeholder: "https://...", gridSpan: 2 }
        ]
      },
      {
        stepNumber: 2,
        title: "Kapasitas & Legalitas",
        fields: [
          { id: "tenagaKerja", label: "Total Ukuran Tim", type: "radio", required: true, options: ["Boutique (1-3)", "Kecil (4-10)", "Menengah (11-30)", "Besar (>30)"], gridSpan: 2 },
          { id: "sistemProduksi", label: "Sistem Kerja", type: "radio", required: true, options: ["In-house", "Outsource", "Hybrid"], gridSpan: 2 },
          { id: "legalEntity", label: "Status Badan Hukum", type: "radio", required: true, options: ["Belum Ada", "CV", "PT Perorangan", "PT"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 3,
        title: "Model Pendapatan",
        fields: [
          { id: "modelBisnis", label: "Model Harga Dominan", type: "radio", required: true, options: ["Project-Based", "Retainer", "Hourly Rate", "Success Fee"], gridSpan: 2 },
          { id: "averageOrderValue", label: "Rata-rata Nilai Proyek (AOV)", type: "text", required: false, placeholder: "Cth: Rp 15 Juta", gridSpan: 1 },
          { id: "omset", label: "Rata-rata Omset per Bulan", type: "text", required: false, placeholder: "Cth: Rp 100 Juta", gridSpan: 1 }
        ]
      },
      {
        stepNumber: 4,
        title: "Klien & Growth",
        fields: [
          { id: "customerRetention", label: "Tingkat Retensi Klien", type: "radio", required: true, options: ["Rendah", "Menengah", "Tinggi"], gridSpan: 2 },
          { id: "channels", label: "Strategi Akuisisi", type: "checkbox", required: false, options: ["Referral", "Paid Ads", "Cold Outreach", "Inbound"], gridSpan: 2 },
          { id: "kendala", label: "Kendala Kritis", type: "checkbox", required: false, options: ["Founder Dependent", "Talent Acquisition", "Cashflow Issues", "Lead Generation"], gridSpan: 2 }
        ]
      },
      {
        stepNumber: 5,
        title: "Dokumen Pendukung",
        description: "Unggah dokumen agar kurator dapat menilai kelayakan Anda secara komprehensif.",
        fields: [
          { id: "portfolioFile", label: "Company Profile / Portofolio (PDF)", type: "file", required: false, fileAccept: ".pdf", gridSpan: 1 },
          { id: "legalitasFile", label: "Dokumen Legalitas (PDF)", type: "file", required: false, fileAccept: ".pdf", gridSpan: 1 }
        ]
      }
    ]
  }
];