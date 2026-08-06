
const fs = require('fs');

function fixFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  replacements.forEach(r => {
    content = content.replace(r.search, r.replace);
  });
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + filePath);
  }
}

// CryptoAcademyBadges
fixFile('d:/DENY/project/curation/src/features/crypto/components/academy/CryptoAcademyBadges.tsx', [
  { search: /bg-slate-900 border-slate-800/g, replace: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' },
  { search: /text-lg font-bold text-white/g, replace: 'text-lg font-bold text-slate-900 dark:text-white' },
  { search: /bg-slate-900 rounded-full mb-3/g, replace: 'bg-white dark:bg-slate-900 rounded-full mb-3' },
  { search: /font-bold text-sm text-white/g, replace: 'font-bold text-sm text-slate-900 dark:text-white' }
]);

// CryptoModuleQuizModal
fixFile('d:/DENY/project/curation/src/features/crypto/components/academy/CryptoModuleQuizModal.tsx', [
  { search: /bg-slate-900 border border-slate-800/g, replace: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800' },
  { search: /text-lg font-black text-white/g, replace: 'text-lg font-black text-slate-900 dark:text-white' },
  { search: /overflow-y-auto bg-slate-900/g, replace: 'overflow-y-auto bg-slate-50 dark:bg-slate-900' }
]);

// CryptoBottomNav
fixFile('d:/DENY/project/curation/src/features/crypto/components/navigation/CryptoBottomNav.tsx', [
  { search: /active \? 'text-white' : 'text-slate-400'/g, replace: 'active ? \'text-slate-900 dark:text-white\' : \'text-slate-500 dark:text-slate-400\'' },
  { search: /drawerOpen \? 'text-white' : 'text-slate-400'/g, replace: 'drawerOpen ? \'text-slate-900 dark:text-white\' : \'text-slate-500 dark:text-slate-400\'' },
  { search: /font-black text-white truncate/g, replace: 'font-black text-slate-900 dark:text-white truncate' },
  { search: /font-black text-white mt-0.5/g, replace: 'font-black text-slate-900 dark:text-white mt-0.5' },
  { search: /text-slate-300 group-hover:text-white/g, replace: 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white' }
]);

console.log('Final fixes applied.');

