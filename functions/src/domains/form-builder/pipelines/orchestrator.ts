import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { executeArchitect } from "../agents/architectAgent";
import { executeFabricator } from "../agents/fabricatorAgent";
import { executeValidator } from "../agents/validatorAgent";
import { executeRagSeeder } from "../agents/ragSeederAgent";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const formBuilderOrchestrator = onDocumentUpdated({
  database: "curation",
  document: "form_templates/{templateId}",
  region: "asia-southeast2",
  memory: "2GiB", // Higher memory since it runs all 4 agents
  timeoutSeconds: 540,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  // Hanya trigger jika admin meminta generasi form (status INITIATING)
  if (afterData?.aiGenerationStatus?.phase !== "INITIATING" || beforeData?.aiGenerationStatus?.phase === "INITIATING") {
    return null;
  }

  const templateRef = event.data?.after.ref;
  const templateId = event.params.templateId;
  if (!templateRef) return null;

  try {
    let currentData = afterData;

    // 1. FASE 1: Architect Agent
    const architectResult = await executeArchitect(templateId, currentData, templateRef);
    if (!architectResult?.success) throw new Error("Architect gagal diselesaikan.");
    
    // Ambil data terbaru dari Firestore (setelah Architect menyimpan kerangka/blueprint)
    currentData = (await templateRef.get()).data();
    if (!currentData) throw new Error("Gagal memuat data setelah fase Architect.");

    // 2. FASE 2: Fabricator Agent
    const fabricatorResult = await executeFabricator(templateId, currentData, templateRef);
    if (!fabricatorResult?.success) throw new Error("Fabricator gagal diselesaikan.");

    // Ambil data terbaru dari Firestore
    currentData = (await templateRef.get()).data();
    if (!currentData) throw new Error("Gagal memuat data setelah fase Fabricator.");

    // 3. FASE 3: Validator Agent
    const validatorResult = await executeValidator(templateId, currentData, templateRef);
    if (!validatorResult?.success) throw new Error("Validator gagal diselesaikan.");

    // Ambil data terbaru dari Firestore
    currentData = (await templateRef.get()).data();
    if (!currentData) throw new Error("Gagal memuat data setelah fase Validator.");

    // 4. FASE 4: RAG Seeder Agent (Hanya dijalankan jika status PRE_WARMING, yang diset oleh Validator jika isAdaptive true)
    if (validatorResult.nextPhase === "PRE_WARMING") {
        const ragResult = await executeRagSeeder(templateId, currentData, templateRef);
        if (!ragResult?.success) throw new Error("RAG Seeder gagal diselesaikan.");
    }

    return null;
  } catch (error: any) {
    console.error("Form Builder Orchestrator Error:", error);
    // Error handling sudah dilakukan di dalam masing-masing agent (menyimpan status FAILED dan logToTerminal).
    // Jadi jika throw error, proses orchestrator hanya berhenti dengan aman.
    return null;
  }
});
