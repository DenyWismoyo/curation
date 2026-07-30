import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { generateAssessmentCacheKey, getCachedAssessmentResult } from "../../general/cacheService";

// Skema Zod untuk Payload Asesmen
const processAssessmentSchema = z.object({
  formData: z.record(z.string(), z.any()).default({}),
  trackType: z.string().trim().optional(),
  tokenUsed: z.union([z.string().trim(), z.null()]).optional(),
  token: z.union([z.string().trim(), z.null()]).optional(),
  aiPromptConfig: z.record(z.string(), z.any()).default({}),
  storageFilePaths: z.array(z.string()).default([]),
});

export const processCurationAssessment = onCall({
  memory: "512MiB",
  region: "asia-southeast2",
  cors: true
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Pengguna harus login.");

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email || '';

  const parsed = processAssessmentSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Data request tidak valid: " + parsed.error.issues[0]?.message);
  }

  const { formData, aiPromptConfig, storageFilePaths } = parsed.data;
  const trackType = parsed.data.trackType || formData.trackType || "Evaluasi Umum";
  const tokenUsed = parsed.data.tokenUsed || formData.tokenUsed || parsed.data.token || formData.token || null;
  
  let tokenCorpId: string | null = null;
  let tokenCode: string | null = null;

  if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
    const lastDashIndex = tokenUsed.lastIndexOf('-');
    tokenCorpId = tokenUsed.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    tokenCode = tokenUsed.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  // Hitung Cache Key jika tidak melampirkan berkas khusus
  const cacheKey = storageFilePaths.length === 0 
    ? generateAssessmentCacheKey(trackType, formData, aiPromptConfig)
    : null;

  let cachedResult: any = null;
  if (cacheKey) {
    cachedResult = await getCachedAssessmentResult(cacheKey);
  }

  let assessmentId = "";
  const db = getFirestore(admin.app(), "curation");

  try {
    await db.runTransaction(async (transaction) => {
      let corporateEntityName = null;
      let b2bOrganizationId = null;
      let allowedDocTemplates: string[] = [];

      if (tokenCorpId && tokenCode) {
        const corpRef = db.collection('corporate_tokens').doc(tokenCorpId);
        const corpDoc = await transaction.get(corpRef);
        
        if (!corpDoc.exists) throw new HttpsError("not-found", `Entitas korporat tidak ditemukan.`);

        const corpData = corpDoc.data();
        const tData = (corpData?.tokens || {})[tokenCode];

        if (!tData) throw new HttpsError("not-found", `Token tidak ditemukan.`);
        if (tData.isUsed) throw new HttpsError("permission-denied", "Token telah digunakan.");

        corporateEntityName = corpData?.corporateName || tokenCorpId;
        b2bOrganizationId = corpData?.organizationId || null;
        allowedDocTemplates = corpData?.allowedDocumentTemplates || [];

        transaction.update(corpRef, {
          [`tokens.${tokenCode}.isUsed`]: true,
          [`tokens.${tokenCode}.usedAt`]: new Date().toISOString(),
          [`tokens.${tokenCode}.usedByNamaUsaha`]: formData.namaUsaha || 'Tanpa Nama',
          usedCount: admin.firestore.FieldValue.increment(1)
        });
      }

      const newAssessmentRef = db.collection("assessments").doc();
      assessmentId = newAssessmentRef.id;

      const isCacheHit = !!cachedResult;

      const newDocData: Record<string, any> = {
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
        cacheKey: cacheKey || null,
        isCacheHit: isCacheHit,
        status: isCacheHit ? "COMPLETED" : "ANALYZING_METRICS",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: null,
      };

      if (b2bOrganizationId) {
        newDocData.b2bOrganizationId = b2bOrganizationId;
      }

      if (isCacheHit && cachedResult) {
        newDocData.aiResult = cachedResult.aiResult;
        newDocData.score = cachedResult.score;
        newDocData.readinessLevel = cachedResult.readinessLevel;
        newDocData.completedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      transaction.set(newAssessmentRef, newDocData);
    });

    return { 
      assessmentId, 
      status: cachedResult ? "COMPLETED" : "ANALYZING_METRICS",
      isCacheHit: !!cachedResult
    };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal menginisiasi asesmen.");
  }
});