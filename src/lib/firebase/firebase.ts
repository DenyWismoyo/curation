import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getPerformance } from "firebase/performance";
import { getRemoteConfig } from "firebase/remote-config";
import { getVertexAI } from "@firebase/vertexai";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi layanan Firebase
const db = getFirestore(app, "curation"); 
const storage = getStorage(app);
const functions = getFunctions(app, "asia-southeast2");

// Inisialisasi Auth untuk Login Google
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Layanan sisi klien saja (App Check, Performance, Remote Config, AI Logic)
let appCheck: any, perf: any, remoteConfig: any, vertexAI: any;
if (typeof window !== "undefined") {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''),
    isTokenAutoRefreshEnabled: true
  });
  perf = getPerformance(app);
  
  remoteConfig = getRemoteConfig(app);
  remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 jam

  vertexAI = getVertexAI(app);
}

export { app, db, storage, functions, auth, googleProvider, appCheck, perf, remoteConfig, vertexAI };