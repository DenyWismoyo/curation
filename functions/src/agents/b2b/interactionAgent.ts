import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const getDb = () => getFirestore(admin.app(), "curation");

export const b2bAddInteractionLog = onCall(
  {
    region: "asia-southeast2",
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const data = request.data;
    const { assessmentId, corporateEntity, participantUid, participantName, interactionType, notes } = data;

    if (!assessmentId || !corporateEntity || !notes) {
      throw new HttpsError("invalid-argument", "Data log interaksi tidak lengkap.");
    }

    const db = getDb();
    const actorUid = request.auth.uid;
    const actorEmail = request.auth.token.email || "";
    const actorName = request.auth.token.name || actorEmail;

    const logRef = db.collection("b2b_interaction_logs").doc();
    const logData = {
      id: logRef.id,
      assessmentId,
      corporateEntity,
      participantUid: participantUid || "",
      participantName: participantName || "Unknown",
      interactionType: interactionType || "general",
      notes: notes,
      aiSummary: "",
      createdByUid: actorUid,
      createdByEmail: actorEmail,
      createdByName: actorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await logRef.set(logData);

    return { success: true, logId: logRef.id, data: logData };
  }
);

export const b2bGenerateInteractionSummary = onCall(
  {
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    timeoutSeconds: 120,
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const data = request.data;
    const { assessmentId, corporateEntity } = data;

    if (!assessmentId || !corporateEntity) {
      throw new HttpsError("invalid-argument", "ID Asesmen atau Corporate Entity tidak valid.");
    }

    const db = getDb();
    
    // Fetch Assessment Data
    const assessmentRef = db.collection("assessments").doc(assessmentId);
    const assessmentSnap = await assessmentRef.get();
    if (!assessmentSnap.exists) {
      throw new HttpsError("not-found", "Data awal peserta tidak ditemukan.");
    }
    const assessmentData = assessmentSnap.data();

    // Fetch Interaction Logs
    const logsQuery = db.collection("b2b_interaction_logs")
      .where("assessmentId", "==", assessmentId)
      .where("corporateEntity", "==", corporateEntity)
      .orderBy("createdAt", "asc");
      
    const logsSnap = await logsQuery.get();
    if (logsSnap.empty) {
      throw new HttpsError("failed-precondition", "Belum ada log interaksi untuk disimpulkan.");
    }

    const logs = logsSnap.docs.map(doc => doc.data());

    // Prepare context for Gemini
    const participantContext = `
Data Awal Peserta:
Nama: ${assessmentData?.namaUsaha || 'Tanpa Nama'}
Profil/Skor Awal: ${assessmentData?.score || 0}
Level Kesiapan: ${assessmentData?.readinessLevel || 'N/A'}
Ringkasan Awal: ${assessmentData?.aiResult?.executiveSummary || 'Tidak tersedia'}

Riwayat Interaksi / Sesi / Catatan Mitra:
${logs.map((l, i) => `[Sesi ${i+1}] Tanggal: ${l.createdAt}, Tipe: ${l.interactionType}, Oleh: ${l.createdByName}\nCatatan: ${l.notes}`).join('\n\n')}
    `.trim();

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["progressSummary", "strengthsObserved", "areasForImprovement", "recommendedNextSteps"],
            properties: {
              progressSummary: { type: SchemaType.STRING, description: "Ringkasan komprehensif perkembangan atau evaluasi peserta berdasarkan log interaksi." },
              strengthsObserved: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              areasForImprovement: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              recommendedNextSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            }
          }
        }
      });

      const prompt = `Anda adalah AI Assistant bagi Mitra (B2B). Tugas Anda menganalisis riwayat interaksi dan data form awal peserta, lalu menghasilkan ringkasan kemajuan atau evaluasi yang objektif.
Berikut adalah data konteksnya:
${participantContext}

Mohon buat kesimpulan profesional berbentuk JSON sesuai skema.`;

      const result = await model.generateContent(prompt);
      let jsonText = result.response.text().trim();
      if (jsonText.startsWith('```')) jsonText = jsonText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      
      const parsedSummary = JSON.parse(jsonText);

      // Save summary back to the assessment record or a specific summary doc
      const summaryRef = db.collection("b2b_interaction_summaries").doc(assessmentId);
      await summaryRef.set({
        assessmentId,
        corporateEntity,
        latestSummary: parsedSummary,
        updatedAt: new Date().toISOString(),
        updatedByUid: request.auth.uid,
      }, { merge: true });

      return { success: true, summary: parsedSummary };
    } catch (error: any) {
      throw new HttpsError("internal", "Gagal melakukan generate AI summary: " + error.message);
    }
  }
);
