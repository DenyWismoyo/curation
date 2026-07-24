// functions/src/agents/promo/imageRendererAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generatePromoImage = onCall({
  memory: "1GiB",
  timeoutSeconds: 300,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
  
  // Menangkap trackName dari frontend untuk dijadikan sub-folder
  const { imagePrompt, trackName } = request.data;
  
  if (!imagePrompt) throw new HttpsError("invalid-argument", "Image Prompt wajib disertakan.");
  
  try {
    const API_KEY = geminiApiKeySecret.value();
    
    const aiStudioEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
    
    const response = await fetch(aiStudioEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: imagePrompt }]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE"] 
        }
      })
    });

    if (!response.ok) {
       const errorText = await response.text();
       console.error("Google AI Studio Response:", errorText);
       throw new Error(`Koneksi ditolak oleh Google (Status: ${response.status})`);
    }

    const data = await response.json();

    if (data.error) {
       throw new Error(`Google AI Studio Error: ${data.error.message}`);
    }

    const candidates = data.candidates;
    if (!candidates || !candidates[0] || !candidates[0].content.parts[0].inlineData) {
      throw new Error("Gambar gagal dirender. Respon data kosong atau format salah.");
    }

    const base64Image = candidates[0].content.parts[0].inlineData.data;
    const buffer = Buffer.from(base64Image, 'base64');

    const bucket = admin.storage().bucket();
    
    // --- LOGIKA SUB-FOLDER DINAMIS ---
    // Membersihkan trackName dari spasi dan karakter khusus, default ke "umum" jika kosong
    const safeTrackName = trackName ? trackName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'umum';
    
    // Struktur file: promo_assets/nama_template/promo_123456.png
    const fileName = `promo_assets/${safeTrackName}/promo_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: { contentType: "image/png" }
    });
    
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