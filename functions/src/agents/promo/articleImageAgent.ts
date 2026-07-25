// functions/src/agents/promo/articleImageAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateArticleImage = onCall({
  memory: "512MiB",
  timeoutSeconds: 120, // Alokasi waktu memadai untuk rendering gambar
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { title, excerpt } = request.data;
  if (!title) throw new HttpsError("invalid-argument", "Judul artikel diperlukan untuk merender gambar.");

  try {
    const API_KEY = geminiApiKeySecret.value();
    const bucket = admin.storage().bucket();
    
    // Instruksi visual: Rasio 2:1 (4x2), gaya vektor padat, palet warna khas, TANPA TEKS
    const imagePrompt = `Horizontal Landscape Aspect Ratio 2:1. Flat vector illustration, corporate minimalist, highly detailed and dense composition. Colors: Teal, Vibrant Orange, and Yellow on a clean white background. Concept/Theme: ${title}. Context: ${excerpt || 'Educational content'}. STRICT RULE: NO TEXT, NO TYPOGRAPHY, NO WORDS, NO LETTERS inside the image. Focus purely on visual storytelling and metaphors. No 3D, no photorealism.`;

    const aiStudioEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + API_KEY;
    
    const response = await fetch(aiStudioEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google AI Studio Error:", errText);
      throw new Error(`Koneksi ditolak: ${errText}`);
    }
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const candidates = data.candidates;
    if (!candidates || !candidates[0] || !candidates[0].content.parts[0].inlineData) {
      throw new Error("Gambar gagal dirender. Respon dari AI kosong.");
    }

    const base64Image = candidates[0].content.parts[0].inlineData.data;
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Simpan otomatis ke Firebase Storage
    const fileName = `articles/ai_covers/cover_${Date.now()}.png`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, { metadata: { contentType: "image/png" } });
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    return { success: true, imageUrl: publicUrl, storagePath: fileName };
  } catch (error: any) {
    console.error("Generate Article Image Error:", error);
    throw new HttpsError("internal", error.message || "Gagal merender gambar artikel.");
  }
});