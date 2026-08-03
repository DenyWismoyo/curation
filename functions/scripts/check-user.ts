import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

async function check() {
  const db = getFirestore(admin.app(), "curation");
  const doc = await db.collection("users").doc("deny.wismoyo@gmail.com").get();
  console.log("User doc:", doc.data());
  
  // also test if rule allows this!
}
check();
