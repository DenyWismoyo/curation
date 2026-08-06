const fs = require('fs');

function removeCards() {
  const filePath = 'd:/DENY/project/curation/src/app/(crypto)/crypto-report/page.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  const startMarker = '{/* QUICK INTELLIGENCE CARDS */}';
  const startIdx = content.indexOf(startMarker);
  
  if (startIdx !== -1) {
    const endMarker = '<div className="w-full">\n              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">';
    const endIdx = content.indexOf(endMarker);
    
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
