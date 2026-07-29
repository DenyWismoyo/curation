import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { buildAssessmentPrompt, getSystemPrompt } from "../../prompt/promptTemplate";
import { withRetry } from "../../utils/retry";

export const executeTriangulator = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string,
  docRef?: any // Ditambahkan agar bisa mengupdate docRef jika ada upload file
): Promise<any> => {
  const aiResult = data.aiResult || {};
  const aiPromptConfig = data.aiPromptConfig || {};
  const geminiFiles = data.geminiFiles || [];
  const storageFilePaths = data.storageFilePaths || [];
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
    systemInstruction: getSystemPrompt(true),
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    }
  });

  // 1. Dapatkan referensi files jika ada
  let uploadedFileRefs: any[] = [];
  if (geminiFiles.length > 0) {
    uploadedFileRefs = geminiFiles.map((f: any) => ({
      fileData: { mimeType: f.mimeType, fileUri: f.uri }
    }));
  } else if (storageFilePaths.length > 0) {
    const fileManager = new GoogleAIFileManager(API_KEY);
    
    const bucket = admin.storage().bucket();
    const tempFiles: string[] = [];
    const newGeminiFiles = [];

    for (const storagePath of storageFilePaths) {
      const file = bucket.file(storagePath);
      const [metadata] = await file.getMetadata();
      let mimeType = metadata.contentType || 'application/octet-stream';
      
      if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('image')) {
        const fileName = path.basename(storagePath);
        const tempFilePath = path.join(os.tmpdir(), fileName);
        await file.download({ destination: tempFilePath });
        tempFiles.push(tempFilePath);
        
        const displayName = fileName.length > 40 ? fileName.substring(0, 40) : fileName;
        try {
          const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType,
            displayName
          });
          newGeminiFiles.push({
            name: uploadResult.file.name,
            uri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType
          });
          uploadedFileRefs.push({
            fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri }
          });
        } catch(e) {
          console.error("Failed to upload to Gemini:", e);
        }
      }
    }
    
    tempFiles.forEach(f => {
      try { fs.unlinkSync(f); } catch(e) {}
    });

    if (newGeminiFiles.length > 0) {
      if (docRef) {
        await docRef.update({ geminiFiles: admin.firestore.FieldValue.arrayUnion(...newGeminiFiles) });
      }
      if (!data.geminiFiles) data.geminiFiles = [];
      data.geminiFiles.push(...newGeminiFiles);
    }
  }

  const formData = data.formData || {};
  const trackType = data.trackType || "Evaluasi Umum";

  const textData: Record<string, any> = {};
  for (const key in formData) {
    const val = formData[key];
    if (typeof val !== 'string' || !val.startsWith('http')) {
      if (val) textData[key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())] = val;
    }
  }
  
  const expertMetrics = aiResult.metrics ? `\n\n[LAPORAN DOMAIN EXPERTS - SKOR PILAR (0-100)]:\n${JSON.stringify(aiResult.metrics)}` : "";
  const expertArgs = aiResult.fieldArguments ? `\n\n[LAPORAN DOMAIN EXPERTS - BEDAH ARGUMEN Tiap Field]:\n${JSON.stringify(aiResult.fieldArguments)}` : "";
  const expertFiles = aiResult.fileAnalysisInsights ? `\n\n[LAPORAN DOMAIN EXPERTS - ANALISIS DOKUMEN]:\n${JSON.stringify(aiResult.fileAnalysisInsights)}` : "";

  const dataString = Object.entries(textData).map(([k, v]) => `- [Data ${k}]: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n") + expertMetrics + expertArgs + expertFiles;
  const targetAudience = aiPromptConfig.targetAudience || 'company';

  const finalPrompt = buildAssessmentPrompt({
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
    customSystemPrompt: aiPromptConfig.customSystemPrompt || '',
    negativePrompts: aiPromptConfig.negativePrompts,
    formatInstructions: aiPromptConfig.formatInstructions,
    customScoringRubric: aiPromptConfig.customScoringRubric,
    targetAudience: targetAudience
  });

  const parts: any[] = [{ text: finalPrompt }];
  if (uploadedFileRefs.length > 0) {
    parts.push(...uploadedFileRefs);
  }

  const result = await withRetry(async () => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts }]
    });
    let text = res.response.text().trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    }
    return JSON.parse(text);
  });

  return result;
};
