import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

async function check() {
  const db = getFirestore(admin.app(), "curation");
  const snap = await db.collection("cryptoReports").get();
  console.log("Documents in curation:", snap.docs.length);
  snap.docs.forEach(doc => {
    console.log(doc.id, JSON.stringify(doc.data().createdAt));
  });
}
check();
