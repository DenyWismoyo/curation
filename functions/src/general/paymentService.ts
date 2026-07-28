// functions/src/paymentService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

const mayarApiKey = defineSecret("MAYAR_API_KEY");
const metaPixelId = defineSecret("META_PIXEL_ID");
const metaAccessToken = defineSecret("META_ACCESS_TOKEN");

type AttributionModel = "first_click_30d" | "last_click_30d";
const DEFAULT_ATTRIBUTION_MODEL: AttributionModel = "last_click_30d";

const sanitizeAffiliateCode = (value: string): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

const sanitizeVisitorId = (value: string): string =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");

const normalizeAttributionModel = (value: unknown): AttributionModel => {
  const model = String(value || "").toLowerCase();
  if (model === "first_click_30d") return "first_click_30d";
  return "last_click_30d";
};

// ============================================================================
// HELPER META CAPI
// ============================================================================
const hashData = (data: string) => {
  if (!data) return "";
  return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
};

const sendMetaConversionEvent = async (pixelId: string, accessToken: string, eventName: string, userEmail: string, amount: number, transactionId: string) => {
  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: transactionId,
      action_source: "website",
      user_data: { em: [hashData(userEmail)] },
      custom_data: { currency: "IDR", value: amount },
    }],
  };
  try {
    await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`[META CAPI] Gagal mengirim:`, error);
  }
};

// ============================================================================
// FUNGSI 1: MEMBUAT LINK PEMBAYARAN (SINGLE PAYMENT)
// ============================================================================
export const createPaymentInvoice = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [mayarApiKey, metaPixelId, metaAccessToken],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const {
      packageId,
      packageName,
      finalPrice,
      userEmail,
      userName,
      affiliateCode,
      attributionVisitorId,
      attributionModel,
      assessmentId,
    } = request.data;
    
    const db = getFirestore(admin.app(), "curation");
    const txRef = db.collection("transactions").doc();
    const transactionId = txRef.id;

    try {
      const response = await fetch("https://api.mayar.id/hl/v1/payment/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mayarApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userName || "Pengguna",
          email: userEmail,
          amount: finalPrice,
          mobile: "089900000000",
          description: `Akses Modul Asesmen: ${packageName}`,
          redirectUrl: `https://omnifit.cloud/checkout/${transactionId}`,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          customField: transactionId,
          custom_field: transactionId,
          reference_id: transactionId, 
          referenceId: transactionId 
        })
      });
      
      const mayarData = await response.json();
      if (!response.ok || mayarData.statusCode !== 200) throw new Error(mayarData.message || "Gagal membuat invoice");

      let finalPaymentLink = mayarData.data?.link || null;
      if (finalPaymentLink) {
        finalPaymentLink = finalPaymentLink.replace("deny-wismoyo.myr.id", "omnifit.myr.id");
      }
      
      const normalizedAffiliateCode = sanitizeAffiliateCode(String(affiliateCode || ""));
      const normalizedVisitorId = sanitizeVisitorId(String(attributionVisitorId || ""));
      const normalizedAttributionModel = normalizeAttributionModel(attributionModel || DEFAULT_ATTRIBUTION_MODEL);

      let resolvedAffiliateCode = normalizedAffiliateCode;
      let attributionSource = normalizedAffiliateCode ? "request_payload" : "none";

      if (normalizedVisitorId && normalizedVisitorId.length >= 12) {
        const traceRef = db.collection("referral_attributions").doc(normalizedVisitorId);
        const traceSnap = await traceRef.get();

        if (traceSnap.exists) {
          const traceData = traceSnap.data() || {};
          const traceBoundUid = String(traceData.boundUserUid || "");
          const traceExpiry = Number(traceData.expiresAtMs || 0);
          const traceModel = normalizeAttributionModel(traceData.attributionModel || normalizedAttributionModel);

          const isBoundValid = !traceBoundUid || traceBoundUid === request.auth.uid;
          const isTraceAlive = Number.isFinite(traceExpiry) && traceExpiry > Date.now();

          if (isBoundValid && isTraceAlive) {
            const codeFromFirst = sanitizeAffiliateCode(String(traceData?.firstClick?.affiliateCode || ""));
            const codeFromLast = sanitizeAffiliateCode(String(traceData?.lastClick?.affiliateCode || ""));

            const selectedCode = traceModel === "first_click_30d" ? codeFromFirst : codeFromLast;
            if (selectedCode) {
              resolvedAffiliateCode = selectedCode;
              attributionSource = "referral_trace";
            }
          }
        }
      }

      let affiliatePayload: Record<string, unknown> = {};

      if (resolvedAffiliateCode) {
        const affiliateSnap = await db.collection("affiliates").doc(resolvedAffiliateCode).get();
        if (affiliateSnap.exists) {
          const affiliateData = affiliateSnap.data() || {};
          const isActive = String(affiliateData.status || "ACTIVE").toUpperCase() === "ACTIVE";
          if (isActive && String(affiliateData.ownerUid || "") !== request.auth.uid) {
            affiliatePayload = {
              affiliateCode: resolvedAffiliateCode,
              affiliateOwnerUid: affiliateData.ownerUid || "",
              affiliateRateSnapshot: Number(affiliateData.commissionRate ?? 0.1),
              affiliateAttachedAt: FieldValue.serverTimestamp(),
            };
          }
        }
      }

      await txRef.set({
        transactionId: transactionId,
        userId: request.auth.uid,
        userEmail: userEmail,
        userName: userName,
        packageId: packageId,
        packageName: packageName,
        amount: finalPrice,
        status: "PENDING",
        mayarTransactionId: mayarData.data?.id || null, 
        paymentLink: finalPaymentLink,
        attributionModel: normalizedAttributionModel,
        attributionSource,
        attributionVisitorId: normalizedVisitorId || null,
        assessmentId: assessmentId || null,
        createdAt: FieldValue.serverTimestamp(),
        ...affiliatePayload,
      });

      if (normalizedVisitorId && normalizedVisitorId.length >= 12) {
        await db.collection("referral_attributions").doc(normalizedVisitorId).set({
          lastCheckoutAt: FieldValue.serverTimestamp(),
          lastTransactionId: transactionId,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      
      await sendMetaConversionEvent(metaPixelId.value(), metaAccessToken.value(), "InitiateCheckout", userEmail, finalPrice, transactionId);
      return { transactionId: transactionId };
    } catch (error: any) {
      console.error("Payment Error:", error);
      throw new HttpsError("internal", error.message || "Terjadi kegagalan komunikasi dengan Mayar");
    }
  }
);

