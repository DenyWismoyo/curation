const fs = require("fs");

function fixFile(file, replaces) {
  let content = fs.readFileSync(file, "utf8");
  replaces.forEach(r => content = content.split(r.old).join(r.new));
  fs.writeFileSync(file, content);
}

fixFile("functions/src/domains/assessment/agents/postProcessingAgent.ts", [
  { old: "matchBusinessWithIndustry", new: "generateAndStoreVectorEmbedding" }
]);

const services = ["actionPlanService", "outputService", "promptEnhancerService"];
for (const s of services) {
  fixFile("functions/src/domains/assessment/services/" + s + ".ts", [
    { old: "./utils/retry", new: "../../../shared/utils/retry" }
  ]);
}

fixFile("functions/src/domains/assessment/services/microSimulatorService.ts", [
  { old: "../../shared/utils/retry", new: "../../../shared/utils/retry" }
]);
