// src/services/ai.service.ts
import { CurationFormData, AIResult, AiPromptConfig } from '@/types/curation';

export async function processAIAssessment(
  formData: CurationFormData, 
  trackType: string,
  aiPromptConfig?: AiPromptConfig,
  token?: string
): Promise<AIResult> {
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, trackType, aiPromptConfig, token })
      });

      if (!response.ok) {
        // 1. Baca response sebagai teks terlebih dahulu (stream dibaca di sini)
        const responseText = await response.text(); 
        let errData;
        
        try {
          // 2. Coba ubah teks tersebut menjadi objek JSON
          errData = JSON.parse(responseText);
        } catch (parseError) {
          // 3. Jika gagal di-parse (biasanya karena isinya HTML error 500 dari Next.js)
          throw new Error(`Terjadi kesalahan internal pada server (Status: ${response.status}).`);
        }
        
        // Jika berhasil di-parse sebagai JSON dan memiliki pesan error dari API kita
        throw new Error(errData?.error || `Server returned ${response.status}`);
      }
      
      const data = await response.json();
      return data as AIResult;

    } catch (err: any) {
      console.warn(`Attempt failed: ${err.message}. Retries left: ${retries - 1}`);
      retries--;
      if (retries === 0) {
        throw err; // Lempar error ke UI (akan ditangkap oleh try-catch di hook)
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }

  throw new Error("Gagal terhubung ke server setelah beberapa percobaan.");
}