// functions/src/vectorService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

/**
 * FUNGSI INTERNAL: Menggenerate Embedding dan Menyimpannya ke Vector Database Firestore
 * Dipanggil otomatis oleh Trigger Background setelah AI Selesai.
 */
export const generateAndStoreVectorEmbedding = async (assessmentId: string, docData: any, apiKey: string) => {
  try {
    const db = getFirestore(admin.app(), "curation");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Gunakan model khusus embedding (sangat murah dan cepat)
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // RAG STRATEGY: Rangkum intisari data untuk diubah menjadi Vector
    // Kita gabungkan Data Profil + Executive Summary + SWOT + Rekomendasi
    const textToEmbed = `
      Nama Usaha: ${docData.namaUsaha || 'Tanpa Nama'}
      Kategori/Track: ${docData.trackType || ''}
      Skor: ${docData.score}/100
      Level Kesiapan: ${docData.readinessLevel}
      
      Data Usaha: ${JSON.stringify(docData.formData || {})}
      Ringkasan AI: ${docData.aiResult?.executiveSummary || ''}
      SWOT AI: ${JSON.stringify(docData.aiResult?.swotAnalysis || {})}
    `.trim();

    const result = await model.embedContent(textToEmbed);
    const vectorArray = result.embedding.values;

    // Simpan ke koleksi khusus Vector (Database RAG)
    // FieldValue.vector didukung secara native oleh Firestore versi terbaru
    await db.collection("business_vectors").doc(assessmentId).set({
      assessmentId: assessmentId,
      namaUsaha: docData.namaUsaha,
      trackType: docData.trackType,
      score: docData.score,
      readinessLevel: docData.readinessLevel,
      // Mengubah array Javascript menjadi format Vector Firestore
      embedding: admin.firestore.FieldValue.vector(vectorArray),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Vector Embedding berhasil disimpan untuk ${assessmentId}`);
  } catch (error) {
    console.error(`❌ Gagal membuat Vector Embedding untuk ${assessmentId}:`, error);
  }
};

/**
 * FUNGSI CALLABLE: Untuk Fitur "Matchmaking Investor / Industri" di Masa Depan
 * Menerima query bahasa natural, dan mencari startup yang paling relevan.
 */
export const matchBusinessWithIndustry = onCall(
  {
    memory: "512MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Hanya untuk user terautentikasi.");
    
    const { query, limit = 5 } = request.data as any;
    if (!query) throw new HttpsError("invalid-argument", "Query pencarian wajib diisi.");

    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    try {
      // 1. Ubah query pencarian investor menjadi Vector
      const queryResult = await model.embedContent(query);
      const queryVector = queryResult.embedding.values;

      const db = getFirestore(admin.app(), "curation");

      // 2. Lakukan Vector Search (Cosine Similarity) di Firestore
      const vectorQuery = db.collection('business_vectors')
        .findNearest('embedding', admin.firestore.FieldValue.vector(queryVector), {
          limit: limit,
          distanceMeasure: 'COSINE'
        });

      const snapshot = await vectorQuery.get();
      
      const matches = snapshot.docs.map(doc => {
        const data = doc.data();
        // Hapus array embedding dari response agar payload tidak bengkak
        delete data.embedding; 
        return data;
      });

      return { matches };

    } catch (error: any) {
      console.error("Vector Search Error:", error);
      throw new HttpsError("internal", "Gagal melakukan pencarian RAG.");
    }
  }
);