// ============================================================================
// FUNGSI 2: GENERATE QRIS DINAMIS DENGAN METADATA
// ============================================================================
export const createDynamicQris = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [mayarApiKey],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { transactionId, amount, userEmail, userName } = request.data;
    
    const db = getFirestore(admin.app(), "curation");
    const txRef = db.collection("transactions").doc(transactionId);

    try {
      const response = await fetch("https://api.mayar.id/hl/v1/qrcode/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mayarApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          reference_id: transactionId,
          referenceId: transactionId,
          customField: transactionId,
          custom_field: transactionId,
          email: userEmail,
          name: userName || "Pengguna"
        })
      });
      
      const mayarData = await response.json();
      if (!response.ok || mayarData.statusCode !== 200) {
        throw new Error(mayarData.message || "Gagal membuat QRIS Dinamis");
      }

      const qrUrl = mayarData.data?.url;
      
      if (qrUrl) {
        await txRef.update({ qrCodeUrl: qrUrl });
      }
      
      return { qrUrl: qrUrl };
    } catch (error: any) {
      console.error("QRIS Error:", error);
      throw new HttpsError("internal", error.message || "Gagal menghubungi Mayar QR API");
    }
  }
);

// ============================================================================
// FUNGSI 3: WEBHOOK "ULTIMATE" (MENANGKAP NOTIFIKASI SUCCESS)
// ============================================================================
export const mayarWebhook = onRequest({
    region: "asia-southeast2",
    cors: true,
    secrets: [metaPixelId, metaAccessToken],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) {}
    }
    
    console.log("📥 [WEBHOOK RADAR] Payload mentah dari Mayar:", JSON.stringify(payload));

    // 1. PENAMBALAN: Bypass event testing agar dashboard Mayar sukses melakukan validasi URL
    if (payload.event === "testing" || payload.event === "ping") {
      res.status(200).send({ status: "success", message: "Webhook connection test successful" });
      return;
    }

    const mayarTx = payload.data ? payload.data : payload;
    const db = getFirestore(admin.app(), "curation");
    
    let txDocRef: admin.firestore.DocumentReference | null = null;
    let txData: any = null;

    // 2. PENAMBALAN: Ekstraksi ID yang ketat (Tolak jika formatnya Array/Object)
    let exactTxId = mayarTx.reference_id || mayarTx.referenceId || payload.reference_id;
    
    // Pastikan customField hanya diambil jika formatnya benar-benar String
    if (!exactTxId && typeof mayarTx.customField === 'string') exactTxId = mayarTx.customField;
    if (!exactTxId && typeof mayarTx.custom_field === 'string') exactTxId = mayarTx.custom_field;

    // STRATEGI 1: Pencocokan Akurat via Reference ID
    if (exactTxId && typeof exactTxId === 'string') {
      try {
        const docSnap = await db.collection("transactions").doc(exactTxId).get();
        if (docSnap.exists) {
          txDocRef = docSnap.ref;
          txData = docSnap.data();
        }
      } catch (e) {
        console.log(`⚠️ [WEBHOOK] Gagal mengambil dokumen by ID: ${exactTxId}`);
      }
    }

    // STRATEGI 2: Pencocokan ID Link Mayar
    if (!txDocRef) {
      const possibleMayarIds = [mayarTx.productId, mayarTx.id, payload.productId, mayarTx.paymentLinkId].filter(Boolean);
      for (const pId of possibleMayarIds) {
        try {
          const q = await db.collection("transactions").where("mayarTransactionId", "==", pId).limit(1).get();
          if (!q.empty) {
            txDocRef = q.docs[0].ref;
            txData = q.docs[0].data();
            break; 
          }
        } catch (e) {}
      }
    }

    // STRATEGI 3: Pencarian via Email
    if (!txDocRef) {
      const emailPelanggan = mayarTx.customerEmail || mayarTx.email || payload.customerEmail;
      if (emailPelanggan) {
        try {
          const fallbackQ = await db.collection("transactions")
            .where("status", "==", "PENDING")
            .where("userEmail", "==", emailPelanggan)
            .get();
          if (!fallbackQ.empty) {
            const docs = fallbackQ.docs.sort((a, b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));
            txDocRef = docs[0].ref;
            txData = docs[0].data();
          }
        } catch (fallbackErr: any) {
          console.error("❌ [WEBHOOK] Fallback query error:", fallbackErr.message);
        }
      }
    }
    
    if (!txDocRef || !txData) {
      res.status(400).send('Transaction Not Found');
      return;
    }

    const currentStatus = String(mayarTx.status || payload.status || "").toUpperCase();
    const transactionStatus = String(mayarTx.transactionStatus || "").toUpperCase();

    try {
      if (
        ['SUCCESS', 'SETTLED', 'PAID', 'COMPLETED'].includes(currentStatus) || 
        ['PAID', 'SETTLED', 'SUCCESS'].includes(transactionStatus)
      ) {
        if (txData.status !== 'PAID') {
          const rawToken = Math.random().toString(36).substring(2, 8).toUpperCase();
          const finalTokenCode = `B2C-${rawToken}`; 
          
          await txDocRef.update({
            status: "PAID",
            paidAt: FieldValue.serverTimestamp(),
            paymentMethod: mayarTx.paymentMethod || mayarTx.payment_method || "GATEWAY",
            paymentChannel: "MAYAR",
            tokenCode: finalTokenCode
          });
          
          await sendMetaConversionEvent(metaPixelId.value(), metaAccessToken.value(), "Purchase", txData.userEmail, txData.amount, txData.transactionId);
          
          if (txData.packageId) {
            if (txData.packageId === 'BUNDLE_3' || txData.packageId === 'BUNDLE_5') {
              const addedQuota = txData.packageId === 'BUNDLE_3' ? 3 : 5;
              if (txData.userId) {
                const userRef = db.collection("users").doc(txData.userId);
                await userRef.set({
                  assessmentQuota: FieldValue.increment(addedQuota)
                }, { merge: true });
              }
            } else if (txData.packageId === 'PREMIUM_CONSULTATION' && txData.assessmentId) {
              const assessmentRef = db.collection("assessments").doc(txData.assessmentId);
              await assessmentRef.update({
                hasPaidForPremiumConsultation: true
              });
            } else {
              const b2cRef = db.collection("corporate_tokens").doc("B2C");
              await b2cRef.set({
                corporateName: "Penjualan B2C (Mandiri)",
                modelType: "flash", 
                totalTokens: FieldValue.increment(1),
                createdAt: new Date().toISOString(), 
                tokens: {
                  [finalTokenCode]: {
                    isUsed: false,
                    usedAt: null,
                    usedByNamaUsaha: null,
                    allowedTemplates: [txData.packageId],
                    buyerEmail: txData.userEmail,
                    transactionId: txData.transactionId
                  }
                }
              }, { merge: true });
            }
          }
        }
      }
      res.status(200).send({ status: "success", message: "Webhook processed" });
    } catch (error) {
      console.error("❌ [WEBHOOK EXECUTION ERROR]:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// ============================================================================
// FUNGSI 4: REDEEM BUNDLE QUOTA (1-CLICK REDEEM)
// ============================================================================
export const redeemAssessmentQuota = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const uid = request.auth.uid;
    const { packageId } = request.data;

    if (!packageId) {
      throw new HttpsError("invalid-argument", "packageId wajib diisi.");
    }

    const db = getFirestore(admin.app(), "curation");
    const userRef = db.collection("users").doc(uid);
    const b2cRef = db.collection("corporate_tokens").doc("B2C");

    try {
      return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        const quota = userDoc.data()?.assessmentQuota || 0;
        if (quota < 1) {
          throw new HttpsError("failed-precondition", "Kuota asesmen tidak mencukupi.");
        }

        const rawToken = Math.random().toString(36).substring(2, 8).toUpperCase();
        const finalTokenCode = `B2C-Q${rawToken}`; 

        transaction.set(userRef, {
          assessmentQuota: FieldValue.increment(-1)
        }, { merge: true });

        transaction.set(b2cRef, {
          corporateName: "Penjualan B2C (Mandiri)",
          modelType: "flash", 
          totalTokens: FieldValue.increment(1),
          tokens: {
            [finalTokenCode]: {
              isUsed: false,
              usedAt: null,
              usedByNamaUsaha: null,
              allowedTemplates: [packageId],
              buyerEmail: request.auth?.token?.email || "",
              transactionId: `QUOTA-REDEEM-${Date.now()}`
            }
          }
        }, { merge: true });

        return { tokenCode: finalTokenCode };
      });
    } catch (error: any) {
      console.error("Redeem Error:", error);
      throw new HttpsError("internal", error.message || "Gagal melakukan redeem kuota.");
    }
  }
);