import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const syncUserClaims = onDocumentWritten({
  document: "users/{uid}",
  region: "asia-southeast2",
}, async (event) => {
  const uid = event.params.uid;

  // Jika doc berupa email (meski sudah kita usahakan pindah), skip sync agar auth tidak error.
  if (uid.includes("@")) {
    console.log(`Skip claims sync for email-based doc: ${uid}`);
    return;
  }

  const auth = admin.auth();

  if (!event.data) {
    // Dokumen dihapus
    console.log(`Document users/${uid} deleted. Removing claims.`);
    try {
      await auth.setCustomUserClaims(uid, null);
    } catch (e: any) {
      console.error("Error clearing custom claims:", e.message);
    }
    return;
  }

  const afterData = event.data.after.data();
  if (!afterData) return;

  const orgScopes = Array.from(new Set([
    ...(afterData.allowedOrganizations || []),
    ...(afterData.b2bOrganizationIds || []),
    ...(afterData.organizationScopes || []),
    ...(afterData.accessibleOrganizations || [])
  ]));

  const claims = {
    role: afterData.role || 'user',
    orgScopes: orgScopes,
    b2bPersonas: afterData.b2bPersonas || []
  };

  try {
    // Memeriksa apakah user ada di Auth sebelum nge-set custom claims
    await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, claims);
    console.log(`Custom claims successfully synced for UID: ${uid}`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User ${uid} not found in Auth. Skip syncing claims.`);
    } else {
      console.error(`Error setting custom claims for ${uid}:`, error.message);
    }
  }
});
