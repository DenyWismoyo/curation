const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`[SKIP] File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // --- BundleUpsellBanner.tsx Replacements ---
    // 1. Bundle 3 Modul Card (Light Premium)
    content = content.replace(
        /className="relative bg-gradient-to-br from-indigo-50 to-white dark:to-transparent rounded-3xl p-6 ring-1 ring-indigo-100 shadow-xl shadow-indigo-100\/50 overflow-hidden flex flex-col justify-between"/g,
        'className="relative card-premium-light card-interactive p-6 flex flex-col justify-between"'
    );
    
    // Fix text in Bundle 3
    content = content.replace(
        /<h3 className="text-xl font-black text-foreground mb-2">Bundle 3 Modul<\/h3>/g,
        '<h3 className="text-xl font-black text-indigo-950 dark:text-indigo-50 mb-2">Bundle 3 Modul</h3>'
    );
    
    // 2. Bundle 5 Modul Card (Dark Premium)
    content = content.replace(
        /className="relative bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-6 ring-1 ring-white\/10 shadow-xl shadow-indigo-900\/20 overflow-hidden flex flex-col justify-between"/g,
        'className="relative card-premium-dark card-interactive p-6 flex flex-col justify-between"'
    );
    
    // --- CurationLanding.tsx Replacements ---
    // 1. Onboarding Banner
    content = content.replace(
        /className="rounded-\[1\.5rem\] bg-indigo-50 dark:bg-indigo-500\/10\/60 p-5 ring-1 ring-indigo-100 shadow-sm"/g,
        'className="card-highlight p-5"'
    );

    // 2. Dashboard stat cards (if any hardcoded)
    content = content.replace(
        /className="bg-white dark:bg-slate-900 rounded-3xl p-6 ring-1 ring-slate-200 dark:ring-white\/10 shadow-xl shadow-slate-200\/50 dark:shadow-none"/g,
        'className="card-solid p-6"'
    );
    
    // General fix for other similar hardcoded rounded-3xl ring-1 cards
    content = content.replace(
        /className="bg-white dark:bg-slate-900 rounded-3xl p-6 ring-1 ring-slate-200 dark:ring-white\/10"/g,
        'className="card-solid p-6"'
    );

    // Write back if changed
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`[UPDATED] ${filePath}`);
    } else {
        console.log(`[NO CHANGES] ${filePath}`);
    }
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

// Target specific directories for maximum safety
const targetDirs = [
    'src/features/payment/components',
    'src/features/assessment/components'
];

console.log('--- Applying Advanced Card System ---');
targetDirs.forEach(dir => scanDir(dir));
console.log('--- Done ---');
