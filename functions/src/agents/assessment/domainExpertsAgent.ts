import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const withRetry = async <T>(fn: () => Promise<T>, retries = 4, delayMs = 3000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (error.status === 400 || (error.message && error.message.includes('SAFETY'))) throw error;
    if (retries <= 1) throw error;
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

export const assessmentDomainExpertsAgent = onDocumentUpdated({
  database: "curation", // PERBAIKAN: Menunjuk database curation
  document: "assessments/{assessmentId}", // PERBAIKAN: Hapus "curation/" di depan
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const afterData = event.data?.after.data();

  if (afterData?.status !== "ANALYZING_METRICS") return null;

  const docRef = event.data!.after.ref;
  const aiResult = afterData.aiResult || {};
  const aiPromptConfig = afterData.aiPromptConfig || {};
  const geminiFiles = afterData.geminiFiles || [];

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  const getWorkerModel = (schema: any) => genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "Anda adalah AI Content Elaborator berkecepatan tinggi. Ekstrak wawasan menjadi narasi PRESISI dalam format JSON murni. Gunakan '\\n' untuk baris baru.",
    generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema }
  });

  const audienceContext = aiPromptConfig.targetAudience === 'individual'
    ? "TARGET AUDIENS: INDIVIDU / PERSONAL." : "TARGET AUDIENS: PERUSAHAAN / BISNIS.";
  const dataString = JSON.stringify(afterData.formData || {});

  try {
    // 1. Worker A (Analysis Blocks)
    const schemaA = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["title", "iconType", "metrics"], properties: { title: { type: SchemaType.STRING }, iconType: { type: SchemaType.STRING }, metrics: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "value"], properties: { label: { type: SchemaType.STRING }, value: { type: SchemaType.STRING } } } } } } };
    const promptA = `JABARKAN narasi analitis untuk kerangka blok ini: ${JSON.stringify(aiPromptConfig.expectedAnalysisBlocks)}. Data: ${dataString}. Selaraskan dengan temuan SWOT: ${JSON.stringify(aiResult.swotAnalysis)}. Konteks: ${audienceContext}`;
    
    // 2. Worker B (Metrics)
    const schemaB = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
    const promptB = `Berikan justifikasi evaluasi naratif dan skor (0-100) untuk daftar metrik ini: ${JSON.stringify(aiPromptConfig.expectedMetrics)}. Data: ${dataString}. Skor Akhir Master adalah ${aiResult.totalScore}/100. Pastikan proporsional.`;

    // 3. Worker D (File Forensics)
    let finalFiles = null;
    if (geminiFiles.length > 0) {
      const schemaD = { type: SchemaType.OBJECT, required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"], properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } } };
      const fileParts = [{ text: `Lakukan analisis FORENSIK dokumen lampiran. Bandingkan isinya dengan klaim teks berikut: ${dataString}.` }];
      geminiFiles.forEach((f: any) => fileParts.push({ fileData: { mimeType: f.mimeType, fileUri: f.uri } } as any));
      
      finalFiles = await withRetry(async () => {
        const res = await getWorkerModel(schemaD).generateContent({ contents: [{ role: "user", parts: fileParts }] });
        let text = res.response.text().trim();
        return JSON.parse(text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
      });
    }

    const [blocksResult, metricsResult] = await Promise.all([
      withRetry(async () => {
        const res = await getWorkerModel(schemaA).generateContent(promptA);
        return JSON.parse(res.response.text().replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
      }),
      withRetry(async () => {
        const res = await getWorkerModel(schemaB).generateContent(promptB);
        return JSON.parse(res.response.text().replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
      })
    ]);

    await docRef.update({
      "aiResult.customAnalysisBlocks": blocksResult,
      "aiResult.metrics": metricsResult,
      "aiResult.fileAnalysisInsights": finalFiles,
      status: "PLANNING_ACTION"
    });

  } catch (error: any) {
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }

  return null;
});