import * as admin from "firebase-admin";

admin.initializeApp();

async function check() {
  const db = admin.firestore();
  const doc = await db.collection("cryptoReports").doc("rbl5J0PEdHqgFR81q3BX").get();
  console.log(JSON.stringify(doc.data(), null, 2));
}
check();
