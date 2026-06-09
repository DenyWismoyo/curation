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
  const processCuration = httpsCallable(functions, 'processCurationAssessment');

  let retries = 3;
  let delay = 1000;

  // PERBAIKAN: Menambahkan log untuk melakukan tracking payload token dari client Next.js
  console.log("Mengirim payload token ke Cloud Function:", tokenUsed);

  while (retries > 0) {
    try {
      // Kita kirimkan semua parameter yang dibutuhkan Cloud Function
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
      console.warn(`Attempt failed: ${err.message}. Retries left: ${retries - 1}`);
      retries--;
      if (retries === 0) {
        throw new Error(err.message || "Gagal terhubung ke server setelah beberapa percobaan.");
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }

  throw new Error("Gagal terhubung ke server setelah beberapa percobaan.");
}