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
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

    // RAG STRATEGY: Rangkum intisari data untuk diubah menjadi Vector
    // Kita gabungkan Data Profil + Executive Summary + SWOT + Rekomendasi
    const rawText = `
      Nama Usaha: ${docData.namaUsaha || 'Tanpa Nama'}
      Kategori/Track: ${docData.trackType || ''}
      Skor: ${docData.score}/100
      Level Kesiapan: ${docData.readinessLevel}
      
      Data Usaha: ${JSON.stringify(docData.formData || {})}
      Ringkasan AI: ${docData.aiResult?.executiveSummary || ''}
      SWOT AI: ${JSON.stringify(docData.aiResult?.swotAnalysis || {})}
    `.trim();

    // PERBAIKAN: Potong teks jika terlalu panjang agar model embedding tidak over-token
    const safeTextToEmbed = rawText.length > 25000 ? rawText.substring(0, 25000) + "...[TRUNCATED]" : rawText;

    const result = await model.embedContent({ content: { role: "user", parts: [{ text: safeTextToEmbed }] }, outputDimensionality: 768 } as any);
    const vectorArray = result.embedding.values;

    // 🛡️ ANTI-CRASH FALLBACK: Jika SDK Firebase usang, simpan sebagai Array biasa
    const embeddingData = typeof admin.firestore.FieldValue.vector === 'function' 
      ? admin.firestore.FieldValue.vector(vectorArray) 
      : vectorArray;

    // Simpan ke koleksi khusus Vector (Database RAG)
    await db.collection("business_vectors").doc(assessmentId).set({
      assessmentId: assessmentId,
      namaUsaha: docData.namaUsaha,
      trackType: docData.trackType,
      score: docData.score,
      readinessLevel: docData.readinessLevel,
      embedding: embeddingData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Vector Embedding berhasil disimpan untuk ${assessmentId}`);
  } catch (error: any) {
    console.error(`❌ Gagal membuat Vector Embedding untuk ${assessmentId}:`, error.message || error);
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
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

    try {
      // 1. Ubah query pencarian investor menjadi Vector
      const queryResult = await model.embedContent({ content: { role: "user", parts: [{ text: query }] }, outputDimensionality: 768 } as any);
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

/**
 * FUNGSI INTERNAL: Menyimpan Hasil Deep Research Form Builder ke Vector DB
 * Berguna untuk RAG (Retrieval-Augmented Generation) di masa depan agar AI 
 * bisa mencontek riset framework yang pernah dibuat sebelumnya.
 */
export const storeTemplateResearchVector = async (templateId: string, trackName: string, researchData: string, apiKey: string) => {
  try {
    console.log(`[Vector DB] Memulai proses embedding untuk template: ${templateId}`);
    const db = getFirestore(admin.app(), "curation");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

    // PERBAIKAN: Potong data riset jika terlampau panjang (Limit Embedding Model ~9600 token / ~30.000 karakter)
    // Teks dipotong hanya untuk kepentingan ekstraksi Vector, namun data teks asli (full) tetap disimpan ke DB
    const safeResearchData = researchData.length > 25000 
      ? researchData.substring(0, 25000) + "... [DATA DIPOTONG UNTUK EMBEDDING]" 
      : researchData;

    const textToEmbed = `
      Kategori Program: ${trackName || 'Tanpa Nama'}
      Hasil Deep Research Framework & Metrik: 
      ${safeResearchData}
    `.trim();

    const result = await model.embedContent({ content: { role: "user", parts: [{ text: textToEmbed }] }, outputDimensionality: 768 } as any);
    const vectorArray = result.embedding.values;

    // 🛡️ ANTI-CRASH FALLBACK: Jika SDK Firebase usang, simpan sebagai Array biasa
    const embeddingData = typeof admin.firestore.FieldValue.vector === 'function' 
      ? admin.firestore.FieldValue.vector(vectorArray) 
      : vectorArray; 

    await db.collection("template_research_vectors").doc(templateId).set({
      templateId: templateId,
      trackName: trackName || 'Umum',
      researchData: researchData, // Data asli utuh tersimpan di sini
      embedding: embeddingData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ [Knowledge Base] Vector Riset berhasil direkam untuk Template: ${templateId}`);
  } catch (error: any) {
    // PERBAIKAN: Menambahkan '.message' agar error terbaca jelas di Console Log Firebase
    console.error(`❌ Gagal merekam Vector Riset untuk Template [${templateId}]:`, error.message || error);
  }
};