// functions/src/agents/promo/imageRendererAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";

// Menggunakan kunci rahasia yang sama dengan yang dipakai copywriterAgent
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generatePromoImage = onCall({
  memory: "1GiB",
  timeoutSeconds: 300,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
  
  const { imagePrompt } = request.data;
  
  if (!imagePrompt) throw new HttpsError("invalid-argument", "Image Prompt wajib disertakan.");
  
  try {
    const API_KEY = geminiApiKeySecret.value();
    
    // PERBAIKAN 1: Model menggunakan versi -002 dan metode dikembalikan ke :predict
    const aiStudioEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`;
    
    const response = await fetch(aiStudioEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY // Meletakkan API key di header lebih direkomendasikan
      },
      // PERBAIKAN 2: Menggunakan format asli Anda yang terbukti benar
      body: JSON.stringify({
        instances: [
          { prompt: imagePrompt }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1" // Bisa diganti "16:9" atau "9:16" sesuai platform jika mau
        }
      })
    });

    // PERBAIKAN 3: Safety Check untuk mencegah error "Unexpected end of JSON input"
    // Jika Google merespon dengan Error 400/500, kita tangkap teks aslinya sebelum crash
    if (!response.ok) {
       const errorText = await response.text();
       console.error("Google AI Studio Response:", errorText);
       throw new Error(`Koneksi ditolak oleh Google (Status: ${response.status})`);
    }

    const data = await response.json();

    if (data.error) {
       throw new Error(`Google AI Studio Error: ${data.error.message}`);
    }

    // Ekstraksi data menggunakan skema balasan dari :predict
    if (!data.predictions || !data.predictions[0]) {
      throw new Error("Gambar gagal dirender. Respon data kosong.");
    }

    const base64Image = data.predictions[0].bytesBase64Encoded;
    const buffer = Buffer.from(base64Image, 'base64');

    // Simpan ke Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `promo_assets/promo_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: { contentType: "image/png" }
    });
    
    // Buat URL Publik
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    return {
      success: true,
      imageUrl: publicUrl
    };
  } catch (error: any) {
    console.error("Image Renderer Agent Error:", error);
    throw new HttpsError("internal", error.message || "Gagal merender gambar via AI Studio.");
  }
});