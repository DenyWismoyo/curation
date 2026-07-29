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

const files = walk('./src');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/from\s+['"]@\/types['"]/g, "from '@/components/icon'");
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    changed++;
    console.log('Updated', f);
  }
});

console.log('Total files updated:', changed);
