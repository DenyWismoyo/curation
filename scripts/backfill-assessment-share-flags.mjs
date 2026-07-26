import process from 'node:process';
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const onlyMissing = args.has('--only-missing');
const batchSize = 300;

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }

  return initializeApp({ credential: applicationDefault() });
}

function needsUpdate(data) {
  if (!onlyMissing) {
    return true;
  }

  return data.allowPublicRead !== true || data.publicResult !== true || data.shareable !== true;
}

async function main() {
  initAdmin();
  const db = getFirestore(undefined, 'curation');

  console.log('Memulai backfill share flags assessment...');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);
  console.log(`Filter: ${onlyMissing ? 'only missing flags' : 'all docs (overwrite true)'}`);

  let totalScanned = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  let lastDoc = null;

  while (true) {
    let q = db.collection('assessments').orderBy('__name__').limit(batchSize);
    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }

    const snap = await q.get();
    if (snap.empty) {
      break;
    }

    totalScanned += snap.size;
    const writer = dryRun ? null : db.bulkWriter();

    for (const doc of snap.docs) {
      const data = doc.data() || {};
      if (!needsUpdate(data)) {
        continue;
      }

      totalMatched += 1;
      const payload = {
        allowPublicRead: true,
        publicResult: true,
        shareable: true,
        shareFlagsBackfilledAt: FieldValue.serverTimestamp(),
      };

      if (dryRun) {
        console.log(`[DRY] ${doc.id}`);
      } else {
        writer.set(doc.ref, payload, { merge: true });
        totalUpdated += 1;
      }
    }

    if (writer) {
      await writer.close();
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    console.log(`Progress: scanned=${totalScanned}, matched=${totalMatched}, updated=${totalUpdated}`);
  }

  console.log('Selesai backfill assessment share flags.');
  console.log(`Total scanned: ${totalScanned}`);
  console.log(`Total matched: ${totalMatched}`);
  console.log(`Total updated: ${dryRun ? 0 : totalUpdated}`);
}

main().catch((err) => {
  console.error('Backfill gagal:', err);
  process.exitCode = 1;
});
