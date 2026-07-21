// scripts/agent-structure.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// Anda menggunakan flash yang cepat dan ringan untuk pemrosesan teks repetitif
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

// Fungsi untuk membaca struktur folder 'src' (tanpa isi file, hanya kerangka)
function getDirectoryTree(dirPath, prefix = '') {
  let result = '';
  const items = fs.readdirSync(dirPath);

  // Abaikan folder build, node_modules, atau file tersembunyi
  const filteredItems = items.filter(item => !['.DS_Store', 'node_modules', '.next'].includes(item));

  filteredItems.forEach((item, index) => {
    const isLast = index === filteredItems.length - 1;
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    result += `${prefix}${isLast ? '└── ' : '├── '}${item}\n`;

    if (stats.isDirectory()) {
      result += getDirectoryTree(itemPath, prefix + (isLast ? '    ' : '│   '));
    }
  });
  return result;
}

async function analyzeStructure() {
  const srcPath = path.resolve(__dirname, '..', 'src');
  const outputDir = path.resolve(__dirname, '..', 'public', 'docs');
  const outputPath = path.join(outputDir, 'architecture-review.md');

  if (!fs.existsSync(srcPath)) {
    console.error(`❌ ERROR: Folder 'src' tidak ditemukan di ${srcPath}`);
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Memindai struktur hirarki folder 'src'...`);
    const tree = getDirectoryTree(srcPath);

    console.log(`🤖 Membangunkan Agen AI (System Architect) untuk analisis struktur...`);
    
    // Prompt dirancang untuk output yang padat, instruksional, dan mudah dieksekusi manusia
    const prompt = `Anda adalah System Architect Ahli untuk aplikasi Next.js (App Router) skala enterprise.
    Tugas Anda adalah meninjau struktur direktori 'src' berikut dan memberikan "Architecture Review & Clean-up Report".
    
    STRUKTUR DIREKTORI SAAT INI:
    src/
    ${tree}
    
    TUGAS ANALISIS (Sajikan dalam format Markdown yang rapi):
    1. **Ringkasan Kesehatan Struktur**: Berikan penilaian singkat (1-10) dan alasan utamanya.
    2. **Anomali & Redundansi**: Deteksi penamaan file yang melanggar konvensi Next.js (misal: harusnya kebab-case tapi memakai camelCase), folder yang terlalu dalam, atau komponen UI (seperti button, card) yang berceceran di luar ekosistem desain.
    3. **Rekomendasi Refactoring**: Berikan instruksi langkah-demi-langkah (actionable steps) folder/file mana yang harus dipindah atau disatukan untuk mencapai arsitektur modular yang minimalis.
    4. **Aturan Domain (Linting Rules)**: Usulkan 3-4 aturan baku (SOP) untuk penamaan file dan pemisahan 'hooks', 'contexts', dan 'services' di masa depan.
    
    Gunakan Bahasa Indonesia yang teknis, lugas, dan sangat instruksional. Jangan gunakan block markdown (seperti \`\`\`markdown) di awal/akhir output. Hasilkan teks murni.`;

    const result = await model.generateContent(prompt);
    const markdownContent = result.response.text();

    if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, markdownContent.trim());
    console.log(`✅ BERHASIL! Laporan refactoring struktur telah ditulis ke: public/docs/architecture-review.md\n`);

  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error.message);
  }
}

analyzeStructure();