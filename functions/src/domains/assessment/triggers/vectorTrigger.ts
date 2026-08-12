import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { generateAndStoreVectorEmbedding } from "../../../infrastructure/vector/vectorService";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateBusinessVector = onDocumentWritten({
  database: "curation",
  document: "assessments/{assessmentId}",
  region: "asia-southeast2",
  memory: "256MiB",
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const snapshotAfter = event.data?.after;
  const snapshotBefore = event.data?.before;
  
  if (!snapshotAfter) return;

  const dataAfter = snapshotAfter.data();
  const dataBefore = snapshotBefore?.data() || {};
  
  // Hanya picu generasi vektor saat dokumen beralih ke status COMPLETED
  // atau saat skor berubah pada status COMPLETED.
  if (dataAfter.status === "COMPLETED" && (dataBefore.status !== "COMPLETED" || dataBefore.score !== dataAfter.score)) {
    console.log(`[VectorTrigger] Generating embeddings for assessment ${event.params.assessmentId}`);
    
    const API_KEY = geminiApiKeySecret.value();
    
    const updatedDocDataForBg = {
      namaUsaha: dataAfter.formData?.namaUsaha || 'Tanpa Nama',
      trackType: dataAfter.trackType,
      score: dataAfter.score || dataAfter.aiResult?.totalScore || 0,
      readinessLevel: dataAfter.readinessLevel || dataAfter.aiResult?.readinessLevel || 'Belum Ditentukan',
      formData: dataAfter.formData,
      aiResult: dataAfter.aiResult,
      userEmail: dataAfter.formData?.email || dataAfter.userEmail
    };

    try {
      await generateAndStoreVectorEmbedding(event.params.assessmentId, updatedDocDataForBg, API_KEY);
      console.log(`[VectorTrigger] Embeddings generated successfully for ${event.params.assessmentId}`);
    } catch (error) {
      console.error(`[VectorTrigger] Failed to generate embeddings for ${event.params.assessmentId}:`, error);
    }
  }
});
