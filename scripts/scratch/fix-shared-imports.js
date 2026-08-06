const fs = require('fs');
const path = require('path');

const replacementMap = {
  'PWAInstallPrompt': '@/components/common/PWAInstallPrompt',
  'BottomNav': '@/components/layout/BottomNav',
  'PageShell': '@/components/domain/public/PageShell',
  'PageHeader': '@/components/domain/public/PageHeader',
  'UniversalAssessmentView': '@/features/assessment/components/UniversalAssessmentView',
  'AdaptiveAssessmentView': '@/features/assessment/components/AdaptiveAssessmentView',
  'TokenExportPDFButton': '@/features/assessment/components/TokenExportPDFButton',
  'TemplateQuestionsPDF': '@/features/assessment/components/TemplateQuestionsPDF'
};

function processDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Find lines like: import { A, B } from '@/components/shared'
      content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]@?\/components\/shared['\"]/g, (match, importsStr) => {
        const imports = importsStr.split(',').map(i => i.trim()).filter(i => i);
        return imports.map(i => {
          const newPath = replacementMap[i] || '@/components/common/' + i;
          return `import { ${i} } from '${newPath}';`;
        }).join('\n');
      });
      
      // Also fix AdminTemplatePreview where TemplateQuestionsPDF was wrong
      content = content.replace(/@\/features\/admin\/components\/template-builder\/TemplateQuestionsPDF/g, '@/features/assessment/components/TemplateQuestionsPDF');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed imports in', fullPath);
      }
    }
  }
}
processDir('src');
