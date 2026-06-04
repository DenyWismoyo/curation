import { CurationFormData, AIResult } from '@/types/curation';

export async function processAIAssessment(formData: CurationFormData, trackType: string): Promise<AIResult> {
  let retries = 3;
  let delay = 1000;

  // Format data tidak lagi di-convert ke base64 di client. Semua dikirim dalam bentuk teks/URL
  while (retries > 0) {
    try {
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, trackType })
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

  // Fallback menyesuaikan skema baru
  return {
    readinessLevel: "Market Ready (Fallback)", 
    totalScore: 68,
    radarMetrics: {
      productInnovation: 70,
      marketPotential: 65,
      financialHealth: 60,
      teamCapability: 75,
      operationalScalability: 60,
      legalAndCompliance: 70,
    },
    swotAnalysis: {
      strengths: ["Sistem AI sedang offline, menggunakan fallback data."],
      weaknesses: ["Koneksi jaringan terganggu sementara."],
      opportunities: ["Mencoba memuat ulang halaman nanti."],
      threats: ["Data sementara mungkin kurang akurat."]
    },
    recommendations: {
      executiveSummary: "Gangguan koneksi API terdeteksi, data berhasil diamankan.",
      targetMarket: "Tunggu hingga koneksi stabil.", 
      pricingAndMonetization: "Mohon cek kembali skor Anda nanti.",
      goToMarketStrategy: "Evaluasi strategi GTM setelah data tersinkronisasi.",
      productRoadmap: "Fokus pada stabilisasi layanan.",
      financialOptimization: "Lindungi kas selama transisi.",
      investmentReadiness: "Lengkapi dokumen pitch deck dan portfolio.", 
      incubationRoute: "Inkubasi Reguler"
    },
    riskAssessment: {
      criticalRisks: ["Koneksi ke server AI terputus.", "Analisis mendalam tidak dapat dilakukan."],
      mitigationStrategies: ["Muat ulang halaman.", "Hubungi administrator jika terus berlanjut."]
    },
    nextActionSteps: ["Segarkan halaman", "Coba kirim ulang form asesmen jika perlu"]
  };
}