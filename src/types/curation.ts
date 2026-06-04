export type ViewState = 'landing' | 'track-select' | 'wizard' | 'processing' | 'dashboard';

export interface CurationFormData {
  // Identitas Dasar
  namaUsaha?: string;
  namaPemilik?: string;
  tahunBerdiri?: string;
  email?: string;
  whatsapp?: string;
  deskripsi?: string;
  omset?: string;
  kendala?: string[];

  // Bidang Jasa / Agensi
  jenisUsaha?: string;
  website?: string;
  tenagaKerja?: string;
  sistemProduksi?: string;
  legalEntity?: string;
  legalitas?: string[];
  modelBisnis?: string;
  averageOrderValue?: string;
  customerRetention?: string;
  channels?: string[];

  // UMKM & Produk Fisik
  alamat?: string;
  instagram?: string;
  tiktok?: string;
  keunggulan?: string[];
  kapasitas?: string;
  konsistensi?: string;
  statusMerek?: string;
  kualitasKemasan?: string;

  // Startup Teknologi
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

  // File Uploads (Tipe diperbaiki dari 'any' menjadi 'File | null')
  portfolioFile?: File | null;
  legalitasFile?: File | null;
  fotoProdukFile?: File | null;
  katalogFile?: File | null;
  pitchDeckFile?: File | null;
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