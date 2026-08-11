const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/components/ui');
const destDir = path.join(__dirname, 'omnifit-ui/components/ui');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);

files.forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Replace cn import
    content = content.replace(/import \{ cn \} from ["']@\/lib\/utils\/cn["']/g, 'import { cn } from "../../utils/cn"');
    
    // Replace internal UI imports, e.g. "@/components/ui/button" -> "./button"
    content = content.replace(/import \{([^}]+)\} from ["']@\/components\/ui\/([^"']+)["']/g, 'import {$1} from "./$2"');
    
    fs.writeFileSync(destPath, content);
    console.log(`Copied ${file}`);
  }
});
