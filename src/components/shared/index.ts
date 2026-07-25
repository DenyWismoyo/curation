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
export { AIPromptBlueprintPDF } from '@/app/components/shared/AIPromptBlueprintPDF';
export { BottomNav } from '@/app/components/shared/BottomNav';
export { FeedbackModal } from '@/app/components/shared/FeedbackModal';
export { GlobalFeedbackWidget } from '@/app/components/shared/GlobalFeedbackWidget';
export { GlobalFloatingWidget } from '@/app/components/shared/GlobalFloatingWidget';
export { NotificationBell } from '@/app/components/shared/NotificationBell';
export { OmniAiWidget } from '@/app/components/shared/OmniAiWidget';
export { PWAInstallPrompt } from '@/app/components/shared/PWAInstallPrompt';
export { SocialShareCard } from '@/app/components/shared/SocialShareCard';
export { TemplateQuestionsPDF } from '@/app/components/shared/TemplateQuestionsPDF';
export { TokenBatchPDFDocument } from '@/app/components/shared/TokenBatchPDFDocument';
export { TokenExportPDFButton } from '@/app/components/shared/TokenExportPDFButton';
export { UniversalAssessmentView } from '@/app/components/shared/UniversalAssessmentView';
export { UniversalPDFDocument } from '@/app/components/shared/UniversalPDFDocument';
