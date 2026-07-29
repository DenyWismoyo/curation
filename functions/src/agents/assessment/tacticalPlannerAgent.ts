import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const assessmentTacticalPlannerAgent = onDocumentUpdated({
  database: "curation", // PERBAIKAN: Menunjuk database curation
  document: "assessments/{assessmentId}", // PERBAIKAN: Hapus "curation/" di depan
  region: "asia-southeast2",
  memory: "256MiB",
  timeoutSeconds: 120,
  secrets: [geminiApiKeySecret],
}, async (event) => {
  const afterData = event.data?.after.data();

  if (afterData?.status !== "PLANNING_ACTION") return null;

  const docRef = event.data!.after.ref;
  const aiResult = afterData.aiResult || {};
  const aiPromptConfig = afterData.aiPromptConfig || {};

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  try {
    const schemaC = { 
       type: SchemaType.OBJECT, 
       required: ["recommendations", "nextActionSteps"], 
       properties: { 
         recommendations: { 
           type: SchemaType.ARRAY, 
           items: { 
             type: SchemaType.OBJECT, 
             required: ["title", "content"], 
             properties: { 
               title: { type: SchemaType.STRING }, 
               content: { type: SchemaType.STRING } 
             } 
           } 
         }, 
         nextActionSteps: { 
           type: SchemaType.ARRAY, 
           items: { 
             type: SchemaType.OBJECT, 
             required: ["timeframe", "task"], 
             properties: { 
               timeframe: { type: SchemaType.STRING }, 
               task: { type: SchemaType.STRING } 
             } 
           } 
         } 
       } 
     };
    
    const audienceContext = aiPromptConfig.targetAudience === 'individual' ? "TARGET: INDIVIDU" : "TARGET: PERUSAHAAN";
    const promptC = `Buat Rencana Tindakan TAKTIS untuk area rekomendasi ini: ${JSON.stringify(aiPromptConfig.expectedRecommendations)}. Fokus pada risiko: ${JSON.stringify(aiResult.riskAssessment?.criticalRisks)}. Konteks: ${audienceContext}. Aturan gaya: ${aiPromptConfig.actionPlanBehavior || 'Profesional.'}`;
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "Hasilkan Action Plan format JSON.",
      generationConfig: { 
         temperature: 0.1, 
         responseMimeType: "application/json", 
         responseSchema: schemaC as any 
       }
    });

    const res = await model.generateContent(promptC);
    let text = res.response.text().trim();
    if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    
    const finalRecommendations = JSON.parse(text);

    await docRef.update({
      "aiResult.recommendations": finalRecommendations.recommendations || [],
      "aiResult.nextActionSteps": finalRecommendations.nextActionSteps || [],
      status: "ASSEMBLING_REPORT"
    });

  } catch (error: any) {
    await docRef.update({ status: "FAILED", errorMessage: error.message });
  }

  return null;
});