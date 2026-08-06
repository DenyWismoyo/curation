
const fs = require('fs');
const path = require('path');

function replaceClasses(content) {
  let c = content;
  
  c = c.replace(/(?<!dark:)bg-slate-900(?!\/)/g, 'bg-white dark:bg-slate-900');
  
  c = c.replace(/text-white(?![\w-]|(?:\/))/g, 'text-slate-900 dark:text-white');
  c = c.replace(/text-slate-300(?![\w-]|(?:\/))/g, 'text-slate-600 dark:text-slate-300');
  c = c.replace(/text-slate-400(?![\w-]|(?:\/))/g, 'text-slate-500 dark:text-slate-400');
  c = c.replace(/border-slate-800(?![\w-]|(?:\/))/g, 'border-slate-200 dark:border-slate-800');
  c = c.replace(/bg-slate-900\/40(?![\w-]|(?:\/))/g, 'bg-white/40 dark:bg-slate-900/40');
  c = c.replace(/bg-white\/5(?![\w-]|(?:\/))/g, 'bg-slate-100 dark:bg-white/5');
  c = c.replace(/border-white\/10(?![\w-]|(?:\/))/g, 'border-slate-200 dark:border-white/10');
  
  // FIX OVER-REPLACEMENTS in Badges/Buttons:
  c = c.replace(/text-slate-900 dark:text-white(?![\w-])/g, 'text-slate-900 dark:text-white'); // dummy
  
  // Revert for specific components that must stay text-white:
  c = c.replace(/text-slate-900 dark:text-white\s+mb-1/g, 'text-slate-900 dark:text-white mb-1'); 
  c = c.replace(/bg-[a-z]+-500 hover:bg-[a-z]+-600 text-slate-900 dark:text-white/g, match => match.replace('text-slate-900 dark:text-white', 'text-white'));
  c = c.replace(/bg-slate-900 text-slate-900 dark:text-white/g, 'bg-slate-900 text-white');
  
  return c;
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = replaceClasses(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir('d:/DENY/project/curation/src/app/(crypto)/crypto-academy');
processDir('d:/DENY/project/curation/src/features/crypto/components/alerts');
processDir('d:/DENY/project/curation/src/features/crypto/components/chat');
processDir('d:/DENY/project/curation/src/features/crypto/components/shared');

