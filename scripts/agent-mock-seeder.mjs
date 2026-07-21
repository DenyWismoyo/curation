// scripts/agent-mock-seeder.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================================================
// PANDUAN PENGGUNAAN (DOCUMENTATION)
// ============================================================================
// Skrip ini berfungsi untuk menyuntikkan (seeding) data dummy yang REALISTIS
// ke dalam database Firestore menggunakan kecerdasan buatan (Gemini).
// Sangat berguna untuk menguji tampilan Dasbor atau UI/UX agar terlihat organik.
//
// CARA EKSEKUSI DI TERMINAL:
// node scripts/agent-mock-seeder.mjs --collection <nama_koleksi> --count <jumlah>
//
// CONTOH:
// Menseeding 5 data transaksi palsu:
// node scripts/agent-mock-seeder.mjs --collection transactions --count 5
//
// Menseeding 3 data feedback pengguna:
// node scripts/agent-mock-seeder.mjs --collection feedbacks --count 3
// ============================================================================

// Warna ANSI
const c = { reset: "\x1b[0m", green: "\x1b[32m", cyan: "\x1b[36m", red: "\x1b[31m", yellow: "\x1b[33m" };

// 1. Parsing Argumen Command Line
const args = process.argv.slice(2);
let targetCollection = null;
let generateCount = 3; // Default 3 data

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--collection' && args[i + 1]) {
    targetCollection = args[i + 1];
  }
  if (args[i] === '--count' && args[i + 1]) {
    generateCount = parseInt(args[i + 1], 10);
  }
}

if (!targetCollection) {
  console.log(`\n${c.red}❌ ERROR: Harap tentukan target koleksi.${c.reset}`);
  console.log(`${c.yellow}Gunakan perintah: node scripts/agent-mock-seeder.mjs --collection <nama_koleksi> --count <jumlah>${c.reset}\n`);
  process.exit(1);
}

// 2. Inisialisasi Firebase Admin & Gemini
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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(`${c.red}❌ ERROR: GEMINI_API_KEY tidak ditemukan di .env.local${c.reset}`);
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function seedData() {
  console.log(`\n${c.cyan}🌱 Memulai Proses Seeding Koleksi: [${targetCollection}]${c.reset}`);
  console.log(`${c.yellow}Meminta AI menghasilkan ${generateCount} data organik dalam bahasa Indonesia...${c.reset}`);

  // 3. Merumuskan Prompt agar output sesuai dengan ekspektasi JSON Array
  const prompt = `Anda adalah Data Engineer. Hasilkan TEPAT ${generateCount} data dummy berwujud Array of JSON Objects.
  Data ini akan disuntikkan ke database Firestore untuk koleksi bernama: "${targetCollection}".
  
  Konteks Aplikasi: "Omnifit - Pusat Kendali Eksekusi Berkelanjutan dan Asesmen AI untuk UMKM/Instansi".
  
  Aturan Wajib:
  1. Data harus berbahasa Indonesia yang profesional dan sangat realistis (jangan gunakan teks lorem ipsum).
  2. Gunakan nama orang/perusahaan lokal Indonesia (misal: PT Sejahtera Abadi, Budi Santoso).
  3. Sisipkan field 'createdAt' dengan format string ISO-8601 (tanggal acak di bulan ini).
  4. OUTPUT HARUS VALID JSON ARRAY, HANYA JSON. Jangan gunakan markdown \`\`\`json.
  
  Mulailah langsung dengan tanda [ dan akhiri dengan ].`;

  try {
    const result = await model.generateContent(prompt);
    let jsonContent = result.response.text().trim();
    
    // Membersihkan sisa markdown jika ada
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    }

    const dummyDataArray = JSON.parse(jsonContent);

    if (!Array.isArray(dummyDataArray)) {
      throw new Error("AI tidak mengembalikan format Array.");
    }

    console.log(`${c.yellow}Data berhasil di-generate AI. Sedang menyuntikkan ke Firestore...${c.reset}`);

    // 4. Batch Upload ke Firestore
    const batch = db.batch();
    
    dummyDataArray.forEach((data, index) => {
      // Membuat referensi dokumen baru dengan ID acak
      const docRef = db.collection(targetCollection).doc();
      batch.set(docRef, data);
    });

    await batch.commit();

    console.log(`${c.green}✅ BERHASIL: ${dummyDataArray.length} data sukses ditambahkan ke koleksi [${targetCollection}]!${c.reset}\n`);

  } catch (error) {
    console.error(`\n${c.red}❌ GAGAL:${c.reset}`, error.message);
    console.log(`${c.yellow}Pastikan format nama koleksi benar atau coba kurangi jumlah --count jika AI kewalahan.${c.reset}\n`);
  }
}

seedData();