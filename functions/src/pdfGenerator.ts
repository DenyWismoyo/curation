// functions/src/pdfGenerator.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import React from "react";
import ReactPDF from "@react-pdf/renderer";
import { UniversalPDFDocument } from "./templates/UniversalPDFDocument"; 

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
      });

      return { downloadUrl, cached: false };

    } catch (error: any) {
      console.error("Error saat Server-Side Rendering PDF:", error);
      throw new HttpsError("internal", "Gagal merender dokumen PDF di server.");
    }
  }
);