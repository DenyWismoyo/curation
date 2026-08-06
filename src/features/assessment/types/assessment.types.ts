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

// 1. TAMBAHAN BARU: Interface untuk Action Plan Checklist
export interface ActionItem {
  id: string;
  task: string;
  description: string;
  timeframe: string;
  isCompleted: boolean;
  contextualTip?: string; // NEW: Tips praktis/motivasi harian
  searchKeyword?: string; // NEW: Kata kunci pencarian resource
  youtubeRecommendations?: {
    title: string;
    query: string;
  }[];
  subTasks?: {
    id: string;
    text: string;
    isCompleted: boolean;
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
  // 2. TAMBAHAN BARU: Field untuk menyimpan hasil generate Action Plan
  customActionPlan?: ActionItem[]; 
  personalActionPlan?: ActionItem[];
  tipsAndTricks?: string[];
  motivationalQuote?: string;
  keyFocusArea?: string;
  sellingOutput?: {
    hookTitle: string;
    compellingSummary: string;
    keyValuePropositions: string[];
    closingCallToAction: string;
  };
  actionPlanBehavior?: string;
  isAdaptiveAssessment?: boolean;
}

export interface CurationHistory {
  id: string;
  date: string;
  trackType: string;
  namaUsaha: string;
  score: number;
  data: CurationFormData;
  result: AIResult;
  aiPromptConfig?: AiPromptConfig;
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
  weightMultiplier?: number; // Ekstra bobot untuk field ini (default 1)
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    regexPattern?: string;
    customErrorMessage?: string;
  };
  showIf?: {
    fieldId: string;
    operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value?: string | number | boolean; // Menggantikan 'equals' sebelumnya
    equals?: string | number | boolean; // Dipertahankan untuk backward compatibility
  };
  aiReasoning?: string; // Menyimpan penjelasan mengapa AI mengajukan pertanyaan ini
}

export interface FormStep {
  stepNumber: number;
  title: string;
  icon?: string;          
  description?: string;
  targetMetrics?: string[];
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
  targetAudience?: 'individual' | 'company' | 'startup' | 'umkm' | 'government' | 'community' | 'student' | string;
  
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
  actionPlanBehavior?: string;
  promptImpactMode?: 'soft' | 'bold' | 'aggressive';
  isAdaptive?: boolean;
  maxAdaptiveSections?: number;
  assessmentOutputMode?: 'auto' | 'adaptive' | 'universal';
  adaptiveLanguageStylePreset?:
    | 'auto'
    | 'friendly_counseling'
    | 'friendly_self_assessment'
    | 'warm_supportive'
    | 'neutral_professional'
    | 'direct_coach';
  adaptiveQuestionTonePrompt?: string;
  adaptiveResultTonePrompt?: string;
}

export interface FormTemplate {
  id: string;             
  trackName: string;      
  trackDescription: string;
  expectedOutputs?: string[]; // <--- TAMBAHKAN BARIS INI
  specificTargetContext?: string; // Menyimpan profil detail responden
  methodologyContext?: string;    // Menyimpan metode pendekatan (Psikologi, ISO, dll)
  trackIcon: string;      
  isActive: boolean;      
  version: number;
  lastUpdated: string;
  isDisplayedOnLanding?: boolean; 
  isPaid?: boolean;               
  trialQuota?: number;            
  price?: number;                 
  discountPercentage?: number;    
  discountExpiry?: string;        
  isBestSeller?: boolean;         
  userCount?: number;             
  customUSPs?: string[];          
  category?: string;
  steps: FormStep[]; 
  aiPromptConfig?: AiPromptConfig;
  folder?: string;
  formBuilderInstruction?: string;
  preferredQuestionTypes?: string[];
  formMode?: 'standard' | 'adaptive' | 'hybrid';
  promoAssets?: {
    [platform: string]: {
      copywriting: string;
      // BARU: Array untuk menampung data multiple slide carousel
      carouselSlides?: {
        slideNumber: number;
        textOnImage: string;
        imagePrompt: string;
        imageUrl?: string;
      }[];
      generatedAt: string;
    }
  };
}

export interface AssessmentPayload {
  selfScore?: number;
  isConfirmedEarnest?: boolean;
}

export type ExportRole = 'public' | 'admin' | 'assessor' | 'curator';

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

import React from 'react';
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export interface LandingPartner {
  id: string;
  name: string;
  logoUrl: string; 
  storagePath?: string; 
  targetUrl?: string; 
  category: 'powered_by' | 'mitra_strategis' | 'klien' | 'testimoni_ahli';
  role?: string; 
  message?: string; 
  isActive: boolean; 
  order: number; 
  createdAt: string;
  updatedAt?: string; 
}