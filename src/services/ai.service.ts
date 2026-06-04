// src/services/ai.service.ts
import { CurationFormData, AIResult } from '@/types/curation';

export async function processAIAssessment(formData: CurationFormData, trackType: string): Promise<AIResult> {
  let retries = 3;
  let delay = 1000;

  // Filter out File objects before sending to our backend to avoid payload too large errors
  const cleanFormData: Record<string, any> = {};
  for (const key in formData) {
    const val = (formData as any)[key];
    if (val && !(val instanceof File)) {
      cleanFormData[key] = val;
    }
  }

  while (retries > 0) {
    try {
      // Memanggil internal Next.js API Route, bukan langsung ke Google
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: cleanFormData, trackType })
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      
      const data = await response.json();
      return data as AIResult;

    } catch (err) {
      console.warn(`Retry attempt failed. Retries left: ${retries - 1}`);
      retries--;
      if (retries === 0) break;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }

  // Fallback Data jika API terus gagal
  return {
    readinessLevel: "Market Ready (Fallback)", 
    totalScore: 68,
    scoreBreakdown: { productAndTech: 70, marketAndFinancial: 65, legalAndCompliance: 70 },
    recommendations: {
      targetMarket: "Sistem AI sedang mengalami gangguan koneksi.", 
      pricingAndMonetization: "Mohon cek kembali saat koneksi stabil.",
      distributionAndGrowth: "Pertahankan basis pengguna awal.", 
      productImprovement: "Kumpulkan feedback klien.",
      investmentReadiness: "Lengkapi dokumen.", 
      nextActionSteps: ["Coba ulang form asesmen", "Perbaiki koneksi internet"],
      incubationRoute: "Inkubasi Reguler"
    }
  };
}