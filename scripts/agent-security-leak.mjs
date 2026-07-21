// scripts/agent-security-leak.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Warna Terminal ANSI
const c = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", 
  yellow: "\x1b[33m", blue: "\x1b[34m", cyan: "\x1b[36m"
};

console.log(`\n${c.cyan}🛡️  Membangunkan Agen Keamanan (Security Leak Scanner)...${c.reset}`);
console.log(`${c.blue}====================================================${c.reset}\n`);

// Fungsi rekursif untuk membaca semua file ber-ekstensi spesifik di dalam folder
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'public'].includes(file)) {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });
  return arrayOfFiles;
}

const srcPath = path.resolve(__dirname, '..', 'src');
if (!fs.existsSync(srcPath)) {
  console.error(`${c.red}❌ ERROR: Folder 'src' tidak ditemukan.${c.reset}`);
  process.exit(1);
}

const files = getAllFiles(srcPath);
let totalIssues = 0;

console.log(`Memindai ${files.length} file di dalam direktori 'src'...\n`);

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);
  let fileIssues = [];

  // 1. CEK: Client-Side ENV Leak ('use client' tapi manggil process.env tanpa NEXT_PUBLIC_)
  const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
  if (isClientComponent) {
    const envMatches = content.match(/process\.env\.([a-zA-Z0-9_]+)/g);
    if (envMatches) {
      envMatches.forEach(match => {
        const envName = match.split('.')[2];
        if (!envName.startsWith('NEXT_PUBLIC_')) {
          fileIssues.push(`${c.red}[KRITIS]${c.reset} Variabel environment backend (${envName}) bocor ke Client Component.`);
        }
      });
    }
  }

  // 2. CEK: Hardcoded Secrets (Firebase AIza, dll)
  const firebaseKeyRegex = /['"](AIza[a-zA-Z0-9-_]{35})['"]/g;
  if (firebaseKeyRegex.test(content)) {
    fileIssues.push(`${c.red}[KRITIS]${c.reset} Terdeteksi Hardcoded Firebase API Key (AIza...).`);
  }

  const genericSecretRegex = /['"](sk-[a-zA-Z0-9]{32,})['"]/g;
  if (genericSecretRegex.test(content)) {
     fileIssues.push(`${c.red}[KRITIS]${c.reset} Terdeteksi Hardcoded API Secret Key (sk-...).`);
  }

  // 3. CEK: Potensi XSS (dangerouslySetInnerHTML)
  if (content.includes('dangerouslySetInnerHTML')) {
    fileIssues.push(`${c.yellow}[PERINGATAN]${c.reset} Penggunaan dangerouslySetInnerHTML terdeteksi. Pastikan data sudah di-sanitize (DOMPurify).`);
  }

  // Tampilkan isu jika ada
  if (fileIssues.length > 0) {
    console.log(`${c.yellow}📄 ${relativePath}${c.reset}`);
    fileIssues.forEach(issue => console.log(`   ↳ ${issue}`));
    totalIssues += fileIssues.length;
  }
});

console.log(`\n${c.blue}====================================================${c.reset}`);
if (totalIssues === 0) {
  console.log(`${c.green}🎉 AMAN: Tidak ditemukan kebocoran rahasia atau celah keamanan kritis.${c.reset}\n`);
} else {
  console.log(`${c.red}⚠️  DITEMUKAN ${totalIssues} ISU KEAMANAN. Harap segera perbaiki sebelum deploy!${c.reset}\n`);
}