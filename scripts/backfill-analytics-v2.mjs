import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx === -1 || !args[idx + 1]) return fallback;
  return args[idx + 1];
};

const databaseId = getArg('--database', 'curation');
const collectionName = getArg('--collection', 'assessments');

const createCredential = () => {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  return applicationDefault();
};

if (getApps().length === 0) {
  initializeApp({ credential: createCredential() });
}

const db = getFirestore(undefined, databaseId);

const BATCH_LIMIT = 450;

async function run() {
  console.log('[backfill-analytics-v2] Start');
  console.log(`[backfill-analytics-v2] database=${databaseId}, collection=${collectionName}, dryRun=${dryRun}`);

  const snapshot = await db.collection(collectionName).where('status', '==', 'COMPLETED').get();
  console.log(`[backfill-analytics-v2] COMPLETED docs: ${snapshot.size}`);

  const candidates = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data();
    return data?.analyticsSummary?.version !== 'v2';
  });

  console.log(`[backfill-analytics-v2] Need backfill: ${candidates.length}`);

  if (dryRun || candidates.length === 0) {
    console.log('[backfill-analytics-v2] Exit without write.');
    return;
  }

  let updated = 0;

  for (let i = 0; i < candidates.length; i += BATCH_LIMIT) {
    const chunk = candidates.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();

    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        analyticsBackfillRequestedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    updated += chunk.length;
    console.log(`[backfill-analytics-v2] Updated ${updated}/${candidates.length}`);
  }

  console.log('[backfill-analytics-v2] Done. Analytics agent v2 will process updated docs asynchronously.');
}

run().catch((error) => {
  console.error('[backfill-analytics-v2] Failed:', error?.message || error);
  process.exit(1);
});
