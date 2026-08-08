const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../src/app/(assessment)'),
  path.join(__dirname, '../src/features/assessment')
];

// Patterns to replace
const replacements = [
  // Page Backgrounds -> bg-background
  { regex: /bg-\[\#FAFAFA\]\s+dark:bg-slate-95[05]/g, replace: 'bg-background' },
  { regex: /bg-[#FAFAFA]\s+dark:bg-slate-950/g, replace: 'bg-background' },
  { regex: /bg-slate-50\s+dark:bg-slate-950\/[0-9]+/g, replace: 'bg-background' },
  { regex: /bg-slate-50\s+dark:bg-slate-950/g, replace: 'bg-background' },
  { regex: /bg-slate-950\s+text-white/g, replace: 'bg-background text-foreground' }, // forced dark mode

  // Cards -> bg-card text-card-foreground
  { regex: /bg-white\s+dark:bg-slate-900\/[0-9]+/g, replace: 'bg-card text-card-foreground' },
  { regex: /bg-white\s+dark:bg-slate-900/g, replace: 'bg-card text-card-foreground' },
  { regex: /bg-white\s+dark:bg-slate-950/g, replace: 'bg-card text-card-foreground' },

  // Secondary elements / Inputs
  // These are often bg-slate-50 dark:bg-slate-900/50 -> replace with bg-secondary or bg-muted
  { regex: /bg-slate-100\s+dark:bg-slate-800/g, replace: 'bg-secondary text-secondary-foreground' },
  { regex: /bg-slate-50\s+dark:bg-slate-800\/50/g, replace: 'bg-muted text-muted-foreground' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
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

targetDirs.forEach(dir => {
  console.log(`Scanning ${dir}...`);
  traverse(dir);
});

console.log('Refactoring complete!');
