// functions/src/paymentService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

const mayarApiKey = defineSecret("MAYAR_API_KEY");
const mayarWebhookSecret = defineSecret("MAYAR_WEBHOOK_SECRET");
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
    secrets: [metaPixelId, metaAccessToken, mayarWebhookSecret],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // --- Webhook Signature Verification (HMAC) ---
    const secret = mayarWebhookSecret.value();
    if (secret) {
      const signatureHeader = req.headers['x-mayar-signature'] || req.headers['x-webhook-signature'];
      if (!signatureHeader) {
        console.warn("⚠️ [WEBHOOK] Missing signature header. Proceeding without validation for now (Set strict mode later).");
      } else {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(req.rawBody).digest('hex');
        if (signatureHeader !== digest) {
          console.error("❌ [WEBHOOK] Invalid signature detected.");
          res.status(401).send('Unauthorized');
          return;
        }
      }
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

    
    if (!txDocRef || !txData) {
      res.status(400).send('Transaction Not Found');
      return;
    }

    const currentStatus = String(mayarTx.status || "").toUpperCase();
    const transactionStatus = String(mayarTx.transactionStatus || "").toUpperCase();
    const eventType = String(payload.event || "").toLowerCase();

    const isPaymentSuccess =
      ['SUCCESS', 'SETTLED', 'PAID', 'COMPLETED'].includes(currentStatus) ||
      ['PAID', 'SETTLED', 'SUCCESS'].includes(transactionStatus);

    // PENAMBALAN BUG KRITIS: Pastikan eventType mencerminkan keberhasilan pembayaran (bukan sekadar pembuatan link)
    // Jika Mayar tidak mengirim eventType, kita fallback ke isPaymentSuccess
    const isSuccessEvent = !eventType || eventType.includes('success') || eventType.includes('paid') || eventType.includes('settled') || eventType.includes('completed');

    if (!isPaymentSuccess || !isSuccessEvent) {
      // Bukan event sukses, log dan abaikan tanpa error
      console.log(`[WEBHOOK] Event diabaikan. Status: ${currentStatus} / ${transactionStatus} | Event: ${eventType}`);
      res.status(200).send({ status: "ignored", message: "Non-payment event received" });
      return;
    }

    try {
      // =========================================================
      // ATOMIC TRANSACTION: Seluruh proses grant kuota harus atomic
      // =========================================================
      await db.runTransaction(async (trx) => {
        // Baca ulang dokumen transaksi di dalam transaction (bukan pakai txData lama)
        const freshTxSnap = await trx.get(txDocRef!);
        if (!freshTxSnap.exists) {
          throw new Error("Transaction document disappeared during processing");
        }

        const freshTxData = freshTxSnap.data()!;

        // ✅ IDEMPOTENCY GUARD #1: Cek apakah sudah PAID sebelumnya
        if (freshTxData.status === 'PAID') {
          console.log(`[WEBHOOK] Transaksi ${txDocRef!.id} sudah PAID sebelumnya. Webhook duplikat diabaikan.`);
          return; // Hentikan transaksi - tidak perlu grant kuota lagi
        }

        // ✅ IDEMPOTENCY GUARD #2: Cek flag quotaGranted
        if (freshTxData.quotaGranted === true) {
          console.log(`[WEBHOOK] quotaGranted=true sudah terset. Webhook duplikat diabaikan.`);
          return; // Hentikan transaksi - kuota sudah pernah diberikan
        }

        // ✅ SECURITY GUARD: Pastikan transaksi punya userId yang valid
        if (!freshTxData.userId) {
          console.error(`[WEBHOOK] Transaksi ${txDocRef!.id} tidak memiliki userId. Tidak dapat grant kuota.`);
          // Tetap update status PAID agar tidak diproses ulang, tapi tidak grant kuota
          trx.update(txDocRef!, {
            status: "PAID",
            paidAt: FieldValue.serverTimestamp(),
            paymentMethod: mayarTx.paymentMethod || mayarTx.payment_method || "GATEWAY",
            paymentChannel: "MAYAR",
            quotaGranted: false,
            quotaGrantError: "MISSING_USER_ID",
          });
          return;
        }

        const rawToken = Math.random().toString(36).substring(2, 8).toUpperCase();
        const finalTokenCode = `B2C-${rawToken}`;

        // Update status PAID + set quotaGranted = true secara ATOMIC
        trx.update(txDocRef!, {
          status: "PAID",
          paidAt: FieldValue.serverTimestamp(),
          paymentMethod: mayarTx.paymentMethod || mayarTx.payment_method || "GATEWAY",
          paymentChannel: "MAYAR",
          tokenCode: finalTokenCode,
          quotaGranted: true,          // ✅ Flag idempotency - mencegah double-grant
          quotaGrantedAt: FieldValue.serverTimestamp(),
        });

        // Grant kuota atau token berdasarkan packageId
        if (freshTxData.packageId === 'BUNDLE_3' || freshTxData.packageId === 'BUNDLE_5') {
          const addedQuota = freshTxData.packageId === 'BUNDLE_3' ? 3 : 5;
          const userRef = db.collection("users").doc(freshTxData.userId);
          // Increment kuota DALAM transaksi yang sama
          trx.set(userRef, {
            assessmentQuota: FieldValue.increment(addedQuota)
          }, { merge: true });

          console.log(`[WEBHOOK] ✅ Bundle quota ${addedQuota} diberikan ke user ${freshTxData.userId} untuk TX ${txDocRef!.id}`);

        } else if (freshTxData.packageId === 'PREMIUM_CONSULTATION' && freshTxData.assessmentId) {
          const assessmentRef = db.collection("assessments").doc(freshTxData.assessmentId);
          trx.update(assessmentRef, {
            hasPaidForPremiumConsultation: true
          });

        } else if (
          freshTxData.packageId === 'CRYPTO_PREMIUM_MONTHLY' || 
          freshTxData.packageId === 'CRYPTO_PREMIUM_QUARTERLY' || 
          freshTxData.packageId === 'CRYPTO_PREMIUM_YEARLY'
        ) {
          // Tentukan durasi berdasarkan packageId
          let daysToAdd = 30; // Default 1 Bulan
          if (freshTxData.packageId === 'CRYPTO_PREMIUM_QUARTERLY') daysToAdd = 90;
          if (freshTxData.packageId === 'CRYPTO_PREMIUM_YEARLY') daysToAdd = 365;

          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + daysToAdd);
          
          const userRef = db.collection("users").doc(freshTxData.userId);
          trx.set(userRef, {
            isPremium: true,
            premiumValidUntil: validUntil.toISOString(),
            isTrial: false
          }, { merge: true });

          console.log(`[WEBHOOK] ✅ Akses Premium diberikan ke user ${freshTxData.userId} hingga ${validUntil.toISOString()} (${daysToAdd} hari)`);
          
        } else if (freshTxData.packageId) {
          // Paket modul individual — grant token B2C
          const b2cRef = db.collection("corporate_tokens").doc("B2C");
          const b2cTokenRef = b2cRef.collection("tokens").doc(finalTokenCode);
          
          trx.set(b2cRef, {
            corporateName: "Penjualan B2C (Mandiri)",
            modelType: "flash",
            totalTokens: FieldValue.increment(1),
            createdAt: new Date().toISOString()
          }, { merge: true });

          trx.set(b2cTokenRef, {
            isUsed: false,
            usedAt: null,
            usedByNamaUsaha: null,
            allowedTemplates: [freshTxData.packageId],
            buyerEmail: freshTxData.userEmail,
            transactionId: freshTxData.transactionId
          }, { merge: true });
        }
      });

      // Kirim event Meta CAPI setelah transaksi selesai (di luar Firestore Transaction)
      await sendMetaConversionEvent(metaPixelId.value(), metaAccessToken.value(), "Purchase", txData.userEmail, txData.amount, txData.transactionId);

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

        const b2cTokenRef = b2cRef.collection("tokens").doc(finalTokenCode);

        transaction.set(b2cRef, {
          corporateName: "Penjualan B2C (Mandiri)",
          modelType: "flash", 
          totalTokens: FieldValue.increment(1)
        }, { merge: true });

        transaction.set(b2cTokenRef, {
          isUsed: false,
          usedAt: null,
          usedByNamaUsaha: null,
          allowedTemplates: [packageId],
          buyerEmail: request.auth?.token?.email || "",
          transactionId: `QUOTA-REDEEM-${Date.now()}`
        }, { merge: true });

        return { tokenCode: finalTokenCode };
      });
    } catch (error: any) {
      console.error("Redeem Error:", error);
      throw new HttpsError("internal", error.message || "Gagal melakukan redeem kuota.");
    }
  }
);

