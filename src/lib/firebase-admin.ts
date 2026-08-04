// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  try {
    // Jika berjalan di localhost DAN ada private key
    if (process.env.NODE_ENV !== 'production' && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Format ulang \n agar terbaca sebagai enter/baris baru
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log("✅ Firebase Admin terinisialisasi (Mode Local).");
    } 
    // Jika berjalan di Production (Firebase App Hosting)
    else {
      // Firebase App Hosting otomatis menyuntikkan kredensial (Application Default Credentials)
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase Admin terinisialisasi (Mode Production / App Hosting).");
    }
  } catch (error: any) {
    console.error('❌ Firebase admin initialization error:', error.message);
  }
}

const getAdminDb = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin SDK tidak terinisialisasi. Periksa kredensial .env.");
  }
  return getFirestore(admin.app(), "curation");
};

const getAdminAuth = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin SDK tidak terinisialisasi. Periksa kredensial .env.");
  }
  return admin.auth();
};

export { getAdminDb, getAdminAuth };