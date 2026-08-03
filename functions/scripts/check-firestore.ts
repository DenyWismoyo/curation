import * as admin from "firebase-admin";

admin.initializeApp();

async function check() {
  const db = admin.firestore();
  const snap = await db.collection("cryptoReports").get();
  console.log("Documents found:", snap.docs.length);
  snap.docs.forEach(doc => {
    console.log(doc.id, doc.data().createdAt);
  });
}
check();
