import * as admin from "firebase-admin";

export const executePostProcessing = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string,
  smtpEmail?: string,
  smtpPassword?: string
): Promise<void> => {
  const updatedDocDataForBg = {
    namaUsaha: data.formData?.namaUsaha || 'Tanpa Nama',
    trackType: data.trackType,
    score: data.aiResult?.totalScore || 0,
    readinessLevel: data.aiResult?.readinessLevel || 'Belum Ditentukan',
    formData: data.formData,
    aiResult: data.aiResult,
    userEmail: data.formData?.email || data.userEmail
  };

  // Eksekusi semua background task secara paralel
  await Promise.allSettled([
    (async () => {
      if (updatedDocDataForBg.score !== undefined) {
        const { generateAndStoreVectorEmbedding } = await import("../../general/vectorService");
        await generateAndStoreVectorEmbedding(assessmentId, updatedDocDataForBg, API_KEY);
      }
    })(),
    (async () => {
      const { generateInternalPDF } = await import("../../general/documentGenerator");
      await Promise.all([
        generateInternalPDF(assessmentId, updatedDocDataForBg, 'user'),
        generateInternalPDF(assessmentId, updatedDocDataForBg, 'curator')
      ]);
    })(),
    (async () => {
      if (smtpEmail && smtpPassword && updatedDocDataForBg.userEmail) {
        const { sendAssessmentEmail } = await import("../../email/emailService");
        await sendAssessmentEmail(smtpEmail, smtpPassword, {
          targetEmail: String(updatedDocDataForBg.userEmail),
          namaUsaha: String(updatedDocDataForBg.namaUsaha),
          totalScore: Number(updatedDocDataForBg.score),
          readinessLevel: String(updatedDocDataForBg.readinessLevel),
          trackType: String(updatedDocDataForBg.trackType),
          assessmentUrl: `https://omnifit.cloud/result/${assessmentId}`
        });
      }
    })()
  ]);

  // Hapus temporary URIs dari database agar rapi
  const { GoogleAIFileManager } = await import("@google/generative-ai/server");
  const fileManager = new GoogleAIFileManager(API_KEY);
  const geminiFiles = data.geminiFiles || [];
  for (const f of geminiFiles) { 
     try { await fileManager.deleteFile(f.name); } catch(e){}
  }

  // Simpan ke Cache jika terdapat cacheKey
  if (data.cacheKey) {
    try {
      const { setCachedAssessmentResult } = await import("../../general/cacheService");
      await setCachedAssessmentResult(data.cacheKey, {
        trackType: data.trackType || 'Evaluasi Umum',
        score: Number(updatedDocDataForBg.score || 0),
        readinessLevel: String(updatedDocDataForBg.readinessLevel),
        aiResult: data.aiResult
      });
    } catch (cacheErr) {
      console.warn("Gagal menyimpan hasil asesmen ke cache:", cacheErr);
    }
  }
};