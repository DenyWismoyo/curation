import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const AFFILIATE_DEFAULT_RATE = 0.1;
const AFFILIATE_PROGRAM_CONFIG_DOC = "affiliate_program";

type AffiliateProgramConfig = {
  defaultCommissionRate: number;
  commissionInfoText: string;
};

const clampRate = (value: number): number => {
  if (!Number.isFinite(value)) return AFFILIATE_DEFAULT_RATE;
  return Math.max(0, Math.min(1, value));
};

const toProgramConfig = (raw: any): AffiliateProgramConfig => {
  const defaultCommissionRate = clampRate(Number(raw?.defaultCommissionRate ?? AFFILIATE_DEFAULT_RATE));
  const commissionInfoText = String(raw?.commissionInfoText || "").trim().slice(0, 400);
  return {
    defaultCommissionRate,
    commissionInfoText,
  };
};

const sanitizeCode = (value: string): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

const createReadableCode = (seed: string): string => {
  const base = sanitizeCode(seed).slice(0, 8) || "AFF";
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AF-${base}-${random}`;
};

const getDb = () => getFirestore(admin.app(), "curation");

const getAffiliateProgramConfig = async (db: FirebaseFirestore.Firestore): Promise<AffiliateProgramConfig> => {
  const snap = await db.collection("app_config").doc(AFFILIATE_PROGRAM_CONFIG_DOC).get();
  if (!snap.exists) {
    return {
      defaultCommissionRate: AFFILIATE_DEFAULT_RATE,
      commissionInfoText: "Komisi affiliate dihitung dari transaksi yang berhasil dibayar sesuai ketentuan Omnifit.",
    };
  }
  return toProgramConfig(snap.data() || {});
};

const isAdminOperator = async (uid: string, email: string): Promise<boolean> => {
  if (email === "deny.wismoyo@gmail.com") return true;

  const db = getDb();
  const [byUid, byEmail] = await Promise.all([
    db.collection("users").doc(uid).get(),
    email ? db.collection("users").doc(email).get() : Promise.resolve(null as any),
  ]);

  const roleUid = String(byUid?.data()?.role || "").toLowerCase();
  const roleEmail = String(byEmail?.data()?.role || "").toLowerCase();
  const allowed = ["admin_csrs", "admin_omnifit", "admin"];

  return allowed.includes(roleUid) || allowed.includes(roleEmail);
};

export const createOrGetAffiliateProfile = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const db = getDb();
  const uid = request.auth.uid;
  const email = request.auth.token.email || "";
  const displayName = String(request.data?.displayName || "").trim() || "Affiliate Partner";
  const payoutMethod = String(request.data?.payoutMethod || "").trim();
  const payoutAccount = String(request.data?.payoutAccount || "").trim();
  const programConfig = await getAffiliateProgramConfig(db);

  // Return existing affiliate profile owned by current user if available.
  const existing = await db.collection("affiliates")
    .where("ownerUid", "==", uid)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data();
    return {
      success: true,
      affiliateCode: doc.id,
      profile: {
        ...data,
        referralLink: `https://omnifit.cloud/?ref=${doc.id}`,
      },
      programConfig,
      isNew: false,
    };
  }

  let code = createReadableCode(displayName || email || uid);
  for (let i = 0; i < 5; i++) {
    const codeSnap = await db.collection("affiliates").doc(code).get();
    if (!codeSnap.exists) break;
    code = createReadableCode(`${displayName}-${Date.now()}-${i}`);
  }

  const docRef = db.collection("affiliates").doc(code);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await docRef.set({
    ownerUid: uid,
    ownerEmail: email,
    displayName,
    payoutMethod: payoutMethod || "manual",
    payoutAccount: payoutAccount || "",
    commissionRate: programConfig.defaultCommissionRate,
    status: "ACTIVE",
    stats: {
      totalReferrals: 0,
      referredRevenue: 0,
      pendingCommission: 0,
      approvedCommission: 0,
      paidCommission: 0,
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    success: true,
    affiliateCode: code,
    profile: {
      ownerUid: uid,
      ownerEmail: email,
      displayName,
      payoutMethod: payoutMethod || "manual",
      payoutAccount: payoutAccount || "",
      commissionRate: programConfig.defaultCommissionRate,
      status: "ACTIVE",
      referralLink: `https://omnifit.cloud/?ref=${code}`,
    },
    programConfig,
    isNew: true,
  };
});