// ============================================================================
// FUNGSI 5: CHECK TOKEN VALIDITY
// ============================================================================
export const checkTokenValidity = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    
    const { tokenCode } = request.data;
    if (!tokenCode || typeof tokenCode !== 'string') {
      return { isValid: false, reason: "Token kosong atau tidak valid." };
    }

    // Bypass check for internal free testing token (if any)
    if (tokenCode.startsWith("FREE-") || tokenCode.startsWith("TRIAL-")) {
      return { isValid: true };
    }

    if (!tokenCode.includes('-')) {
      return { isValid: false, reason: "Format token tidak valid." };
    }

    const db = getFirestore(admin.app(), "curation");
    const lastDashIndex = tokenCode.lastIndexOf('-');
    const corpId = tokenCode.substring(0, lastDashIndex).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const specificTokenCode = tokenCode.substring(lastDashIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    try {
      const corpRef = db.collection('corporate_tokens').doc(corpId);
      const corpDoc = await corpRef.get();

      if (!corpDoc.exists) {
        return { isValid: false, reason: "Entitas korporat tidak ditemukan." };
      }

      const corpData = corpDoc.data();
      
      // Backward compatibility: Cek document utama dulu
      let tData = (corpData?.tokens || {})[specificTokenCode];

      // Jika tidak ada di document utama, cek di subcollection
      if (!tData) {
        const tokenRef = corpRef.collection('tokens').doc(specificTokenCode);
        const tokenDoc = await tokenRef.get();
        if (tokenDoc.exists) {
          tData = tokenDoc.data();
        }
      }

      if (!tData) {
        return { isValid: false, reason: "Token tidak ditemukan." };
      }

      if (tData.isUsed) {
        return { isValid: false, reason: "Token telah digunakan." };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error("checkTokenValidity Error:", error);
      throw new HttpsError("internal", "Gagal memvalidasi token.");
    }
  }
);