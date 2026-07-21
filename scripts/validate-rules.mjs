// scripts/validate-rules.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definisikan path ke file firestore.rules
const rulesFilePath = path.resolve(__dirname, '..', 'firestore.rules');

console.log(`\n🔍 Memulai Pengecekan Firestore Rules (Omnifit)`);
console.log(`====================================================\n`);

if (!fs.existsSync(rulesFilePath)) {
  console.error(`❌ ERROR: File firestore.rules tidak ditemukan di rute: ${rulesFilePath}`);
  process.exit(1);
}

const rulesContent = fs.readFileSync(rulesFilePath, 'utf8');

// ==========================================
// DAFTAR PENGECEKAN (CHECKLIST KEMANAN)
// ==========================================
const checks = [
  {
    name: 'Version 2 Terdefinisi',
    test: /rules_version\s*=\s*['"]2['"];/i.test(rulesContent),
    desc: 'Memastikan penggunaan Firestore Rules Engine versi 2.'
  },
  {
    name: 'Fungsi isAuthenticated()',
    test: /function\s+isAuthenticated\(\)\s*\{/.test(rulesContent),
    desc: 'Fungsi dasar pengecekan user yang sudah login (auth).'
  },
  {
    name: 'Fungsi isSuperAdmin() (Hardcoded)',
    test: /function\s+isSuperAdmin\(\)\s*\{\s*return\s+request\.auth\s*!=\s*null\s*&&\s*request\.auth\.token\.email\s*==\s*['"]deny\.wismoyo@gmail\.com['"];/i.test(rulesContent),
    desc: 'Pengecekan Super Admin spesifik ke "deny.wismoyo@gmail.com".'
  },
  {
    name: 'Fungsi isAssessor()',
    test: /function\s+isAssessor\(\)\s*\{/.test(rulesContent),
    desc: 'Fungsi untuk mengecek Role Assessor.'
  },
  {
    name: 'Proteksi Dokumen Internal',
    test: /match\s+\/internal\/details/.test(rulesContent) && /allow\s+write\s*:\s*if\s+false\s*;/.test(rulesContent),
    desc: 'Sub-koleksi /internal/details TIDAK BOLEH ditulis (write) dari client-side.'
  },
  {
    name: 'Proteksi Brankas Transaksi',
    test: /match\s+\/transactions\slash\{transactionId\}/.test(rulesContent) && /allow\s+write\s*:\s*if\s+false\s*;/.test(rulesContent),
    desc: 'Koleksi transactions harus Read-Only bagi client-side (ditulis dari Cloud Functions).'
  },
  {
    name: 'Penutup Dokumen Ganda (Fallback Match All)',
    test: /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write\s*:\s*if\s+false\s*;/.test(rulesContent),
    desc: 'Mengunci semua akses pada koleksi yang tidak dideklarasikan.'
  }
];

let failedCount = 0;

checks.forEach((check, index) => {
  if (check.test) {
    console.log(`✅ [${index + 1}] ${check.name}`);
  } else {
    console.log(`❌ [${index + 1}] ${check.name} \n      ↳ (Peringatan: ${check.desc})`);
    failedCount++;
  }
});

console.log(`\n====================================================`);
if (failedCount === 0) {
  console.log(`🎉 SUKSES: Semua pengecekan Firestore Rules berhasil dilalui.`);
} else {
  console.log(`⚠️ PERINGATAN: Ditemukan ${failedCount} isu keamanan pada rules Anda.`);
}
console.log(`\n`);