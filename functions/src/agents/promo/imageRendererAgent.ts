// functions/src/agents/promo/imageRendererAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const generatePromoImage = onCall({
  memory: "1GiB",
  timeoutSeconds: 300,
  region: "asia-southeast2",
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { imagePrompt } = request.data;
  if (!imagePrompt) throw new HttpsError("invalid-argument", "Image Prompt wajib disertakan.");

  // Ambil Project ID otomatis dari Firebase Admin
  const projectId = admin.app().options.projectId || process.env.GCLOUD_PROJECT;
  if (!projectId) throw new HttpsError("internal", "Project ID tidak ditemukan.");

  try {
    const accessToken = await admin.credential.applicationDefault().getAccessToken();
    
    // KUNCI PENTING: Kita paksa lokasi ke us-central1 karena Imagen 3 selalu tersedia di sana
    const imagenEndpoint = "https://us-central1-aiplatform.googleapis.com/v1/projects/teknopark-surakarta/locations/us-central1/publishers/google/models/imagegeneration@006:predict";
    
    const imagenResponse = await fetch(imagenEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1", // Rasio Kotak (1:1), Landscape (16:9), atau Portrait (9:16)
          outputOptions: { mimeType: "image/png" },
          personGeneration: "DONT_ALLOW" // Menghindari error kebijakan Google untuk gambar orang
        }
      })
    });

    const imagenData = await imagenResponse.json();
    
    if (imagenData.error) {
       throw new Error(`Vertex AI Error: ${imagenData.error.message}`);
    }

    if (!imagenData.predictions || !imagenData.predictions[0]) {
      throw new Error("Imagen gagal merender gambar. Data kosong.");
    }

    const base64Image = imagenData.predictions[0].bytesBase64Encoded;
    const buffer = Buffer.from(base64Image, 'base64');

    // Simpan ke Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `promo_assets/promo_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: { contentType: "image/png" }
    });
    
    // Buat URL Publik
    const publicUrl = `[https://firebasestorage.googleapis.com/v0/b/$](https://firebasestorage.googleapis.com/v0/b/$){bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    return {
      success: true,
      imageUrl: publicUrl
    };

  } catch (error: any) {
    console.error("Image Renderer Agent Error:", error);
    throw new HttpsError("internal", error.message || "Gagal merender gambar via Vertex AI.");
  }
});