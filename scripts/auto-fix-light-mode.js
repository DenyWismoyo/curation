const fs = require('fs');
const path = require('path');

function fixClasses(content) {
  let c = content;
  
  // Backgrounds
  c = c.replace(/(?<!dark:)bg-slate-800(?!\d|\/)/g, 'bg-slate-100 dark:bg-slate-800');
  c = c.replace(/(?<!dark:)bg-slate-950(?!\d|\/)/g, 'bg-slate-50 dark:bg-slate-950');
  c = c.replace(/(?<!dark:)bg-emerald-950(?!\d|\/)/g, 'bg-emerald-50 dark:bg-emerald-950');
  c = c.replace(/(?<!dark:)bg-rose-950(?!\d|\/)/g, 'bg-rose-50 dark:bg-rose-950');
  c = c.replace(/(?<!dark:)bg-red-950(?!\d|\/)/g, 'bg-red-50 dark:bg-red-950');
  c = c.replace(/(?<!dark:)bg-indigo-900(?!\d|\/)/g, 'bg-indigo-50 dark:bg-indigo-900');
  c = c.replace(/(?<!dark:)bg-indigo-950(?!\d|\/)/g, 'bg-indigo-100 dark:bg-indigo-950');
  c = c.replace(/(?<!dark:)bg-purple-900(?!\d|\/)/g, 'bg-purple-50 dark:bg-purple-900');
  c = c.replace(/(?<!dark:)bg-purple-950(?!\d|\/)/g, 'bg-purple-100 dark:bg-purple-950');
  c = c.replace(/(?<!dark:)bg-orange-950(?!\d|\/)/g, 'bg-orange-50 dark:bg-orange-950');

  // Backgrounds with opacity
  c = c.replace(/(?<!dark:)bg-slate-950\/(\d+)/g, 'bg-slate-100 dark:bg-slate-950/$1');
  c = c.replace(/(?<!dark:)bg-emerald-950\/(\d+)/g, 'bg-emerald-100 dark:bg-emerald-950/$1');
  c = c.replace(/(?<!dark:)bg-rose-950\/(\d+)/g, 'bg-rose-100 dark:bg-rose-950/$1');
  c = c.replace(/(?<!dark:)bg-red-950\/(\d+)/g, 'bg-red-100 dark:bg-red-950/$1');
  c = c.replace(/(?<!dark:)bg-slate-800\/(\d+)/g, 'bg-slate-200 dark:bg-slate-800/$1');

  // Gradients
  c = c.replace(/(?<!dark:)from-slate-800(?!\d)/g, 'from-slate-100 dark:from-slate-800');
  c = c.replace(/(?<!dark:)from-slate-950(?!\d)/g, 'from-slate-50 dark:from-slate-950');
  c = c.replace(/(?<!dark:)from-orange-950(?!\d)/g, 'from-orange-50 dark:from-orange-950');
  c = c.replace(/(?<!dark:)from-purple-900(?!\d)/g, 'from-purple-100 dark:from-purple-900');
  c = c.replace(/(?<!dark:)from-indigo-900(?!\d)/g, 'from-indigo-100 dark:from-indigo-900');
  
  c = c.replace(/(?<!dark:)to-slate-900(?!\d)/g, 'to-slate-200 dark:to-slate-900');
  c = c.replace(/(?<!dark:)to-slate-950(?!\d)/g, 'to-slate-100 dark:to-slate-950');
  c = c.replace(/(?<!dark:)to-indigo-900(?!\d)/g, 'to-indigo-50 dark:to-indigo-900');

  // Borders
  c = c.replace(/(?<!dark:)border-slate-700(?!\d|\/)/g, 'border-slate-300 dark:border-slate-700');
  c = c.replace(/(?<!dark:)border-slate-800(?!\d|\/)/g, 'border-slate-200 dark:border-slate-800');
  c = c.replace(/(?<!dark:)border-slate-900(?!\d|\/)/g, 'border-slate-200 dark:border-slate-900');
  c = c.replace(/(?<!dark:)border-slate-950(?!\d|\/)/g, 'border-slate-100 dark:border-slate-950');
  c = c.replace(/(?<!dark:)border-([a-z]+)-900(?!\d|\/)/g, (match, color) => 'border-' + color + '-200 dark:' + match);
  
  // Borders with opacity
  c = c.replace(/(?<!dark:)border-slate-700\/(\d+)/g, 'border-slate-300 dark:border-slate-700/$1');
  c = c.replace(/(?<!dark:)border-red-900\/(\d+)/g, 'border-red-300 dark:border-red-900/$1');
  c = c.replace(/(?<!dark:)border-emerald-900\/(\d+)/g, 'border-emerald-300 dark:border-emerald-900/$1');
  
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
      let newContent = fixClasses(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

console.log('--- MENERAPKAN AUTO-FIX LIGHT MODE KELAS ---');
processDir('d:/DENY/project/curation/src/app/(crypto)');
processDir('d:/DENY/project/curation/src/features/crypto');
console.log('Selesai auto-fix.');
