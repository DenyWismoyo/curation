import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

type UserRole = "user" | "assessor" | "curator" | "admin_omnifit" | "admin_csrs";
type B2BPersona = "executive" | "hr" | "leader";
type OrgStatus = "active" | "pilot" | "inactive";

const upsertOrganizationSchema = z.object({
  organizationId: z.string().trim().max(80).nullish(),
  name: z.string().trim().min(2).max(120),
  displayName: z.string().trim().max(120).nullish(),
  status: z.enum(["active", "pilot", "inactive"]).default("pilot"),
  industry: z.string().trim().max(80).nullish(),
  contactName: z.string().trim().max(120).nullish(),
  // Modifikasi email untuk bisa memvalidasi string kosong ("") dengan aman
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(160)]).nullish(),
  contactPhone: z.string().trim().max(40).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).nullish(),
  notes: z.string().trim().max(800).nullish(),
});

const setUserAccessSchema = z.object({
  targetEmail: z.string().trim().email().max(160),
  targetUid: z.string().trim().max(128).nullish(),
  displayName: z.string().trim().max(120).nullish(),
  role: z.enum(["user", "assessor", "curator", "admin_omnifit", "admin_csrs"]).default("user"),
  personas: z.array(z.enum(["executive", "hr", "leader"]))
    .min(1)
    .max(3),
  organizationIds: z.array(z.string().trim().min(1).max(80)).min(1).max(120),
  enableCuratorToken: z.boolean().default(false).nullish(),
});

const revokeUserAccessSchema = z.object({
  targetEmail: z.string().trim().email().max(160),
  targetUid: z.string().trim().max(128).nullish(),
});

const listOrganizationsSchema = z.object({
  includeInactive: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
}).optional();

const getDb = () => getFirestore(admin.app(), "curation");

const normalizeOrgId = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const normalizeStringArray = (values: string[]): string[] =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const buildCuratorCode = (organizationName: string): string => {
  const normalized = normalizeOrgId(organizationName).slice(0, 8) || "ORG";
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `B2B-${normalized}-${suffix}`;
};

const isB2BAdminRole = (role: string): boolean =>
  ["admin_csrs", "admin_omnifit", "admin"].includes(role.toLowerCase());

const assertB2BAdmin = async (uid: string, email: string): Promise<void> => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  if (email.toLowerCase() === "deny.wismoyo@gmail.com") {
    return;
  }

  const db = getDb();
  const [byUid, byEmail] = await Promise.all([
    db.collection("users").doc(uid).get(),
    email ? db.collection("users").doc(email).get() : Promise.resolve(null as any),
  ]);

  const roleUid = String(byUid?.data()?.role || "");
  const roleEmail = String(byEmail?.data()?.role || "");

  if (!isB2BAdminRole(roleUid) && !isB2BAdminRole(roleEmail)) {
    throw new HttpsError("permission-denied", "Hanya admin B2B yang memiliki akses.");
  }
};

const readOrganizationsByIds = async (organizationIds: string[]): Promise<Array<{ id: string; name: string }>> => {
  const db = getDb();
  const normalized = normalizeStringArray(organizationIds.map((id) => normalizeOrgId(id)));

  if (normalized.length === 0) {
    throw new HttpsError("invalid-argument", "organizationIds tidak valid.");
  }

  const chunks: string[][] = [];
  for (let index = 0; index < normalized.length; index += 10) {
    chunks.push(normalized.slice(index, index + 10));
  }

  const docs: Array<{ id: string; name: string }> = [];
  for (const chunk of chunks) {
    const snap = await db.collection("b2b_organizations").where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
    snap.docs.forEach((entry) => {
      const data = entry.data() || {};
      const name = String(data.name || "").trim();
      if (name) {
        docs.push({ id: entry.id, name });
      }
    });
  }

  if (docs.length !== normalized.length) {
    const found = new Set(docs.map((item) => item.id));
    const missing = normalized.filter((id) => !found.has(id));
    throw new HttpsError("not-found", `Organization tidak ditemukan: ${missing.join(", ")}`);
  }

  return docs;
};

export const adminUpsertB2BOrganization = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const parsed = upsertOrganizationSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload tidak valid.");
  }

  const actorUid = request.auth.uid;
  const actorEmail = String(request.auth.token.email || "").trim().toLowerCase();
  await assertB2BAdmin(actorUid, actorEmail);

  const db = getDb();
  const payload = parsed.data;
  const organizationId = normalizeOrgId(payload.organizationId || payload.name);
  if (!organizationId) {
    throw new HttpsError("invalid-argument", "organizationId tidak valid.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const tags = normalizeStringArray(payload.tags || []);
  const status: OrgStatus = payload.status;
  const organizationRef = db.collection("b2b_organizations").doc(organizationId);

  await db.runTransaction(async (trx) => {
    const snap = await trx.get(organizationRef);
    const existing = snap.data() || {};

    trx.set(organizationRef, {
      organizationId,
      name: payload.name,
      displayName: payload.displayName || payload.name,
      status,
      industry: payload.industry || "",
      tags,
      contact: {
        name: payload.contactName || "",
        email: payload.contactEmail || "",
        phone: payload.contactPhone || "",
      },
      notes: payload.notes || "",
      updatedAt: now,
      updatedByUid: actorUid,
      updatedByEmail: actorEmail,
      createdAt: existing.createdAt || now,
      createdByUid: existing.createdByUid || actorUid,
      createdByEmail: existing.createdByEmail || actorEmail,
    }, { merge: true });
  });

  await db.collection("b2b_access_admin_logs").add({
    action: "upsert_organization",
    organizationId,
    organizationName: payload.name,
    status,
    actorUid,
    actorEmail,
    createdAt: now,
  });

  const fresh = await organizationRef.get();
  return {
    success: true,
    organization: {
      id: organizationId,
      ...(fresh.data() || {}),
    },
  };
});

