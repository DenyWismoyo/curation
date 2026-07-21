// scripts/agent-db-indexer.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiKey = process.env.GEMINI_API_KEY;

// Warna Terminal ANSI
const c = { reset: "\x1b[0m", green: "\x1b[32m", cyan: "\x1b[36m", red: "\x1b[31m", yellow: "\x1b[33m" };

if (!apiKey) {
  console.error(`${c.red}❌ ERROR: GEMINI_API_KEY tidak ditemukan di .env.local${c.reset}`);
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Fungsi membaca file rekursif
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'public'].includes(file)) {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });
  return arrayOfFiles;
}

async function generateIndexes() {
  const srcPath = path.resolve(__dirname, '..', 'src');
  const outputPath = path.resolve(__dirname, '..', 'firestore.indexes.json');
  
  console.log(`\n${c.cyan}🗄️  Membangunkan Agen Database (Firestore Indexer)...${c.reset}`);
  console.log(`Mengekstraksi query Firebase dari source code...\n`);

  const files = getAllFiles(srcPath);
  let extractedQueries = [];

  // Ekstrak snippet kueri (mencari blok kode yang mengandung "query(collection")
  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('collection(') && content.includes('query(')) {
      // Ambil seluruh blok kueri menggunakan regex (mendekati)
      const queryMatches = content.match(/query\s*\(\s*collection\s*\([\s\S]*?\)\s*;/g) || 
                           content.match(/query\s*\(\s*collection\s*\([\s\S]*?\]\s*\)/g);
      if (queryMatches) {
        extractedQueries.push(...queryMatches);
      }
    }
  });

  if (extractedQueries.length === 0) {
    console.log(`${c.yellow}Tidak ditemukan kueri Firebase kompleks yang membutuhkan composite index.${c.reset}\n`);
    return;
  }

  console.log(`Terdeteksi ${extractedQueries.length} blok kueri. Menganalisis kebutuhan index menggunakan AI...\n`);

  const prompt = `Anda adalah Database Administrator ahli Firebase Firestore.
  Saya akan memberikan daftar sintaks kueri Firestore yang saya ekstrak dari source code aplikasi Next.js saya.
  
  Tugas Anda:
  1. Analisis setiap kueri, perhatikan kombinasi klausa 'where' dan 'orderBy' pada koleksi ('collection') yang sama.
  2. Hasilkan konfigurasi Composite Index yang valid untuk Firestore.
  3. Output HARUS murni dalam format JSON (file firestore.indexes.json). JANGAN berikan penjelasan apapun. JANGAN gunakan block markdown (seperti \`\`\`json). Langsung mulai dengan { dan akhiri dengan }.

  Daftar Kueri Source Code:
  ${extractedQueries.join('\n\n')}
  `;

  try {
    const result = await model.generateContent(prompt);
    let jsonContent = result.response.text().trim();
    
    // Membersihkan markdown jika AI masih membandel
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    }

    // Validasi apakah ini JSON beneran
    JSON.parse(jsonContent); 

    fs.writeFileSync(outputPath, jsonContent);
    console.log(`${c.green}✅ BERHASIL: File konfigurasi firestore.indexes.json telah digenerate!${c.reset}`);
    console.log(`${c.yellow}   ↳ Jalankan "firebase deploy --only firestore:indexes" untuk menerapkan ke Google Cloud.${c.reset}\n`);

  } catch (error) {
    console.error(`${c.red}❌ GAGAL: Terjadi kesalahan saat memproses Index dengan AI:${c.reset}`, error.message);
  }
}

generateIndexes();