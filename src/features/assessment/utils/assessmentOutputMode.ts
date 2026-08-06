import { AiPromptConfig, CurationFormData, AIResult } from '@/features/assessment/types/assessment.types';

export type AssessmentOutputMode = 'adaptive' | 'universal';

export function resolveAssessmentOutputMode(
  aiPromptConfig?: AiPromptConfig | null,
  aiResult?: AIResult | null,
  formData?: CurationFormData | null,
): AssessmentOutputMode {
  if (
    aiPromptConfig?.isAdaptive ||
    aiResult?.isAdaptiveAssessment ||
    formData?.isAdaptive ||
    formData?.mode === 'adaptive' ||
    formData?.formMode === 'adaptive'
  ) {
    return 'adaptive';
  }

  const configuredMode = aiPromptConfig?.assessmentOutputMode;

  if (configuredMode === 'adaptive' || configuredMode === 'universal') {
    return configuredMode;
  }

  return 'universal';
}