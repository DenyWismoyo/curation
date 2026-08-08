const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.log(`[SKIP] File not found: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    for (const [search, replace] of replacements) {
        // use regex with global flag if search is string
        const regex = typeof search === 'string' ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : search;
        content = content.replace(regex, replace);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[UPDATED] ${filePath}`);
    } else {
        console.log(`[NO CHANGES] ${filePath}`);
    }
}

// 1. Update Admin Layout
replaceInFile(path.join(__dirname, '../src/app/(admin)/layout.tsx'), [
    ['bg-slate-900', 'bg-background'],
    ['bg-slate-900/90', 'bg-background/90'],
    ['text-slate-300', 'text-foreground'],
    ['text-slate-400', 'text-muted-foreground'],
    ['text-slate-100', 'text-foreground'],
    ['hover:bg-slate-800/80', 'hover:bg-muted'],
    ['hover:bg-slate-800/70', 'hover:bg-muted'],
    ['hover:bg-slate-800/40', 'hover:bg-muted'],
    ['hover:bg-slate-800', 'hover:bg-muted'],
    ['border-slate-800', 'border-border'],
    ['shadow-slate-950/20', 'shadow-sm'],
    ['hidden md:flex flex-col bg-background text-foreground shrink-0 transition-all duration-300 relative z-20 shadow-sm', 'hidden md:flex flex-col bg-background text-foreground border-r border-border shrink-0 transition-all duration-300 relative z-20']
]);

// 2. Update Landing Page
replaceInFile(path.join(__dirname, '../src/app/(landing)/page.tsx'), [
    ['bg-[#03040B]', 'bg-background'],
    ['bg-slate-950', 'bg-background'],
    ['bg-slate-900/40', 'card-glass'],
    ['bg-slate-900/60', 'card-glass'],
    ['bg-slate-900/80', 'card-solid'],
    ['border-slate-800', 'border-border'],
    ['border-white/10', 'border-border'],
    ['border-white/5', 'border-border'],
    ['text-slate-400', 'text-muted-foreground'],
    ['text-slate-300', 'text-muted-foreground'],
    ['text-slate-500', 'text-muted-foreground/70'],
    ['text-slate-200', 'text-foreground'],
    ['text-white', 'text-foreground'],
    ['hover:bg-slate-800', 'hover:bg-muted'],
    ['hover:bg-slate-900', 'hover:bg-muted'],
    ['hover:text-white', 'hover:text-foreground'],
    ['bg-white/5', 'bg-muted/50'],
    ['bg-white/10', 'bg-muted'],
    ['card-solid/5', 'card-solid'],
    ['hover:card-solid/10', 'hover:bg-muted']
]);
