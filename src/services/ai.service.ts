import { CurationFormData, AIResult, AiPromptConfig } from '@/types/curation';

export async function processAIAssessment(
  formData: CurationFormData, 
  trackType: string,
  aiPromptConfig?: AiPromptConfig
): Promise<AIResult> {
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, trackType, aiPromptConfig })
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

  // Fallback data terstruktur array dinamis apabila koneksi terputus
  return {
    readinessLevel: "Market Ready (Fallback)", 
    totalScore: 65,
    incubationRoute: "Inkubasi Reguler",
    metrics: [
      { label: "Kesiapan Umum", score: 70, description: "Menggunakan fallback data karena sistem utama offline." },
      { label: "Potensi Pasar", score: 65, description: "Nilai perkiraan sementara." },
      { label: "Kesehatan Finansial", score: 60, description: "Perlu rekalkulasi ulang setelah server aktif." }
    ],
    swotAnalysis: {
      strengths: ["Sistem AI sedang offline, menggunakan data cadangan terstruktur."],
      weaknesses: ["Koneksi jaringan terganggu sementara waktu."],
      opportunities: ["Mencoba melakukan submit ulang form beberapa saat lagi."],
      threats: ["Analisis mendalam per dimensi industri belum dapat dimuat."]
    },
    recommendations: [
      { title: "Status Sistem Terdeteksi", content: "Gangguan koneksi API eksternal terdeteksi, namun data isian form berhasil diamankan di database." },
      { title: "Langkah Tindak Lanjut", content: "Silakan hubungi administrator jika Anda terus melihat laporan cadangan ini." }
    ],
    riskAssessment: {
      criticalRisks: ["Koneksi ke server AI terputus.", "Analisis kustom template tidak dapat divalidasi."],
      mitigationStrategies: ["Muat ulang halaman browser.", "Cek konsol jaringan firebase jika ada masalah autentikasi."]
    },
    nextActionSteps: ["Segarkan halaman aplikasi", "Coba kirim ulang form asesmen"]
  };
}