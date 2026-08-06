const fs = require("fs");
const path = require("path");

const functionsDir = path.join(__dirname, "../../functions/src");

const replacements = [
  { old: "../../general/cacheService", new: "../../../infrastructure/storage/cacheService" },
  { old: "../../utils/retry", new: "../../../shared/utils/retry" },
  { old: "../utils/retry", new: "../../shared/utils/retry" },
  { old: "../../prompt/promptTemplate", new: "../../../prompts/promptTemplate" },
  { old: "../../prompt/formBuilderPrompt", new: "../../../prompts/formBuilderPrompt" },
  { old: "../../templates/CryptoCertificateDocument", new: "../../../infrastructure/pdf/templates/CryptoCertificateDocument" },
  { old: "../../agents/assessment/domainExpertsAgent", new: "../agents/domainExpertsAgent" },
  { old: "../../agents/assessment/triangulatorAgent", new: "../agents/triangulatorAgent" },
  { old: "../../agents/assessment/tacticalPlannerAgent", new: "../agents/tacticalPlannerAgent" },
  { old: "../../agents/assessment/synthesisAgent", new: "../agents/synthesisAgent" },
  { old: "../../agents/assessment/postProcessingAgent", new: "../agents/postProcessingAgent" },
  { old: "../../agents/assessment/adaptiveAssessmentAgent", new: "../agents/adaptiveAssessmentAgent" },
  { old: "../../agents/formBuilder/architectAgent", new: "../agents/architectAgent" },
  { old: "../../agents/formBuilder/fabricatorAgent", new: "../agents/fabricatorAgent" },
  { old: "../../agents/formBuilder/validatorAgent", new: "../agents/validatorAgent" },
  { old: "../../agents/formBuilder/ragSeederAgent", new: "../agents/ragSeederAgent" },
  { old: "../../agents/study/writerAgent", new: "../agents/writerAgent" },
  { old: "../../agents/study/citationAuditorAgent", new: "../agents/citationAuditorAgent" },
  { old: "../../agents/study/shared", new: "../agents/shared" },
  { old: "../../agents/study/architectAgent", new: "../agents/architectAgent" },
  { old: "../../agents/study/plannerAgent", new: "../agents/plannerAgent" },
  { old: "../../agents/study/consistencyAuditorAgent", new: "../agents/consistencyAuditorAgent" },
  { old: "../../agents/study/sourceIngestionService", new: "../agents/sourceIngestionService" },
  { old: "../templates/UniversalPDFDocument", new: "./templates/UniversalPDFDocument" },
  { old: "./templates/UniversalPDFDocument", new: "./templates/UniversalPDFDocument" }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;

  for (const r of replacements) {
    // replace inside quotes
    content = content.split(`'${r.old}'`).join(`'${r.new}'`);
    content = content.split(`"${r.old}"`).join(`"${r.new}"`);
  }

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
      processFile(fullPath);
    }
  }
}

processDir(functionsDir);
console.log("Done fixing backend imports.");
