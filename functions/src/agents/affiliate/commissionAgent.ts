import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const clampRate = (value: number): number => {
  if (!Number.isFinite(value)) return 0.1;
  return Math.max(0, Math.min(1, value));
};

const toAmount = (value: unknown): number => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
};

export const affiliateCommissionAgent = onDocumentUpdated({
  database: "curation",
  document: "transactions/{transactionId}",
  region: "asia-southeast2",
  memory: "256MiB",
  timeoutSeconds: 120,
}, async (event) => {
  const beforeData = event.data?.before.data() || {};
  const afterData = event.data?.after.data() || {};

  const beforeStatus = String(beforeData.status || "").toUpperCase();
  const afterStatus = String(afterData.status || "").toUpperCase();

  if (afterStatus !== "PAID") return null;
  if (beforeStatus === "PAID") return null;

  const affiliateCode = String(afterData.affiliateCode || "").trim().toUpperCase();
  if (!affiliateCode) return null;

  const db = getFirestore(admin.app(), "curation");
  const transactionId = event.params.transactionId;
  const txRef = event.data!.after.ref;
  const affiliateRef = db.collection("affiliates").doc(affiliateCode);
  const commissionRef = db.collection("affiliate_commissions").doc(transactionId);

  try {
    await db.runTransaction(async (trx) => {
      const [affiliateSnap, commissionSnap, freshTxSnap] = await Promise.all([
        trx.get(affiliateRef),
        trx.get(commissionRef),
        trx.get(txRef),
      ]);

      if (!affiliateSnap.exists) {
        trx.update(txRef, {
          affiliateCommissionStatus: "SKIPPED",
          affiliateCommissionReason: "AFFILIATE_NOT_FOUND",
          affiliateProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      if (commissionSnap.exists) {
        trx.update(txRef, {
          affiliateCommissionStatus: "LOCKED",
          affiliateCommissionId: commissionSnap.id,
          affiliateProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const txData = freshTxSnap.data() || {};
      const affiliateData = affiliateSnap.data() || {};

      if (String(affiliateData.status || "ACTIVE").toUpperCase() !== "ACTIVE") {
        trx.update(txRef, {
          affiliateCommissionStatus: "SKIPPED",
          affiliateCommissionReason: "AFFILIATE_INACTIVE",
          affiliateProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const amount = toAmount(txData.amount);
      if (amount <= 0) {
        trx.update(txRef, {
          affiliateCommissionStatus: "SKIPPED",
          affiliateCommissionReason: "INVALID_AMOUNT",
          affiliateProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const rateFromTx = Number(txData.affiliateRateSnapshot);
      const rateFromAffiliate = Number(affiliateData.commissionRate);
      const commissionRate = clampRate(Number.isFinite(rateFromTx) ? rateFromTx : rateFromAffiliate);
      const commissionAmount = Math.round(amount * commissionRate);

      trx.set(commissionRef, {
        transactionId,
        affiliateCode,
        affiliateOwnerUid: affiliateData.ownerUid || txData.affiliateOwnerUid || "",
        customerUid: txData.userId || "",
        customerEmail: txData.userEmail || "",
        packageId: txData.packageId || "",
        packageName: txData.packageName || "",
        transactionAmount: amount,
        commissionRate,
        commissionAmount,
        status: "PENDING_APPROVAL",
        paymentStatus: afterStatus,
        source: "transactions",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      trx.update(affiliateRef, {
        "stats.totalReferrals": admin.firestore.FieldValue.increment(1),
        "stats.referredRevenue": admin.firestore.FieldValue.increment(amount),
        "stats.pendingCommission": admin.firestore.FieldValue.increment(commissionAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastConversionAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      trx.update(txRef, {
        affiliateCommissionStatus: "LOCKED",
        affiliateCommissionId: transactionId,
        affiliateCommissionAmount: commissionAmount,
        affiliateCommissionRate: commissionRate,
        affiliateProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (error: any) {
    await txRef.update({
      affiliateCommissionStatus: "FAILED",
      affiliateCommissionError: error.message || "Unknown error",
      affiliateProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return null;
});
