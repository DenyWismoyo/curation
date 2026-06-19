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
  
  // KEMBALI KE METODE STABIL: Timeout diatur ke 9 Menit karena menunggu AI selesai
  const processCuration = httpsCallable(functions, 'processCurationAssessment', {
    timeout: 540000 
  });

  console.log("Mengirim payload data ke Cloud Function...");

  try {
    // KIRIM DATA & TUNGGU HASIL SECARA LANGSUNG DARI SERVER
    const result = await processCuration({
      formData,
      trackType,
      storageFilePaths,
      aiPromptConfig,
      tokenUsed
    });

    const data = result.data as { assessmentId: string, aiResult: AIResult };
    console.log("Berhasil menerima respons AI! ID:", data.assessmentId);

    return { assessmentId: data.assessmentId, aiResult: data.aiResult };

  } catch (err: any) {
    console.error("Gagal terhubung ke server:", err);
    throw new Error(err.message || "Gagal memproses data atau waktu tunggu habis. Silakan coba lagi.");
  }
}