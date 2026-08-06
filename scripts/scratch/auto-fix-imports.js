const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../src');

const fileMap = {};

function buildMap(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      buildMap(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const parsed = path.parse(fullPath);
      let name = parsed.name;
      if (name === 'index') name = path.basename(dir);
      
      let relativePath = path.relative(srcDir, fullPath).replace(/\\/g, '/');
      relativePath = relativePath.replace(/\.tsx?$/, '');
      if (relativePath.endsWith('/index')) relativePath = relativePath.slice(0, -6);
      
      const alias = '@/' + relativePath;
      if (!fileMap[name]) fileMap[name] = [];
      fileMap[name].push(alias);
    }
  }
}

buildMap(srcDir);

const oldToNew = [
  { old: /@\/lib\/utils\b(?!(?:\/cn|\/rate-limit))/g, new: '@/lib/utils/cn' },
  { old: /@\/lib\/firebase\b/g, new: '@/lib/firebase/firebase' },
  { old: /@\/lib\/firebase-admin\b/g, new: '@/lib/firebase/firebase-admin' },
  { old: /@\/lib\/session-auth\b/g, new: '@/lib/auth/session-auth' },
  { old: /@\/lib\/rate-limit\b/g, new: '@/lib/utils/rate-limit' },
  { old: /@\/lib\/referralAttribution\b/g, new: '@/services/referralAttribution' },
  { old: /@\/lib\/share\b/g, new: '@/services/share' },
  { old: /@\/lib\/b2b-curator-audit\b/g, new: '@/services/b2b/b2b-curator-audit' },
  { old: /@\/lib\/b2b-dashboard\b/g, new: '@/services/b2b/b2b-dashboard' },
  { old: /@\/lib\/assessmentOutputMode\b/g, new: '@/features/assessment/utils/assessmentOutputMode' },
  { old: /@\/lib\/storyboard/g, new: '@/services/storyboard' },
  
  { old: /@\/data\//g, new: '@/config/templates/' },
  
  { old: /@\/app\/components\/curation\//g, new: '@/features/assessment/components/' },
  { old: /@\/app\/components\/admin\//g, new: '@/features/admin/components/' },
  { old: /@\/app\/components\/b2b\//g, new: '@/features/b2b/components/' },
  { old: /@\/app\/components\/shared\//g, new: '@/components/common/' },
  { old: /@\/components\/shared\//g, new: '@/components/common/' },
  { old: /@\/app\/components\/assessor\//g, new: '@/features/admin/components/assessor/' },
  { old: /@\/app\/components\/curator\//g, new: '@/features/admin/components/curator/' },
  { old: /@\/app\/components\/payment\//g, new: '@/features/payment/components/' },
  
  { old: /@\/components\/common\/PublicNavbar/g, new: '@/components/layout/PublicNavbar' },
  { old: /@\/components\/common\/BottomNav/g, new: '@/components/layout/BottomNav' },
  { old: /@\/components\/common\/SafeLogo/g, new: '@/components/layout/SafeLogo' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const rule of oldToNew) {
    content = content.replace(rule.old, rule.new);
  }

  content = content.replace(/from\s+['"]@\/components\/crypto\/([^'"]+)['"]/g, (match, componentName) => {
    if (fileMap[componentName] && fileMap[componentName].length > 0) {
      return `from '${fileMap[componentName][0]}'`;
    }
    return match;
  });

  content = content.replace(/from\s+['"]\.\.\/curation\/([^'"]+)['"]/g, (match, componentName) => {
    if (fileMap[componentName] && fileMap[componentName].length > 0) {
      return `from '${fileMap[componentName][0]}'`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed imports in', filePath);
  }
}

function processDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

processDir(srcDir);
console.log('Done fixing frontend imports.');
