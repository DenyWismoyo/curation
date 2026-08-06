const fs = require('fs');
const path = require('path');

const DARK_PATTERNS = [
  /(?<!dark:)bg-[a-z]+-800(?!\d)/g,
  /(?<!dark:)bg-[a-z]+-900(?!\d)/g,
  /(?<!dark:)bg-[a-z]+-950(?!\d)/g,
  /(?<!dark:)from-[a-z]+-800(?!\d)/g,
  /(?<!dark:)from-[a-z]+-900(?!\d)/g,
  /(?<!dark:)from-[a-z]+-950(?!\d)/g,
  /(?<!dark:)to-[a-z]+-800(?!\d)/g,
  /(?<!dark:)to-[a-z]+-900(?!\d)/g,
  /(?<!dark:)to-[a-z]+-950(?!\d)/g,
  /(?<!dark:)border-[a-z]+-700(?!\d)/g,
  /(?<!dark:)border-[a-z]+-800(?!\d)/g,
  /(?<!dark:)border-[a-z]+-900(?!\d)/g,
  /(?<!dark:)border-[a-z]+-950(?!\d)/g,
  /(?<!dark:)ring-[a-z]+-800(?!\d)/g,
  /(?<!dark:)ring-[a-z]+-900(?!\d)/g,
];

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      let localIssues = 0;
      lines.forEach((line, i) => {
        if (line.includes('className=')) {
           DARK_PATTERNS.forEach(pattern => {
              const matches = line.match(pattern);
              if (matches) {
                 // Ignore if it's explicitly meant to be dark
                 if (!line.includes('variant="premium"') && !line.includes('bg-slate-900 text-white')) {
                    console.log(fullPath + ':' + (i+1) + ' -> ' + matches.join(', '));
                    localIssues++;
                 }
              }
           });
        }
      });
    }
  }
}

console.log('--- DETEKSI HARDCODED DARK MODE KELAS ---');
checkDir('d:/DENY/project/curation/src/app/(crypto)');
checkDir('d:/DENY/project/curation/src/features/crypto');
console.log('Selesai pengecekan.');
