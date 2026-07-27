// src/services/ai.service.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { CurationFormData, AIResult, AiPromptConfig } from '@/types/curation';

export async function processAIAssessment(
  formData: CurationFormData, 
  trackType: string,
  storageFilePaths: string[],
  aiPromptConfig?: AiPromptConfig,
  tokenUsed?: string
): Promise<{ assessmentId: string, aiResult: AIResult }> {
  
  const functions = getFunctions(app, 'asia-southeast2');
  
  // Timeout diatur ke 9 Menit karena menunggu proses Evaluasi AI selesai
  const processCuration = httpsCallable(functions, 'processCurationAssessment', {
    timeout: 540000 
  });

  try {
    const result = await processCuration({
      formData,
      trackType,
      storageFilePaths,
      aiPromptConfig,
      tokenUsed
    });

    const data = result.data as { assessmentId: string, aiResult: AIResult };

    return { assessmentId: data.assessmentId, aiResult: data.aiResult };

  } catch (err) {
    console.error("Gagal terhubung ke server:", err);
    throw new Error(err instanceof Error ? err.message : "Gagal memproses data atau waktu tunggu habis. Silakan coba lagi.");
  }
}