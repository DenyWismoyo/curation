const fs = require('fs');
const path = require('path');

const pathReplacements = [
  // 1. types/curation.ts
  { regex: /@\/types\/curation/g, replace: '@/features/assessment/types/assessment.types' },
  // 2. services/referralAttribution
  { regex: /@\/services\/referralAttribution/g, replace: '@/features/assessment/services/referralAttribution' },
  // 3. features/admin/components/assessor
  { regex: /@\/features\/admin\/components\/assessor/g, replace: '@/features/assessor/components' },
  // 4. features/admin/components/curator
  { regex: /@\/features\/admin\/components\/curator/g, replace: '@/features/curator/components' },
  
  // 5. assessment components restructuring
  { regex: /@\/features\/assessment\/components\/(DynamicWizard|DynamicField)/g, replace: '@/features/assessment/components/wizard/$1' },
  { regex: /@\/features\/assessment\/components\/(ActionPlanBuilder|ReviewAndConfirm)/g, replace: '@/features/assessment/components/result/$1' },
  { regex: /@\/features\/assessment\/components\/(UniversalAssessmentView|AdaptiveAssessmentView)/g, replace: '@/features/assessment/components/shared/$1' },
  { regex: /@\/features\/assessment\/components\/([A-Za-z0-9_]*PDF[A-Za-z0-9_]*)/g, replace: '@/features/assessment/components/pdf/$1' },
];

function processDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      for (const rule of pathReplacements) {
        content = content.replace(rule.regex, rule.replace);
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed imports in', fullPath);
      }
    }
  }
}
processDir('src');
