export type ViewState = 'landing' | 'track-select' | 'wizard' | 'processing' | 'dashboard';

export interface CurationFormData {
  // Identitas Dasar Umum
  namaUsaha?: string;
  namaPemilik?: string;
  tahunBerdiri?: string;
  whatsapp?: string;
  email?: string;
  deskripsi?: string;
  omset?: string;
  channels?: string[];
  kendala?: string[];
  legalitas?: string[];
  sistemProduksi?: string;
  jenisUsaha?: string;
  website?: string;

  // Khusus Bisnis Jasa / Agensi
  tenagaKerja?: string;
  legalEntity?: string;
  modelBisnis?: string;
  averageOrderValue?: string;
  customerRetention?: string;

  // Khusus UMKM & Produk Fisik
  alamat?: string;
  instagram?: string;
  tiktok?: string;
  keunggulan?: string[];
  kapasitas?: string;
  konsistensi?: string;
  statusMerek?: string;
  kualitasKemasan?: string;

  // Khusus Startup Teknologi
  masalah?: string;
  solusi?: string;
  statusProduk?: string;
  unfairAdvantage?: string[];
  modelMonetisasi?: string;
  mrr?: string;
  activeUsers?: string;
  grossMargin?: string;
  ltvCacRatio?: string;
  capTableFounder?: string;
  komposisiTim?: string[];
  statusPendanaan?: string;
  runway?: string;
  bentukPendanaan?: string;
  budgetMarketing?: string;

  // File Uploads (File saat di form, string URL saat diambil dari Firebase)
  portfolioFile?: File | string | null;
  legalitasFile?: File | string | null;
  fotoProdukFile?: File | string | null;
  katalogFile?: File | string | null;
  pitchDeckFile?: File | string | null;
}

export interface AIResult {
  readinessLevel: string;
  totalScore: number;
  scoreBreakdown: {
    productAndTech: number;
    marketAndFinancial: number;
    legalAndCompliance: number;
  };
  recommendations: {
    targetMarket: string;
    pricingAndMonetization: string;
    distributionAndGrowth: string;
    productImprovement: string;
    investmentReadiness: string;
    nextActionSteps: string[];
    incubationRoute: string;
  };
}

export interface CurationHistory {
  id: string;
  date: string;
  trackType: string;
  namaUsaha: string;
  score: number;
  data: CurationFormData;
  result: AIResult;
}