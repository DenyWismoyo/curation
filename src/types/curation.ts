export type ViewState = 'landing' | 'track-select' | 'wizard' | 'processing' | 'dashboard';

export interface CurationFormData {
  [key: string]: any; 
}

// Skema output metrik penilaian dinamis
export interface DynamicMetric {
  label: string;      // Contoh: "Kesiapan Teknologi (TRL)" atau "Kesehatan SHU Koperasi"
  score: number;      // Nilai skala 0 - 100
  description: string; // Alasan penilaian singkat dari AI
}

// Skema output blok rekomendasi dinamis
export interface DynamicSection {
  title: string;      // Contoh: "Strategi HAKI & Komersialisasi" atau "Rencana Skalasi Bisnis"
  content: string;    // Isi analisis detail dari AI
}

// Integrasi hasil analisa AI yang fleksibel mengikuti template
export interface AIResult {
  readinessLevel: string;
  totalScore: number;
  incubationRoute: string;
  metrics: DynamicMetric[]; 
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: DynamicSection[];
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

export type FieldType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'file';

export interface FormField {
  id: string;             
  label: string;          
  type: FieldType;        
  required: boolean;      
  placeholder?: string;   
  description?: string;   
  options?: string[];     
  fileAccept?: string;    
  gridSpan?: 1 | 2;       
}

export interface FormStep {
  stepNumber: number;
  title: string;
  icon?: string;          
  description?: string;
  fields: FormField[];    
}

// Konfigurasi instruksi AI khusus untuk setiap template
export interface AiPromptConfig {
  expectedMetrics: string[];         // Metrik yang wajib dinilai oleh AI
  expectedRecommendations: string[]; // Judul blok rekomendasi strategis yang wajib dibuat AI
}

export interface FormTemplate {
  id: string;             
  trackName: string;      
  trackDescription: string;
  trackIcon: string;      
  isActive: boolean;      
  version: number;
  lastUpdated: string;
  steps: FormStep[];
  aiPromptConfig?: AiPromptConfig; // Opsional untuk template custom baru
}