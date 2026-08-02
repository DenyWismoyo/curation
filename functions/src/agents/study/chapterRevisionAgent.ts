import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { extractAndChunkSource } from "./sourceIngestionService";
import { dedupeSourceIds } from "./shared";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const requestRevisionSchema = z.object({
  projectId: z.string().trim().min(1),
  chapterId: z.string().trim().min(1),
  reviewerNotes: z.string().trim().min(10).max(3000),
  supplementalSources: z.array(z.object({
    type: z.enum(["url", "file", "ai_search"]),
    url: z.string().optional(),
    storagePath: z.string().optional(),
    fileName: z.string().optional(),
    aiMaterial: z.string().optional(),
    title: z.string().optional(),
  })).optional(),
});

const getDb = () => getFirestore(admin.app(), "curation");

export const generateRevisionMaterials = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Anda harus login.");
  
  const parsed = z.object({
    projectId: z.string().trim().min(1),
    chapterId: z.string().trim().min(1),
  }).safeParse(request.data || {});
  
  if (!parsed.success) throw new HttpsError("invalid-argument", "Payload tidak valid.");
  
  const { projectId, chapterId } = parsed.data;
  const db = getDb();
  
  const chapterSnap = await db.collection("study_projects").doc(projectId).collection("chapters").doc(chapterId).get();
  if (!chapterSnap.exists) throw new HttpsError("not-found", "Bab tidak ditemukan.");
  
  const chapterData = chapterSnap.data() || {};
  const findings = chapterData.auditFindings || [];
  const findingsText = findings.map((f: any) => `- ${f.issue}\n  Rekomendasi: ${f.recommendation}`).join("\n");
  
  const prompt = `Anda adalah asisten periset akademik. Berikut adalah judul bab yang sedang direvisi: "${chapterData.title}".
Daftar temuan auditor yang harus diperbaiki (jika ada):
${findingsText || "(Tidak ada temuan spesifik, perbaiki dan kembangkan bab ini menjadi lebih baik)"}

Tugas Anda: Lakukan pencarian mendalam di internet mengenai topik ini untuk melengkapi dan memperbaiki kelemahan yang disebutkan di atas.
Tuliskan rangkuman riset materi yang padat dan informatif (sekitar 300-500 kata) yang memuat fakta-fakta, data terukur, regulasi, atau teori pendukung yang Anda temukan dari internet. Wajib sertakan URL referensi sumber di dalam teks Anda agar agen penulis nanti dapat merujuknya.`;

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      tools: [{ googleSearch: {} } as any],
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract http/https links using regex
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const matches = text.match(urlRegex) || [];
    // Clean up trailing punctuation if any (like . or ,)
    const urls = Array.from(new Set(matches.map(u => u.replace(/[.,;:]$/, ''))));

    return { success: true, aiMaterial: text, foundUrls: urls };
  } catch (error: any) {
    console.error("generateRevisionMaterials error", error);
    throw new HttpsError("internal", "Gagal melakukan pencarian AI: " + error.message);
  }
});

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
  const { projectId, chapterId, reviewerNotes, supplementalSources } = parsed.data;
  
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

  // Removed immediate REVISING status update to allow orchestrator to handle it.
  await projectRef.collection("audits").add({
    action: "chapter_revision_requested",
    actorUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    details: { chapterId, reviewerNotes },
  });

  try {
    // 1. Fetch evidence using Vector Search (same logic as orchestrator)
    const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    
    const queryText = `${chapterData.title} ${chapterData.summary || ""} ${chapterData.objective || ""} ${(chapterData.keyThemes || []).join(" ")}`.trim();
    const embeddingResult = await embedModel.embedContent({ content: { role: "user", parts: [{ text: queryText }] }, outputDimensionality: 768 } as any);
    const vectorArray = embeddingResult.embedding.values;
    const embeddingData = typeof admin.firestore.FieldValue.vector === "function"
      ? admin.firestore.FieldValue.vector(vectorArray)
      : vectorArray;

    const newSourceIds: string[] = [];
    if (supplementalSources && supplementalSources.length > 0) {
      const bucket = getStorage().bucket();
      for (const src of supplementalSources) {
        const sourceId = projectRef.collection("sources").doc().id;
        let sourceRecord: any = {
          sourceId,
          title: src.title || (src.type === "ai_search" ? "AI Search Material" : src.type === "url" ? src.url : src.fileName),
          kind: src.type === "url" ? "url" : src.type === "file" ? "file" : "text_snippet",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isSupplemental: true,
          chapterId: chapterId,
        };
        
        if (src.type === "url") {
          sourceRecord.sourceUrl = src.url;
        } else if (src.type === "file") {
          sourceRecord.storagePath = src.storagePath;
          sourceRecord.fileName = src.fileName;
        } else if (src.type === "ai_search") {
          sourceRecord.summaryHint = src.aiMaterial;
        }
        
        await projectRef.collection("sources").doc(sourceId).set(sourceRecord);
        newSourceIds.push(sourceId);
        
        try {
          const extracted = await extractAndChunkSource(bucket as any, sourceRecord);
          for (const chunk of extracted.chunks) {
            const embedRes = await embedModel.embedContent({ content: { role: "user", parts: [{ text: chunk.text }] }, outputDimensionality: 768 } as any);
            const vec = typeof admin.firestore.FieldValue.vector === "function"
              ? admin.firestore.FieldValue.vector(embedRes.embedding.values)
              : embedRes.embedding.values;
              
            await projectRef.collection("vectors").add({
              sourceId,
              chunkId: chunk.chunkId,
              chunkIndex: chunk.chunkIndex,
              textChunk: chunk.text,
              embedding: vec,
            });
          }
        } catch (err) {
          console.error(`Failed to ingest supplemental source ${sourceId}`, err);
        }
      }
      
      if (newSourceIds.length > 0) {
        await projectRef.set({
          'sourceStats.total': admin.firestore.FieldValue.increment(newSourceIds.length),
          'sourceStats.indexed': admin.firestore.FieldValue.increment(newSourceIds.length)
        }, { merge: true });
      }
    }

    const relevantSourceIds = dedupeSourceIds([...(chapterData.relevantSourceIds || []), ...newSourceIds]);
    
    await chapterRef.set({
      draftStatus: "REVISION_REQUESTED",
      reviewerNotes: reviewerNotes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(newSourceIds.length > 0 && { relevantSourceIds })
    }, { merge: true });

    return { success: true, status: "REVISION_REQUESTED" };
  } catch (error: any) {
    console.error("requestChapterRevision error:", error);
    await chapterRef.set({
      draftStatus: "FAILED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    throw new HttpsError("internal", error?.message || "Gagal merevisi bab.");
  }
});
