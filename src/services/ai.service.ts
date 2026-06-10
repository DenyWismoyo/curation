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
  
  // PERBAIKAN KRUSIAL: Tambahkan timeout 9 menit (540000 ms) agar selaras dengan Backend
  const processCuration = httpsCallable(functions, 'processCurationAssessment', {
    timeout: 540000 
  });

  console.log("Mengirim payload token ke Cloud Function:", tokenUsed);

  try {
    // HAPUS perulangan (while retries) agar tidak terjadi error "Token Paralel"
    const result = await processCuration({
      formData,
      trackType,
      storageFilePaths,
      aiPromptConfig,
      tokenUsed
    });

    const data = result.data as { assessmentId: string, aiResult: AIResult };
    return { assessmentId: data.assessmentId, aiResult: data.aiResult };

  } catch (err: any) {
    console.error("Gagal terhubung ke server:", err);
    throw new Error(err.message || "Gagal memproses data. Waktu tunggu habis.");
  }
}