const fs = require('fs');
let f = fs.readFileSync('src/agents/crypto/cryptoAdminAgents.ts', 'utf8');
f = f.split('\\`').join('`');
f = f.split('\\$').join('$');
fs.writeFileSync('src/agents/crypto/cryptoAdminAgents.ts', f);
console.log('Fixed');
