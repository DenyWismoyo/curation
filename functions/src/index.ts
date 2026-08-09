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
import { buildAssessmentPrompt, getSystemPrompt } from './prompts/promptTemplate'

// ============================================================================
// EXPORT FUNGSI MODULAR
// ============================================================================
export { generatePDFReport } from './infrastructure/pdf/documentGenerator'
export { matchBusinessWithIndustry } from './infrastructure/vector/vectorService'
export { generateScenePrompt, generateFullStoryboard } from './domains/storyboard/agents/videoPromptAgent'
export { 
  saveCryptoQuizResult, 
  enrichCryptoModuleMetadata, 
  generateCryptoModuleAssessment 
} from './domains/crypto/agents/cryptoAcademyAgent'
export { generateCryptoCertificate } from './domains/crypto/agents/cryptoCertificateAgent'

export {
  createPaymentInvoice,
  createDynamicQris,
  mayarWebhook,
  redeemAssessmentQuota,
  checkTokenValidity,
} from './infrastructure/payment/paymentService'
export { chatWithOmniAi } from './infrastructure/ai/omniAiService'
export { analyzeEvidence } from './domains/assessment/services/evidenceService'
export {
  generateActionPlanChecklist,
  generateSubTaskChecklist,
  generatePersonalActionPlan,
} from './domains/assessment/services/actionPlanService'
export {
  generateTemplateSellingPoints,
  generatePromptAnchors,
} from './domains/assessment/services/outputService'
export { weeklyActionPlanNudge, cryptoTrialExpiryNudge } from './infrastructure/email/nudgeService'
export {
  generateAdaptiveQuestions,
  evaluateMacroBranching,
  manualTriggerRAGSeed,
} from './domains/assessment/services/adaptiveValidationService'
export { enhanceFieldLogic, enhanceStepLogic } from './domains/assessment/services/fieldEnhancerService'
// TAMBAHKAN EXPORT FUNGSI BARU DI SINI:
export {
  generateAssessmentCacheKey,
  getCachedAssessmentResult,
  setCachedAssessmentResult,
} from './infrastructure/storage/cacheService'
export { scheduledCacheCleanup } from './infrastructure/storage/cacheCleanupService'
export { generateAdvancedPrompts } from './domains/assessment/services/promptEnhancerService'
export { analyzeMicroIdea } from './domains/assessment/services/microSimulatorService'
export { processVoiceInput } from './infrastructure/voice/voiceService'
export { formBuilderOrchestrator } from './domains/form-builder/pipelines/orchestrator'

// ============================================================================
// DATABASE & AUTH SYNC TRIGGERS
// ============================================================================
export { normalizeUserDocs } from './scripts/normalizeUsers'
export { syncUserClaims } from './triggers/userClaimsSync'

// ============================================================================
// AI ASSESSMENT AGENTS
// ============================================================================
export { processCurationAssessment } from './domains/assessment/agents/gatewayAgent'
export { assessmentOrchestrator } from './domains/assessment/pipelines/orchestrator'
export { actionPlanCopilotChat } from './domains/assessment/agents/copilotAgent'
export { adminGenerateMockData } from './domains/assessment/agents/mockDataAgent'
export { premiumConsultationChat } from './domains/assessment/agents/premiumConsultationAgent'
export { assessmentAnalyticsAgent } from './domains/analytics/agents/analyticsAgent'
export {
  generateCopywriting,
  reviseSlidePrompt,
  reviseCopywriting,
} from './domains/promo/agents/copywriterAgent'
export { renderSingleSlide } from './domains/promo/agents/imageRendererAgent'
export { generateArticleFromTemplate } from './domains/promo/agents/articleAgent'
export { batchGenerateSmartPricing } from './domains/promo/agents/pricingAgent'
export { generateProgramIdentity } from './domains/promo/agents/identityAgent'
export { generateTemplateIdentityInspirations } from './domains/promo/agents/templateIdentityInspirationAgent'
export { generateArticleImage } from './domains/promo/agents/articleImageAgent'
export {
  createOrGetAffiliateProfile,
  attachAffiliateToTransaction,
  updateAffiliatePayoutProfile,
  adminReviewAffiliatePayout,
  adminMarkAffiliateCommissionPaid,
  getAffiliateProgramConfigPublic,
  adminUpdateAffiliateProgramConfig,
} from './domains/affiliate/agents/affiliateAgent'
export { affiliateCommissionAgent } from './domains/affiliate/agents/commissionAgent'
export {
  upsertReferralAttribution,
  bindReferralAttributionToUser,
} from './domains/affiliate/agents/attributionAgent'
export { generateAdaptiveOnboardingPlan } from './domains/onboarding/agents/adaptiveOnboardingAgent'
export {
  adminUpsertB2BOrganization,
  adminListB2BOrganizations,
  adminSetB2BUserAccess,
  adminRevokeB2BUserAccess,
} from './domains/b2b/agents/organizationAgent'
export { getB2BOrganizationAnalytics } from './domains/b2b/agents/b2bAnalyticsService'
export {
  b2bAddInteractionLog,
  b2bGenerateInteractionSummary,
} from './domains/b2b/agents/interactionAgent'
export {
  createStudyProject,
  registerStudySource,
  assignStudyProjectReviewers,
  startStudyProjectPipeline,
  approveStudyOutline,
  publishStudyToCryptoAcademy,
  updateStudyChapterManual,
} from './domains/study/agents/studyProjectAgent'
export { requestChapterRevision, generateRevisionMaterials } from './domains/study/agents/chapterRevisionAgent'
export { exportStudyDocument } from './domains/study/agents/exportService'
export { studyProjectOrchestrator } from './domains/study/pipelines/orchestrator'
export { studyChapterOrchestrator } from './domains/study/pipelines/chapterOrchestrator'
export { cryptoCronAgent } from './domains/crypto/agents/cryptoCronAgent'
export { cryptoHiddenGemAgent } from './domains/crypto/agents/cryptoHiddenGemAgent'
export { cryptoPremiumIntelligenceAgent } from "./domains/crypto/agents/cryptoPremiumIntelligenceAgent";
export { cryptoMacroAgent } from "./domains/crypto/agents/cryptoMacroAgent";
export { telegramWebhook } from "./domains/telegram/agents/telegramBot";
export { cryptoCopilotChat, cryptoCopilotSuggestions } from './domains/crypto/agents/cryptoCopilotAgent'
export { cryptoNewsAgent } from './domains/crypto/agents/cryptoNewsAgent'
export { generateRealtimeScalping, generateRealtimeHiddenGem } from './domains/crypto/agents/cryptoAdminAgents'
export { activateCryptoTrial } from './domains/crypto/agents/cryptoTrialAgent'

// ============================================================================
// INISIALISASI FIREBASE
// ============================================================================
admin.initializeApp()
const db = getFirestore(admin.app(), 'curation')

const geminiApiKeySecret = defineSecret('GEMINI_API_KEY')
const smtpEmailSecret = defineSecret('SMTP_EMAIL')
const smtpPasswordSecret = defineSecret('SMTP_PASSWORD')

// // ============================================================================
// // CLOUD FUNCTION: ASESMEN AI UTAMA (MULTI-AGENT ARCHITECTURE)
// // ============================================================================
// // NOTE: Fungsi monolitik processCurationAssessment telah dihapus.
// // Logika utama kini dijalankan oleh gatewayAgent.ts dan pipeline multi-agent.
