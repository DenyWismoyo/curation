// scripts/agent-type-sync.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Warna ANSI
const c = { reset: "\x1b[0m", green: "\x1b[32m", cyan: "\x1b[36m", red: "\x1b[31m", yellow: "\x1b[33m" };

console.log(`\n${c.cyan}🔄 Membangunkan Agen Type-Sync (Firestore to TypeScript)...${c.reset}`);

// 1. Inisialisasi Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}
const db = getFirestore();

// Inisialisasi Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(`${c.red}❌ ERROR: GEMINI_API_KEY tidak ditemukan di .env.local${c.reset}`);
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Daftar koleksi yang ingin di-sync tipenya
const TARGET_COLLECTIONS = ['assessments', 'form_templates', 'transactions'];

async function syncTypes() {
  let dbSchemaSamples = {};

  try {
    console.log(`${c.yellow}Mengambil sampel dokumen terbaru dari Firestore...${c.reset}`);
    
    // Ambil 1 dokumen terbaru dari setiap koleksi sebagai sampel
    for (const collectionName of TARGET_COLLECTIONS) {
      const snap = await db.collection(collectionName).limit(1).get();
      if (!snap.empty) {
        dbSchemaSamples[collectionName] = snap.docs[0].data();
      } else {
        console.log(`${c.red}⚠️ Koleksi '${collectionName}' kosong, dilewati.${c.reset}`);
      }
    }

    if (Object.keys(dbSchemaSamples).length === 0) {
      console.log(`${c.red}❌ Tidak ada data untuk dianalisis.${c.reset}\n`);
      return;
    }

    console.log(`${c.yellow}Menganalisis skema dengan AI...${c.reset}`);

    const prompt = `Anda adalah TypeScript Expert. 
    Berikut adalah JSON sampel struktur data dari database Firestore saya.
    Buatkan TypeScript Interfaces (export interface) yang elegan dan presisi untuk merepresentasikan data ini.
    Berikan nama interface yang masuk akal (misal koleksi 'assessments' menjadi 'Assessment').
    Pastikan untuk menangani tipe data bersarang (nested objects/arrays).
    
    Data JSON:
    ${JSON.stringify(dbSchemaSamples, null, 2)}
    
    OUTPUT HARUS MURNI KODE TYPESCRIPT. Jangan gunakan blok markdown (\`\`\`typescript). Jangan berikan penjelasan.`;

    const result = await model.generateContent(prompt);
    let tsCode = result.response.text().trim();
    
    // Bersihkan sisa markdown jika ada
    if (tsCode.startsWith('```')) {
      tsCode = tsCode.replace(/^```(typescript|ts)?/gi, '').replace(/```$/g, '').trim();
    }

    // Pastikan folder types ada
    const typesDir = path.resolve(__dirname, '..', 'src', 'types');
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    const outputPath = path.join(typesDir, 'database.ts');
    fs.writeFileSync(outputPath, tsCode);

    console.log(`${c.green}✅ BERHASIL: Definisi Tipe Data telah di-generate di src/types/database.ts!${c.reset}\n`);

  } catch (error) {
    console.error(`${c.red}❌ GAGAL:${c.reset}`, error.message);
  }
}

syncTypes();