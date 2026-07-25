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
// FUNGSI 1: MEMBUAT TRANSAKSI MAYAR & GENERATE QRIS
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
      // Panggil API Mayar untuk Generate QRIS
      // Catatan: Pastikan endpoint ini sesuai dengan dokumentasi Mayar API v1 untuk create QRIS
      const response = await fetch("https://api.mayar.id/v1/payment/qris/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mayarApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalPrice,
          customer_name: userName || "Pengguna",
          customer_email: userEmail,
          description: `Akses Modul Asesmen: ${packageName}`,
          reference_id: transactionId, 
        })
      });

      const mayarData = await response.json();

      if (!response.ok) {
        console.error("Mayar Error:", mayarData);
        throw new Error(mayarData.message || "Gagal menghasilkan QRIS dari gateway.");
      }

      // Simpan log transaksi ke Firestore dengan status PENDING beserta data QRIS
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
        qrisString: mayarData.data?.qris_string || mayarData.qris_string, // Sesuaikan struktur response Mayar
        createdAt: FieldValue.serverTimestamp(),
      });

      // [MARKETING EVENT] Kirim event InitiateCheckout ke Meta
      await sendMetaConversionEvent(
        metaPixelId.value(),
        metaAccessToken.value(),
        "InitiateCheckout",
        userEmail,
        finalPrice,
        transactionId
      );

      // Kembalikan ID Transaksi agar frontend bisa mengarahkan ke halaman internal
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
    
    // Sesuaikan parameter id referensi berdasarkan payload webhook Mayar
    const transactionId = data.reference_id; 

    if (!transactionId || !data.status) {
      res.status(400).send('Bad Request');
      return;
    }

    try {
      const db = getFirestore(admin.app(), "curation");
      
      // Mayar biasanya mengirim status "SUCCESS" atau "PAID"
      if (data.status === 'SUCCESS' || data.status === 'SETTLED' || data.status === 'PAID') {
        const txRef = db.collection("transactions").doc(transactionId);
        const txSnap = await txRef.get();

        if (txSnap.exists) {
          const txData = txSnap.data();

          if (txData?.status !== 'PAID') {
            const tokenCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            await txRef.update({
              status: "PAID",
              paidAt: FieldValue.serverTimestamp(),
              paymentMethod: "QRIS",
              paymentChannel: "MAYAR",
              tokenCode: `B2C-${tokenCode}`
            });

            // [MARKETING EVENT] Kirim event Purchase ke Meta
            await sendMetaConversionEvent(
              metaPixelId.value(),
              metaAccessToken.value(),
              "Purchase",
              txData?.userEmail || "unknown@domain.com",
              txData?.amount || data.amount,
              transactionId
            );

            // AUTO-PROVISIONING Token B2C
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

      res.status(200).send({ status: "success", message: "Webhook processed" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);