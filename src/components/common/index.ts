/**
 * src/components/shared/index.ts
 *
 * Barrel re-exports untuk semua shared components.
 * Migration shim: saat ini masih pointing ke app/components/shared/.
 * Target: pindahkan file fisik ke sini dan hapus referensi lama.
 *
 * SOP: import shared components dari '@/components/shared', BUKAN '@/app/components/shared'
 */

// === Native components (already in correct location) ===


// === Migration shim: app/components/shared → src/components/shared ===
export { AIPromptBlueprintPDF } from '@/features/assessment/components/pdf/AIPromptBlueprintPDF';
export { BottomNav } from '@/components/layout/BottomNav';
export { FeedbackModal } from '@/components/common/FeedbackModal';
export { GlobalFeedbackWidget } from '@/components/common/GlobalFeedbackWidget';
export { GlobalFloatingWidget } from '@/components/common/GlobalFloatingWidget';
export { NotificationBell } from '@/components/common/NotificationBell';
export { OmniAiWidget } from '@/components/common/OmniAiWidget';
export { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
export { ReferralAttributionTracker } from '@/components/common/ReferralAttributionTracker';
export { SocialShareCard } from '@/components/common/SocialShareCard';
export { TemplateQuestionsPDF } from '@/features/assessment/components/pdf/TemplateQuestionsPDF';
export { TokenBatchPDFDocument } from '@/features/assessment/components/pdf/TokenBatchPDFDocument';
export { TokenExportPDFButton } from '@/features/assessment/components/pdf/TokenExportPDFButton';
export { UniversalAssessmentView } from '@/features/assessment/components/shared/UniversalAssessmentView';
export { AdaptiveAssessmentView } from '@/features/assessment/components/shared/AdaptiveAssessmentView';
export { UniversalPDFDocument } from '@/features/assessment/components/pdf/UniversalPDFDocument';
