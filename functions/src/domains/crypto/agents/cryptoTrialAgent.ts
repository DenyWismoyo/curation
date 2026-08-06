import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const activateCryptoTrial = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User harus login untuk mengaktifkan trial.');
  }

  const db = getFirestore(admin.app(), 'curation');
  const uid = request.auth.uid;
  const userRef = db.collection('users').doc(uid);

  try {
    return await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) {
        throw new HttpsError('not-found', 'Data user tidak ditemukan.');
      }

      const userData = doc.data();

      // Cek apakah sudah pernah trial atau sudah/pernah premium
      if (userData?.cryptoTrialUsed || userData?.cryptoTrialActivatedAt) {
        throw new HttpsError('already-exists', 'Anda sudah pernah menggunakan akses trial.');
      }

      if (userData?.isPremium || userData?.premiumValidUntil) {
        throw new HttpsError('already-exists', 'Akses trial hanya untuk pengguna baru yang belum pernah berlangganan.');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 hari

      t.set(userRef, {
        isPremium: true,
        premiumValidUntil: expiresAt.toISOString(),
        isTrial: true,
        cryptoTrialUsed: true,
        cryptoTrialActivatedAt: now.toISOString(),
        trialExpiresAt: expiresAt.toISOString()
      }, { merge: true });

      return {
        success: true,
        message: 'Akses trial berhasil diaktifkan selama 3 hari.',
        expiresAt: expiresAt.toISOString()
      };
    });
  } catch (error: any) {
    console.error('Error activating trial:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Gagal mengaktifkan trial.', error);
  }
});
