// functions/src/paymentService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

// Secret untuk Mayar & Meta
const mayarApiKey = defineSecret("MAYAR_API_KEY");
const metaPixelId = defineSecret("META_PIXEL_ID");
const metaAccessToken = defineSecret("META_ACCESS_TOKEN");

// ============================================================================
// HELPER META CONVERSIONS API (CAPI)
// ============================================================================
const hashData = (data: string) => {
  if (!data) return "";
  return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
};

const sendMetaConversionEvent = async (
  pixelId: string,
  accessToken: string,
  eventName: string,
  userEmail: string,
  amount: number,
  transactionId: string
) => {
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: transactionId,
        action_source: "website",
        user_data: {
          em: [hashData(userEmail)],
        },
        custom_data: {
          currency: "IDR",
          value: amount,
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json();
    if (!response.ok) {
      console.error(`[META CAPI] Error for ${eventName}:`, result);
    } else {
      console.log(`[META CAPI] Event ${eventName} berhasil dikirim untuk ${userEmail}`);
    }
  } catch (error) {
    console.error(`[META CAPI] Gagal mengirim HTTP request untuk ${eventName}:`, error);
  }
};

// ============================================================================
// FUNGSI 1: MEMBUAT TRANSAKSI MAYAR (SINGLE PAYMENT LINK)
// ============================================================================
export const createPaymentInvoice = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [mayarApiKey, metaPixelId, metaAccessToken],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak. Silakan login.");
    const { packageId, packageName, finalPrice, userEmail, userName } = request.data;
    
    if (!packageId || !finalPrice || !userEmail) {
      throw new HttpsError("invalid-argument", "Data checkout tidak lengkap.");
    }
    
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
          // PERBAIKAN 1: Sisipkan transactionId kita ke Mayar agar dikembalikan via Webhook
          reference_id: transactionId, 
          referenceId: transactionId 
        })
      });
      
      const mayarData = await response.json();
      
      if (!response.ok || mayarData.statusCode !== 200) {
        console.error("Mayar Error:", mayarData);
        throw new Error(mayarData.messages || mayarData.message || "Gagal menghasilkan invoice dari gateway.");
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
        paymentLink: mayarData.data?.link || null,
        createdAt: FieldValue.serverTimestamp(),
      });
      
      await sendMetaConversionEvent(
        metaPixelId.value(),
        metaAccessToken.value(),
        "InitiateCheckout",
        userEmail,
        finalPrice,
        transactionId
      );
      
      return { transactionId: transactionId };
    } catch (error: any) {
      console.error("Payment Error:", error);
      throw new HttpsError("internal", error.message || "Gagal membuat invoice pembayaran.");
    }
  }
);

// ============================================================================
// FUNGSI 2: WEBHOOK MAYAR (OTOMATISASI SAAT PEMBAYARAN BERHASIL)
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
    
    const data = req.body;
    const db = getFirestore(admin.app(), "curation");

    // PERBAIKAN 2: Prioritaskan mencari reference_id yang kita sisipkan sebelumnya
    let transactionId = data.reference_id || data.referenceId || data.custom_field; 

    // PERBAIKAN 3: Jika reference_id kosong (transaksi lama), gunakan link_id dari payload Mayar
    // (Karena mayarTransactionId di Firestore Anda menyimpan ID Product/Link, bukan ID Transaksi)
    if (!transactionId) {
      const linkIdFromMayar = data.link_id || data.payment_link_id; 
      
      if (linkIdFromMayar) {
        const txQuery = await db.collection("transactions").where("mayarTransactionId", "==", linkIdFromMayar).limit(1).get();
        if (!txQuery.empty) {
          transactionId = txQuery.docs[0].id;
        }
      }
    }
    
    if (!transactionId) {
      console.error("Webhook Error: Tidak dapat memetakan data Mayar ke Firestore", data);
      res.status(400).send('Bad Request: Missing Transaction Mapping ID');
      return;
    }

    // PERBAIKAN 4: Atasi masalah Huruf Besar/Kecil (Case Sensitivity) pada Status
    const currentStatus = String(data.status || "").toUpperCase();

    try {
      if (['SUCCESS', 'SETTLED', 'PAID', 'COMPLETED'].includes(currentStatus)) {
        const txRef = db.collection("transactions").doc(transactionId);
        const txSnap = await txRef.get();
        
        if (txSnap.exists) {
          const txData = txSnap.data();
          
          if (txData?.status !== 'PAID') {
            const tokenCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            await txRef.update({
              status: "PAID",
              paidAt: FieldValue.serverTimestamp(),
              paymentMethod: data.payment_method || "GATEWAY",
              paymentChannel: "MAYAR",
              tokenCode: `B2C-${tokenCode}`
            });
            
            await sendMetaConversionEvent(
              metaPixelId.value(),
              metaAccessToken.value(),
              "Purchase",
              txData?.userEmail || "unknown@domain.com",
              txData?.amount || data.amount,
              transactionId
            );
            
            if (txData?.packageId) {
              const b2cRef = db.collection("corporate_tokens").doc("B2C");
              
              await b2cRef.set({
                corporateName: "Penjualan B2C (Mandiri)",
                modelType: "flash", 
                totalTokens: FieldValue.increment(1),
                createdAt: new Date().toISOString(), 
                tokens: {
                  [tokenCode]: {
                    isUsed: false,
                    usedAt: null,
                    usedByNamaUsaha: null,
                    allowedTemplates: [txData.packageId],
                    buyerEmail: txData.userEmail,
                    transactionId: transactionId
                  }
                }
              }, { merge: true });
            }
          }
        }
      }
      
      res.status(200).send({ status: "success", message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Webhook Execution Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);