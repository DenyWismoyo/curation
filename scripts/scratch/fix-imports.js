const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('functions/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Since files were moved into deeper directories (e.g. agents/crypto -> domains/crypto/agents), 
  // their relative imports might be off by one level (e.g. '../general/..' needs to be '../../infrastructure/..')
  // This is quite complex to do with simple string replace.
});
