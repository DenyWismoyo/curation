const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../public/fonts');
const destDir = path.join(__dirname, 'lib/fonts');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  fs.readdirSync(srcDir).forEach(file => {
    if (file.endsWith('.ttf')) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      console.log(`Copied ${file} to lib/fonts`);
    }
  });
} else {
  console.log(`Source font directory ${srcDir} does not exist. Skipping.`);
}
