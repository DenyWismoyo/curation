import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore"; // PERBAIKAN: Import getFirestore
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const logToTerminal = async (docRef: admin.firestore.DocumentReference, message: string, type: 'info' | 'success' | 'error' = 'info') => {
  await docRef.update({
    generationLogs: admin.firestore.FieldValue.arrayUnion({
      timestamp: new Date().toISOString(),
      message,
      type
    })
  });
};

export const formBuilderRagSeederAgent = onDocumentUpdated({
  database: "curation", // PERBAIKAN: Menunjuk database curation
  document: "form_templates/{templateId}",
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (afterData?.aiGenerationStatus?.phase !== "PRE_WARMING" || beforeData?.aiGenerationStatus?.phase === "PRE_WARMING") {
    return null;
  }

  const templateRef = event.data?.after.ref;
  const templateId = event.params.templateId;
  if (!templateRef) return null;

  try {
    await logToTerminal(templateRef, "FASE 4: RAG Seeder Agent menyuntikkan referensi kuesioner ke Bank Soal AI...", "info");
    
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const db = getFirestore(admin.app(), "curation"); // PERBAIKAN: Mengarah ke database curation yang benar

    const trackName = afterData.trackName || "Asesmen Umum";
    const cleanedSteps = afterData.steps || [];

    const bankPromises = cleanedSteps.flatMap((step: any) => 
       (step.fields || []).map(async (field: any) => {
        const textToEmbed = `Track: ${trackName}, Step: ${step.title}, Label: ${field.label}`;
        const embRes = await embedModel.embedContent(textToEmbed);
        const vectorVal = embRes.embedding.values;
        
        return db.collection('adaptive_question_banks').doc().set({
          templateId: templateId,
          stepIndex: step.stepNumber || 1,
          stepTitle: step.title,
          questionData: field,
          embedding: admin.firestore.FieldValue.vector(vectorVal),
          usageCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      })
    );
    
    await Promise.allSettled(bankPromises);
    await logToTerminal(templateRef, "Pre-Warming RAG selesai! AI memiliki pengetahuan dasar yang kaya.", "success");

    await templateRef.update({
      stepOutlinesCache: admin.firestore.FieldValue.delete(),
      researchNotesCache: admin.firestore.FieldValue.delete(),
      rawStepsCache: admin.firestore.FieldValue.delete(),
      version: admin.firestore.FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
      aiGenerationStatus: {
        phase: "COMPLETED", 
        message: `Sukses! Formulir Adaptive skala Enterprise (${cleanedSteps.length} seksi) siap digunakan.`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });
    
    await logToTerminal(templateRef, "PIPELINE SELESAI: Mode Adaptive berhasil diintegrasikan!", "success");
    return null;

  } catch (error: any) {
    console.error("RAG Seeder Agent Error:", error);
    await templateRef.update({
      aiGenerationStatus: { phase: "FAILED", message: `RAG Seeder Gagal: ${error.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
    });
    await logToTerminal(templateRef, `FATAL ERROR: ${error.message}`, "error");
    return null;
  }
});