// functions/src/documentGenerator.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateDocumentDraft = onCall(
  {
    memory: "1GiB",
    timeoutSeconds: 300, // Durasi lama karena AI menulis dokumen komprehensif
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    // 1. Validasi Autentikasi Pengguna
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anda harus login untuk menggunakan fitur ini.");
    }

    const { assessmentId, docTitle, promptTemplate } = request.data as any;
    if (!assessmentId || !promptTemplate) {
      throw new HttpsError("invalid-argument", "Data request tidak lengkap.");
    }

    try {
      const db = admin.firestore();
      const docRef = db.collection("assessments").doc(assessmentId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        throw new HttpsError("not-found", "Data asesmen tidak ditemukan.");
      }
      const data = docSnap.data() as any;

      // ==========================================
      // 2. VALIDASI KUOTA ATAU PEMBAYARAN (B2B & B2C)
      // ==========================================
      const currentQuota = data.documentGenerationQuota || 0;
      const hasPaid = data.hasPaidForDocument === true;

      // Jika kuota habis (0) DAN belum membayar, tolak akses.
      if (currentQuota <= 0 && !hasPaid) {
        throw new HttpsError(
          "permission-denied", 
          "Kuota pembuatan dokumen Anda telah habis. Silakan lakukan pembelian akses dokumen AI."
        );
      }

      // ==========================================
      // 3. SUSUN PROMPT & PANGGIL GEMINI AI
      // ==========================================
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

      const promptText = `
        Anda adalah AI Business Writer dan Konsultan Ahli tingkat eksekutif.
        Tugas Anda adalah menulis draf dokumen berjudul: "${docTitle}".
        
        DATA INPUT SUMBER (Fakta Entitas):
        - Profil & Identitas: ${JSON.stringify(data?.formData || {})}
        - Hasil Analisis AI Sebelumnya (SWOT, Metrik, Rekomendasi): ${JSON.stringify(data?.aiResult || {})}
        
        INSTRUKSI PENULISAN:
        ${promptTemplate}

        FORMAT OUTPUT MUTLAK:
        Keluarkan jawaban MURNI DALAM FORMAT HTML SEMANTIK yang siap diekspor ke Microsoft Word.
        - Gunakan tag <h1> untuk Judul Utama Dokumen.
        - Gunakan tag <h2> untuk Sub-judul Bab.
        - Gunakan tag <h3> untuk sub-sub bagian.
        - Gunakan tag <p> untuk paragraf narasi.
        - Gunakan <ul> dan <li> untuk daftar/bullet points.
        - Gunakan <strong> untuk penebalan teks penting.
        - JANGAN membuat tabel HTML yang kompleks.
        - DILARANG KERAS menggunakan tag <html>, <head>, atau <body>. Langsung konten utamanya saja.
        - DILARANG KERAS membungkus respons dengan block markdown (seperti \`\`\`html). Hanya teks HTML mentahnya.
      `;

      const result = await model.generateContent(promptText);
      let htmlContent = result.response.text();
      
      // Pembersihan format jika AI menambahkan blockticks markdown
      htmlContent = htmlContent.replace(/^```html/i, '').replace(/```$/i, '').trim();

      // ==========================================
      // 4. PEMOTONGAN KUOTA (DEDUCTION LOGIC)
      // ==========================================
      // Jika pengguna menggunakan jalur kuota gratis (B2B Token), potong kuotanya.
      // (Jika jalur B2C/hasPaid, biarkan saja agar mereka bisa unlimited download untuk dokumen ini)
      if (currentQuota > 0 && !hasPaid) {
        await docRef.update({
          documentGenerationQuota: admin.firestore.FieldValue.increment(-1)
        });
      }

      return { htmlContent };

    } catch (error: any) {
      console.error("Error Document Generation:", error);
      // Teruskan HttpsError agar bisa ditangkap oleh frontend
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Gagal memproses dokumen draf akibat kesalahan internal.");
    }
  }
);