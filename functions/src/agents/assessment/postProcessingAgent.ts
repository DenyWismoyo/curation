import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

export const assessmentPostProcessingAgent = onDocumentUpdated({
  database: "curation", // PERBAIKAN: Menunjuk database curation
  document: "assessments/{assessmentId}", // PERBAIKAN: Hapus "curation/" di depan
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
}, async (event) => {
  const afterData = event.data?.after.data();

  if (afterData?.status !== "GENERATING_ASSETS") return null;

  const docRef = event.data!.after.ref;
  const assessmentId = event.params.assessmentId;
  
  const API_KEY = geminiApiKeySecret.value();
  const smtpEmail = smtpEmailSecret.value();
  const smtpPassword = smtpPasswordSecret.value();

  try {
    const updatedDocDataForBg = {
      namaUsaha: afterData.formData?.namaUsaha || 'Tanpa Nama',
      trackType: afterData.trackType,
      score: afterData.aiResult?.totalScore || 0,
      readinessLevel: afterData.aiResult?.readinessLevel || 'Belum Ditentukan',
      formData: afterData.formData,
      aiResult: afterData.aiResult,
      userEmail: afterData.formData?.email || afterData.userEmail
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
        await generateInternalPDF(assessmentId, updatedDocDataForBg, 'user');
        await generateInternalPDF(assessmentId, updatedDocDataForBg, 'curator');
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
    const geminiFiles = afterData.geminiFiles || [];
    for (const f of geminiFiles) { 
       try { await fileManager.deleteFile(f.name); } catch(e){}
    }

    // Simpan ke Cache jika terdapat cacheKey
    if (afterData.cacheKey) {
      try {
        const { setCachedAssessmentResult } = await import("../../general/cacheService");
        await setCachedAssessmentResult(afterData.cacheKey, {
          trackType: afterData.trackType || 'Evaluasi Umum',
          score: Number(updatedDocDataForBg.score || 0),
          readinessLevel: String(updatedDocDataForBg.readinessLevel),
          aiResult: afterData.aiResult
        });
      } catch (cacheErr) {
        console.warn("Gagal menyimpan hasil asesmen ke cache:", cacheErr);
      }
    }

    await docRef.update({
      status: "COMPLETED",
      geminiFiles: admin.firestore.FieldValue.delete(),
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  } catch (error: any) {
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }

  return null;
});