import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
  const triangulatorSchema: any = {
    type: SchemaType.OBJECT,
    required: ["totalScore", "dataConfidenceScore", "readinessLevel", "incubationRoute", "executiveSummary", "_internalReasoning", "contradictionsFound", "swotAnalysis", "riskAssessment"],
    properties: {
      totalScore: { type: SchemaType.INTEGER },
      dataConfidenceScore: { type: SchemaType.INTEGER },
      readinessLevel: { type: SchemaType.STRING },
      incubationRoute: { type: SchemaType.STRING },
      executiveSummary: { type: SchemaType.STRING },
      _internalReasoning: { type: SchemaType.STRING },
      contradictionsFound: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      swotAnalysis: {
        type: SchemaType.OBJECT,
        required: ["strengths", "weaknesses", "opportunities", "threats"],
        properties: {
          strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        }
      },
      riskAssessment: {
        type: SchemaType.OBJECT,
        required: ["criticalRisks", "mitigationStrategies"],
        properties: {
          criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        }
      }
    }
  };

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
    systemInstruction: getSystemPrompt(true),
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: triangulatorSchema
    }
  });

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
    dataString,
    hasFiles: (data.storageFilePaths && data.storageFilePaths.length > 0) || (data.geminiFiles && data.geminiFiles.length > 0),
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

  const result = await withRetry(async () => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
    });
    let text = res.response.text().trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    }
    return JSON.parse(text);
  });

  return result;
};
