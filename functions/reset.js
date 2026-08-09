const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'teknopark-surakarta' });
const db = admin.firestore();

async function reset() {
  console.log("Resetting...");
  const snap = await db.collection('cryptoEducation').where('refactorStatus', 'in', ['INDEXING_RESEARCH', 'WRITING', 'EDITING']).get();
  console.log(`Found ${snap.size} documents.`);
  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, { refactorStatus: 'IDLE' });
  });
  await batch.commit();
  console.log('Reset complete');
  process.exit(0);
}
reset().catch(e => { console.error(e); process.exit(1); });
