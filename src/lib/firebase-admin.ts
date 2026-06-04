import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        // Untuk production, sangat disarankan menggunakan private key dari Service Account JSON
        // clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

// Menghubungkan ke spesifik database bernama "curation"
const db = getFirestore(admin.app(), "curation");

export { db };