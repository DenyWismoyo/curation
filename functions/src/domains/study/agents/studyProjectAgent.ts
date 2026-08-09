import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { z } from "zod";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

type StudyRole = "user" | "assessor" | "curator" | "study_author" | "study_reviewer" | "admin_omnifit" | "admin_csrs" | "admin";
type StudyStatus = "DRAFT" | "INDEXING_SOURCES" | "GENERATING_OUTLINE" | "PLANNING_CHAPTERS" | "WRITING_CHAPTERS" | "AUDITING_CHAPTERS" | "READY_FOR_REVIEW" | "FAILED";

const createStudyProjectSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().max(2000).optional(),
  researchQuestion: z.string().trim().min(12).max(2000),
  organizationId: z.string().trim().max(120).optional(),
  methodology: z.enum(["literature_review", "case_study", "survey", "mixed"]).optional(),
  targetPages: z.number().int().min(10).max(200).default(100),
  targetWordCount: z.number().int().min(3000).max(120000).default(25000),
  citationStyle: z.enum(["APA", "IEEE", "Harvard"]).default("APA"),
  writingTone: z.enum(["academic", "consultative", "investigative", "hedge_fund", "crypto_academy"]).default("academic"),
  reviewerIds: z.array(z.string().trim().min(1).max(128)).max(20).optional(),
  reviewerEmails: z.array(z.string().trim().email().max(200)).max(20).optional(),
});

const registerStudySourceSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(2).max(200),
  kind: z.enum(["file", "url", "text_snippet"]).default("file"),
  storagePath: z.string().trim().max(500).optional(),
  downloadUrl: z.string().trim().max(2000).optional(),
  contentType: z.string().trim().max(160).optional(),
  sourceUrl: z.string().trim().max(2000).optional(),
  summaryHint: z.string().trim().max(3000).optional(),
  fileName: z.string().trim().max(260).optional(),
  fileSize: z.number().int().min(0).max(100 * 1024 * 1024).optional(),
});

const startStudyPipelineSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
});

const assignStudyReviewersSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
  reviewerIds: z.array(z.string().trim().min(1).max(128)).max(20).default([]),
  reviewerEmails: z.array(z.string().trim().email().max(200)).max(20).default([]),
});

const normalizeStringArray = (values: string[]): string[] =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const getDb = () => getFirestore(admin.app(), "curation");

const normalizeEmail = (value: unknown): string => String(value || "").trim().toLowerCase();

const STUDY_ALLOWED_ROLES = new Set<StudyRole>(["study_author", "admin_omnifit", "admin_csrs", "admin"]);

const isStudyOperatorRole = (role: unknown): role is StudyRole => {
  const normalized = String(role || "").trim().toLowerCase() as StudyRole;
  return STUDY_ALLOWED_ROLES.has(normalized);
};

const assertStudyOperator = async (uid: string, email: string, requiredProjectId?: string) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const db = getDb();
  const [byUid, byEmail] = await Promise.all([
    db.collection("users").doc(uid).get(),
    email ? db.collection("users").doc(email).get() : Promise.resolve(null as any),
  ]);

  const roleUid = byUid.data()?.role;
  const roleEmail = byEmail?.data()?.role;
  const isOperator = isStudyOperatorRole(roleUid) || isStudyOperatorRole(roleEmail);

  if (!isOperator) {
    throw new HttpsError("permission-denied", "Role Anda belum memiliki akses workspace kajian.");
  }

  if (!requiredProjectId) {
    return {
      userDoc: byUid.data() || {},
      role: String(roleUid || roleEmail || "user"),
    };
  }

  const projectSnap = await db.collection("study_projects").doc(requiredProjectId).get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  const projectData = projectSnap.data() || {};
  const authorId = String(projectData.authorId || "");
  const authorEmail = normalizeEmail(projectData.authorEmail);
  const organizationId = String(projectData.organizationId || "").trim();
  const userDocData = byUid.data() || byEmail?.data() || {};
  const orgScopes = new Set<string>([
    ...((Array.isArray(userDocData.allowedOrganizations) ? userDocData.allowedOrganizations : []) as string[]),
    ...((Array.isArray(userDocData.b2bOrganizationIds) ? userDocData.b2bOrganizationIds : []) as string[]),
    ...((Array.isArray(userDocData.organizationScopes) ? userDocData.organizationScopes : []) as string[]),
    ...((Array.isArray(userDocData.accessibleOrganizations) ? userDocData.accessibleOrganizations : []) as string[]),
  ].map((entry) => String(entry || "").trim()).filter(Boolean));

  const canAccess = authorId === uid || authorEmail === email || isOperator || (organizationId && orgScopes.has(organizationId));
  if (!canAccess) {
    throw new HttpsError("permission-denied", "Anda tidak memiliki akses ke project kajian ini.");
  }

  return {
    projectRef: projectSnap.ref,
    projectData,
    userDoc: userDocData,
    role: String(roleUid || roleEmail || "user"),
  };
};

