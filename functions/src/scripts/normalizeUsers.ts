import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export const normalizeUserDocs = onRequest({
  region: "asia-southeast2",
  timeoutSeconds: 300,
}, async (req, res) => {
  // Hanya izinkan admin via token sederhana atau dari environment tertentu,
  // untuk demo kita gunakan API key sederhana lewat query params
  const apiKey = req.query.key;
  if (apiKey !== process.env.MIGRATION_API_KEY && apiKey !== 'omnifit-migrate-2026') {
    res.status(401).send("Unauthorized");
    return;
  }

  const db = getFirestore(admin.app(), "curation");
  const auth = admin.auth();
  let migratedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  try {
    // Cari semua dokumen yang ID-nya mengandung '@' (asumsi itu email)
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();

    for (const doc of snapshot.docs) {
      const docId = doc.id;
      
      if (docId.includes("@")) {
        try {
          const email = docId;
          const data = doc.data();

          // Cek apakah user dengan email ini ada di Firebase Auth
          let userRecord;
          try {
            userRecord = await auth.getUserByEmail(email);
          } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
              // Jika user belum mendaftar, biarkan doc ini ada agar saat dia daftar nanti bisa diklaim
              skippedCount++;
              continue;
            }
            throw error; // Lempar jika error lain
          }

          const uid = userRecord.uid;
          const uidDocRef = usersRef.doc(uid);

          let finalData: any = {};
          // Pindahkan data (gabungkan dengan data yang mungkin sudah ada di UID doc)
          await db.runTransaction(async (transaction) => {
            const uidDoc = await transaction.get(uidDocRef);
            const uidData = uidDoc.exists ? uidDoc.data() : {};

            const mergedData = {
              ...uidData,
              role: data.role || uidData?.role || 'user',
              b2bPersonas: data.b2bPersonas || uidData?.b2bPersonas || [],
              allowedOrganizations: data.allowedOrganizations || uidData?.allowedOrganizations || [],
              b2bOrganizationIds: data.b2bOrganizationIds || uidData?.b2bOrganizationIds || [],
              organizationScopes: data.organizationScopes || uidData?.organizationScopes || [],
              accessibleOrganizations: data.accessibleOrganizations || uidData?.accessibleOrganizations || [],
              email: email,
              updatedAt: new Date().toISOString()
            };
            
            finalData = mergedData;

            transaction.set(uidDocRef, mergedData, { merge: true });
            transaction.delete(doc.ref); // Hapus doc email
          });
          
          migratedCount++;
          
          // Setelah migrasi, set Custom Claims
          const orgScopes = Array.from(new Set([
            ...(finalData.allowedOrganizations || []),
            ...(finalData.b2bOrganizationIds || []),
            ...(finalData.organizationScopes || []),
            ...(finalData.accessibleOrganizations || [])
          ]));

          const customClaims = {
            role: finalData.role,
            orgScopes: orgScopes,
            b2bPersonas: finalData.b2bPersonas
          };

          await auth.setCustomUserClaims(uid, customClaims);

        } catch (err) {
          console.error(`Gagal memigrasi doc ${docId}:`, err);
          errorsCount++;
        }
      } else {
        // Untuk doc UID, kita sync custom claims-nya sekalian
        try {
          const uid = docId;
          const data = doc.data();
          const orgScopes = Array.from(new Set([
            ...(data.allowedOrganizations || []),
            ...(data.b2bOrganizationIds || []),
            ...(data.organizationScopes || []),
            ...(data.accessibleOrganizations || [])
          ]));

          const customClaims = {
            role: data.role || 'user',
            orgScopes: orgScopes,
            b2bPersonas: data.b2bPersonas || []
          };
          
          await auth.setCustomUserClaims(uid, customClaims);
        } catch (e) {
          // mungkin user tidak ada di auth, skip
        }
      }
    }

    res.status(200).json({
      success: true,
      migratedCount,
      skippedCount,
      errorsCount,
      message: "Migrasi selesai."
    });
  } catch (error: any) {
    console.error("Migrasi gagal:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
