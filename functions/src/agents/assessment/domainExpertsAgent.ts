import { onDocumentWritten } from "firebase-functions/v2/firestore";
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

export const assessmentDomainExpertsAgent = onDocumentWritten({
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
    // 1. Worker A (Analysis Blocks) - Dipindahkan ke Synthesis Agent
    
    // 2. Worker B (Radar Metrics)
    const schemaB = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
    const promptB = `TUGAS ANDA:
1. Anda HANYA BOLEH menghasilkan persis ${aiPromptConfig.expectedMetrics?.length || 6} metrik.
2. Daftar metrik yang WAJIB Anda hasilkan adalah: ${JSON.stringify(aiPromptConfig.expectedMetrics)}. DILARANG KERAS menambah atau mengurangi metrik dari daftar ini!
3. Berikan justifikasi evaluasi naratif dan skor (0-100) HANYA untuk metrik-metrik tersebut berdasarkan Data berikut.

Data Subjek: ${dataString}.`;

    // 3. Worker C (Field Arguments / Analisis Detil)
    const schemaC = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
    const promptC = `TUGAS ANDA:
Lakukan evaluasi mendalam pada SETIAP poin data/jawaban yang ada di form berikut. Untuk setiap poin data, buatkan satu entri yang berisi:
- label: (Nama atau pertanyaan dari poin data tersebut, misal 'D39. Manajemen Pengetahuan')
- score: (Nilai 0-100 untuk poin ini)
- description: (Analisis/argumen tajam AI tentang poin ini)

Data Subjek: ${dataString}.`;
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

    const [metricsResult, fieldArgsResult] = await Promise.all([
      withRetry(async () => {
        const res = await getWorkerModel(schemaB).generateContent(promptB);
        return JSON.parse(res.response.text().replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
      }),
      withRetry(async () => {
        const res = await getWorkerModel(schemaC).generateContent(promptC);
        return JSON.parse(res.response.text().replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
      })
    ]);

    await docRef.update({
      "aiResult.metrics": metricsResult,
      "aiResult.fieldArguments": fieldArgsResult,
      "aiResult.fileAnalysisInsights": finalFiles,
      status: "ANALYZING_MASTER"
    });

  } catch (error: any) {
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }

  return null;
});