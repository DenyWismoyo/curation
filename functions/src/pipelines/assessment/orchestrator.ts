import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { executeDomainExperts } from "../../agents/assessment/domainExpertsAgent";
import { executeTriangulator } from "../../agents/assessment/triangulatorAgent";
import { executeTacticalPlanner } from "../../agents/assessment/tacticalPlannerAgent";
import { executeSynthesis } from "../../agents/assessment/synthesisAgent";
import { executePostProcessing } from "../../agents/assessment/postProcessingAgent";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

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
    // 0. Prepare Files (Upload to Gemini if needed)
    const geminiFiles = data.geminiFiles || [];
    let storageFilePaths: string[] = data.storageFilePaths || [];
    
    // FALLBACK: Jika storageFilePaths kosong, coba ekstrak dari formData
    // (untuk backward compatibility dan edge case)
    if (storageFilePaths.length === 0 && data.formData) {
      const firebaseStoragePattern = /firebasestorage\.googleapis\.com/;
      for (const val of Object.values(data.formData)) {
        if (typeof val === 'string' && firebaseStoragePattern.test(val)) {
          // Ambil storage path dari URL download Firebase Storage
          try {
            const url = new URL(val);
            const pathEncoded = url.pathname.split('/o/')[1]?.split('?')[0];
            if (pathEncoded) storageFilePaths.push(decodeURIComponent(pathEncoded));
          } catch (e) { /* abaikan URL tidak valid */ }
        }
      }
      if (storageFilePaths.length > 0) {
        console.log(`[Orchestrator] Extracted ${storageFilePaths.length} file path(s) from formData as fallback.`);
      }
    }
    if (geminiFiles.length === 0 && storageFilePaths.length > 0) {
      const fileManager = new GoogleAIFileManager(API_KEY);
      
      // FIX: Ensure bucket is instantiated safely
      let bucket;
      try {
        bucket = admin.storage().bucket();
      } catch (e) {
        console.warn("admin.storage().bucket() failed, falling back to explicit bucket name:", e);
        bucket = admin.storage().bucket("teknopark-surakarta.firebasestorage.app");
      }

      const tempFiles: string[] = [];
      const newGeminiFiles = [];

      for (const storagePath of storageFilePaths) {
        try {
          const file = bucket.file(storagePath);
          const [metadata] = await file.getMetadata();
          const mimeType = metadata.contentType || 'application/octet-stream';
          
          // ===================================================================
          // GEMINI SUPPORTED MIME TYPES ALLOWLIST
          // Ref: https://ai.google.dev/gemini-api/docs/vision#supported-formats
          // File yang tidak didukung akan di-SKIP agar pipeline tidak crash.
          // ===================================================================
          const GEMINI_SUPPORTED_MIME_TYPES = new Set([
            // Dokumen
            'application/pdf',
            // Gambar
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'image/webp', 'image/heic', 'image/heif',
            // Audio
            'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff',
            'audio/aac', 'audio/ogg', 'audio/flac',
            // Video
            'video/mp4', 'video/mpeg', 'video/mov', 'video/quicktime',
            'video/avi', 'video/wmv', 'video/webm', 'video/3gpp',
            // Teks
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'text/csv', 'text/xml', 'text/rtf', 'text/markdown',
          ]);

          if (!GEMINI_SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase())) {
            console.warn(
              `[Orchestrator] Skipping file "${path.basename(storagePath)}" — ` +
              `MIME type "${mimeType}" is not supported by Gemini API. ` +
              `(Hint: Convert Excel/Word files to PDF before uploading.)`
            );
            continue; // Lewati file ini, jangan crash pipeline
          }

          const fileName = path.basename(storagePath);
          const tempFilePath = path.join(os.tmpdir(), fileName);
          await file.download({ destination: tempFilePath });
          tempFiles.push(tempFilePath);
          
          const displayName = fileName.length > 40 ? fileName.substring(0, 40) : fileName;
          try {
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
              mimeType,
              displayName
            });
            newGeminiFiles.push({
              name: uploadResult.file.name,
              uri: uploadResult.file.uri,
              mimeType: uploadResult.file.mimeType
            });
          } catch(e) {
            console.error(`Gagal mengunggah file ${fileName} ke Gemini API:`, e);
          }
        } catch(e) {
          console.error(`Gagal memproses file dari Storage: ${storagePath}`, e);
        }
      }
      
      tempFiles.forEach(f => {
        try { fs.unlinkSync(f); } catch(e) {}
      });

      if (newGeminiFiles.length > 0) {
        await docRef.update({ geminiFiles: admin.firestore.FieldValue.arrayUnion(...newGeminiFiles) });
        data.geminiFiles = newGeminiFiles;
      }
    }

    // 1. Domain Experts
    const { metricsResult, fieldArgsResult, finalFiles } = await executeDomainExperts(assessmentId, data, API_KEY);
    
    data.aiResult.metrics = metricsResult;
    data.aiResult.fieldArguments = fieldArgsResult;
    data.aiResult.fileAnalysisInsights = finalFiles;
    
    // Progress update: hanya tulis status (data lengkap dikirim di final update)
    await docRef.update({ status: "ANALYZING_MASTER" });

    // 2. Triangulator
    const triangulatorResult = await executeTriangulator(assessmentId, data, API_KEY, docRef);
    
    // 3. Gunakan skor dan readiness langsung dari Triangulator (Master Evaluator)
    const calculatedTotalScore = triangulatorResult.totalScore || 0;
    const contradictionsFound = triangulatorResult.contradictionsFound || [];
    const dataConfidenceScore = triangulatorResult.dataConfidenceScore || 80;

    data.aiResult.readinessLevel = triangulatorResult.readinessLevel || "Belum Ditentukan";
    data.aiResult.totalScore = calculatedTotalScore;
    data.aiResult.dataConfidenceScore = dataConfidenceScore;
    data.aiResult.contradictionsFound = contradictionsFound;
    data.aiResult._internalReasoning = triangulatorResult._internalReasoning || "";
    data.aiResult.incubationRoute = triangulatorResult.incubationRoute || "Pendampingan Standar";
    data.aiResult.executiveSummary = triangulatorResult.executiveSummary || "";
    data.aiResult.swotAnalysis = triangulatorResult.swotAnalysis || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    data.aiResult.riskAssessment = triangulatorResult.riskAssessment || { criticalRisks: [], mitigationStrategies: [] };

    // Progress update: hanya tulis status (data lengkap dikirim di final update)
    await docRef.update({ status: "PLANNING_ACTION" });

    // 3. Tactical Planner
    const plannerResult = await executeTacticalPlanner(assessmentId, data, API_KEY);
    
    data.aiResult.recommendations = plannerResult.recommendations || [];
    data.aiResult.nextActionSteps = plannerResult.nextActionSteps || [];
    
    // Progress update: hanya tulis status (data lengkap dikirim di final update)
    await docRef.update({ status: "ASSEMBLING_REPORT" });

    // 4. Synthesis
    const synthesisResult = await executeSynthesis(assessmentId, data, API_KEY);
    
    data.aiResult.customAnalysisBlocks = synthesisResult;
    
    // Progress update: hanya tulis status (data lengkap dikirim di final update)
    await docRef.update({ status: "GENERATING_ASSETS" });

    // 5. Post Processing
    const smtpEmail = smtpEmailSecret.value();
    const smtpPassword = smtpPasswordSecret.value();
    await executePostProcessing(assessmentId, data, API_KEY, smtpEmail, smtpPassword);

    // ═══════════════════════════════════════════════════════════════════
    // UPDATE FINAL — satu kali penulisan atomik ke status "COMPLETED".
    // Menulis semua field sekaligus meminimalkan jumlah Pub/Sub events
    // dan memastikan assessmentAnalyticsAgent hanya terpanggil SEKALI
    // pada transisi status GENERATING_ASSETS → COMPLETED.
    // ═══════════════════════════════════════════════════════════════════
    await docRef.update({
      status: "COMPLETED",
      score: data.aiResult?.totalScore || 0,
      readinessLevel: data.aiResult?.readinessLevel || "Belum Ditentukan",
      // Tulis ulang seluruh aiResult sekaligus agar analytics agent
      // mendapat data lengkap saat ia dipicu oleh update ini.
      "aiResult.metrics": data.aiResult.metrics,
      "aiResult.fieldArguments": data.aiResult.fieldArguments,
      "aiResult.fileAnalysisInsights": data.aiResult.fileAnalysisInsights,
      "aiResult.readinessLevel": data.aiResult.readinessLevel,
      "aiResult.totalScore": data.aiResult.totalScore,
      "aiResult.dataConfidenceScore": data.aiResult.dataConfidenceScore,
      "aiResult.contradictionsFound": data.aiResult.contradictionsFound,
      "aiResult.incubationRoute": data.aiResult.incubationRoute,
      "aiResult.executiveSummary": data.aiResult.executiveSummary,
      "aiResult.swotAnalysis": data.aiResult.swotAnalysis,
      "aiResult.riskAssessment": data.aiResult.riskAssessment,
      "aiResult.recommendations": data.aiResult.recommendations,
      "aiResult.nextActionSteps": data.aiResult.nextActionSteps,
      "aiResult.customAnalysisBlocks": data.aiResult.customAnalysisBlocks,
      "aiResult._internalReasoning": data.aiResult._internalReasoning,
      geminiFiles: admin.firestore.FieldValue.delete(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }
});

