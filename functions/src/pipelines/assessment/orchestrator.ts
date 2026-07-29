import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { executeDomainExperts } from "../../agents/assessment/domainExpertsAgent";
import { executeTriangulator } from "../../agents/assessment/triangulatorAgent";
import { executeTacticalPlanner } from "../../agents/assessment/tacticalPlannerAgent";
import { executeSynthesis } from "../../agents/assessment/synthesisAgent";
import { executePostProcessing } from "../../agents/assessment/postProcessingAgent";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

export const assessmentOrchestrator = onDocumentCreated({
  database: "curation",
  document: "assessments/{assessmentId}",
  region: "asia-southeast2",
  memory: "2GiB",
  timeoutSeconds: 540,
  secrets: [geminiApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  // Gateway membuat dokumen dengan status ANALYZING_METRICS atau COMPLETED (jika cache hit)
  if (data.status !== "ANALYZING_METRICS") return;

  const docRef = snapshot.ref;
  const assessmentId = event.params.assessmentId;
  const API_KEY = geminiApiKeySecret.value();
  
  if (!data.aiResult) data.aiResult = {};

  try {
    // 1. Domain Experts
    const { metricsResult, fieldArgsResult, finalFiles } = await executeDomainExperts(assessmentId, data, API_KEY);
    
    data.aiResult.metrics = metricsResult;
    data.aiResult.fieldArguments = fieldArgsResult;
    data.aiResult.fileAnalysisInsights = finalFiles;
    
    await docRef.update({
      "aiResult.metrics": metricsResult,
      "aiResult.fieldArguments": fieldArgsResult,
      "aiResult.fileAnalysisInsights": finalFiles,
      status: "ANALYZING_MASTER"
    });

    // 2. Triangulator
    const triangulatorResult = await executeTriangulator(assessmentId, data, API_KEY, docRef);
    
    // Hitung total skor dari fieldArguments
    let calculatedTotalScore = 0;
    if (data.aiResult.fieldArguments && Array.isArray(data.aiResult.fieldArguments) && data.aiResult.fieldArguments.length > 0) {
       const sum = data.aiResult.fieldArguments.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
       calculatedTotalScore = Math.round(sum / data.aiResult.fieldArguments.length);
    } else {
       calculatedTotalScore = triangulatorResult.totalScore || 0;
    }
    
    const aiPromptConfig = data.aiPromptConfig || {};
    const tiers = aiPromptConfig.customReadinessTiers || ["Pemula", "Menengah", "Lanjutan", "Ahli", "Master"];
    let readiness = tiers[0];
    if (calculatedTotalScore >= 85) readiness = tiers[4] || tiers[tiers.length-1];
    else if (calculatedTotalScore >= 70) readiness = tiers[3] || tiers[Math.floor(tiers.length*0.75)];
    else if (calculatedTotalScore >= 55) readiness = tiers[2] || tiers[Math.floor(tiers.length*0.5)];
    else if (calculatedTotalScore >= 40) readiness = tiers[1] || tiers[Math.floor(tiers.length*0.25)];

    data.aiResult.readinessLevel = triangulatorResult.readinessLevel || readiness;
    data.aiResult.totalScore = calculatedTotalScore;
    data.aiResult.dataConfidenceScore = triangulatorResult.dataConfidenceScore || 80;
    data.aiResult.contradictionsFound = triangulatorResult.contradictionsFound || [];
    data.aiResult.incubationRoute = triangulatorResult.incubationRoute || "Pendampingan Standar";
    data.aiResult.executiveSummary = triangulatorResult.executiveSummary || "";
    data.aiResult.swotAnalysis = triangulatorResult.swotAnalysis || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    data.aiResult.riskAssessment = triangulatorResult.riskAssessment || { criticalRisks: [], mitigationStrategies: [] };

    await docRef.update({
      "aiResult.readinessLevel": data.aiResult.readinessLevel,
      "aiResult.totalScore": data.aiResult.totalScore,
      "aiResult.dataConfidenceScore": data.aiResult.dataConfidenceScore,
      "aiResult.contradictionsFound": data.aiResult.contradictionsFound,
      "aiResult.incubationRoute": data.aiResult.incubationRoute,
      "aiResult.executiveSummary": data.aiResult.executiveSummary,
      "aiResult.swotAnalysis": data.aiResult.swotAnalysis,
      "aiResult.riskAssessment": data.aiResult.riskAssessment,
      status: "PLANNING_ACTION"
    });

    // 3. Tactical Planner
    const plannerResult = await executeTacticalPlanner(assessmentId, data, API_KEY);
    
    data.aiResult.recommendations = plannerResult.recommendations || [];
    data.aiResult.nextActionSteps = plannerResult.nextActionSteps || [];
    
    await docRef.update({
      "aiResult.recommendations": data.aiResult.recommendations,
      "aiResult.nextActionSteps": data.aiResult.nextActionSteps,
      status: "ASSEMBLING_REPORT"
    });

    // 4. Synthesis
    const synthesisResult = await executeSynthesis(assessmentId, data, API_KEY);
    
    data.aiResult.customAnalysisBlocks = synthesisResult;
    
    await docRef.update({
      "aiResult.customAnalysisBlocks": data.aiResult.customAnalysisBlocks,
      status: "GENERATING_ASSETS"
    });

    // 5. Post Processing
    const smtpEmail = smtpEmailSecret.value();
    const smtpPassword = smtpPasswordSecret.value();
    await executePostProcessing(assessmentId, data, API_KEY, smtpEmail, smtpPassword);

    await docRef.update({
      status: "COMPLETED",
      geminiFiles: admin.firestore.FieldValue.delete(),
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }
});
