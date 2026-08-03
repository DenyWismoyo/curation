import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeStudyArchitect } from "../../agents/study/architectAgent";
import { executeStudyPlanner } from "../../agents/study/plannerAgent";
import { executeStudyConsistencyAuditor } from "../../agents/study/consistencyAuditorAgent";
import { extractAndChunkSource } from "../../agents/study/sourceIngestionService";
import { StudySource } from "../../agents/study/shared";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const updateProjectPhase = async (projectRef: admin.firestore.DocumentReference, status: string, phase: string, completedPhases: string[], errors: Array<Record<string, string>> = []) => {
  await projectRef.set({
    status,
    orchestration: {
      phase,
      completedPhases,
      errors,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
};

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export const studyProjectOrchestrator = onDocumentUpdated({
  database: "curation",
  document: "study_projects/{projectId}",
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [deepseekApiKeySecret, geminiApiKeySecret],
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  if (!afterData || !beforeData) return null;

  // Hanya proses jika status berubah atau ada request baru (untuk restart pipeline)
  const currentStatus = afterData.status;
  const currentRequestedAt = afterData.orchestration?.requestedAt?.toMillis();
  const beforeRequestedAt = beforeData.orchestration?.requestedAt?.toMillis();
  
  if (currentStatus === beforeData.status && currentRequestedAt === beforeRequestedAt) {
    return null;
  }

  const projectRef = event.data?.after.ref;
  if (!projectRef) return null;
  const projectId = event.params.projectId;

  try {
    // -------------------------------------------------------------
    // PHASE 1: INDEXING SOURCES (Batch Promise.all)
    // -------------------------------------------------------------
    if (currentStatus === "INDEXING_SOURCES") {
      const sourceSnap = await projectRef.collection("sources").get();
      const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
      const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      
      let bucket;
      try {
        bucket = admin.storage().bucket();
      } catch (error) {
        bucket = admin.storage().bucket("teknopark-surakarta.firebasestorage.app");
      }

      const sources = sourceSnap.docs.map(doc => ({ sourceId: doc.id, ...(doc.data() as Omit<StudySource, "sourceId">) })) as StudySource[];
      
      for (const source of sources) {
        const extracted = await extractAndChunkSource(bucket, source);
        const previousChunkSnap = await projectRef.collection("vectors").where("sourceId", "==", source.sourceId).get();
        await Promise.all(previousChunkSnap.docs.map((docSnap) => docSnap.ref.delete()));

        // Batch proses chunk 25 per 25 agar tidak memblokir dan sangat cepat
        const chunkBatches = chunkArray(extracted.chunks, 25);
        let processedChunks = 0;
        
        for (const batch of chunkBatches) {
          const batchPromises = batch.map(async (chunk) => {
            const embeddingResult = await embedModel.embedContent({ content: { role: "user", parts: [{ text: chunk.text }] }, outputDimensionality: 768 } as any);
            const vectorArray = embeddingResult.embedding.values;
            const embeddingData = typeof admin.firestore.FieldValue.vector === "function"
              ? admin.firestore.FieldValue.vector(vectorArray)
              : vectorArray;

            await projectRef.collection("vectors").doc(`${source.sourceId}_${String(chunk.chunkIndex + 1).padStart(3, "0")}`).set({
              sourceId: source.sourceId,
              projectId: projectId,
              chunkIndex: chunk.chunkIndex,
              chunkId: chunk.chunkId,
              textChunk: chunk.text,
              sourceType: source.kind,
              embedding: embeddingData,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          });
          await Promise.all(batchPromises); // Tunggu 1 batch selesai
          processedChunks += batch.length;
          console.log(`[INDEXING] Source ${source.sourceId}: Processed ${processedChunks}/${extracted.chunks.length} chunks`);
        }

        await projectRef.collection("sources").doc(source.sourceId).set({
          status: "INDEXED",
          extractedText: extracted.previewText,
          extractedCharCount: extracted.extractedCharCount,
          extractedWordCount: extracted.extractedWordCount,
          chunkCount: extracted.chunks.length,
          extractionMode: extracted.extractionMode,
          embeddingGenerated: extracted.chunks.length > 0,
          indexedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await updateProjectPhase(projectRef, "GENERATING_OUTLINE", "outline_generation", ["source_indexing"]);
      return null;
    }

    // -------------------------------------------------------------
    // PHASE 2: GENERATING OUTLINE
    // -------------------------------------------------------------
    if (currentStatus === "GENERATING_OUTLINE") {
      const sourceSnap = await projectRef.collection("sources").get();
      const sources = sourceSnap.docs.map(doc => ({ sourceId: doc.id, ...(doc.data() as Omit<StudySource, "sourceId">) })) as StudySource[];
      
      const outline = await executeStudyArchitect(afterData, sources, deepseekApiKeySecret.value());

      await projectRef.set({
        outline,
        sourceStats: { total: sources.length, indexed: sources.length, failed: 0 },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await projectRef.collection("audits").add({
        action: "outline_generated",
        actorUid: "system",
        actorEmail: "system@omnifit.cloud",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          chapters: Array.isArray(outline.chapters) ? outline.chapters.length : 0,
          model: String(afterData.modelPlan?.architect || "deepseek-v4-pro"),
        },
      });

      // STOP HERE AND WAIT FOR HUMAN APPROVAL
      await updateProjectPhase(projectRef, "REVIEWING_OUTLINE", "outline_review", ["source_indexing", "outline_generation"]);
      return null;
    }

    // -------------------------------------------------------------
    // PHASE 3: PLANNING CHAPTERS (Trigger Writer Agent via DraftStatus)
    // -------------------------------------------------------------
    if (currentStatus === "PLANNING_CHAPTERS") {
      const outline = afterData.outline;
      const plans = await executeStudyPlanner(afterData, outline, deepseekApiKeySecret.value());

      for (const [index, chapter] of ((outline.chapters || []) as any[]).entries()) {
        const chapterPlan = plans.find((plan: any) => plan.chapterId === chapter.chapterId) || {};
        
        // Pembuatan dokumen berstatus PLANNED akan memicu chapterOrchestrator untuk bab ini secara paralel
        await projectRef.collection("chapters").doc(chapter.chapterId).set({
          projectId: projectId,
          chapterId: chapter.chapterId,
          chapterNumber: index + 1,
          title: chapter.title,
          summary: chapter.summary,
          keyThemes: Array.isArray(chapter.keyThemes) ? chapter.keyThemes : [],
          relevantSourceIds: Array.isArray(chapter.relevantSourceIds) ? chapter.relevantSourceIds : [],
          draftStatus: index === 0 ? "PLANNED" : "PENDING", // Trigger event penulisan bab di latar belakang secara sekuensial
          planRequestedAt: index === 0 ? admin.firestore.FieldValue.serverTimestamp() : null,
          objective: String(chapterPlan.objective || ""),
          targetWordCount: Number(chapterPlan.targetWordCount || 0),
          suggestedSections: Array.isArray(chapterPlan.suggestedSections) ? chapterPlan.suggestedSections : [],
          evidenceFocus: Array.isArray(chapterPlan.evidenceFocus) ? chapterPlan.evidenceFocus : [],
          content: "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await projectRef.collection("audits").add({
        action: "chapter_plans_generated",
        actorUid: "system",
        actorEmail: "system@omnifit.cloud",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        details: { chapters: plans.length, model: String(afterData.modelPlan?.planner || "deepseek-v4-flash") },
      });

      await updateProjectPhase(projectRef, "WRITING_CHAPTERS", "draft_writing", ["source_indexing", "outline_generation", "chapter_planning"]);
      return null;
    }

    // -------------------------------------------------------------
    // PHASE 4: AUDITING CHAPTERS (Consistency Audit Lintas Bab)
    // -------------------------------------------------------------
    if (currentStatus === "AUDITING_CHAPTERS") {
      const writtenChapterSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
      const chapterAuditPayloads = [];

      for (const docSnap of writtenChapterSnap.docs) {
        const chapter = docSnap.data();
        chapterAuditPayloads.push({
          chapterId: chapter.chapterId,
          title: chapter.title,
          content: String(chapter.content || ""),
          auditStatus: String(chapter.auditStatus || "NEEDS_REVIEW"),
          findings: Array.isArray(chapter.auditFindings) ? chapter.auditFindings : [],
        });
      }

      const projectAudit = await executeStudyConsistencyAuditor(deepseekApiKeySecret.value(), afterData, chapterAuditPayloads);

      await projectRef.set({
        reviewStatus: String(projectAudit.overallStatus || "READY_FOR_REVIEW"),
        reviewSummary: {
          summary: String(projectAudit.summary || "Audit lintas bab selesai."),
          crossChapterRisks: Array.isArray(projectAudit.crossChapterRisks) ? projectAudit.crossChapterRisks : [],
          reviewerFocus: Array.isArray(projectAudit.reviewerFocus) ? projectAudit.reviewerFocus : [],
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await projectRef.collection("audits").add({
        action: "chapters_written_and_audited",
        actorUid: "system",
        actorEmail: "system@omnifit.cloud",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          chapters: chapterAuditPayloads.length,
          overallStatus: String(projectAudit.overallStatus || "READY_FOR_REVIEW"),
        },
      });

      await updateProjectPhase(projectRef, "READY_FOR_REVIEW", "review_ready", ["source_indexing", "outline_generation", "chapter_planning", "draft_writing", "audit_chapters"]);
      return null;
    }

    return null;
  } catch (error: any) {
    console.error("studyProjectOrchestrator error:", error);
    await projectRef.set({
      status: "FAILED",
      orchestration: {
        phase: "failed",
        completedPhases: Array.isArray(afterData.orchestration?.completedPhases) ? afterData.orchestration.completedPhases : [],
        errors: admin.firestore.FieldValue.arrayUnion({
          phase: String(afterData.orchestration?.phase || "unknown"),
          message: String(error?.message || error || "Unknown error"),
          createdAt: new Date().toISOString(),
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await projectRef.collection("audits").add({
      action: "pipeline_failed",
      actorUid: "system",
      actorEmail: "system@omnifit.cloud",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        message: String(error?.message || error || "Unknown error"),
      },
    });
    return null;
  }
});