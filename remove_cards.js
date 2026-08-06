const fs = require('fs');

function removeCards() {
  const filePath = 'd:/DENY/project/curation/src/app/(crypto)/crypto-report/page.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  const startStr = '<div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10 mt-6\">';
  const startIdx = content.indexOf(startStr);
  
  if (startIdx !== -1) {
    const endStr = '{/* ===================== TAB & KONTEN UTAMA ===================== */}';
    const endIdx = content.indexOf(endStr);
    
    if (endIdx !== -1) {
       content = content.substring(0, startIdx) + content.substring(endIdx);
       fs.writeFileSync(filePath, content, 'utf8');
       console.log('Successfully removed Quick Intelligence Cards.');
    } else {
       console.log('Could not find the end string.');
    }
  } else {
    console.log('Could not find the start string.');
  }
}

removeCards();
