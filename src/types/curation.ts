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
  
  // ---> TAMBAHAN ENTERPRISE-GRADE <---
  dataConfidenceScore: number; 
  contradictionsFound: string[];
  // -----------------------------------
  
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

export type FieldType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'file' | 'select' | 'date';

export interface FormField {
  id: string;             
  label: string;          
  type: FieldType;        
  required: boolean;      
  placeholder?: string;   
  description?: string;   
  options?: any[]; // Bisa berisi string[] atau { label: string, weight: number }[]
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

  customSystemPrompt?: string; 
  negativePrompts?: string;    
  formatInstructions?: string; 
  customScoringRubric?: string; 
  researchSourcesCited?: string[]; // <--- TAMBAHAN UNTUK RISET ENTERPRISE
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