// functions/src/paymentService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

const xenditSecretKey = defineSecret("XENDIT_SECRET_KEY");
const metaPixelId = defineSecret("META_PIXEL_ID");
const metaAccessToken = defineSecret("META_ACCESS_TOKEN");

// ============================================================================
// HELPER META CONVERSIONS API (CAPI)
// ============================================================================

// Helper hashing SHA-256 wajib dari Meta untuk privasi data pengguna
const hashData = (data: string) => {
  if (!data) return "";
  return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
};

// Fungsi CAPI untuk mengirim event ke Meta
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
        event_time: Math.floor(Date.now() / 1000), // Waktu saat ini dalam detik Unix
        event_id: transactionId, // ID unik untuk deduplikasi antara frontend (jika ada) dan backend
        action_source: "website",
        user_data: {
          em: [hashData(userEmail)], // Email di-hash menggunakan SHA-256
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
// FUNGSI 1: MEMBUAT INVOICE XENDIT (DIPANGGIL DARI FRONTEND)
// ============================================================================
export const createPaymentInvoice = onCall(
  {
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [xenditSecretKey, metaPixelId, metaAccessToken], // Menambahkan secrets Meta
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
      // Encode API Key untuk Basic Auth Xendit (Format: "SecretKey:")
      const base64Key = Buffer.from(`${xenditSecretKey.value()}:`).toString('base64');

      // Panggil Xendit API menggunakan Native Fetch
      const response = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${base64Key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: transactionId,
          amount: finalPrice,
          payer_email: userEmail,
          description: `Akses Modul Asesmen: ${packageName}`,
          // TODO: Ubah URL ini ke domain production Anda nantinya
          success_redirect_url: `https://omnifit.cloud/dashboard`,
          failure_redirect_url: `https://omnifit.cloud/pricing`,
          currency: "IDR"
        })
      });

      const invoice = await response.json();

      if (!response.ok) {
        console.error("Xendit Error:", invoice);
        throw new Error(invoice.message || "Gagal menghubungi gateway pembayaran.");
      }

      // Simpan log transaksi dengan status PENDING
      await txRef.set({
        transactionId: transactionId,
        userId: request.auth.uid,
        userEmail: userEmail,
        userName: userName,
        packageId: packageId,
        packageName: packageName,
        amount: finalPrice,
        status: "PENDING",
        invoiceUrl: invoice.invoice_url,
        xenditInvoiceId: invoice.id,
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

      return { checkoutUrl: invoice.invoice_url };
    } catch (error: any) {
      console.error("Payment Error:", error);
      throw new HttpsError("internal", error.message || "Gagal membuat invoice pembayaran.");
    }
  }
);

// ============================================================================
// FUNGSI 2: WEBHOOK XENDIT (OTOMATISASI SAAT PEMBAYARAN BERHASIL)
// ============================================================================
export const xenditWebhook = onRequest(
  {
    region: "asia-southeast2",
    cors: true,
    secrets: [metaPixelId, metaAccessToken], // Menambahkan secrets Meta
  },
  async (req, res) => {
    // Xendit mengirim POST request
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const data = req.body;
    
    // Pastikan ini notifikasi invoice yang valid
    if (!data.external_id || !data.status) {
      res.status(400).send('Bad Request');
      return;
    }

    try {
      const db = getFirestore(admin.app(), "curation");
      const transactionId = data.external_id;

      // Hanya proses jika statusnya PAID atau SETTLED
      if (data.status === 'PAID' || data.status === 'SETTLED') {
        const txRef = db.collection("transactions").doc(transactionId);
        const txSnap = await txRef.get();

        if (txSnap.exists) {
          const txData = txSnap.data();

          // Cegah double-processing
          if (txData?.status !== 'PAID') {
            // 1. PINDAHKAN PEMBUATAN KODE KE SINI AGAR BISA DIBACA OLEH KODE DI BAWAHNYA
            const tokenCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 2. UPDATE TRANSAKSI DENGAN TOKEN TERSEBUT
            await txRef.update({
              status: "PAID",
              paidAt: FieldValue.serverTimestamp(),
              paymentMethod: data.payment_method || 'UNKNOWN',
              paymentChannel: data.payment_channel || 'UNKNOWN',
              tokenCode: `B2C-${tokenCode}` // Garis merah pasti hilang sekarang
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

            // =========================================================
            // AUTO-PROVISIONING: Generate Token B2C secara otomatis
            // =========================================================
            if (txData?.packageId) {
              const b2cRef = db.collection("corporate_tokens").doc("B2C");
              
              await b2cRef.set({
                corporateName: "Penjualan B2C (Mandiri)",
                modelType: "flash", 
                totalTokens: FieldValue.increment(1),
                tokens: {
                  [tokenCode]: {
                    isUsed: false,
                    usedAt: null,
                    usedByNamaUsaha: null,
                    allowedTemplates: [txData.packageId],
                    buyerEmail: txData.userEmail, // Simpan histori pembeli
                    transactionId: transactionId
                  }
                }
              }, { merge: true });
              console.log(`[XENDIT WEBHOOK] Transaksi ${transactionId} sukses. Token B2C-${tokenCode} digenerate untuk ${txData.userEmail}`);
            }
          }
        }
      }

      // WAJIB merespon 200 OK agar Xendit berhenti melakukan retry pengiriman webhook
      res.status(200).send({ status: "success", message: "Webhook processed" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);