// src/types/curation.ts

export type ViewState = 'landing' | 'track-select' | 'wizard' | 'processing' | 'dashboard';

export interface CurationFormData {
  [key: string]: any; 
}

export interface DynamicMetric {
  label: string;
  score: number;
  description: string;
}

export interface DynamicSection {
  title: string;
  content: string;
}

export interface CustomAnalysisBlock {
  title: string;
  iconType: string;
  metrics: {
    label: string;
    value: string;
  }[];
}

export interface AIResult {
  readinessLevel: string;
  totalScore: number;
  dataConfidenceScore: number; 
  contradictionsFound: string[];
  incubationRoute: string;
  executiveSummary: string;
  customAnalysisBlocks: CustomAnalysisBlock[];
  fileAnalysisInsights?: {
    documentQuality: string;
    keyFindingsFromFiles: string[];
    discrepancies: string;
  };
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
  nextActionSteps: {
    timeframe: string;
    task: string;
  }[];
  formPurpose?: FormDomainPurpose;
  customUiLabels?: CustomUiLabels;
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

export type FieldType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'file' | 'select' | 'date';

export interface FormField {
  id: string;             
  label: string;          
  type: FieldType;        
  required: boolean;      
  placeholder?: string;   
  description?: string;   
  options?: any[]; 
  fileAccept?: string;    
  gridSpan?: 1 | 2;       
  showIf?: {
    fieldId: string;
    equals: string | number | boolean;
  };
}

export interface FormStep {
  stepNumber: number;
  title: string;
  icon?: string;          
  description?: string;
  fields: FormField[];    
}

export type FormDomainPurpose = 'assessment' | 'counseling' | 'monitoring' | 'consultation' | 'custom';

export interface CustomUiLabels {
  scoreLabel?: string;
  swotLabel?: string;
  riskLabel?: string;
  roadmapLabel?: string;
  executionLabel?: string;
}

export interface AiPromptConfig {
  aiPersona?: string;
  reportTone?: 'investigative' | 'consultative' | 'academic';
  gradingStrictness?: 'supportive' | 'standard' | 'strict';
  
  assessmentGoal?: string;
  mediaAnalysisFocus?: 'pitch-delivery' | 'ui-ux-design' | 'product-demo';
  riskFramework?: string;

  // FITUR BARU: Variabel kontrol skala/volume output AI
  targetMetricCount?: number;
  targetBlockCount?: number;
  targetTierCount?: number;
  targetRecommendationCount?: number;

  customReadinessTiers?: string[];
  expectedMetrics: string[];
  expectedAnalysisBlocks?: string[]; 
  expectedRecommendations: string[];

  customSystemPrompt?: string; 
  negativePrompts?: string;    
  formatInstructions?: string; 
  customScoringRubric?: string; 
  researchSourcesCited?: string[];
  
  formPurpose?: FormDomainPurpose; 
  customUiLabels?: CustomUiLabels;
}

export interface FormTemplate {
  id: string;             
  trackName: string;      
  trackDescription: string;
  trackIcon: string;      
  isActive: boolean;      
  version: number;
  lastUpdated: string;
  isDisplayedOnLanding?: boolean; // Tampil/Sembunyi di Landing Page B2C
  isPaid?: boolean;               // Toggle Berbayar / Gratis
  trialQuota?: number;            // Input kuota trial (0 = Tanpa Trial)
  price?: number;                 // Harga (Rp)
  discountPercentage?: number;    // Persentase Diskon (0 - 100)
  discountExpiry?: string;        // Batas waktu promo diskon (Format ISO String)
  isBestSeller?: boolean;         // Toggle "Best Seller / Terpopuler"
  userCount?: number;             // Dummy jumlah pengguna (Social Proof)
  customUSPs?: string[];          // Keunggulan tambahan khusus modul ini
  steps: FormStep[]; 
  aiPromptConfig?: AiPromptConfig;
  folder?: string;
  formBuilderInstruction?: string;
  preferredQuestionTypes?: string[];
}

export interface AssessmentPayload {
  selfScore?: number;
  isConfirmedEarnest?: boolean;
}

export type ExportRole = 'public' | 'admin' | 'curator';

export interface UniversalPDFProps {
  role: ExportRole;
  trackType: string;
  formData: CurationFormData;
  aiResult: AIResult;
  curatorNotes?: string | null;
  corporateEntity?: string;
  timestamp: string;
  watermarkText?: string; 
}

export interface AssessmentData { 
  documentGenerationQuota?: number;
  hasPaidForDocument?: boolean;
  allowedDocumentTemplates?: string[]; 
}