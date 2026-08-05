import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { CryptoCertificateDocument } from '../../templates/CryptoCertificateDocument';

const getDb = () => getFirestore(admin.app(), "curation");

export const generateCryptoCertificate = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Anda harus login untuk generate sertifikat.");
  }

  const uid = request.auth.uid;
  const { levelName, userName } = request.data || {};

  if (!levelName) {
    throw new HttpsError("invalid-argument", "Data levelName harus disertakan.");
  }

  const db = getDb();

  // 1. Verifikasi apakah semua modul dalam level tersebut sudah selesai
  // Untuk saat ini, kita ambil dari userAcademyStats
  const statsRef = db.collection("userAcademyStats").doc(uid);
  const statsSnap = await statsRef.get();
  
  if (!statsSnap.exists) {
    throw new HttpsError("failed-precondition", "Belum ada progres belajar.");
  }

  const statsData = statsSnap.data()!;
  
  const completedLevels = statsData.completedLevels || [];
  
  if (!completedLevels.includes(levelName)) {
    throw new HttpsError("failed-precondition", `Anda belum menyelesaikan seluruh modul pada level ${levelName}.`);
  }

  const averageScore = statsData.averageScore || 0;
  const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const certificateId = `CA-${uid.substring(0, 5).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  // 2. Generate PDF
  const bucket = admin.storage().bucket();
  const fileName = `certificates/${uid}/${levelName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  const file = bucket.file(fileName);

  const documentElement = React.createElement(CryptoCertificateDocument, {
    userName: userName || request.auth.token.name || request.auth.token.email || 'Trader',
    levelName,
    averageScore,
    dateStr,
    certificateId,
  });

  try {
    const pdfStream = await ReactPDF.renderToStream(documentElement as any);
    const writeStream = file.createWriteStream({
      metadata: { contentType: "application/pdf" },
    });

    await new Promise((resolve, reject) => {
      pdfStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 3. Update Database
    await statsRef.update({
      certificates: admin.firestore.FieldValue.arrayUnion({
        id: certificateId,
        level: levelName,
        url: fileName,
        issuedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    });

    // 4. Dapatkan Signed URL
    const [downloadUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000,
      responseDisposition: `attachment; filename="Sertifikat_${levelName}.pdf"`,
    });

    return { success: true, downloadUrl, certificateId };

  } catch (error: any) {
    console.error("Error generating certificate:", error);
    throw new HttpsError("internal", "Gagal merender sertifikat PDF.");
  }
});
