const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Inisialisasi menggunakan Application Default Credentials (ADC) bawaan dari gcloud
admin.initializeApp({
  projectId: 'teknopark-surakarta'
});

const db = getFirestore(admin.app(), "curation");

async function runMigration() {
  console.log("Memulai migrasi data B2B...");
  try {
    // 1. Dapatkan semua organisasi
    const orgsSnap = await db.collection("b2b_organizations").get();
    const orgMap = {};
    orgsSnap.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      if (data.name) orgMap[data.name.toLowerCase()] = id;
      if (data.displayName) orgMap[data.displayName.toLowerCase()] = id;
    });

    console.log(`Ditemukan ${Object.keys(orgMap).length} referensi organisasi.`);

    // 2. Dapatkan semua assessments
    const assessmentsSnap = await db.collection("assessments").where("corporateEntity", "!=", null).get();
    
    let count = 0;
    const batch = db.batch();
    let currentBatchSize = 0;

    for (const doc of assessmentsSnap.docs) {
      const data = doc.data();
      if (data.corporateEntity && !data.b2bOrganizationId) {
        const corpLower = data.corporateEntity.toLowerCase();
        let orgId = orgMap[corpLower] || null;
        
        if (!orgId) {
          const key = Object.keys(orgMap).find(k => k.includes(corpLower) || corpLower.includes(k));
          if (key) {
            orgId = orgMap[key];
          }
        }

        if (orgId) {
          batch.update(doc.ref, { b2bOrganizationId: orgId });
          count++;
          currentBatchSize++;

          if (currentBatchSize >= 450) {
            await batch.commit();
            currentBatchSize = 0;
            console.log(`Berhasil memproses batch: ${count} dokumen.`);
          }
        }
      }
    }

    if (currentBatchSize > 0) {
      await batch.commit();
    }

    console.log(`Migrasi Selesai! Berhasil mengupdate ${count} dokumen lama dengan field b2bOrganizationId.`);
  } catch (error) {
    console.error("Terjadi kesalahan saat migrasi:", error);
  }
}

runMigration();