const buildPhasePayload = (status: StudyStatus, phase: string, completedPhases: string[] = [], errors: Array<Record<string, string>> = []) => ({
  status,
  orchestration: {
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    phase,
    completedPhases,
    errors,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

export const createStudyProject = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = createStudyProjectSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload project kajian tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  await assertStudyOperator(uid, email);

  const payload = parsed.data;
  const db = getDb();
  const projectRef = db.collection("study_projects").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const reviewerIds = normalizeStringArray(payload.reviewerIds || []);
  const reviewerEmails = normalizeStringArray((payload.reviewerEmails || []).map((entry) => normalizeEmail(entry)));
  const memberIds = normalizeStringArray([uid, ...reviewerIds]);
  const memberEmails = normalizeStringArray([email, ...reviewerEmails]);

  await projectRef.set({
    projectId: projectRef.id,
    title: payload.title,
    description: payload.description || "",
    researchQuestion: payload.researchQuestion,
    organizationId: payload.organizationId || "",
    methodology: payload.methodology || "literature_review",
    targetPages: payload.targetPages,
    targetWordCount: payload.targetWordCount,
    citationStyle: payload.citationStyle,
    writingTone: payload.writingTone,
    authorId: uid,
    authorEmail: email,
    collaboratorIds: [],
    reviewerIds,
    reviewerEmails,
    memberIds,
    memberEmails,
    sourceStats: {
      total: 0,
      indexed: 0,
      failed: 0,
    },
    outline: null,
    reviewStatus: "DRAFTING",
    reviewSummary: null,
    status: "DRAFT",
    orchestration: {
      phase: "project_setup",
      completedPhases: [],
      errors: [],
      updatedAt: now,
    },
    modelPlan: {
      architect: "deepseek-v4-pro",
      planner: "deepseek-v4-flash",
      embeddings: "gemini-embedding-2",
    },
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  await projectRef.collection("audits").add({
    action: "project_created",
    actorUid: uid,
    actorEmail: email,
    createdAt: now,
    details: {
      title: payload.title,
      methodology: payload.methodology || "literature_review",
      reviewerCount: reviewerIds.length,
    },
  });

  return {
    success: true,
    projectId: projectRef.id,
    status: "DRAFT",
  };
});

export const registerStudySource = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = registerStudySourceSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload source kajian tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const payload = parsed.data;
  const { projectRef } = await assertStudyOperator(uid, email, payload.projectId);
  if (!projectRef) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  const sourceRef = projectRef.collection("sources").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await sourceRef.set({
    sourceId: sourceRef.id,
    projectId: payload.projectId,
    kind: payload.kind,
    title: payload.title,
    storagePath: payload.storagePath || "",
    downloadUrl: payload.downloadUrl || "",
    contentType: payload.contentType || "",
    sourceUrl: payload.sourceUrl || "",
    fileName: payload.fileName || "",
    fileSize: payload.fileSize || 0,
    summaryHint: payload.summaryHint || "",
    extractedText: "",
    embeddingGenerated: false,
    status: "PENDING",
    uploadedByUid: uid,
    uploadedByEmail: email,
    uploadedAt: now,
    indexedAt: null,
    updatedAt: now,
  });

  await projectRef.set({
    sourceStats: {
      total: admin.firestore.FieldValue.increment(1),
    },
    updatedAt: now,
    lastActivityAt: now,
  }, { merge: true });

  await projectRef.collection("audits").add({
    action: "source_added",
    actorUid: uid,
    actorEmail: email,
    createdAt: now,
    details: {
      sourceId: sourceRef.id,
      title: payload.title,
      kind: payload.kind,
    },
  });

  return {
    success: true,
    sourceId: sourceRef.id,
  };
});

export const startStudyProjectPipeline = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = startStudyPipelineSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload start pipeline tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const { projectRef, projectData } = await assertStudyOperator(uid, email, parsed.data.projectId);
  if (!projectRef || !projectData) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  const currentStatus = String(projectData.status || "DRAFT") as StudyStatus;
  const isFailed = currentStatus === "FAILED" || projectData?.orchestration?.phase === "failed";
  if (!["DRAFT", "READY_FOR_REVIEW", "INDEXING_SOURCES", "WRITING_CHAPTERS"].includes(currentStatus) && !isFailed) {
    throw new HttpsError("failed-precondition", `Project tidak bisa dimulai ulang dari status ${currentStatus}.`);
  }

  const sourceSnap = await projectRef.collection("sources").limit(1).get();
  if (sourceSnap.empty) {
    throw new HttpsError("failed-precondition", "Tambahkan minimal 1 source knowledge base sebelum menjalankan pipeline kajian.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await projectRef.set({
    ...buildPhasePayload("INDEXING_SOURCES", "source_indexing"),
    reviewStatus: "GENERATING",
  }, { merge: true });
  await projectRef.collection("audits").add({
    action: "pipeline_started",
    actorUid: uid,
    actorEmail: email,
    createdAt: now,
    details: {
      previousStatus: currentStatus,
    },
  });

  return {
    success: true,
    projectId: parsed.data.projectId,
    status: "INDEXING_SOURCES",
  };
});

