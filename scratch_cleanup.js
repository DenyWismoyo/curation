
const fs = require('fs');
const path = require('path');

function cleanup(content) {
  let c = content;
  
  c = c.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');
  c = c.replace(/text-slate-600 dark:text-slate-600 dark:text-slate-300/g, 'text-slate-600 dark:text-slate-300');
  c = c.replace(/text-slate-500 dark:text-slate-500 dark:text-slate-400/g, 'text-slate-500 dark:text-slate-400');
  c = c.replace(/border-slate-200 dark:border-slate-200 dark:border-slate-800/g, 'border-slate-200 dark:border-slate-800');
  c = c.replace(/bg-white dark:bg-white dark:bg-slate-900/g, 'bg-white dark:bg-slate-900');
  c = c.replace(/bg-white\/40 dark:bg-white\/40 dark:bg-slate-900\/40/g, 'bg-white/40 dark:bg-slate-900/40');
  c = c.replace(/bg-slate-100 dark:bg-slate-100 dark:bg-white\/5/g, 'bg-slate-100 dark:bg-white/5');
  c = c.replace(/border-slate-200 dark:border-slate-200 dark:border-white\/10/g, 'border-slate-200 dark:border-white/10');
  
  // Edge cases from bad over-replacement
  c = c.replace(/text-slate-600 dark:text-slate-500 dark:text-slate-400/g, 'text-slate-500 dark:text-slate-400');
  c = c.replace(/bg-white\/40 dark:bg-white\/40/g, 'bg-white/40');
  c = c.replace(/dark:bg-slate-900\/40 dark:bg-slate-900\/40/g, 'dark:bg-slate-900/40');
  
  return c;
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = cleanup(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir('d:/DENY/project/curation/src/app/(crypto)/crypto-report');
processDir('d:/DENY/project/curation/src/features/crypto/components/dashboard');

