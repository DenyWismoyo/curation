import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeStudyArchitect } from "../../agents/study/architectAgent";
import { executeStudyPlanner } from "../../agents/study/plannerAgent";
import { executeStudyWriter } from "../../agents/study/writerAgent";
import { executeStudyCitationAuditor } from "../../agents/study/citationAuditorAgent";
import { executeStudyConsistencyAuditor } from "../../agents/study/consistencyAuditorAgent";
import { extractAndChunkSource } from "../../agents/study/sourceIngestionService";
import { dedupeSourceIds, StudyEvidenceChunk, StudySource } from "../../agents/study/shared";

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
  if (!afterData) return null;

  if (afterData.status !== "INDEXING_SOURCES" || beforeData?.status === "INDEXING_SOURCES") {
    return null;
  }

  const projectRef = event.data?.after.ref;
  if (!projectRef) return null;

  try {
    const sourceSnap = await projectRef.collection("sources").get();
    const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-001" });
    let bucket;
    try {
      bucket = admin.storage().bucket();
    } catch (error) {
      console.warn("admin.storage().bucket() failed in studyProjectOrchestrator, using explicit bucket name:", error);
      bucket = admin.storage().bucket("teknopark-surakarta.firebasestorage.app");
    }

    const sources = sourceSnap.docs.map((docSnap) => ({
      sourceId: docSnap.id,
      ...(docSnap.data() as Omit<StudySource, "sourceId">),
    })) as StudySource[];

    for (const source of sources) {
      const extracted = await extractAndChunkSource(bucket, source);
      const previousChunkSnap = await projectRef.collection("vectors").where("sourceId", "==", source.sourceId).get();
      const deletePromises = previousChunkSnap.docs.map((docSnap) => docSnap.ref.delete());
      await Promise.all(deletePromises);

      for (const chunk of extracted.chunks) {
        const embeddingResult = await embedModel.embedContent(chunk.text);
        const vectorArray = embeddingResult.embedding.values;
        const embeddingData = typeof admin.firestore.FieldValue.vector === "function"
          ? admin.firestore.FieldValue.vector(vectorArray)
          : vectorArray;

        await projectRef.collection("vectors").doc(`${source.sourceId}_${String(chunk.chunkIndex + 1).padStart(3, "0")}`).set({
          sourceId: source.sourceId,
          projectId: event.params.projectId,
          chunkIndex: chunk.chunkIndex,
          chunkId: chunk.chunkId,
          textChunk: chunk.text,
          sourceType: source.kind,
          embedding: embeddingData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
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

    const outline = await executeStudyArchitect(afterData, sources, deepseekApiKeySecret.value());

    await projectRef.set({
      outline,
      sourceStats: {
        total: sources.length,
        indexed: sources.length,
        failed: 0,
      },
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

    await updateProjectPhase(projectRef, "PLANNING_CHAPTERS", "chapter_planning", ["source_indexing", "outline_generation"]);

    const plans = await executeStudyPlanner(afterData, outline, deepseekApiKeySecret.value());

    for (const [index, chapter] of ((outline.chapters || []) as any[]).entries()) {
      const chapterPlan = plans.find((plan: any) => plan.chapterId === chapter.chapterId) || {};
      await projectRef.collection("chapters").doc(chapter.chapterId).set({
        projectId: event.params.projectId,
        chapterId: chapter.chapterId,
        chapterNumber: index + 1,
        title: chapter.title,
        summary: chapter.summary,
        keyThemes: Array.isArray(chapter.keyThemes) ? chapter.keyThemes : [],
        relevantSourceIds: Array.isArray(chapter.relevantSourceIds) ? chapter.relevantSourceIds : [],
        draftStatus: "PLANNED",
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
      details: {
        chapters: plans.length,
        model: String(afterData.modelPlan?.planner || "deepseek-v4-flash"),
      },
    });

    await updateProjectPhase(projectRef, "WRITING_CHAPTERS", "draft_writing", ["source_indexing", "outline_generation", "chapter_planning"]);

    const fetchEvidenceChunks = async (chapterData: any) => {
      const queryText = `${chapterData.title} ${chapterData.summary || ""} ${chapterData.objective || ""} ${(chapterData.keyThemes || []).join(" ")}`.trim();
      const embeddingResult = await embedModel.embedContent(queryText);
      const vectorArray = embeddingResult.embedding.values;
      const embeddingData = typeof admin.firestore.FieldValue.vector === "function"
        ? admin.firestore.FieldValue.vector(vectorArray)
        : vectorArray;

      let query: admin.firestore.Query = projectRef.collection("vectors");
      const relevantSourceIds = dedupeSourceIds(chapterData.relevantSourceIds || []);
      if (relevantSourceIds.length > 0 && relevantSourceIds.length <= 10) {
        query = query.where("sourceId", "in", relevantSourceIds);
      }

      const snap = await query.findNearest("embedding", embeddingData, {
        limit: 12,
        distanceMeasure: "COSINE"
      }).get();

      return snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          sourceId: data.sourceId,
          chunkIndex: data.chunkIndex,
          textChunk: data.textChunk,
        };
      }) as StudyEvidenceChunk[];
    };

    const chapterSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
    const chapterAuditPayloads: Array<{ chapterId: string; title: string; content: string; auditStatus: string; findings: unknown[] }> = [];

    for (const docSnap of chapterSnap.docs) {
      const chapter = docSnap.data() as {
        chapterId: string;
        chapterNumber: number;
        title: string;
        summary?: string;
        keyThemes?: string[];
        relevantSourceIds?: string[];
        objective?: string;
        targetWordCount?: number;
        suggestedSections?: string[];
        evidenceFocus?: string[];
      };
      const evidenceChunks = await fetchEvidenceChunks(chapter);

      const draftResult = await executeStudyWriter(deepseekApiKeySecret.value(), afterData, chapter, evidenceChunks);
      const draftCitations = Array.isArray(draftResult.citations) ? draftResult.citations : [];

      await docSnap.ref.set({
        draftStatus: "COMPLETED",
        content: String(draftResult.content || ""),
        citations: draftCitations,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await updateProjectPhase(projectRef, "AUDITING_CHAPTERS", "audit_chapters", ["source_indexing", "outline_generation", "chapter_planning", "draft_writing"]);

    const writtenChapterSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
    for (const docSnap of writtenChapterSnap.docs) {
      const chapter = docSnap.data() as {
        chapterId: string;
        title: string;
        summary?: string;
        relevantSourceIds?: string[];
        content?: string;
        citations?: Array<{ sourceId: string; claim: string; supportingSnippet: string }>;
      };
      const evidenceChunks = await fetchEvidenceChunks(chapter);
      const auditResult = await executeStudyCitationAuditor(
        deepseekApiKeySecret.value(),
        afterData,
        chapter,
        String(chapter.content || ""),
        Array.isArray(chapter.citations) ? chapter.citations : [],
        evidenceChunks
      );

      await docSnap.ref.set({
        draftStatus: auditResult.status === "APPROVED" ? "UNDER_REVIEW" : "COMPLETED",
        auditStatus: String(auditResult.status || "NEEDS_REVIEW"),
        content: String(auditResult.revisedContent || chapter.content || ""),
        citationCoverageScore: Number(auditResult.citationCoverageScore || 0),
        consistencyScore: Number(auditResult.consistencyScore || 0),
        auditFindings: Array.isArray(auditResult.findings) ? auditResult.findings : [],
        auditedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      chapterAuditPayloads.push({
        chapterId: chapter.chapterId,
        title: chapter.title,
        content: String(auditResult.revisedContent || chapter.content || ""),
        auditStatus: String(auditResult.status || "NEEDS_REVIEW"),
        findings: Array.isArray(auditResult.findings) ? auditResult.findings : [],
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