import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

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
  writingTone: z.enum(["academic", "consultative", "investigative"]).default("academic"),
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
      embeddings: "text-embedding-001",
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
  if (!["DRAFT", "FAILED", "READY_FOR_REVIEW"].includes(currentStatus)) {
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