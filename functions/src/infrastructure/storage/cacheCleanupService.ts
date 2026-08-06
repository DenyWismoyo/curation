import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export const scheduledCacheCleanup = onSchedule({
  schedule: "every day 00:00",
  timeZone: "Asia/Jakarta",
  region: "asia-southeast2",
  memory: "256MiB",
}, async (event) => {
  const db = getFirestore(admin.app(), "curation");
  const cacheCollection = db.collection("assessment_caches");
  
  // Hitung tanggal 14 hari yang lalu
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 14);
  
  try {
    const snapshot = await cacheCollection
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(500)
      .get();
      
    if (snapshot.empty) {
      console.log("Tidak ada cache lama yang perlu dihapus.");
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Berhasil menghapus ${snapshot.size} dokumen cache yang kadaluarsa.`);
    
  } catch (error) {
    console.error("Gagal melakukan cleanup cache:", error);
  }
});
