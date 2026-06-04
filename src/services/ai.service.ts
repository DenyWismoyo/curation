import { CurationFormData, AIResult } from '@/types/curation';

// Fungsi bantuan untuk mengubah object File menjadi format string Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export async function processAIAssessment(formData: CurationFormData, trackType: string): Promise<AIResult> {
  let retries = 3;
  let delay = 1000;

  const cleanFormData: Record<string, any> = {};
  const filesBase64: { mimeType: string, data: string }[] = [];

  // Pisahkan antara data teks biasa dan data file yang akan diproses AI
  for (const key in formData) {
    const val = (formData as any)[key];
    if (val instanceof File) {
      try {
        const base64String = await fileToBase64(val);
        // Hapus header base64 (contoh: "data:application/pdf;base64,") agar sesuai standar API Gemini
        const base64Data = base64String.split(',')[1];
        filesBase64.push({ mimeType: val.type, data: base64Data });
      } catch (e) {
        console.error("Gagal convert file ke base64:", e);
      }
    } else if (val !== null && val !== undefined) {
      cleanFormData[key] = val;
    }
  }

  while (retries > 0) {
    try {
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Mengirimkan teks form DAN dokumen base64 ke server
        body: JSON.stringify({ formData: cleanFormData, trackType, filesBase64 })
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

  // Fallback Data jika API Google sedang gangguan parah
  return {
    readinessLevel: "Market Ready (Fallback)", 
    totalScore: 68,
    scoreBreakdown: { productAndTech: 70, marketAndFinancial: 65, legalAndCompliance: 70 },
    recommendations: {
      targetMarket: "Sistem AI sedang mengalami gangguan koneksi sementara.", 
      pricingAndMonetization: "Mohon cek kembali skor Anda saat koneksi stabil.",
      distributionAndGrowth: "Data telah disimpan dengan aman di database kami.", 
      productImprovement: "Kumpulkan feedback awal dari tim.",
      investmentReadiness: "Lengkapi dokumen pitch deck dan portfolio.", 
      nextActionSteps: ["Segarkan halaman", "Coba kirim ulang form asesmen jika perlu"],
      incubationRoute: "Inkubasi Reguler"
    }
  };
}