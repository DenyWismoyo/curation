// functions/src/documentGenerator.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateDocumentDraft = onCall(
  {
    memory: "1GiB",
    timeoutSeconds: 300,
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anda harus login untuk menggunakan fitur ini.");
    }

    const { assessmentId, docTitle, promptTemplate } = request.data as any;
    if (!assessmentId || !promptTemplate) throw new HttpsError("invalid-argument", "Data request tidak lengkap.");

    try {
      const db = getFirestore(admin.app(), "curation");
      const docRef = db.collection("assessments").doc(assessmentId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) throw new HttpsError("not-found", "Data asesmen tidak ditemukan.");
      const data = docSnap.data() as any;

      const currentQuota = data.documentGenerationQuota || 0;
      const hasPaid = data.hasPaidForDocument === true;

      if (currentQuota <= 0 && !hasPaid) {
        throw new HttpsError("permission-denied", "Kuota habis. Silakan lakukan pembelian akses dokumen AI.");
      }

      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      // Gunakan model pro jika memungkinkan untuk penulisan panjang, atau flash untuk kecepatan
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

      // ==========================================
      // PROMPT ENGINE: STRUKTUR MUTLAK BERBASIS DATA
      // ==========================================
      const promptText = `
        Anda adalah AI Business Writer, Auditor, dan Konsultan Ahli tingkat eksekutif.
        Tugas Anda adalah menulis dokumen resmi berjudul: "${docTitle}".
        
        SUMBER DATA UTAMA YANG WAJIB DIEKSTRAK (Format JSON):
        1. [FORM_DATA] Fakta Entitas: ${JSON.stringify(data?.formData || {})}
        2. [AI_SCORE] Skor Total: ${data?.aiResult?.totalScore || 0}/100, Level Kesiapan: ${data?.aiResult?.readinessLevel || '-'}
        3. [AI_SUMMARY] Ringkasan Eksekutif: ${data?.aiResult?.executiveSummary || '-'}
        4. [AI_BLOCKS] Analisis Mendalam: ${JSON.stringify(data?.aiResult?.customAnalysisBlocks || [])}
        5. [AI_METRICS] Metrik Detail: ${JSON.stringify(data?.aiResult?.metrics || [])}
        6. [AI_SWOT] SWOT Analysis: ${JSON.stringify(data?.aiResult?.swotAnalysis || {})}
        7. [AI_RISKS] Risiko & Mitigasi: ${JSON.stringify(data?.aiResult?.riskAssessment || {})}
        8. [AI_ACTIONS] Action Plan: ${JSON.stringify(data?.aiResult?.recommendations || [])}
        
        INSTRUKSI KERANGKA DOKUMEN (SANGAT KETAT):
        ${promptTemplate}

        ATURAN PENULISAN MUTLAK:
        1. WAJIB mengikuti struktur BAB I, BAB II, dst sesuai instruksi kerangka di atas. Jangan ubah urutan Bab.
        2. DILARANG KERAS mengarang data di luar [FORM_DATA]. Jika ada yang kosong, gunakan kalimat asumsi umum yang profesional.
        3. Saat menjabarkan Bab Analisis, WAJIB memasukkan poin-poin dari [AI_BLOCKS] dan [AI_METRICS].
        4. Saat menjabarkan Bab Risiko/SWOT, WAJIB mengekstrak data dari [AI_SWOT] dan [AI_RISKS].
        
        FORMAT OUTPUT HTML SEMANTIK (HANYA INI, TANPA MARKDOWN):
        - Gunakan <h1> SATU KALI SAJA untuk JUDUL DOKUMEN UTAMA (Kapital semua).
        - Gunakan <h2> untuk NAMA BAB (Contoh: <h2>BAB I. RINGKASAN EKSEKUTIF</h2>).
        - Gunakan <h3> untuk Sub-Bab di dalam Bab.
        - Gunakan <p> untuk narasi paragraf.
        - Gunakan <ul> dan <li> untuk daftar poin.
        - DILARANG menggunakan tag <html>, <head>, <body>, atau membungkus jawaban dengan \`\`\`html.
        - Langsung hasilkan teks HTML murni.
      `;

      const result = await model.generateContent(promptText);
      let htmlContent = result.response.text();
      htmlContent = htmlContent.replace(/^```html/i, '').replace(/```$/i, '').trim();

      if (currentQuota > 0 && !hasPaid) {
        await docRef.update({ documentGenerationQuota: admin.firestore.FieldValue.increment(-1) });
      }

      return { htmlContent };

    } catch (error: any) {
      console.error("Error Document Generation:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Gagal memproses dokumen draf akibat kesalahan internal.");
    }
  }
);