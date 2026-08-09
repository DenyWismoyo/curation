const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({ projectId: 'teknopark-surakarta' });
const db = getFirestore(admin.app(), "curation");

async function run() {
  const snapshot = await db.collection('cryptoEducation').get();
  console.log(`Checking ${snapshot.size} documents in 'curation' database...`);
  
  let batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.refactorStatus && data.refactorStatus !== 'IDLE' && data.refactorStatus !== 'COMPLETED') {
      console.log(`Resetting doc ${doc.id} from ${data.refactorStatus} to IDLE`);
      batch.update(doc.ref, { refactorStatus: 'IDLE' });
      count++;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully reset ${count} documents.`);
  } else {
    console.log("No documents needed reset.");
  }
}

run().catch(console.error);
