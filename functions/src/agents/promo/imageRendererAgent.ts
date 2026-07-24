// functions/src/agents/promo/imageRendererAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const renderSingleSlide = onCall({
  memory: "512MiB",
  timeoutSeconds: 120, // 2 menit cukup untuk render 1 gambar
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { slide, trackName } = request.data;
  if (!slide || !slide.imagePrompt) {
    throw new HttpsError("invalid-argument", "Data slide atau prompt tidak valid.");
  }

  try {
    const API_KEY = geminiApiKeySecret.value();
    const bucket = admin.storage().bucket();
    const safeTrackName = trackName ? trackName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'umum';
    
    const aiStudioEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + API_KEY;

    const response = await fetch(aiStudioEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: slide.imagePrompt }]
          }
        ],
        // Menghapus parameter aspectRatio yang ditolak oleh API
        // Rasio gambar akan dikendalikan melalui teks prompt.
        generationConfig: {
          responseModalities: ["IMAGE"] 
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Google AI Studio Error (Slide ${slide.slideNumber}):`, errText);
      throw new Error(`Koneksi ditolak: ${errText}`);
    }
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const candidates = data.candidates;
    if (!candidates || !candidates[0] || !candidates[0].content.parts[0].inlineData) {
      throw new Error("Gambar gagal dirender. Respon kosong.");
    }

    const base64Image = candidates[0].content.parts[0].inlineData.data;
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Simpan ke Firebase Storage
    const fileName = `promo_assets/${safeTrackName}/promo_${Date.now()}_slide_${slide.slideNumber}.png`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, { metadata: { contentType: "image/png" } });
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    return { 
      success: true, 
      updatedSlide: { ...slide, imageUrl: publicUrl } 
    };

  } catch (error: any) {
    console.error("Render Single Slide Error:", error);
    throw new HttpsError("internal", error.message || "Gagal merender gambar slide.");
  }
});