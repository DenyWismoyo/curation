const fs = require("fs");
const path = require("path");

const functionsDir = path.join(__dirname, "../../functions/src");

const fileMap = {};

function buildMap(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      buildMap(fullPath);
    } else if (fullPath.endsWith(".ts")) {
      const parsed = path.parse(fullPath);
      let name = parsed.name;
      if (name === "index") name = path.basename(dir);
      
      if (!fileMap[name]) fileMap[name] = [];
      fileMap[name].push(fullPath);
    }
  }
}

buildMap(functionsDir);

function fixRelativeImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;
  
  // Find relative imports: from "../some/path/filename" or "./filename"
  content = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, relPath) => {
    // get just the filename from the relative path
    const targetName = path.basename(relPath);
    
    // If the file exists in our map
    if (fileMap[targetName] && fileMap[targetName].length > 0) {
      const targetFullPath = fileMap[targetName][0];
      
      // Calculate new relative path
      let newRelPath = path.relative(path.dirname(filePath), targetFullPath).replace(/\\/g, "/");
      
      // Remove .ts extension
      newRelPath = newRelPath.replace(/\.ts$/, "");
      
      // Ensure it starts with ./ or ../
      if (!newRelPath.startsWith(".")) {
        newRelPath = "./" + newRelPath;
      }
      
      return `from "${newRelPath}"`;
    }
    
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log("Fixed imports in", filePath);
  }
}

function processDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith(".ts")) {
      fixRelativeImports(fullPath);
    }
  }
}

processDir(functionsDir);
console.log("Done fixing backend imports.");
