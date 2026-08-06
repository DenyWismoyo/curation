const fs = require('fs');

function refactorPage() {
  const filePath = 'd:/DENY/project/curation/src/app/(crypto)/crypto-report/page.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Refactor TabsList and TabsTrigger
  content = content.replace(
    /TabsList className=\"[^\"]*bg-slate-100[^\"]*\"/g,
    'TabsList className=\"bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl inline-flex min-w-max border border-slate-200/50 dark:border-slate-800/50\"'
  );
  
  content = content.replace(
    /TabsTrigger\s*\n*\s*value=\"([^\"]+)\"\s*\n*\s*className=\"[^\"]+\"/g,
    'TabsTrigger value=\"$1\" className=\"rounded-xl px-5 py-2.5 text-sm sm:text-base font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-500/10 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border-0\"'
  );

  // 2. Refactor Crypto Academy Banner
  const academyOld = /<CryptoCard variant=\"premium\" className=\"p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:shadow-\[0_0_30px_rgba\(245,158,11,0\.2\)\]\">\s*<div className=\"absolute top-0 right-0 w-64 h-64 bg-amber-500\/10 blur-\[50px\] group-hover:bg-amber-500\/20 transition-all pointer-events-none\"><\/div>/g;
  const academyNew = `<CryptoCard className=\"p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-amber-200/50 dark:border-amber-500/20 hover:border-amber-300/60 dark:hover:border-amber-500/40 transition-all hover:shadow-[0_8px_30px_rgb(245,158,11,0.06)] dark:hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]\">
                <div className=\"absolute top-0 right-0 w-72 h-72 bg-amber-400/10 dark:bg-amber-500/5 blur-[60px] group-hover:bg-amber-400/20 dark:group-hover:bg-amber-500/10 transition-all pointer-events-none rounded-full\"></div>
                <div className=\"absolute -bottom-32 -left-32 w-64 h-64 bg-orange-400/10 dark:bg-orange-500/5 blur-[50px] pointer-events-none rounded-full\"></div>`;
  content = content.replace(academyOld, academyNew);

  const academyBadgeOld = /<CryptoBadge variant=\"premium\" className=\"mb-2\">Baru<\/CryptoBadge>/g;
  const academyBadgeNew = `<CryptoBadge className=\"mb-3 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 font-bold uppercase tracking-widest text-[10px]\">🌟 FITUR BARU</CryptoBadge>`;
  content = content.replace(academyBadgeOld, academyBadgeNew);

  // 3. Refactor Quick Intelligence Cards
  const cardsPattern = /<CryptoCard variant=\"glow-(purple|cyan|rose|emerald)\" className=\"cursor-pointer group h-full\">\s*<div className=\"p-4 flex flex-col items-center text-center justify-center h-full\">\s*<div className=\"p-3 bg-\1-500\/10 rounded-full mb-3 group-hover:scale-110 transition-transform\">\s*<(Eye|Radar|Flame|Diamond) className=\"w-6 h-6 text-\1-500\" \/>\s*<\/div>\s*<h4 className=\"font-bold text-slate-900 dark:text-white mb-1\">([^<]+)<\/h4>\s*<p className=\"text-xs text-slate-500 dark:text-slate-400\">([^<]+)<\/p>\s*<\/div>\s*<\/CryptoCard>/g;
  
  content = content.replace(cardsPattern, (match, color, icon, title, desc) => {
    return `<CryptoCard className=\"cursor-pointer group h-full bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:border-${color}-300 dark:hover:border-${color}-500/30 hover:shadow-[0_8px_20px_rgb(0,0,0,0.03)] dark:hover:shadow-[0_0_20px_rgba(0,0,0,0.1)] transition-all duration-300 overflow-hidden relative\">
                   <div className=\"absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${color}-400/0 via-${color}-400/0 to-${color}-400/0 group-hover:from-${color}-400 group-hover:via-${color}-500 group-hover:to-${color}-600 transition-all opacity-0 group-hover:opacity-100\"></div>
                   <div className=\"p-5 sm:p-6 flex flex-col items-center text-center justify-center h-full relative z-10\">
                      <div className=\"p-3.5 bg-${color}-50 dark:bg-${color}-500/10 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-${color}-100 dark:group-hover:bg-${color}-500/20 transition-all duration-300 text-${color}-600 dark:text-${color}-400\">
                         <${icon} className=\"w-6 h-6\" />
                      </div>
                      <h4 className=\"font-bold text-slate-800 dark:text-slate-100 mb-1.5 text-base sm:text-lg tracking-tight\">${title}</h4>
                      <p className=\"text-xs font-medium text-slate-500 dark:text-slate-400\">${desc}</p>
                   </div>
                 </CryptoCard>`;
  });

  // 4. Update the Grid container for Quick Intelligence Cards to use gaps better
  content = content.replace(/<div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-4\">/, '<div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10 mt-6\">');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully refactored crypto-report/page.tsx');
  } else {
    console.log('No changes made to crypto-report/page.tsx. Please check the regex patterns.');
  }
}

refactorPage();
