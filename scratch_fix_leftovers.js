
const fs = require('fs');
const path = require('path');

function fixLeftovers(content) {
  let c = content;
  
  // Specific patterns missed:
  c = c.replace(/(?<!dark:)bg-slate-900\/50/g, 'bg-white/50 dark:bg-slate-900/50');
  c = c.replace(/(?<!dark:)bg-slate-900\/60/g, 'bg-white/60 dark:bg-slate-900/60');
  c = c.replace(/(?<!dark:)bg-slate-900\/80/g, 'bg-white/80 dark:bg-slate-900/80');
  c = c.replace(/(?<!dark:)bg-slate-900\/30/g, 'bg-slate-100/50 dark:bg-slate-900/30'); // Used in table hover
  
  c = c.replace(/(?<!dark:)border-slate-800\/80/g, 'border-slate-200 dark:border-slate-800/80');
  c = c.replace(/(?<!dark:)border-slate-800\/60/g, 'border-slate-200 dark:border-slate-800/60');
  c = c.replace(/(?<!dark:)border-slate-800\/50/g, 'border-slate-200 dark:border-slate-800/50');
  
  c = c.replace(/(?<!dark:)hover:bg-slate-800(?!\/)/g, 'hover:bg-slate-100 dark:hover:bg-slate-800');
  
  // Fix the duplicate bg-slate-50 bg-slate-950 issue (it seems it was generated manually or by a previous replace)
  c = c.replace(/bg-slate-50 bg-slate-950/g, 'bg-slate-50 dark:bg-slate-950');
  c = c.replace(/(?<!dark:)bg-slate-950\/50/g, 'bg-slate-100 dark:bg-slate-950/50');
  c = c.replace(/(?<!dark:)bg-slate-950(?!\/|\])/g, 'bg-slate-50 dark:bg-slate-950');

  // Any remaining border-white/10 not prefixed with dark:
  c = c.replace(/(?<!dark:)border-white\/10/g, 'border-slate-200 dark:border-white/10');
  
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
      let newContent = fixLeftovers(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir('d:/DENY/project/curation/src/app/(crypto)');
processDir('d:/DENY/project/curation/src/features/crypto');

