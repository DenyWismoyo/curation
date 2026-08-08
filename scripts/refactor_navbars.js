const fs = require('fs');

function refactorCryptoNavbar() {
    let content = fs.readFileSync('src/features/crypto/components/navigation/CryptoNavbar.tsx', 'utf-8');
    
    // 1. ThemeToggle to ThemeToggleCompact
    content = content.replace(
        /import { ThemeToggle } from '.\/ThemeToggle'/g, 
        `import { ThemeToggleCompact } from '@/components/ui/ThemeToggleCompact'`
    );
    content = content.replace(/<ThemeToggle \/>/g, '<ThemeToggleCompact />');

    // 2. Header
    content = content.replace(
        /card-solid\/80 dark:bg-slate-950\/80 backdrop-blur-xl border-b border-slate-200 dark:border-white\/10 z-40 items-center justify-between px-6 lg:px-12 w-full max-w-full/g,
        'card-solid/80 backdrop-blur-xl border-b border-border z-50 items-center justify-between px-6 lg:px-12'
    );

    // 3. Pill Container
    content = content.replace(
        /bg-secondary text-secondary-foreground dark:card-solid\/5 p-1 rounded-2xl ring-1 ring-slate-200 dark:ring-white\/10/g,
        'bg-muted text-muted-foreground/60 p-1 rounded-2xl ring-1 ring-border/80'
    );

    // 4. Dropdown menus
    content = content.replace(
        /p-2 rounded-2xl card-solid border border-slate-200 dark:border-slate-800 shadow-xl/g,
        'p-3 rounded-[1.5rem] card-solid ring-1 ring-border border-none shadow-xl'
    );
    
    content = content.replace(
        /w-56 p-2 rounded-2xl card-solid border border-slate-200 dark:border-slate-800 shadow-xl/g,
        'w-56 p-3 rounded-[1.5rem] card-solid ring-1 ring-border border-none shadow-xl'
    );

    // 5. User dropdown
    content = content.replace(
        /w-64 rounded-\[1\.5rem\] p-3 shadow-lg dark:shadow-2xl dark:shadow-black\/50 ring-1 ring-slate-200 dark:ring-white\/10 border-slate-100 dark:border-white\/5 card-solid/g,
        'w-64 rounded-[1.5rem] p-3 shadow-xl ring-1 ring-border border-none card-solid'
    );

    // 6. User button avatar ring
    content = content.replace(
        /ring-1 ring-slate-200 dark:ring-white\/20/g,
        'ring-1 ring-border'
    );
    
    content = content.replace(
        /border-slate-200 dark:border-white\/10/g,
        'border-border'
    );

    fs.writeFileSync('src/features/crypto/components/navigation/CryptoNavbar.tsx', content);
    console.log('CryptoNavbar refactored');
}

function refactorPublicNavbar() {
    let content = fs.readFileSync('src/components/layout/PublicNavbar.tsx', 'utf-8');
    content = content.replace(/z-40/g, 'z-50');
    fs.writeFileSync('src/components/layout/PublicNavbar.tsx', content);
    console.log('PublicNavbar refactored');
}

function refactorCryptoBottomNav() {
    let content = fs.readFileSync('src/features/crypto/components/navigation/CryptoBottomNav.tsx', 'utf-8');
    
    // 1. Container gradient
    content = content.replace(
        /bg-gradient-to-t from-slate-50 dark:from-slate-950\/95 via-slate-900\/80 to-transparent/g,
        'bg-gradient-to-t from-background/95 via-background/80 to-transparent'
    );
    
    // 2. Pill background
    content = content.replace(
        /bg-slate-900\/90 backdrop-blur-xl border border-slate-200 dark:border-white\/10 shadow-xl shadow-slate-950\/20 rounded-2xl p-1 max-w-lg mx-auto ring-1 ring-white\/5/g,
        'card-solid/90 backdrop-blur-xl border border-border/80 shadow-xl shadow-slate-900/5 rounded-2xl p-1 max-w-lg mx-auto ring-1 ring-border'
    );
    
    // 3. Inner nav
    content = content.replace(
        /relative card-solid\/5 p-0\.5 rounded-xl/g,
        'relative bg-muted text-muted-foreground/60 p-0.5 rounded-xl'
    );
    
    // 4. Drawer
    content = content.replace(
        /border-t border-slate-200 dark:border-white\/10 bg-background text-foreground rounded-t-\[2\.5rem\]/g,
        'border-none card-solid rounded-t-[2.5rem]'
    );
    
    content = content.replace(
        /border-white\/5/g,
        'border-border'
    );
    
    content = content.replace(
        /card-solid\/10/g,
        'bg-slate-200/80 dark:bg-slate-700/80' // for the drag handle
    );

    fs.writeFileSync('src/features/crypto/components/navigation/CryptoBottomNav.tsx', content);
    console.log('CryptoBottomNav refactored');
}

function refactorBottomNav() {
    let content = fs.readFileSync('src/components/layout/BottomNav.tsx', 'utf-8');
    
    content = content.replace(
        /from-white\/95 via-white\/80/g,
        'from-background/95 via-background/80'
    );
    
    fs.writeFileSync('src/components/layout/BottomNav.tsx', content);
    console.log('BottomNav refactored');
}

refactorCryptoNavbar();
refactorPublicNavbar();
refactorCryptoBottomNav();
refactorBottomNav();
