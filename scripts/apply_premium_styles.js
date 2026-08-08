const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../src/app'),
  path.join(__dirname, '../src/features'),
  path.join(__dirname, '../src/components')
];

let modifiedFiles = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  const fileName = path.basename(filePath);
  const isPDF = fileName.includes('PDF');

  // 1. Page Backgrounds
  content = content.replace(/bg-\[\#FAFAFA\](?:\s+dark:bg-slate-9[0-5]0)?/g, 'bg-background text-foreground');
  content = content.replace(/bg-slate-50\s+dark:bg-slate-9[0-5]0(?:\/[0-9]+)?/g, 'bg-background text-foreground');
  content = content.replace(/bg-slate-950\s+text-white/g, 'bg-background text-foreground');

  // 2. Text Colors
  content = content.replace(/text-slate-900(?:\s+dark:text-white)?/g, 'text-foreground');
  content = content.replace(/text-slate-800(?:\s+dark:text-slate-200)?/g, 'text-foreground');
  content = content.replace(/text-slate-500(?:\s+dark:text-slate-400)?/g, 'text-muted-foreground');
  content = content.replace(/text-slate-600(?:\s+dark:text-slate-300)?/g, 'text-muted-foreground');

  // 3. Secondary Backgrounds
  content = content.replace(/bg-slate-100(?:\s+dark:bg-slate-800)?/g, 'bg-secondary text-secondary-foreground');
  content = content.replace(/bg-slate-50(?:\s+dark:bg-slate-800\/50)?/g, 'bg-muted text-muted-foreground');

  // 4. Cards (Only if not a PDF)
  if (!isPDF) {
    content = content.replace(/bg-card text-card-foreground/g, 'card-solid');
    // If it's just bg-white dark:bg-slate-900, we convert to card-solid
    content = content.replace(/bg-white(?:\s+dark:bg-slate-9[0-5]0(?:\/[0-9]+)?)?/g, 'card-solid');
  }

  // 5. Cleanup rings and specialized inputs
  content = content.replace(/ring-1 ring-slate-200(?:\/60)?(?! dark:)/g, 'ring-1 ring-border');
  content = content.replace(/ring-1 ring-slate-100(?:\/60)?(?! dark:)/g, 'ring-1 ring-border');
  content = content.replace(/border-slate-100(?:\/60)?(?! dark:)/g, 'border-border');
  content = content.replace(/border-slate-200(?:\/60)?(?! dark:)/g, 'border-border');
  content = content.replace(/border-slate-300(?:\/60)?(?! dark:)/g, 'border-border');
  
  content = content.replace(/bg-background border-slate-200 dark:border-slate-700(?:\/60)? shadow-sm text-lg font-mono text-foreground font-bold focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-transparent transition-all/g, 'input-premium');
  content = content.replace(/bg-indigo-50 dark:bg-indigo-900\/30 p-5 ring-1 ring-indigo-100 dark:ring-indigo-900\/50 shadow-sm/g, 'alert-soft-indigo p-5 flex items-start gap-4 rounded-[1.5rem]');

  // 6. Fix Red / Danger Buttons
  content = content.replace(/bg-red-500 hover:bg-red-600 text-white/g, 'btn-danger-rich');
  content = content.replace(/bg-rose-500 hover:bg-rose-600 text-white/g, 'btn-danger-rich');
  content = content.replace(/bg-red-600 hover:bg-red-700 text-white/g, 'btn-danger-rich');
  content = content.replace(/bg-rose-600 hover:bg-rose-700 (?:shadow-rose-600\/20 )?text-white/g, 'btn-danger-rich');

  // 7. Ultimate Adaptive Color Engine (For 12 Tailwind colors)
  const colors = ['rose', 'emerald', 'sky', 'blue', 'indigo', 'amber', 'purple', 'fuchsia', 'pink', 'teal', 'cyan', 'orange'];
  
  colors.forEach(c => {
    // 7a. Backgrounds (Light to Dark)
    const bgRegex = new RegExp(`\\bbg-${c}-50\\b(?!\\s+dark:)`, 'g');
    content = content.replace(bgRegex, `bg-${c}-50 dark:bg-${c}-500/10`);
    
    const hoverBgRegex = new RegExp(`\\bhover:bg-${c}-100\\b(?!\\s+dark:)`, 'g');
    content = content.replace(hoverBgRegex, `hover:bg-${c}-100 dark:hover:bg-${c}-500/20`);
    
    // 7b. Text Colors
    const textRegex = new RegExp(`text-${c}-600(?!\\s+dark:)`, 'g');
    content = content.replace(textRegex, `text-${c}-600 dark:text-${c}-400`);
    
    const text700Regex = new RegExp(`text-${c}-700(?!\\s+dark:)`, 'g');
    content = content.replace(text700Regex, `text-${c}-700 dark:text-${c}-300`);
    
    // 7c. Rings & Borders
    const ringRegex = new RegExp(`ring-${c}-200(?!\\s+dark:)`, 'g');
    content = content.replace(ringRegex, `ring-${c}-200 dark:ring-${c}-500/20`);
    
    const borderRegex = new RegExp(`border-${c}-200(?!\\s+dark:)`, 'g');
    content = content.replace(borderRegex, `border-${c}-200 dark:border-${c}-500/20`);
  });

  // 8. Fix White Gradients in Dark Mode
  content = content.replace(/to-white(?! dark:)/g, 'to-white dark:to-transparent');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
    console.log(`Refactored styles in ${fileName}`);
  }
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting universal premium styles refactor...');
targetDirs.forEach(dir => traverse(dir));
console.log(`\nSuccess! Refactored styles in ${modifiedFiles} files.`);
