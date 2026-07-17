// scripts/generate-tree.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Daftar folder yang secara otomatis diabaikan
const IGNORE_LIST = ['node_modules', '.git', '.next', 'dist', 'build', '.backup', '.agents', '.github'];

/**
 * Fungsi rekursif untuk membaca struktur direktori dengan filter
 */
function generateTree(basePath, relativePath = '', prefix = '') {
  let result = [];
  const currentFullPath = path.join(basePath, relativePath);
  let files;

  try {
    files = fs.readdirSync(currentFullPath);
  } catch (err) {
    return [`${prefix}└── [Error membaca direktori]`];
  }

  // Filter khusus sesuai permintaan
  const filteredFiles = files.filter(file => {
    // Abaikan file/folder dalam IGNORE_LIST
    if (IGNORE_LIST.includes(file)) return false;

    // Filter di level ROOT proyek
    if (relativePath === '') {
      // HANYA izinkan functions, public, dan src
      return ['functions', 'public', 'src'].includes(file);
    }

    // Filter di dalam folder 'functions'
    if (relativePath === 'functions') {
      // HANYA izinkan folder src
      return file === 'src';
    }

    // Untuk sub-folder lainnya (di dalam public, src, atau functions/src), izinkan semua
    return true;
  });

  // Mengurutkan agar folder tampil lebih dulu, lalu file
  filteredFiles.sort((a, b) => {
    const isDirA = fs.statSync(path.join(currentFullPath, a)).isDirectory();
    const isDirB = fs.statSync(path.join(currentFullPath, b)).isDirectory();
    if (isDirA && !isDirB) return -1;
    if (!isDirA && isDirB) return 1;
    return a.localeCompare(b);
  });

  filteredFiles.forEach((file, index) => {
    const isLast = index === filteredFiles.length - 1;
    const fileRelativePath = path.join(relativePath, file);
    const fullPath = path.join(basePath, fileRelativePath);
    const stats = fs.statSync(fullPath);
    
    const marker = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    result.push(`${prefix}${marker}${file}`);

    // Jika ini adalah direktori, panggil fungsi ini lagi secara rekursif
    if (stats.isDirectory()) {
      result.push(...generateTree(basePath, fileRelativePath, childPrefix));
    }
  });

  return result;
}

function main() {
  const args = process.argv.slice(2);
  const targetRelativePath = args[0] || '..';
  const targetAbsolutePath = path.resolve(__dirname, targetRelativePath);

  console.log(`\nMemindai struktur direktori: ${targetAbsolutePath}...\n`);

  if (!fs.existsSync(targetAbsolutePath)) {
    console.error(`ERROR: Direktori ${targetAbsolutePath} tidak ditemukan.`);
    process.exit(1);
  }

  const rootName = path.basename(targetAbsolutePath);
  console.log(`${rootName}/ (Root Directory)`);
  
  const treeLines = generateTree(targetAbsolutePath);
  console.log(treeLines.join('\n'));
  
  console.log('\nSelesai!');
}

main();