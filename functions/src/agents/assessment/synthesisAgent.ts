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

export const assessmentSynthesisAgent = onDocumentUpdated({
  database: "curation",
  document: "assessments/{assessmentId}",
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const afterData = event.data?.after.data();

  if (afterData?.status !== "ASSEMBLING_REPORT") return null;

  const docRef = event.data!.after.ref;
  const aiResult = afterData.aiResult || {};
  const aiPromptConfig = afterData.aiPromptConfig || {};
  const formData = afterData.formData || {};

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  const audienceContext = aiPromptConfig.targetAudience === 'individual'
    ? "TARGET AUDIENS: INDIVIDU / PERSONAL." : "TARGET AUDIENS: PERUSAHAAN / BISNIS.";

  try {
    const schemaA = { 
      type: SchemaType.ARRAY, 
      items: { 
        type: SchemaType.OBJECT, 
        required: ["title", "iconType", "metrics"], 
        properties: { 
          title: { type: SchemaType.STRING }, 
          iconType: { type: SchemaType.STRING }, 
          metrics: { 
            type: SchemaType.ARRAY, 
            items: { 
              type: SchemaType.OBJECT, 
              required: ["label", "value"], 
              properties: { 
                label: { type: SchemaType.STRING }, 
                value: { type: SchemaType.STRING } 
              } 
            } 
          } 
        } 
      } 
    };

    const promptA = `Sebagai AI Synthesis & Reporting Expert, JABARKAN narasi analitis mendalam untuk kerangka blok ini: ${JSON.stringify(aiPromptConfig.expectedAnalysisBlocks)}. 
Data mentah subjek: ${JSON.stringify(formData)}. 
Selaraskan dengan temuan dari agen sebelumnya: 
- SWOT: ${JSON.stringify(aiResult.swotAnalysis)}
- Risiko: ${JSON.stringify(aiResult.riskAssessment)}
- Rekomendasi/Action Plan: ${JSON.stringify(aiResult.recommendations)}
- Metrics/Scores: ${JSON.stringify(aiResult.metrics)}

Konteks: ${audienceContext}
Aturan Khusus:
1. JANGAN sekadar menyalin atau mengulang jawaban peserta. Ekstrak makna, berikan insight, tren, atau evaluasi kritis.
2. Tiap 'value' pada metrik harus berupa paragraf/bullet points yang tajam dan analitis.
3. Gunakan '\\n' untuk baris baru.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-pro-preview",
      systemInstruction: "Anda adalah AI Synthesis & Reporting Expert tingkat lanjut. Hasilkan narasi laporan yang mendalam, kritis, dan koheren berdasarkan kompilasi data dari berbagai agen evaluasi. Format dalam JSON murni.",
      generationConfig: { 
        temperature: 0.2, 
        responseMimeType: "application/json", 
        responseSchema: schemaA as any
      }
    });

    const blocksResult = await withRetry(async () => {
      const res = await model.generateContent(promptA);
      let text = res.response.text().trim();
      if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      return JSON.parse(text);
    });

    await docRef.update({
      "aiResult.customAnalysisBlocks": blocksResult,
      status: "GENERATING_ASSETS"
    });

  } catch (error: any) {
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }

  return null;
});
