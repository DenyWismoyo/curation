import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

async function migrate() {
  const defaultDb = admin.firestore();
  const curationDb = getFirestore(admin.app(), "curation");
  
  const snap = await defaultDb.collection("cryptoReports").get();
  for (const doc of snap.docs) {
    console.log("Copying doc:", doc.id);
    await curationDb.collection("cryptoReports").doc(doc.id).set(doc.data());
    // hapus doc lama agar tidak duplikat di default db 
    // await defaultDb.collection("cryptoReports").doc(doc.id).delete();
  }
  console.log("Migration done!");
}
migrate();
