// src/services/ai.service.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
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
  
  // Endpoint sekarang SANGAT CEPAT (Decoupling) krn hanya buat antrean. Timeout cukup 1 menit.
  const submitCuration = httpsCallable(functions, 'processCurationAssessment', {
    timeout: 60000 
  });

  console.log("Mengirim antrean ke Cloud Function:", tokenUsed);

  try {
    // 1. KIRIM DATA (Hampir Instan)
    const result = await submitCuration({
      formData,
      trackType,
      storageFilePaths,
      aiPromptConfig,
      tokenUsed
    });

    const data = result.data as { assessmentId: string, status: string };
    const assessmentId = data.assessmentId;

    console.log(`Antrean Berhasil! ID: ${assessmentId}. Menunggu AI memproses di background...`);

    // 2. TUNGGU HASIL VIA REALTIME LISTENER
    // Frontend sekarang "mendengarkan" database alih-alih menunggu respons Server.
    return new Promise((resolve, reject) => {
      const db = getFirestore(app, "curation");
      const docRef = doc(db, "assessments", assessmentId);

      // Timeout perlindungan di sisi Klien (Misal dibatalkan jika melebihi 9 Menit)
      const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("Waktu tunggu AI habis. Namun AI masih bekerja di server. Anda bisa refresh halaman ini nanti."));
      }, 540000);

      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const docData = snapshot.data();
          
          if (docData.status === "COMPLETED") {
            // PROSES AI SELESAI
            clearTimeout(timeout);
            unsubscribe();
            resolve({ assessmentId, aiResult: docData.aiResult as AIResult });
          } else if (docData.status === "FAILED") {
            // PROSES AI GAGAL
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error(docData.errorMessage || "Gagal memproses analisis AI di server."));
          }
          // Jika status === 'PROCESSING', biarkan terus menunggu (tidak melakukan apa-apa)
        }
      }, (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      });
    });

  } catch (err: any) {
    console.error("Gagal terhubung ke server:", err);
    throw new Error(err.message || "Gagal mengirim data. Silakan coba lagi.");
  }
}