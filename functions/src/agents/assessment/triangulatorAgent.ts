import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore"; // PERBAIKAN: Import getFirestore
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { buildAssessmentPrompt, getSystemPrompt } from "../../promt/promptTemplate";

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

export const assessmentTriangulatorAgent = onDocumentWritten({
  database: "curation", // PERBAIKAN: Menunjuk database curation
  document: "assessments/{assessmentId}", // PERBAIKAN: Hapus "curation/" di depan
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const afterData = event.data?.after.data();

  if (!afterData || afterData.status !== "ANALYZING_MASTER") return null;
  // Mencegah loop jika sudah diproses
  if (afterData.aiResult?.executiveSummary) return null;

  const docRef = event.data!.after.ref;
  const formData = afterData.formData || {};
  const trackType = afterData.trackType || "Evaluasi Umum";
  const aiPromptConfig = afterData.aiPromptConfig || {};
  const storageFilePaths = afterData.storageFilePaths || [];

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);
  const fileManager = new GoogleAIFileManager(API_KEY);
  
  const tempLocalFiles: string[] = [];
  const uploadedGeminiFiles: any[] = [];
  const parts: any[] = [];
  const db = getFirestore(admin.app(), "curation"); // PERBAIKAN: Mengarah ke database curation yang benar

  try {
    const bucket = admin.storage().bucket();
    
    if (storageFilePaths && storageFilePaths.length > 0) {
      for (const filePath of storageFilePaths) {
        try {
          const fileName = path.basename(filePath);
          const [metadata] = await bucket.file(filePath).getMetadata();
          const mimeType = metadata.contentType || 'application/octet-stream';
          const isSupported = mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/') || mimeType.startsWith('text/');
          
          if (!isSupported) {
            parts.push({ text: `[SYSTEM NOTE]: Pengguna melampirkan berkas "${fileName}". Secara administratif BUKTI TELAH DILAMPIRKAN.` });
            continue;
          }
          
          const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${fileName}`);
          await bucket.file(filePath).download({ destination: tempFilePath });
          tempLocalFiles.push(tempFilePath);

          const uploadResult = await withRetry(() => fileManager.uploadFile(tempFilePath, { mimeType, displayName: "Dokumen Lampiran" }));
          let fileState = await withRetry(() => fileManager.getFile(uploadResult.file.name));
          
          let pollingAttempts = 0;
          while (fileState.state === "PROCESSING" && pollingAttempts < 20) {
            await new Promise(r => setTimeout(r, 5000));
            fileState = await withRetry(() => fileManager.getFile(uploadResult.file.name));
            pollingAttempts++;
          }
          
          if (fileState.state === "FAILED" || fileState.state === "PROCESSING") continue;
          
          uploadedGeminiFiles.push({ name: uploadResult.file.name, uri: uploadResult.file.uri, mimeType: uploadResult.file.mimeType });
          parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
          
        } catch (err) { console.warn("File upload failed", err); }
      }
    }

    let fewShotContext = "";
    try {
      const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const ragQuery = `Track: ${trackType}, Data Bisnis: ${JSON.stringify(formData)}`;
      const embedResult = await withRetry(() => embedModel.embedContent(ragQuery));
      const vectorQuery = db.collection('business_vectors').findNearest('embedding', admin.firestore.FieldValue.vector(embedResult.embedding.values), { limit: 2, distanceMeasure: 'COSINE' });
      const vectorSnap = await vectorQuery.get();
      
      if (!vectorSnap.empty) {
        fewShotContext = `\n[KONTEKS RAG INDUSTRI]: Gunakan profil bisnis serupa yang pernah dievaluasi ini sebagai pembanding kalibrasi: ` + vectorSnap.docs.map(d => `(${d.data().namaUsaha} | Kesiapan: ${d.data().readinessLevel} | Skor: ${d.data().score})`).join(", ");
      }
    } catch (err) { }

    const textData: Record<string, any> = {};
    for (const key in formData) {
      const val = formData[key];
      if (typeof val !== 'string' || !val.startsWith('http')) {
        if (val) textData[key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())] = val;
      }
    }
    
    const dataString = Object.entries(textData).map(([k, v]) => `- [Data ${k}]: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
    const targetAudience = aiPromptConfig.targetAudience || 'company';
    
    const mainPromptText = buildAssessmentPrompt({
      aiPersona: aiPromptConfig.aiPersona || "AHLI ANALISIS",
      trackContext: trackType,
      assessmentGoal: aiPromptConfig.assessmentGoal || "Evaluasi kelayakan",
      strictnessInstruction: aiPromptConfig.gradingStrictness === 'strict' ? "Penilaian SANGAT KETAT" : "Penilaian objektif",
      toneInstruction: aiPromptConfig.reportTone || "Gaya bahasa: Konsultatif",
      dataString, storageFilePaths,
      mediaFocus: aiPromptConfig.mediaAnalysisFocus ? `Fokus Media: ${aiPromptConfig.mediaAnalysisFocus}.` : '',
      targetAnalysisBlocks: aiPromptConfig.expectedAnalysisBlocks?.map((b: string) => `- ${b}`).join("\n") || "- Posisi Pasar",
      targetMetrics: aiPromptConfig.expectedMetrics || ["Validasi", "Keuangan"],
      riskInstruction: aiPromptConfig.riskFramework || "Identifikasi risiko.",
      targetRecommendations: aiPromptConfig.expectedRecommendations?.map((r: string) => `- ${r}`).join("\n") || "- Strategi",
      tiersString: (aiPromptConfig.customReadinessTiers || []).join(', ') || '"Pra-Inkubasi", "Siap Akselerasi"',
      fewShotContext,
      customSystemPrompt: aiPromptConfig.customSystemPrompt || '',
      negativePrompts: aiPromptConfig.negativePrompts,
      formatInstructions: aiPromptConfig.formatInstructions,
      customScoringRubric: aiPromptConfig.customScoringRubric,
      targetAudience: targetAudience
    });

    parts.unshift({ text: mainPromptText });
    
    const masterModel = genAI.getGenerativeModel({
      model: "gemini-3.1-pro-preview",
      systemInstruction: getSystemPrompt(true),
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: ["_internalReasoning", "readinessLevel", "totalScore", "dataConfidenceScore", "contradictionsFound", "incubationRoute", "executiveSummary", "swotAnalysis", "riskAssessment"],
          properties: {
            _internalReasoning: { type: SchemaType.STRING },
            executiveSummary: { type: SchemaType.STRING },
            readinessLevel: { type: SchemaType.STRING },
            totalScore: { type: SchemaType.INTEGER },
            dataConfidenceScore: { type: SchemaType.INTEGER },
            contradictionsFound: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            incubationRoute: { type: SchemaType.STRING },
            swotAnalysis: {
              type: SchemaType.OBJECT,
              properties: { strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
            },
            riskAssessment: {
              type: SchemaType.OBJECT,
              properties: { criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
            }
          }
        }
      }
    });

    const masterPromptOverride = `
      ${parts[0].text}
      PERHATIAN TUGAS MASTER AGENT:
      1. HANYA mengisi kerangka JSON utama ("_internalReasoning", "totalScore", "swotAnalysis", dll).
      2. DILARANG KERAS menjabarkan Custom Analysis Blocks atau Metrics!
      3. executiveSummary WAJIB dipisahkan dengan '\\n'.
    `;
    const masterParts = [{ text: masterPromptOverride }, ...parts.slice(1)];
    const masterResult = await withRetry(() => masterModel.generateContent({ contents: [{ role: "user", parts: masterParts }] }));
    
    let rawText = masterResult.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    const masterJson = JSON.parse(rawText);

    const publicAiResult = {
      executiveSummary: masterJson.executiveSummary || "",
      readinessLevel: masterJson.readinessLevel || "Belum Ditentukan",
      totalScore: masterJson.totalScore || 0,
      incubationRoute: masterJson.incubationRoute || "",
      riskAssessment: masterJson.riskAssessment || {},
      formPurpose: aiPromptConfig.formPurpose || 'assessment',
      targetAudience: targetAudience,
      customUiLabels: aiPromptConfig.customUiLabels || {},
      actionPlanBehavior: aiPromptConfig.actionPlanBehavior || ""
    };

    const internalAiResult = {
      _internalReasoning: masterJson._internalReasoning || "",
      dataConfidenceScore: masterJson.dataConfidenceScore || 0,
      contradictionsFound: masterJson.contradictionsFound || [],
      swotAnalysis: masterJson.swotAnalysis || {},
    };

    await docRef.update({
      aiResult: { ...publicAiResult, ...internalAiResult },
      score: publicAiResult.totalScore,
      readinessLevel: publicAiResult.readinessLevel,
      geminiFiles: uploadedGeminiFiles,
      status: "ANALYZING_METRICS",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  } catch (error: any) {
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  } finally {
    for (const tmpFile of tempLocalFiles) {
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
    }
  }
  return null;
});