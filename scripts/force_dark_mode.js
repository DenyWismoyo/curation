const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = [
  ...walk('./src/app/(crypto)'),
  ...walk('./src/components/crypto')
];

let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content;

  // Background replacements
  newContent = newContent.replace(/bg-white(\/\d+)? dark:bg-slate-9[05]0(\/\d+)?/g, (match, p1, p2) => `bg-slate-900${p2 || ''}`);
  newContent = newContent.replace(/bg-slate-[15]00?(\/\d+)? dark:bg-slate-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-slate-800${p2 || ''}`);
  newContent = newContent.replace(/bg-indigo-[51]00?(\/\d+)? dark:bg-indigo-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-indigo-900${p2 || ''}`);
  newContent = newContent.replace(/bg-indigo-[15]0\/50 dark:bg-indigo-950\/30/g, 'bg-indigo-950/30');
  newContent = newContent.replace(/bg-blue-[51]00?(\/\d+)? dark:bg-blue-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-blue-900${p2 || ''}`);
  newContent = newContent.replace(/bg-emerald-[51]00?(\/\d+)? dark:bg-emerald-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-emerald-900${p2 || ''}`);
  newContent = newContent.replace(/bg-rose-[51]00?(\/\d+)? dark:bg-rose-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-rose-900${p2 || ''}`);
  newContent = newContent.replace(/bg-orange-[51]00?(\/\d+)? dark:bg-orange-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-orange-900${p2 || ''}`);
  newContent = newContent.replace(/bg-amber-[51]00?(\/\d+)? dark:bg-amber-[89]00(\/\d+)?/g, (match, p1, p2) => `bg-amber-900${p2 || ''}`);

  // Text replacements
  newContent = newContent.replace(/text-slate-900 dark:text-white/g, 'text-white');
  newContent = newContent.replace(/text-slate-800 dark:text-slate-200/g, 'text-slate-200');
  newContent = newContent.replace(/text-slate-700 dark:text-slate-300/g, 'text-slate-300');
  newContent = newContent.replace(/text-slate-600 dark:text-slate-400/g, 'text-slate-400');
  newContent = newContent.replace(/text-indigo-700 dark:text-indigo-300/g, 'text-indigo-300');
  newContent = newContent.replace(/text-indigo-[67]00 dark:text-indigo-400/g, 'text-indigo-400');
  newContent = newContent.replace(/text-emerald-[67]00 dark:text-emerald-400/g, 'text-emerald-400');
  newContent = newContent.replace(/text-rose-[67]00 dark:text-rose-400/g, 'text-rose-400');
  newContent = newContent.replace(/text-blue-[67]00 dark:text-blue-400/g, 'text-blue-400');

  // Border replacements
  newContent = newContent.replace(/border-slate-[12]00(\/\d+)? dark:border-slate-[789]00(\/\d+)?/g, (match, p1, p2) => `border-slate-800${p2 || ''}`);
  newContent = newContent.replace(/border-indigo-200 dark:border-indigo-[89]00(\/\d+)?/g, (match, p1) => `border-indigo-800${p1 || ''}`);
  newContent = newContent.replace(/border-blue-200 dark:border-blue-[89]00(\/\d+)?/g, (match, p1) => `border-blue-800${p1 || ''}`);
  newContent = newContent.replace(/border-emerald-200 dark:border-emerald-[89]00(\/\d+)?/g, (match, p1) => `border-emerald-800${p1 || ''}`);
  newContent = newContent.replace(/border-rose-200 dark:border-rose-[89]00(\/\d+)?/g, (match, p1) => `border-rose-800${p1 || ''}`);
  
  // Data state replacements
  newContent = newContent.replace(/data-\[state=active\]:bg-white dark:data-\[state=active\]:bg-slate-900/g, 'data-[state=active]:bg-slate-900');
  newContent = newContent.replace(/data-\[state=active\]:bg-white dark:data-\[state=active\]:bg-slate-800/g, 'data-[state=active]:bg-slate-800');
  newContent = newContent.replace(/data-\[state=active\]:text-indigo-600 dark:data-\[state=active\]:text-indigo-400/g, 'data-[state=active]:text-indigo-400');

  // Generic fallback: remove `dark:` prefix from remaining properties that are in crypto section
  // Note: Only targeting specific props like dark:bg-..., dark:text-..., dark:border-...
  newContent = newContent.replace(/dark:(bg-[a-z0-9-\/]+)/g, '$1');
  newContent = newContent.replace(/dark:(text-[a-z0-9-\/]+)/g, '$1');
  newContent = newContent.replace(/dark:(border-[a-z0-9-\/]+)/g, '$1');
  newContent = newContent.replace(/dark:(hover:[a-z0-9-\/]+)/g, '$1');
  newContent = newContent.replace(/dark:(prose-invert)/g, '$1');
  newContent = newContent.replace(/dark:(data-\[state=active\]:[a-z0-9-\/]+)/g, '$1');

  // Clean up potential duplicate classes from generic fallback 
  // (e.g. if we had `bg-white dark:bg-slate-900` and generic fallback left `bg-white bg-slate-900`)
  // Actually, wait, if the generic fallback strips `dark:`, we get `bg-white bg-slate-900`. 
  // Let's remove the light counterpart if we see a dark counterpart next to it.
  newContent = newContent.replace(/bg-slate-[51]00?(\/\d+)?\s+bg-slate-[89]00/g, 'bg-slate-900');
  newContent = newContent.replace(/bg-white(\/\d+)?\s+bg-slate-[89]00/g, 'bg-slate-900');
  newContent = newContent.replace(/text-slate-[789]00\s+text-(white|slate-[234]00)/g, 'text-$1');
  newContent = newContent.replace(/border-slate-[12]00(\/\d+)?\s+border-slate-[789]00/g, 'border-slate-800');

  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    changed++;
    console.log('Updated', f);
  }
});

console.log('Total files updated:', changed);
