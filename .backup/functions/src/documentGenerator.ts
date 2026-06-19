// functions/src/documentGenerator.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import React from "react";
import ReactPDF from "@react-pdf/renderer";
import { UniversalPDFDocument } from "./templates/UniversalPDFDocument";

/**
 * FUNGSI 1: DIPANGGIL OLEH FRONTEND (USER / ADMIN / CURATOR)
 * Akan langsung memberikan URL PDF jika PDF sudah pernah digenerate di background.
 */
export const generatePDFReport = onCall(
  {
    memory: "1GiB",
    timeoutSeconds: 300,
    region: "asia-southeast2",
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Anda harus login.");

    // Kita tambahkan assessmentId, templateVersion, dan forceRegenerate
    const { role, payload, assessmentId, templateVersion = 1, forceRegenerate = false } = request.data as any;
    
    if (!role || !payload || !assessmentId) {
      throw new HttpsError("invalid-argument", "Data request PDF tidak lengkap (butuh assessmentId).");
    }

    const db = getFirestore(admin.app(), "curation");
    const docRef = db.collection("assessments").doc(assessmentId);
    
    // Nama file statis: menimpa file lama jika di-generate ulang
    const bucket = admin.storage().bucket();
    const fileName = `pdf_exports/${assessmentId}_${role}.pdf`;
    const file = bucket.file(fileName);

    // Sanitasi nama file agar aman saat diunduh
    const safeEntityName = payload?.formData?.namaUsaha 
      ? String(payload.formData.namaUsaha).replace(/[^a-zA-Z0-9]/gi, '_') 
      : assessmentId;
    const downloadFileName = `Laporan_CSRS_${safeEntityName}_${role}.pdf`;

    try {
      const docSnap = await docRef.get();
      if (!docSnap.exists) throw new HttpsError("not-found", "Data asesmen tidak ditemukan di Database.");
      
      const docData = docSnap.data();

      // 1. CEK ARSIP (SMART CACHE)
      const existingPdf = docData?.generatedPdfs?.[role];
      const isUpToDate = existingPdf && existingPdf.version === templateVersion;

      // Jika PDF sudah ada, versinya sama, dan tidak dipaksa regenerate -> Kembalikan URL lama!
      if (isUpToDate && !forceRegenerate) {
        console.log(`[CACHE HIT] Mengembalikan PDF lama untuk ${assessmentId} (${role})`);
        
        const [downloadUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 2 * 60 * 60 * 1000, // 2 Jam
          // Memaksa browser untuk langsung mengunduh file
          responseDisposition: `attachment; filename="${downloadFileName}"`,
        });
        
        return { downloadUrl, cached: true };
      }

      // 2. JIKA KOSONG / KADALUARSA / FORCE REGENERATE -> RENDER ULANG
      console.log(`[RENDERING] Membuat PDF baru untuk ${assessmentId} (${role})`);
      
      const documentElement = React.createElement(UniversalPDFDocument, {
        role: role,
        trackType: payload.trackType,
        formData: payload.formData,
        aiResult: payload.aiResult,
        downloadedBy: payload.downloadedBy,
      });

      const pdfStream = await ReactPDF.renderToStream(documentElement as any);
      const writeStream = file.createWriteStream({
        metadata: { contentType: "application/pdf" },
      });

      await new Promise((resolve, reject) => {
        pdfStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // 3. UPDATE DATABASE (Catat bahwa PDF versi ini sudah dibuat)
      await docRef.set({
         generatedPdfs: {
            [role]: {
               filePath: fileName,
               version: templateVersion,
               generatedAt: new Date().toISOString()
            }
         }
      }, { merge: true }); // merge: true memastikan data lama tidak terhapus

      // 4. KEMBALIKAN URL
      const [downloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 2 * 60 * 60 * 1000,
        // Memaksa browser untuk langsung mengunduh file
        responseDisposition: `attachment; filename="${downloadFileName}"`,
      });

      return { downloadUrl, cached: false };

    } catch (error: any) {
      console.error("Error saat Server-Side Rendering PDF:", error);
      throw new HttpsError("internal", "Gagal merender dokumen PDF di server.");
    }
  }
);

/**
 * FUNGSI 2: FUNGSI INTERNAL (OTOMATISASI BACKGROUND)
 * Pre-computing PDF secara diam-diam. Dipanggil oleh Firestore Trigger setelah AI selesai.
 */
export const generateInternalPDF = async (assessmentId: string, docData: any, role: string = 'founder') => {
  const bucket = admin.storage().bucket();
  const fileName = `pdf_exports/${assessmentId}_${role}.pdf`;
  const file = bucket.file(fileName);

  try {
    console.log(`[BACKGROUND TASK] Mulai pre-computing PDF untuk ${assessmentId} (${role})`);
    
    // Pastikan kita meneruskan downloadedBy jika ada (bisa kosong jika dari background)
    const documentElement = React.createElement(UniversalPDFDocument, {
      role: role as 'user' | 'admin_csrs' | 'curator',
      trackType: docData.trackType || "Evaluasi Umum",
      formData: docData.formData || {},
      aiResult: docData.aiResult || {},
      downloadedBy: { name: "Sistem Otomatis", email: "system@csrs.app" },
    });

    const pdfStream = await ReactPDF.renderToStream(documentElement as any);
    const writeStream = file.createWriteStream({
      metadata: { contentType: "application/pdf" },
    });

    await new Promise((resolve, reject) => {
      pdfStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Update database untuk mencatat cache PDF
    const db = getFirestore(admin.app(), "curation");
    await db.collection("assessments").doc(assessmentId).set({
       generatedPdfs: {
          [role]: {
             filePath: fileName,
             version: 1, // Default version = 1
             generatedAt: new Date().toISOString(),
             isPrecomputed: true
          }
       }
    }, { merge: true });

    console.log(`✅ Pre-computed PDF selesai dan tersimpan: ${fileName}`);
  } catch (error) {
    console.error(`❌ Gagal Pre-compute PDF untuk ${assessmentId}:`, error);
  }
};