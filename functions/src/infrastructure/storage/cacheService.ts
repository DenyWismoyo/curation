import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Menghitung deterministic SHA-256 hash untuk data request asesmen.
 */
export function generateAssessmentCacheKey(
  trackType: string,
  formData: Record<string, any>,
  aiPromptConfig: Record<string, any> = {}
): string {
  const normalizedFormData: Record<string, any> = {};
  
  const sortedKeys = Object.keys(formData || {}).sort();
  for (const key of sortedKeys) {
    if (['whatsapp', 'email', 'submittedAt', 'timestamp', 'tokenUsed'].includes(key)) {
      continue;
    }
    const val = formData[key];
    if (val !== undefined && val !== null && val !== '') {
      normalizedFormData[key] = val;
    }
  }

  const payload = {
    trackType: (trackType || '').trim().toLowerCase(),
    formData: normalizedFormData,
    promptConfig: {
      strictness: aiPromptConfig.gradingStrictness || 'standard',
      tone: aiPromptConfig.reportTone || 'consultative',
      targetAudience: aiPromptConfig.targetAudience || 'company',
      customSystemPrompt: aiPromptConfig.customSystemPrompt || ''
    }
  };

  const jsonString = JSON.stringify(payload);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Mengambil hasil asesmen yang di-cache jika masih valid (default TTL: 14 hari).
 */
export async function getCachedAssessmentResult(
  cacheKey: string,
  maxAgeDays = 14
): Promise<any | null> {
  try {
    const db = getFirestore(admin.app(), "curation");
    const cacheRef = db.collection('assessment_caches').doc(cacheKey);
    const docSnap = await cacheRef.get();

    if (!docSnap.exists) return null;

    const data = docSnap.data();
    if (!data || !data.aiResult) return null;

    const createdAt = data.createdAt ? data.createdAt.toDate() : new Date(0);
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > maxAgeDays) {
      console.log(`[CACHE EXPIRED] Cache ${cacheKey} sudah berusia ${ageInDays.toFixed(1)} hari.`);
      return null;
    }

    console.log(`[CACHE HIT] Menggunakan cache hasil asesmen untuk key: ${cacheKey}`);
    return {
      aiResult: data.aiResult,
      score: data.score || data.aiResult?.totalScore || 0,
      readinessLevel: data.readinessLevel || data.aiResult?.readinessLevel || 'Belum Ditentukan',
      cachedAt: createdAt.toISOString()
    };
  } catch (error) {
    console.warn(`[CACHE ERROR] Gagal membaca cache:`, error);
    return null;
  }
}

/**
 * Menyimpan hasil asesmen ke dalam cache Firestore.
 */
export async function setCachedAssessmentResult(
  cacheKey: string,
  docData: {
    trackType: string;
    score: number;
    readinessLevel: string;
    aiResult: any;
  }
): Promise<void> {
  try {
    const db = getFirestore(admin.app(), "curation");
    const cacheRef = db.collection('assessment_caches').doc(cacheKey);

    await cacheRef.set({
      cacheKey,
      trackType: docData.trackType,
      score: docData.score,
      readinessLevel: docData.readinessLevel,
      aiResult: docData.aiResult,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[CACHE SET] Berhasil menyimpan cache hasil asesmen untuk key: ${cacheKey}`);
  } catch (error) {
    console.warn(`[CACHE SET ERROR] Gagal menyimpan cache:`, error);
  }
}
