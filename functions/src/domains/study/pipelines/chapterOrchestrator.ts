import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeStudyWriter } from "../agents/writerAgent";
import { executeStudyCitationAuditor } from "../agents/citationAuditorAgent";
import { dedupeSourceIds, StudyEvidenceChunk } from "../agents/shared";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const studyChapterOrchestrator = onDocumentWritten({
  database: "curation",
  document: "study_projects/{projectId}/chapters/{chapterId}",
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [deepseekApiKeySecret, geminiApiKeySecret],
}, async (event) => {
  const afterData = event.data?.after?.data();
  const beforeData = event.data?.before?.data();

  // Hanya jalankan jika dokumen baru dibuat (PLANNED) atau diupdate ke PLANNED / REVISION_REQUESTED
  if (!afterData) return null;
  if (afterData.draftStatus !== "PLANNED" && afterData.draftStatus !== "REVISION_REQUESTED") return null;
  
  if (afterData.draftStatus === "PLANNED") {
    const currentRequestedAt = afterData.planRequestedAt?.toMillis();
    const beforeRequestedAt = beforeData?.planRequestedAt?.toMillis();
    if (beforeData && beforeData.draftStatus === "PLANNED" && currentRequestedAt === beforeRequestedAt) {
      return null;
    }
  } else if (afterData.draftStatus === "REVISION_REQUESTED") {
    if (beforeData && beforeData.draftStatus === "REVISION_REQUESTED") return null;
  }

  const projectId = event.params.projectId;
  const chapterId = event.params.chapterId;
  const chapterRef = event.data?.after.ref;
  if (!chapterRef) return null;

  try {
    const db = chapterRef.firestore;
    console.log(`[Chapter Orchestrator] Starting processing for chapter: ${chapterId}`);
    
    const projectRef = db.collection("study_projects").doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return null;
    const projectData = projectSnap.data()!;

    const isRevision = afterData.draftStatus === "REVISION_REQUESTED";

    // 1. Fetch Evidence
    await chapterRef.update({ currentAction: "Mencari referensi...", draftStatus: "REVISING" });
    const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    
    let queryText = `${afterData.title} ${afterData.summary || ""} ${afterData.objective || ""} ${(afterData.keyThemes || []).join(" ")}`.trim();
    if (isRevision && afterData.reviewerNotes) {
      queryText = `Topik Bab: ${queryText}\n\nFokus Pencarian Revisi: ${afterData.reviewerNotes}`;
    }
    const embeddingResult = await embedModel.embedContent({ content: { role: "user", parts: [{ text: queryText }] }, outputDimensionality: 768 } as any);
    const vectorArray = embeddingResult.embedding.values;
    const embeddingData = typeof admin.firestore.FieldValue.vector === "function"
      ? admin.firestore.FieldValue.vector(vectorArray)
      : vectorArray;

    let query: admin.firestore.Query = projectRef.collection("vectors");
    const relevantSourceIds = dedupeSourceIds(afterData.relevantSourceIds || []);
    if (relevantSourceIds.length > 0 && relevantSourceIds.length <= 10) {
      query = query.where("sourceId", "in", relevantSourceIds);
    }

    const snap = await query.findNearest("embedding", embeddingData, {
      limit: 12,
      distanceMeasure: "COSINE"
    }).get();

    const evidenceChunks = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        sourceId: data.sourceId,
        chunkIndex: data.chunkIndex,
        textChunk: data.textChunk,
      };
    }) as StudyEvidenceChunk[];

    // 2. Run Writer Agent
    console.log(`[Chapter Orchestrator] Running Writer Agent for chapter: ${chapterId}`);
    await chapterRef.update({ currentAction: "Menulis draf bab..." });
    const outlineChapters = projectData.outline?.chapters || [];
    const crossChapterContext = outlineChapters.map((ch: any, idx: number) => `Bab ${idx + 1}. ${ch.title}\nRingkasan: ${ch.summary || '-'}`).join("\n\n");

    const draftResult = await executeStudyWriter(deepseekApiKeySecret.value(), projectData, afterData as any, evidenceChunks, isRevision ? afterData.reviewerNotes : undefined, crossChapterContext);
    const draftContent = String(draftResult.content || "");
    const draftCitations = Array.isArray(draftResult.citations) ? draftResult.citations : [];

    // 3. Run Citation Auditor
    console.log(`[Chapter Orchestrator] Running Citation Auditor for chapter: ${chapterId}`);
    await chapterRef.update({ currentAction: "Mengaudit sitasi & bahasa..." });
    const auditResult = await executeStudyCitationAuditor(deepseekApiKeySecret.value(), projectData, afterData as any, draftContent, draftCitations, evidenceChunks);

    // 4. Save to Chapter Document
    await chapterRef.set({
      content: String(auditResult.revisedContent || draftContent || ""),
      draftStatus: auditResult.status === "APPROVED" ? "UNDER_REVIEW" : "COMPLETED",
      auditStatus: String(auditResult.status || "NEEDS_REVIEW"),
      citationCoverageScore: Number(auditResult.citationCoverageScore || 0),
      consistencyScore: Number(auditResult.consistencyScore || 0),
      auditFindings: Array.isArray(auditResult.findings) ? auditResult.findings : [],
      currentAction: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 5. Trigger Next Chapter or Final Audit (Hanya jika penulisan awal, bukan revisi)
    if (!isRevision) {
      const currentChapterNumber = Number(afterData.chapterNumber || 1);
      console.log(`[Chapter Orchestrator] Chapter ${currentChapterNumber} completed. Looking for chapter ${currentChapterNumber + 1}`);
      
      const nextChapterQuery = await projectRef.collection("chapters").where("chapterNumber", "==", currentChapterNumber + 1).limit(1).get();
      
      if (!nextChapterQuery.empty) {
        // Trigger next chapter
        const nextChapterRef = nextChapterQuery.docs[0].ref;
        console.log(`[Chapter Orchestrator] Triggering next chapter: ${nextChapterRef.id}`);
        await nextChapterRef.update({
          draftStatus: "PLANNED",
          planRequestedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // No more chapters, move to AUDITING_CHAPTERS
        console.log(`[Chapter Orchestrator] All chapters completed. Moving to AUDITING_CHAPTERS`);
        await projectRef.set({
          status: "AUDITING_CHAPTERS",
          orchestration: {
            phase: "consistency_audit",
            completedPhases: ["source_indexing", "outline_generation", "chapter_planning", "draft_writing"],
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

  } catch (error: any) {
    console.error(`Error processing chapter ${chapterId}:`, error);
    await chapterRef.set({
      draftStatus: "FAILED",
      errorMessage: error.message || "Unknown error occurred",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
});
