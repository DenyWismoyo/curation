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
  
  // BLOK DINAMIS (Menggantikan financial, market, team, investment statis)
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

export interface AiPromptConfig {
  aiPersona?: string;
  assessmentGoal?: string;
  expectedAnalysisBlocks?: string[]; // TAMBAHAN BARU
  expectedMetrics: string[];
  expectedRecommendations: string[];
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
}

export interface AssessmentPayload {
  selfScore?: number;
  isConfirmedEarnest?: boolean;
}