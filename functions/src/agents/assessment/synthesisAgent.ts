import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { withRetry } from "../../utils/retry";

export const executeSynthesis = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string
): Promise<any> => {
  const aiResult = data.aiResult || {};
  const aiPromptConfig = data.aiPromptConfig || {};
  const formData = data.formData || {};

  const genAI = new GoogleGenerativeAI(API_KEY);

  const audienceContext = aiPromptConfig.targetAudience === 'individual'
    ? "TARGET AUDIENS: INDIVIDU / PERSONAL." : "TARGET AUDIENS: PERUSAHAAN / BISNIS.";

  const schemaA = { 
    type: SchemaType.ARRAY, 
    items: { 
      type: SchemaType.OBJECT, 
      required: ["title", "iconType", "metrics"], 
      properties: { 
        title: { 
          type: SchemaType.STRING,
          ...(aiPromptConfig.expectedAnalysisBlocks?.length > 0 && { enum: aiPromptConfig.expectedAnalysisBlocks.map((b: string) => b.split(':')[0].trim()) })
        }, 
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
    model: "gemini-2.5-flash",
    systemInstruction: "Anda adalah AI Synthesis & Reporting Expert tingkat lanjut. Hasilkan narasi laporan yang mendalam, kritis, dan koheren berdasarkan kompilasi data dari berbagai agen evaluasi. Format dalam JSON murni.",
    generationConfig: { 
      temperature: 0.4,
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

  return blocksResult;
};
