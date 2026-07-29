import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const executeTacticalPlanner = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string
): Promise<{ recommendations: any; nextActionSteps: any }> => {
  const aiResult = data.aiResult || {};
  const aiPromptConfig = data.aiPromptConfig || {};

  const genAI = new GoogleGenerativeAI(API_KEY);

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
    
  const audienceType = aiPromptConfig.targetAudience || 'entitas';
  const promptC = `Buat Rencana Tindakan TAKTIS untuk area rekomendasi ini: ${JSON.stringify(aiPromptConfig.expectedRecommendations)}. Fokus pada risiko: ${JSON.stringify(aiResult.riskAssessment?.criticalRisks)}. 
  
  PERINGATAN SUDUT PANDANG MUTLAK: Rencana tindakan ini WAJIB ditujukan LANGSUNG kepada subjek yang dinilai (Kategori Klien: ${audienceType}) agar mereka bisa memperbaiki operasi/diri mereka sendiri. DILARANG KERAS menulis instruksi untuk tim auditor/penilai (Jangan menulis "Lakukan verifikasi lapangan", tapi tulislah "Lakukan audit internal di sistem Anda").
  
  Konteks Target: ${audienceType}. Aturan gaya: ${aiPromptConfig.actionPlanBehavior || 'Profesional.'}`;
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "Hasilkan Action Plan format JSON.",
    generationConfig: { 
      temperature: 0.3,
      responseMimeType: "application/json", 
      responseSchema: schemaC as any 
    }
  });

  const res = await model.generateContent(promptC);
  let text = res.response.text().trim();
  if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
  
  const finalRecommendations = JSON.parse(text);

  return {
    recommendations: finalRecommendations.recommendations || [],
    nextActionSteps: finalRecommendations.nextActionSteps || []
  };
};