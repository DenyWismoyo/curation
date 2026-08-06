import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

type AttributionModel = "first_click_30d" | "last_click_30d";

const DEFAULT_MODEL: AttributionModel = "last_click_30d";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sanitizeAffiliateCode = (value: string): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

const sanitizeVisitorId = (value: string): string =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");

const normalizeModel = (value: unknown): AttributionModel => {
  const model = String(value || "").toLowerCase();
  if (model === "first_click_30d") return "first_click_30d";
  return "last_click_30d";
};

const isValidVisitorId = (value: string): boolean =>
  value.length >= 12 && value.length <= 128;

const getDb = () => getFirestore(admin.app(), "curation");

export const upsertReferralAttribution = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  const db = getDb();

  const visitorId = sanitizeVisitorId(String(request.data?.visitorId || ""));
  const affiliateCode = sanitizeAffiliateCode(String(request.data?.affiliateCode || ""));
  const attributionModel = normalizeModel(request.data?.attributionModel || DEFAULT_MODEL);
  const landingPath = String(request.data?.landingPath || "").slice(0, 400);
  const sourceQuery = String(request.data?.sourceQuery || "").slice(0, 1200);

  if (!isValidVisitorId(visitorId)) {
    throw new HttpsError("invalid-argument", "visitorId tidak valid.");
  }
  if (!affiliateCode) {
    throw new HttpsError("invalid-argument", "affiliateCode tidak valid.");
  }

  const affiliateRef = db.collection("affiliates").doc(affiliateCode);
  const affiliateSnap = await affiliateRef.get();
  if (!affiliateSnap.exists) {
    throw new HttpsError("not-found", "Kode affiliate tidak ditemukan.");
  }

  const affiliateData = affiliateSnap.data() || {};
  if (String(affiliateData.status || "ACTIVE").toUpperCase() !== "ACTIVE") {
    throw new HttpsError("failed-precondition", "Affiliate sedang nonaktif.");
  }

  const nowMs = Date.now();
  const docRef = db.collection("referral_attributions").doc(visitorId);
  const existingSnap = await docRef.get();
  const existing = existingSnap.exists ? (existingSnap.data() || {}) : {};

  const existingExpiry = Number(existing.expiresAtMs || 0);
  const isExpired = !existingExpiry || existingExpiry <= nowMs;

  const existingFirstCode = sanitizeAffiliateCode(String(existing?.firstClick?.affiliateCode || ""));
  const existingFirstAtMs = Number(existing?.firstClick?.capturedAtMs || 0);
  const keepFirst = !isExpired && !!existingFirstCode && existingFirstAtMs > 0;

  const firstClick = keepFirst ? {
    affiliateCode: existingFirstCode,
    capturedAtMs: existingFirstAtMs,
    landingPath: String(existing?.firstClick?.landingPath || ""),
    sourceQuery: String(existing?.firstClick?.sourceQuery || ""),
  } : {
    affiliateCode,
    capturedAtMs: nowMs,
    landingPath,
    sourceQuery,
  };

  const lastClick = {
    affiliateCode,
    capturedAtMs: nowMs,
    landingPath,
    sourceQuery,
  };

  const expiresAtMs = attributionModel === "first_click_30d"
    ? (keepFirst ? existingExpiry : nowMs + TTL_MS)
    : nowMs + TTL_MS;

  const selectedAffiliateCode = attributionModel === "first_click_30d"
    ? firstClick.affiliateCode
    : lastClick.affiliateCode;

  await docRef.set({
    visitorId,
    attributionModel,
    firstClick,
    lastClick,
    selectedAffiliateCode,
    expiresAtMs,
    status: expiresAtMs > nowMs ? "ACTIVE" : "EXPIRED",
    boundUserUid: existing.boundUserUid || null,
    boundUserEmail: existing.boundUserEmail || null,
    firstBoundAt: existing.firstBoundAt || null,
    lastTouchAtMs: nowMs,
    source: "public_tracking",
    createdAt: existing.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    success: true,
    visitorId,
    attributionModel,
    selectedAffiliateCode,
    expiresAtMs,
  };
});

export const bindReferralAttributionToUser = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const visitorId = sanitizeVisitorId(String(request.data?.visitorId || ""));
  if (!isValidVisitorId(visitorId)) {
    throw new HttpsError("invalid-argument", "visitorId tidak valid.");
  }

  const db = getDb();
  const docRef = db.collection("referral_attributions").doc(visitorId);
  const snap = await docRef.get();

  if (!snap.exists) {
    return { success: true, bound: false, reason: "NOT_FOUND" };
  }

  const data = snap.data() || {};
  const expiresAtMs = Number(data.expiresAtMs || 0);
  if (!expiresAtMs || expiresAtMs <= Date.now()) {
    await docRef.update({
      status: "EXPIRED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, bound: false, reason: "EXPIRED" };
  }

  await docRef.update({
    boundUserUid: request.auth.uid,
    boundUserEmail: String(request.auth.token.email || ""),
    firstBoundAt: data.firstBoundAt || admin.firestore.FieldValue.serverTimestamp(),
    lastBoundAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    bound: true,
    visitorId,
    selectedAffiliateCode: String(data.selectedAffiliateCode || ""),
    attributionModel: normalizeModel(data.attributionModel || DEFAULT_MODEL),
    expiresAtMs,
  };
});
