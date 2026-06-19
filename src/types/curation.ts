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

// UPGRADE: Tambahan tipe field 'select' dan 'date'
// Di dalam src/types/curation.ts (Timpa interface FormField)

export type FieldType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'file' | 'select' | 'date';

export interface FormField {
  id: string;             
  label: string;          
  type: FieldType;        
  required: boolean;      
  placeholder?: string;   
  description?: string;   
  // UPDATE: options sekarang bisa berupa string biasa ATAU objek berbobot
  options?: any[]; // Bisa berisi string[] atau { label: string, weight: number }[]
  fileAccept?: string;    
  gridSpan?: 1 | 2;       
  // FITUR BARU: Conditional Logic
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

export interface AiPromptConfig {
  aiPersona?: string;
  reportTone?: 'investigative' | 'consultative' | 'academic';
  gradingStrictness?: 'supportive' | 'standard' | 'strict';
  
  assessmentGoal?: string;
  mediaAnalysisFocus?: 'pitch-delivery' | 'ui-ux-design' | 'product-demo';
  riskFramework?: string;

  customReadinessTiers?: string[];
  expectedMetrics: string[];
  expectedAnalysisBlocks?: string[]; 
  expectedRecommendations: string[];

  // ---> EKSTENSI ULTRA KOMPREHENSIF (ADVANCED CONFIG) <---
  customSystemPrompt?: string; 
  negativePrompts?: string;    
  formatInstructions?: string; 
  customScoringRubric?: string; // BARU: Rubrik Skor Matematik Eksak
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
  aiPromptConfig?: AiPromptConfig;
  folder?: string;
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