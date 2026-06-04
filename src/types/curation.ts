export type ViewState = 'landing' | 'track-select' | 'wizard' | 'processing' | 'dashboard';

// ==========================================
// 1. TIPE DATA LAMA (Mempertahankan kompatibilitas AI & History)
// ==========================================
export interface CurationFormData {
  [key: string]: any; // Diperlonggar agar menerima dynamic keys dari form dinamis
}

export interface AIResult {
  readinessLevel: string;
  totalScore: number;
  radarMetrics: {
    productInnovation: number;
    marketPotential: number;
    financialHealth: number;
    teamCapability: number;
    operationalScalability: number;
    legalAndCompliance: number;
  };
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: {
    executiveSummary: string;
    targetMarket: string;
    pricingAndMonetization: string;
    goToMarketStrategy: string;
    productRoadmap: string;
    financialOptimization: string;
    investmentReadiness: string;
    incubationRoute: string;
  };
  riskAssessment: {
    criticalRisks: string[];
    mitigationStrategies: string[];
  };
  nextActionSteps: string[];
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

// ==========================================
// 2. TIPE DATA BARU (Sistem Form Dinamis / Schema-Driven)
// ==========================================
export type FieldType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'file';

export interface FormField {
  id: string;             // Key untuk disimpan di formData (contoh: "namaUsaha")
  label: string;          // Label pertanyaan yang ditampilkan
  type: FieldType;        // Jenis input
  required: boolean;      // Wajib diisi atau tidak
  placeholder?: string;   // Teks placeholder opsional
  description?: string;   // Penjelasan tambahan di bawah label
  options?: string[];     // Array pilihan (Untuk radio & checkbox)
  fileAccept?: string;    // Ekstensi file (contoh: ".pdf, image/*")
  gridSpan?: 1 | 2;       // 1 = Setengah kolom, 2 = Lebar penuh (Di desktop)
}

export interface FormStep {
  stepNumber: number;
  title: string;
  icon?: string;          // Nama icon Lucide opsional
  description?: string;
  fields: FormField[];    // Kumpulan field dalam satu step
}

export interface FormTemplate {
  id: string;             // ID Track (contoh: "startup_tech")
  trackName: string;      // Nama Tampilan (contoh: "Startup Teknologi")
  trackDescription: string;
  trackIcon: string;      // Nama Icon Lucide (contoh: "Rocket")
  isActive: boolean;      // Status visibilitas
  version: number;
  lastUpdated: string;
  steps: FormStep[];
}