export const assignStudyProjectReviewers = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = assignStudyReviewersSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload reviewer tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const { projectRef, projectData } = await assertStudyOperator(uid, email, parsed.data.projectId);
  if (!projectRef || !projectData) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  const reviewerIds = normalizeStringArray(parsed.data.reviewerIds || []).filter((entry) => entry !== uid);
  const reviewerEmails = normalizeStringArray((parsed.data.reviewerEmails || []).map((entry) => normalizeEmail(entry))).filter((entry) => entry !== email);
  const memberIds = normalizeStringArray([String(projectData.authorId || uid), ...reviewerIds]);
  const memberEmails = normalizeStringArray([normalizeEmail(projectData.authorEmail || email), ...reviewerEmails]);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await projectRef.set({
    reviewerIds,
    reviewerEmails,
    memberIds,
    memberEmails,
    updatedAt: now,
    lastActivityAt: now,
  }, { merge: true });

  await projectRef.collection("audits").add({
    action: "reviewers_assigned",
    actorUid: uid,
    actorEmail: email,
    createdAt: now,
    details: {
      reviewerIds,
      reviewerEmails,
    },
  });

  return {
    success: true,
    reviewerIds,
    reviewerEmails,
  };
});

const approveStudyOutlineSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
});

export const approveStudyOutline = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = approveStudyOutlineSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Payload persetujuan outline tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const { projectRef, projectData } = await assertStudyOperator(uid, email, parsed.data.projectId);
  
  if (!projectRef || !projectData) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  if (projectData.status !== "REVIEWING_OUTLINE") {
    throw new HttpsError("failed-precondition", "Project tidak sedang dalam fase review outline.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await projectRef.set({
    status: "PLANNING_CHAPTERS",
    "orchestration.phase": "chapter_planning",
    updatedAt: now,
    lastActivityAt: now,
  }, { merge: true });

  await projectRef.collection("audits").add({
    action: "outline_approved",
    actorUid: uid,
    actorEmail: email,
    createdAt: now,
  });

  return { success: true };
});

const publishStudyToCryptoAcademySchema = z.object({
  projectId: z.string().trim().min(1).max(128),
  level: z.string().trim().min(1).max(128),
  assessmentTemplateId: z.string().trim().max(128).optional().nullable().or(z.literal("")),
});

export const publishStudyToCryptoAcademy = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = publishStudyToCryptoAcademySchema.safeParse(request.data || {});
  if (!parsed.success) {
    console.error("publishStudyToCryptoAcademy validation failed:", parsed.error);
    throw new HttpsError("invalid-argument", "Payload persetujuan publikasi tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const { projectRef, projectData } = await assertStudyOperator(uid, email, parsed.data.projectId);
  
  if (!projectRef || !projectData) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  if (projectData.status !== "READY_FOR_REVIEW" && projectData.status !== "COMPLETED") {
    throw new HttpsError("failed-precondition", "Project harus berstatus READY_FOR_REVIEW atau COMPLETED.");
  }

  const chaptersSnap = await projectRef.collection("chapters").orderBy("chapterNumber", "asc").get();
  if (chaptersSnap.empty) {
    throw new HttpsError("failed-precondition", "Project tidak memiliki bab untuk dipublikasikan.");
  }

  const db = getDb();
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let order = 1;
  const moduleIds: string[] = [];
  for (const doc of chaptersSnap.docs) {
    const chapterData = doc.data();
    // Gunakan revisedContent jika ada, jika tidak gunakan content biasa. Jika kosong gunakan string kosong.
    const content = chapterData.revisedContent || chapterData.content || ""; 
    const moduleRef = db.collection("cryptoEducation").doc();
    
    const wordCount = content.split(/\s+/).length;
    const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));
    
    batch.set(moduleRef, {
      moduleId: moduleRef.id,
      studyProjectId: parsed.data.projectId,
      studyChapterId: doc.id,
      level: parsed.data.level,
      moduleOrder: order,
      title: chapterData.title || `Modul ${order}`,
      content: content,
      assessmentTemplateId: parsed.data.assessmentTemplateId || null,
      publishedByUid: uid,
      // Metadata baru untuk Crypto Academy v2
      description: "",
      estimatedMinutes: estimatedMinutes,
      tags: [],
      difficulty: "beginner",
      prerequisites: [],
      coverEmoji: "📚",
      keyLearnings: [],
      isPublished: false, // Disimpan sebagai draft terlebih dahulu untuk direview di /admin
      publishedAt: null, // belum dipublish ke publik
      updatedAt: now,
      version: 1,
    });
    moduleIds.push(moduleRef.id);
    order++;
  }

  // Tambahkan audit log
  batch.set(projectRef.collection("audits").doc(), {
    action: "published_to_crypto_academy",
    actorUid: uid,
    actorEmail: email,
    createdAt: now,
    details: {
      level: parsed.data.level,
      modulesCount: chaptersSnap.size,
    }
  });

  await batch.commit();

  return { success: true, publishedModulesCount: chaptersSnap.size, moduleIds };
});

const updateStudyChapterManualSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
  chapterId: z.string().trim().min(1).max(128),
  content: z.string().trim().min(1),
});

export const updateStudyChapterManual = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = updateStudyChapterManualSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Payload update manual tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const { projectRef, projectData } = await assertStudyOperator(uid, email, parsed.data.projectId);
  
  if (!projectRef || !projectData) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  const chapterRef = projectRef.collection("chapters").doc(parsed.data.chapterId);
  const chapterSnap = await chapterRef.get();
  
  if (!chapterSnap.exists) {
    throw new HttpsError("not-found", "Bab kajian tidak ditemukan.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await chapterRef.update({
    content: parsed.data.content,
    revisedContent: parsed.data.content,
    manuallyEdited: true,
    manuallyEditedAt: now,
    manuallyEditedBy: uid,
  });

  return { success: true };
});

const searchAndGenerateStudySourceSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
});

export const searchAndGenerateStudySource = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const parsed = searchAndGenerateStudySourceSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Payload pencarian internet tidak valid.");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const { projectRef, projectData } = await assertStudyOperator(uid, email, parsed.data.projectId);
  
  if (!projectRef || !projectData) {
    throw new HttpsError("not-found", "Project kajian tidak ditemukan.");
  }

  const apiKey = deepseekApiKeySecret.value();
  if (!apiKey) {
    throw new HttpsError("internal", "API Key DeepSeek tidak terkonfigurasi.");
  }

  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });

  const prompt = `Anda adalah asisten peneliti senior (AI Web Researcher) dengan kapabilitas pencarian internet.
Tugas Anda adalah melakukan riset virtual ekstensif terkait topik kajian berikut:
- Judul: ${projectData.title}
- Deskripsi: ${projectData.description || "Tidak ada deskripsi spesifik."}
- Pertanyaan Riset: ${projectData.researchQuestion}

INSTRUKSI WAJIB:
1. Rangkum informasi terkini, temuan, metrik/data relevan, dan argumen kuat yang menjawab pertanyaan riset di atas secara komprehensif.
2. Panjang teks minimal 1000 kata. Artikel harus padat fakta dan data.
3. Asumsikan Anda memiliki akses ke data internet. Tulis seakan-akan ini adalah laporan hasil pencarian internet. Jika ada URL fiktif atau URL spesifik yang Anda ketahui, sebutkan di bagian bawah sebagai referensi pendukung.
4. Jangan menulis menggunakan gaya pengantar ("Baiklah", "Tentu", dll). Langsung tulis konten risetnya.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [{ role: "user", content: prompt }]
    });

    const generatedText = response.choices[0]?.message?.content || "";
    if (!generatedText) {
      throw new Error("Respon AI kosong.");
    }

    const sourceRef = projectRef.collection("sources").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await sourceRef.set({
      sourceId: sourceRef.id,
      projectId: parsed.data.projectId,
      kind: "text_snippet",
      title: "Hasil Riset AI: " + projectData.title,
      summaryHint: "Dihasilkan otomatis oleh Agen Peneliti AI menggunakan DeepSeek Reasoner (v4 Pro).",
      extractedText: generatedText, // Now supported via our sourceIngestionService patch
      embeddingGenerated: false,
      status: "PENDING",
      uploadedByUid: uid,
      uploadedByEmail: email,
      uploadedAt: now,
      indexedAt: null,
      updatedAt: now,
    });

    await projectRef.set({
      sourceStats: {
        total: admin.firestore.FieldValue.increment(1),
      },
      updatedAt: now,
      lastActivityAt: now,
    }, { merge: true });

    await projectRef.collection("audits").add({
      action: "source_ai_searched",
      actorUid: uid,
      actorEmail: email,
      createdAt: now,
      details: {
        sourceId: sourceRef.id,
        kind: "text_snippet",
        model: "deepseek-reasoner"
      },
    });

    return { success: true, sourceId: sourceRef.id };
  } catch (err: any) {
    console.error("Gagal melakukan pencarian AI:", err);
    throw new HttpsError("internal", "Gagal menghasilkan riset AI: " + err.message);
  }
});