import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export const processCurationAssessment = onCall({
  memory: "512MiB",
  region: "asia-southeast2",
  cors: true
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Pengguna harus login.");

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email || '';
  const data = request.data as any;

  if (!data) throw new HttpsError("invalid-argument", "Data request kosong.");

  const formData = data.formData || {};
  const trackType = data.trackType || formData.trackType || "Evaluasi Umum";
  const tokenUsed = data.tokenUsed || formData.tokenUsed || data.token || formData.token || null;
  const aiPromptConfig = data.aiPromptConfig || {};
  const storageFilePaths = data.storageFilePaths || [];
  
  let corporateEntityName = null;
  let allowedDocTemplates: string[] = [];

  const db = getFirestore(admin.app(), "curation");

  if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
    const lastDashIndex = tokenUsed.lastIndexOf('-');
    const corpId = tokenUsed.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const tokenCode = tokenUsed.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const corpRef = db.collection('corporate_tokens').doc(corpId);
    const corpDoc = await corpRef.get();
    if (!corpDoc.exists) throw new HttpsError("not-found", `Entitas korporat tidak ditemukan.`);

    const corpData = corpDoc.data();
    const tData = (corpData?.tokens || {})[tokenCode];

    if (!tData) throw new HttpsError("not-found", `Token tidak ditemukan.`);
    if (tData.isUsed) throw new HttpsError("permission-denied", "Token telah digunakan.");

    corporateEntityName = corpData?.corporateName || corpId;
    allowedDocTemplates = corpData?.allowedDocumentTemplates || [];
  }

  let assessmentId = "";

  try {
    await db.runTransaction(async (transaction) => {
      if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
        const lastDashIndex = tokenUsed.lastIndexOf('-');
        const corpId = tokenUsed.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const tokenCode = tokenUsed.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        const corpRefToUpdate = db.collection('corporate_tokens').doc(corpId);
        transaction.update(corpRefToUpdate, {
          [`tokens.${tokenCode}.isUsed`]: true,
          [`tokens.${tokenCode}.usedAt`]: new Date().toISOString(),
          [`tokens.${tokenCode}.usedByNamaUsaha`]: formData.namaUsaha || 'Tanpa Nama',
          usedCount: admin.firestore.FieldValue.increment(1)
        });
      }

      const newAssessmentRef = db.collection("assessments").doc();
      assessmentId = newAssessmentRef.id;

      const newDocData = {
        userId: userId,
        userEmail: formData.email || userEmail,
        trackType: trackType,
        corporateEntity: corporateEntityName,
        namaUsaha: formData.namaUsaha || 'Tanpa Nama',
        whatsapp: formData.whatsapp || '',
        formData: formData,
        aiPromptConfig: aiPromptConfig,
        storageFilePaths: storageFilePaths,
        tokenUsed: tokenUsed || null,
        allowedDocumentTemplates: allowedDocTemplates,
        documentGenerationQuota: tokenUsed ? 1 : 0,
        hasPaidForDocument: false,
        status: "ANALYZING_MASTER", 
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(newAssessmentRef, newDocData);
    });

    return { assessmentId, status: "ANALYZING_MASTER" };
  } catch (error: any) {
    throw new HttpsError("internal", error.message || "Gagal menginisiasi asesmen.");
  }
});