export const attachAffiliateToTransaction = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const transactionId = String(request.data?.transactionId || "").trim();
  const affiliateCode = sanitizeCode(String(request.data?.affiliateCode || ""));

  if (!transactionId) throw new HttpsError("invalid-argument", "transactionId wajib diisi.");
  if (!affiliateCode) throw new HttpsError("invalid-argument", "affiliateCode tidak valid.");

  const db = getDb();
  const txRef = db.collection("transactions").doc(transactionId);
  const affiliateRef = db.collection("affiliates").doc(affiliateCode);

  await db.runTransaction(async (trx) => {
    const [txSnap, affiliateSnap] = await Promise.all([trx.get(txRef), trx.get(affiliateRef)]);

    if (!txSnap.exists) throw new HttpsError("not-found", "Transaksi tidak ditemukan.");
    if (!affiliateSnap.exists) throw new HttpsError("not-found", "Kode affiliate tidak ditemukan.");

    const txData = txSnap.data() || {};
    const affData = affiliateSnap.data() || {};

    if (String(txData.userId || "") !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Transaksi bukan milik Anda.");
    }

    if (String(txData.status || "").toUpperCase() === "PAID") {
      throw new HttpsError("failed-precondition", "Transaksi sudah dibayar dan tidak bisa diubah.");
    }

    if (String(affData.status || "ACTIVE").toUpperCase() !== "ACTIVE") {
      throw new HttpsError("failed-precondition", "Affiliate sedang nonaktif.");
    }

    if (String(affData.ownerUid || "") === request.auth!.uid) {
      throw new HttpsError("failed-precondition", "Self referral tidak diizinkan.");
    }

    trx.update(txRef, {
      affiliateCode,
      affiliateOwnerUid: affData.ownerUid || "",
      affiliateRateSnapshot: Number(affData.commissionRate ?? AFFILIATE_DEFAULT_RATE),
      affiliateAttachedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    transactionId,
    affiliateCode,
  };
});

export const updateAffiliatePayoutProfile = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const affiliateCode = sanitizeCode(String(request.data?.affiliateCode || ""));
  const payoutMethod = String(request.data?.payoutMethod || "manual").trim().slice(0, 40);
  const payoutAccount = String(request.data?.payoutAccount || "").trim().slice(0, 240);
  const displayName = String(request.data?.displayName || "").trim().slice(0, 120);
  const payoutPhone = String(request.data?.payoutPhone || "").trim().slice(0, 30);
  const payoutEwalletProvider = String(request.data?.payoutEwalletProvider || "").trim().slice(0, 40);
  const payoutEwalletAccountName = String(request.data?.payoutEwalletAccountName || "").trim().slice(0, 120);
  const payoutDataConfirmed = request.data?.payoutDataConfirmed === true;

  if (!affiliateCode) {
    throw new HttpsError("invalid-argument", "affiliateCode tidak valid.");
  }
  if (!payoutMethod) {
    throw new HttpsError("invalid-argument", "payoutMethod wajib diisi.");
  }
  if (!payoutDataConfirmed) {
    throw new HttpsError("failed-precondition", "Konfirmasi data payout wajib diaktifkan sebelum menyimpan.");
  }

  if (payoutMethod === "ewallet") {
    if (!payoutPhone || !payoutEwalletProvider || !payoutEwalletAccountName) {
      throw new HttpsError("invalid-argument", "Nomor telepon, provider e-wallet, dan nama akun e-wallet wajib diisi.");
    }
  }

  const db = getDb();
  const affiliateRef = db.collection("affiliates").doc(affiliateCode);

  await db.runTransaction(async (trx) => {
    const snap = await trx.get(affiliateRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Profil affiliate tidak ditemukan.");
    }

    const data = snap.data() || {};
    if (String(data.ownerUid || "") !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Anda bukan pemilik profil affiliate ini.");
    }

    trx.update(affiliateRef, {
      payoutMethod,
      payoutAccount,
      payoutPhone,
      payoutEwalletProvider,
      payoutEwalletAccountName,
      payoutDataConfirmed,
      payoutDataConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      displayName: displayName || data.displayName || "Affiliate Partner",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const refreshed = await affiliateRef.get();
  const profile = refreshed.data() || {};

  return {
    success: true,
    affiliateCode,
    profile: {
      ...profile,
      referralLink: `https://omnifit.cloud/?ref=${affiliateCode}`,
    },
  };
});

export const adminReviewAffiliatePayout = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const reviewerUid = request.auth.uid;
  const reviewerEmail = String(request.auth.token.email || "");
  const allowed = await isAdminOperator(reviewerUid, reviewerEmail);
  if (!allowed) {
    throw new HttpsError("permission-denied", "Hanya admin yang dapat me-review payout affiliate.");
  }

  const commissionId = String(request.data?.commissionId || "").trim();
  const action = String(request.data?.action || "").trim().toUpperCase();
  const note = String(request.data?.note || "").trim();

  if (!commissionId) throw new HttpsError("invalid-argument", "commissionId wajib diisi.");
  if (!["APPROVE", "REJECT"].includes(action)) {
    throw new HttpsError("invalid-argument", "action hanya boleh APPROVE atau REJECT.");
  }

  const db = getDb();
  const commissionRef = db.collection("affiliate_commissions").doc(commissionId);

  const result = await db.runTransaction(async (trx) => {
    const commissionSnap = await trx.get(commissionRef);
    if (!commissionSnap.exists) {
      throw new HttpsError("not-found", "Komisi tidak ditemukan.");
    }

    const commissionData = commissionSnap.data() || {};
    const currentStatus = String(commissionData.status || "").toUpperCase();
    if (currentStatus !== "PENDING_APPROVAL") {
      throw new HttpsError("failed-precondition", `Status komisi saat ini ${currentStatus}, tidak dapat di-review ulang.`);
    }

    const affiliateCode = String(commissionData.affiliateCode || "").trim();
    if (!affiliateCode) {
      throw new HttpsError("failed-precondition", "Data affiliateCode pada komisi kosong.");
    }

    const affiliateRef = db.collection("affiliates").doc(affiliateCode);
    const affiliateSnap = await trx.get(affiliateRef);
    if (!affiliateSnap.exists) {
      throw new HttpsError("not-found", "Profil affiliate tidak ditemukan.");
    }

    const txId = String(commissionData.transactionId || "").trim();
    const txRef = txId ? db.collection("transactions").doc(txId) : null;
    const commissionAmount = Number(commissionData.commissionAmount || 0);
    const safeAmount = Number.isFinite(commissionAmount) ? Math.max(0, Math.round(commissionAmount)) : 0;

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    trx.update(commissionRef, {
      status: nextStatus,
      reviewAction: action,
      reviewNote: note || null,
      reviewedByUid: reviewerUid,
      reviewedByEmail: reviewerEmail,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (action === "APPROVE") {
      trx.update(affiliateRef, {
        "stats.pendingCommission": admin.firestore.FieldValue.increment(-safeAmount),
        "stats.approvedCommission": admin.firestore.FieldValue.increment(safeAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      trx.update(affiliateRef, {
        "stats.pendingCommission": admin.firestore.FieldValue.increment(-safeAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (txRef) {
      trx.update(txRef, {
        affiliateCommissionStatus: nextStatus,
        affiliateCommissionReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        affiliateCommissionReviewedBy: reviewerEmail,
      });
    }

    return {
      success: true,
      commissionId,
      status: nextStatus,
      action,
    };
  });

  return result;
});

export const adminMarkAffiliateCommissionPaid = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const operatorUid = request.auth.uid;
  const operatorEmail = String(request.auth.token.email || "");
  const allowed = await isAdminOperator(operatorUid, operatorEmail);
  if (!allowed) {
    throw new HttpsError("permission-denied", "Hanya admin yang dapat menandai payout komisi sebagai PAID.");
  }

  const commissionId = String(request.data?.commissionId || "").trim();
  const note = String(request.data?.note || "").trim().slice(0, 500);

  if (!commissionId) {
    throw new HttpsError("invalid-argument", "commissionId wajib diisi.");
  }

  const db = getDb();
  const commissionRef = db.collection("affiliate_commissions").doc(commissionId);

  const result = await db.runTransaction(async (trx) => {
    const commissionSnap = await trx.get(commissionRef);
    if (!commissionSnap.exists) {
      throw new HttpsError("not-found", "Komisi tidak ditemukan.");
    }

    const commissionData = commissionSnap.data() || {};
    const currentStatus = String(commissionData.status || "").toUpperCase();
    if (currentStatus !== "APPROVED") {
      throw new HttpsError("failed-precondition", `Komisi harus berstatus APPROVED. Status saat ini: ${currentStatus}`);
    }

    const affiliateCode = String(commissionData.affiliateCode || "").trim();
    if (!affiliateCode) {
      throw new HttpsError("failed-precondition", "affiliateCode pada komisi kosong.");
    }

    const commissionAmount = Number(commissionData.commissionAmount || 0);
    const safeAmount = Number.isFinite(commissionAmount) ? Math.max(0, Math.round(commissionAmount)) : 0;

    const affiliateRef = db.collection("affiliates").doc(affiliateCode);
    const affiliateSnap = await trx.get(affiliateRef);
    if (!affiliateSnap.exists) {
      throw new HttpsError("not-found", "Profil affiliate tidak ditemukan.");
    }

    trx.update(commissionRef, {
      status: "PAID",
      paidByUid: operatorUid,
      paidByEmail: operatorEmail,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidNote: note || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    trx.update(affiliateRef, {
      "stats.approvedCommission": admin.firestore.FieldValue.increment(-safeAmount),
      "stats.paidCommission": admin.firestore.FieldValue.increment(safeAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const txId = String(commissionData.transactionId || "").trim();
    if (txId) {
      const txRef = db.collection("transactions").doc(txId);
      trx.update(txRef, {
        affiliateCommissionStatus: "PAID",
        affiliateCommissionPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        affiliateCommissionPaidBy: operatorEmail,
      });
    }

    return {
      success: true,
      commissionId,
      status: "PAID",
    };
  });

  return result;
});

export const getAffiliateProgramConfigPublic = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async () => {
  const db = getDb();
  const programConfig = await getAffiliateProgramConfig(db);
  return {
    success: true,
    programConfig,
  };
});

export const adminUpdateAffiliateProgramConfig = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const operatorUid = request.auth.uid;
  const operatorEmail = String(request.auth.token.email || "");
  const allowed = await isAdminOperator(operatorUid, operatorEmail);
  if (!allowed) {
    throw new HttpsError("permission-denied", "Hanya admin yang dapat mengubah konfigurasi affiliate.");
  }

  const rawRate = Number(request.data?.defaultCommissionRate);
  const commissionInfoText = String(request.data?.commissionInfoText || "").trim().slice(0, 400);
  const applyToExistingAffiliates = request.data?.applyToExistingAffiliates === true;

  if (!Number.isFinite(rawRate)) {
    throw new HttpsError("invalid-argument", "defaultCommissionRate wajib berupa angka.");
  }

  const nextRate = clampRate(rawRate);
  if (nextRate <= 0) {
    throw new HttpsError("invalid-argument", "defaultCommissionRate harus lebih dari 0.");
  }

  const db = getDb();
  const configRef = db.collection("app_config").doc(AFFILIATE_PROGRAM_CONFIG_DOC);

  await configRef.set({
    defaultCommissionRate: nextRate,
    commissionInfoText: commissionInfoText || "Komisi affiliate dihitung dari transaksi yang berhasil dibayar sesuai ketentuan Omnifit.",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUid: operatorUid,
    updatedByEmail: operatorEmail,
  }, { merge: true });

  let updatedAffiliates = 0;
  if (applyToExistingAffiliates) {
    const affiliatesSnap = await db.collection("affiliates").limit(500).get();
    const batch = db.batch();

    affiliatesSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        commissionRate: nextRate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatedAffiliates += 1;
    });

    if (updatedAffiliates > 0) {
      await batch.commit();
    }
  }

  return {
    success: true,
    programConfig: {
      defaultCommissionRate: nextRate,
      commissionInfoText: commissionInfoText || "Komisi affiliate dihitung dari transaksi yang berhasil dibayar sesuai ketentuan Omnifit.",
    },
    updatedAffiliates,
  };
});