export const adminListB2BOrganizations = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const actorUid = request.auth.uid;
  const actorEmail = String(request.auth.token.email || "").trim().toLowerCase();
  await assertB2BAdmin(actorUid, actorEmail);

  const parsed = listOrganizationsSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload tidak valid.");
  }

  const includeInactive = parsed.data?.includeInactive === true;
  const cap = parsed.data?.limit ?? 120;

  const db = getDb();
  let orgQuery: FirebaseFirestore.Query = db.collection("b2b_organizations").orderBy("updatedAt", "desc").limit(cap);
  if (!includeInactive) {
    orgQuery = db.collection("b2b_organizations").where("status", "in", ["active", "pilot"]).orderBy("updatedAt", "desc").limit(cap);
  }

  const snap = await orgQuery.get();
  const organizations = snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() || {}) }));
  return { success: true, organizations };
});

export const adminSetB2BUserAccess = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const parsed = setUserAccessSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload tidak valid.");
  }

  const actorUid = request.auth.uid;
  const actorEmail = String(request.auth.token.email || "").trim().toLowerCase();
  await assertB2BAdmin(actorUid, actorEmail);

  const data = parsed.data;
  const db = getDb();

  const targetEmail = data.targetEmail.trim().toLowerCase();
  const targetUid = String(data.targetUid || "").trim();
  const role: UserRole = data.role;
  const personas: B2BPersona[] = normalizeStringArray(data.personas) as B2BPersona[];

  const organizations = await readOrganizationsByIds(data.organizationIds);
  const organizationIds = organizations.map((item) => item.id);
  const organizationNames = organizations.map((item) => item.name);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const basePayload = {
    email: targetEmail,
    displayName: data.displayName || targetEmail,
    role,
    b2bPersonas: personas,
    b2bOrganizationIds: organizationIds,
    allowedOrganizations: organizationNames,
    organizationScopes: organizationNames,
    accessibleOrganizations: organizationNames,
    b2bAccess: {
      enabled: true,
      personas,
      organizationIds,
      organizations: organizationNames,
    },
    updatedAt: now,
    b2bAccessUpdatedAt: now,
  };

  await db.collection("users").doc(targetEmail).set(basePayload, { merge: true });
  if (targetUid) {
    await db.collection("users").doc(targetUid).set(basePayload, { merge: true });
  }

  let curatorCode = "";

  if ((role === "assessor" || role === "curator") && organizationNames.length > 0) {
    await db.collection("assessors").doc(targetEmail).set({
      assessorName: data.displayName || targetEmail,
      assessorEmail: targetEmail,
      role,
      programName: organizationNames[0],
      b2bIntegrated: true,
      linkedOrganizations: organizationNames,
      linkedOrganizationIds: organizationIds,
      updatedAt: now,
    }, { merge: true });
  }

  if (data.enableCuratorToken && organizationNames.length > 0) {
    curatorCode = buildCuratorCode(organizationNames[0]);
    await db.collection("curator_tokens").doc(curatorCode).set({
      programName: organizationNames[0],
      role: "curator_b2b",
      linkedEmail: targetEmail,
      linkedOrganizations: organizationNames,
      linkedOrganizationIds: organizationIds,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  await db.collection("b2b_access_admin_logs").add({
    action: "grant_or_update",
    targetEmail,
    targetUid: targetUid || null,
    role,
    personas,
    organizationIds,
    organizations: organizationNames,
    generatedCuratorToken: Boolean(curatorCode),
    curatorCode: curatorCode || null,
    actorUid,
    actorEmail,
    createdAt: now,
  });

  return {
    success: true,
    targetEmail,
    targetUid: targetUid || null,
    role,
    organizationIds,
    organizations: organizationNames,
    curatorCode: curatorCode || null,
  };
});

export const adminRevokeB2BUserAccess = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const parsed = revokeUserAccessSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload tidak valid.");
  }

  const actorUid = request.auth.uid;
  const actorEmail = String(request.auth.token.email || "").trim().toLowerCase();
  await assertB2BAdmin(actorUid, actorEmail);

  const db = getDb();
  const targetEmail = parsed.data.targetEmail.trim().toLowerCase();
  const targetUid = String(parsed.data.targetUid || "").trim();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const revokePayload = {
    b2bPersonas: [],
    b2bOrganizationIds: [],
    allowedOrganizations: [],
    organizationScopes: [],
    accessibleOrganizations: [],
    b2bAccess: {
      enabled: false,
      personas: [],
      organizationIds: [],
      organizations: [],
    },
    updatedAt: now,
    b2bAccessUpdatedAt: now,
  };

  await db.collection("users").doc(targetEmail).set(revokePayload, { merge: true });
  if (targetUid) {
    await db.collection("users").doc(targetUid).set(revokePayload, { merge: true });
  }

  await db.collection("b2b_access_admin_logs").add({
    action: "revoke",
    targetEmail,
    targetUid: targetUid || null,
    actorUid,
    actorEmail,
    createdAt: now,
  });

  return {
    success: true,
    targetEmail,
    targetUid: targetUid || null,
  };
});
