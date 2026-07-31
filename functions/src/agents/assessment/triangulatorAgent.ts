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

  // ═══════════════════════════════════════════════════════════════════
  // PERBAIKAN: Expand gradingStrictness & reportTone menjadi instruksi
  // bermakna agar AI benar-benar mengikuti tone & keketatan yang diset admin
  // ═══════════════════════════════════════════════════════════════════
  const strictnessMap: Record<string, string> = {
    'supportive': 'Penilaian SUPORTIF: Fokus pada potensi dan sisi positif subjek. Awali setiap evaluasi dengan apresiasi yang genuine sebelum menyampaikan area perbaikan. Gunakan bahasa yang membesarkan hati. DILARANG menggunakan bahasa yang menghakimi atau menjatuhkan. Framing kelemahan sebagai "peluang pengembangan".',
    'standard': 'Penilaian STANDAR (OBJEKTIF): Berikan evaluasi yang berimbang antara kekuatan dan kelemahan berdasarkan fakta. Hindari bias positif atau negatif yang berlebihan. Sampaikan kritik secara konstruktif dengan disertai rekomendasi perbaikan yang konkret.',
    'strict': 'Penilaian SANGAT KETAT (FORENSIK): Lakukan analisis dengan standar audit tertinggi. Tantang setiap klaim yang tidak disertai bukti. Hancurkan asumsi yang lemah. Berikan penalti skor signifikan untuk klaim besar tanpa substantiasi. Ungkap semua anomali, inkonsistensi, dan potensi manipulasi data. Jangan ada toleransi untuk jawaban generik atau superfisial.',
  };

  const toneMap: Record<string, string> = {
    'consultative': 'Gaya Bahasa KONSULTATIF: Tulis seperti konsultan terpercaya yang berbicara langsung kepada klien. Gunakan kata "kami merekomendasikan", berikan 2-3 opsi solusi, tunjukkan empati terhadap tantangan yang dihadapi, dan tutup setiap poin dengan langkah konkret yang actionable.',
    'investigative': 'Gaya Bahasa INVESTIGATIF: Tulis seperti lead auditor berpengalaman. Gunakan bahasa yang tegas, faktual, dan tidak ambigu. Tunjukkan anomali dan red flag secara eksplisit. Setiap temuan harus didukung oleh data spesifik dari jawaban subjek. Hindari bahasa bersayap atau kiasan.',
    'academic': 'Gaya Bahasa AKADEMIS: Tulis dengan struktur ilmiah yang sistematis dan terstruktur. Gunakan terminologi domain yang tepat, referensikan standar atau kerangka yang relevan, dan dukung setiap pernyataan dengan data atau logika yang terverifikasi. Gunakan bahasa formal tanpa ekspresi emosional.',
  };

  const resolvedStrictness = strictnessMap[aiPromptConfig.gradingStrictness || 'standard'] || strictnessMap['standard'];
  const resolvedTone = toneMap[aiPromptConfig.reportTone || 'consultative'] || toneMap['consultative'];

  // Ekstrak tier names untuk fewShotContext jika ada customReadinessTiers
  const tierNames = (aiPromptConfig.customReadinessTiers || [])
    .map((t: string) => t.split('(')[0]?.trim())
    .filter(Boolean);
  const fewShotContext = tierNames.length > 0
    ? `\nCONTOH FORMAT READINESS LEVEL YANG VALID (WAJIB IKUTI):\n${tierNames.map((n: string) => `- "${n} | [3-5 kata sifat deskriptif yang dinamis]"`).join('\n')}\n`
    : '';

  const finalPrompt = buildAssessmentPrompt({
    aiPersona: aiPromptConfig.aiPersona || "AHLI ANALISIS",
    trackContext: trackType,
    assessmentGoal: aiPromptConfig.assessmentGoal || "Evaluasi kelayakan",
    strictnessInstruction: resolvedStrictness,
    toneInstruction: resolvedTone,
    dataString,
    hasFiles: (data.storageFilePaths && data.storageFilePaths.length > 0) || (data.geminiFiles && data.geminiFiles.length > 0),
    mediaFocus: aiPromptConfig.mediaAnalysisFocus ? `Fokus Media: ${aiPromptConfig.mediaAnalysisFocus}.` : '',
    targetAnalysisBlocks: aiPromptConfig.expectedAnalysisBlocks?.map((b: string) => `- ${b}`).join("\n") || "- Posisi Pasar",
    targetMetrics: aiPromptConfig.expectedMetrics || ["Validasi", "Keuangan"],
    riskInstruction: aiPromptConfig.riskFramework || "Identifikasi risiko.",
    targetRecommendations: aiPromptConfig.expectedRecommendations?.map((r: string) => `- ${r}`).join("\n") || "- Strategi",
    tiersString: (aiPromptConfig.customReadinessTiers || []).join(' | ') || '"Pra-Inkubasi", "Siap Akselerasi"',
    fewShotContext,
    customSystemPrompt: aiPromptConfig.customSystemPrompt || '',
    negativePrompts: aiPromptConfig.negativePrompts,
    formatInstructions: aiPromptConfig.formatInstructions,
    customScoringRubric: aiPromptConfig.customScoringRubric,
    targetAudience: targetAudience,
    formPurpose: aiPromptConfig.formPurpose || 'assessment',
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
