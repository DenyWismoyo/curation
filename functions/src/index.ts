// functions/src/index.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { buildAssessmentPrompt, getSystemPrompt } from './prompt/promptTemplate'

// ============================================================================
// EXPORT FUNGSI MODULAR
// ============================================================================
export { generatePDFReport } from './general/documentGenerator'
export { matchBusinessWithIndustry } from './general/vectorService'

export {
  createPaymentInvoice,
  createDynamicQris,
  mayarWebhook,
  redeemAssessmentQuota,
  checkTokenValidity,
} from './general/paymentService'
export { chatWithOmniAi } from './general/omniAiService'
export { analyzeEvidence } from './general/evidenceService'
export {
  generateActionPlanChecklist,
  generateSubTaskChecklist,
  generatePersonalActionPlan,
} from './actionPlanService'
export {
  generateTemplateSellingPoints,
  generatePromptAnchors,
} from './outputService'
export { weeklyActionPlanNudge } from './email/nudgeService'
export {
  generateAdaptiveQuestions,
  evaluateMacroBranching,
  manualTriggerRAGSeed,
} from './general/adaptiveValidationService'
export { enhanceFieldLogic, enhanceStepLogic } from './fieldEnhancerService'
// TAMBAHKAN EXPORT FUNGSI BARU DI SINI:
export {
  generateAssessmentCacheKey,
  getCachedAssessmentResult,
  setCachedAssessmentResult,
} from './general/cacheService'
export { scheduledCacheCleanup } from './general/cacheCleanupService'
export { generateAdvancedPrompts } from './promptEnhancerService'
export { analyzeMicroIdea } from './general/microSimulatorService'
export { processVoiceInput } from './general/voiceService'
export { formBuilderOrchestrator } from './pipelines/formBuilder/orchestrator'

// ============================================================================
// DATABASE & AUTH SYNC TRIGGERS
// ============================================================================
export { normalizeUserDocs } from './scripts/normalizeUsers'
export { syncUserClaims } from './triggers/userClaimsSync'

// ============================================================================
// AI ASSESSMENT AGENTS
// ============================================================================
export { processCurationAssessment } from './agents/assessment/gatewayAgent'
export { assessmentOrchestrator } from './pipelines/assessment/orchestrator'
export { actionPlanCopilotChat } from './agents/assessment/copilotAgent'
export { adminGenerateMockData } from './agents/assessment/mockDataAgent'
export { premiumConsultationChat } from './agents/assessment/premiumConsultationAgent'
export { assessmentAnalyticsAgent } from './agents/analytics/analyticsAgent'
export {
  generateCopywriting,
  reviseSlidePrompt,
  reviseCopywriting,
} from './agents/promo/copywriterAgent'
export { renderSingleSlide } from './agents/promo/imageRendererAgent'
export { generateArticleFromTemplate } from './agents/promo/articleAgent'
export { batchGenerateSmartPricing } from './agents/promo/pricingAgent'
export { generateProgramIdentity } from './agents/promo/identityAgent'
export { generateTemplateIdentityInspirations } from './agents/promo/templateIdentityInspirationAgent'
export { generateArticleImage } from './agents/promo/articleImageAgent'
export {
  createOrGetAffiliateProfile,
  attachAffiliateToTransaction,
  updateAffiliatePayoutProfile,
  adminReviewAffiliatePayout,
  adminMarkAffiliateCommissionPaid,
  getAffiliateProgramConfigPublic,
  adminUpdateAffiliateProgramConfig,
} from './agents/affiliate/affiliateAgent'
export { affiliateCommissionAgent } from './agents/affiliate/commissionAgent'
export {
  upsertReferralAttribution,
  bindReferralAttributionToUser,
} from './agents/affiliate/attributionAgent'
export { generateAdaptiveOnboardingPlan } from './agents/onboarding/adaptiveOnboardingAgent'
export {
  adminUpsertB2BOrganization,
  adminListB2BOrganizations,
  adminSetB2BUserAccess,
  adminRevokeB2BUserAccess,
} from './agents/b2b/organizationAgent'
export { getB2BOrganizationAnalytics } from './agents/b2b/b2bAnalyticsService'
export {
  b2bAddInteractionLog,
  b2bGenerateInteractionSummary,
} from './agents/b2b/interactionAgent'
export {
  createStudyProject,
  registerStudySource,
  assignStudyProjectReviewers,
  startStudyProjectPipeline,
  approveStudyOutline,
} from './agents/study/studyProjectAgent'
export { requestChapterRevision, generateRevisionMaterials } from './agents/study/chapterRevisionAgent'
export { exportStudyDocument } from './agents/study/exportService'
export { studyProjectOrchestrator } from './pipelines/study/orchestrator'
export { studyChapterOrchestrator } from './pipelines/study/chapterOrchestrator'
export { cryptoCronAgent } from './agents/crypto/cryptoCronAgent'
export { cryptoCopilotChat } from './agents/crypto/cryptoCopilotAgent'

// ============================================================================
// INISIALISASI FIREBASE
// ============================================================================
admin.initializeApp()
const db = getFirestore(admin.app(), 'curation')

const geminiApiKeySecret = defineSecret('GEMINI_API_KEY')
const smtpEmailSecret = defineSecret('SMTP_EMAIL')
const smtpPasswordSecret = defineSecret('SMTP_PASSWORD')

// // ============================================================================
// CLOUD FUNCTION: ASESMEN AI UTAMA (MULTI-AGENT ARCHITECTURE)
// ============================================================================
// NOTE: Fungsi monolitik processCurationAssessment telah dihapus.
// Logika utama kini dijalankan oleh gatewayAgent.ts dan pipeline multi-agent.
