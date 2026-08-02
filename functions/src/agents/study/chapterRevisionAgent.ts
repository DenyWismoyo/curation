import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { writeChapterDraft, auditChapterDraft } from "./chapterGenerationService";
import { dedupeSourceIds, StudyEvidenceChunk } from "./shared";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const requestRevisionSchema = z.object({
  projectId: z.string().trim().min(1),
  chapterId: z.string().trim().min(1),
  reviewerNotes: z.string().trim().min(10).max(3000),
});

const getDb = () => getFirestore(admin.app(), "curation");

export const requestChapterRevision = onCall({
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [deepseekApiKeySecret, geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = requestRevisionSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload revisi tidak valid.");
  }

  const uid = request.auth.uid;
  const { projectId, chapterId, reviewerNotes } = parsed.data;
  
  const db = getDb();
  const projectRef = db.collection("study_projects").doc(projectId);
  const projectSnap = await projectRef.get();
  
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project tidak ditemukan.");
  }
  
  const projectData = projectSnap.data() || {};
  const memberIds = projectData.memberIds || [];
  if (!memberIds.includes(uid)) {
    throw new HttpsError("permission-denied", "Anda bukan anggota project ini.");
  }

  const chapterRef = projectRef.collection("chapters").doc(chapterId);
  const chapterSnap = await chapterRef.get();
  
  if (!chapterSnap.exists) {
    throw new HttpsError("not-found", "Bab tidak ditemukan.");
  }
  
  const chapterData = chapterSnap.data() as any;

  // Set status to generating
  await chapterRef.set({
    draftStatus: "REVISING",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await projectRef.collection("audits").add({
    action: "chapter_revision_requested",
    actorUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    details: { chapterId, reviewerNotes },
  });

  try {
    // 1. Fetch evidence using Vector Search (same logic as orchestrator)
    const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-001" });
    
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

    const vectorSnap = await query.findNearest("embedding", embeddingData, {
      limit: 12,
      distanceMeasure: "COSINE"
    }).get();

    const evidenceChunks = vectorSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        sourceId: data.sourceId,
        chunkIndex: data.chunkIndex,
        textChunk: data.textChunk,
      };
    }) as StudyEvidenceChunk[];

    // 2. Draft Writing with Reviewer Feedback
    const draftResult = await writeChapterDraft(
      deepseekApiKeySecret.value(),
      projectData,
      chapterData,
      evidenceChunks,
      reviewerNotes
    );
    const draftCitations = Array.isArray(draftResult.citations) ? draftResult.citations : [];
    
    // 3. Audit Draft
    const auditResult = await auditChapterDraft(
      deepseekApiKeySecret.value(),
      projectData,
      chapterData,
      String(draftResult.content || ""),
      draftCitations,
      evidenceChunks
    );

    await chapterRef.set({
      draftStatus: auditResult.status === "APPROVED" ? "UNDER_REVIEW" : "COMPLETED",
      auditStatus: String(auditResult.status || "NEEDS_REVIEW"),
      content: String(auditResult.revisedContent || draftResult.content || ""),
      citations: draftCitations,
      citationCoverageScore: Number(auditResult.citationCoverageScore || 0),
      consistencyScore: Number(auditResult.consistencyScore || 0),
      auditFindings: Array.isArray(auditResult.findings) ? auditResult.findings : [],
      auditedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, status: auditResult.status };
  } catch (error: any) {
    console.error("requestChapterRevision error:", error);
    await chapterRef.set({
      draftStatus: "FAILED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    throw new HttpsError("internal", error?.message || "Gagal merevisi bab.");
  }
});
