import OpenAI from "openai";
import { withRetry } from "../../utils/retry";
import { z } from "zod";

const adaptiveAssessmentSchema = z.object({
  executiveSummary: z.string().default("Ringkasan belum tersedia."),
  riskAssessment: z.object({
    criticalRisks: z.array(z.string()).default([]),
    mitigationStrategies: z.array(z.string()).default([]),
  }).default({ criticalRisks: [], mitigationStrategies: [] }),
  nextActionSteps: z.array(z.object({
    timeframe: z.string().default("Langkah berikutnya"),
    task: z.string().default(""),
  })).default([]),
  formPurpose: z.string().optional(),
}).passthrough();

const resolveAdaptiveToneGuidance = (aiPromptConfig: any): string => {
  const preset = aiPromptConfig?.adaptiveLanguageStylePreset || 'auto';
  const formPurpose = String(aiPromptConfig?.formPurpose || 'assessment').toLowerCase();
  const audience = String(aiPromptConfig?.targetAudience || 'company').toLowerCase();

  const autoPreset =
    formPurpose === 'counseling'
      ? 'friendly_counseling'
      : (audience === 'individual' || audience === 'student')
        ? 'friendly_self_assessment'
        : 'neutral_professional';

  const activePreset = preset === 'auto' ? autoPreset : preset;

  const map: Record<string, string> = {
    friendly_counseling:
      'Gunakan bahasa empatik, hangat, tidak menghakimi, seperti sesi konseling mandiri yang aman.',
    friendly_self_assessment:
      'Gunakan bahasa ramah, mudah dipahami, dan membumi untuk kebutuhan asesmen mandiri.',
    warm_supportive:
      'Gunakan bahasa suportif yang memotivasi, menenangkan, dan fokus pada progres realistis.',
    neutral_professional:
      'Gunakan bahasa profesional ringan yang tetap humanis dan tidak terlalu teknis.',
    direct_coach:
      'Gunakan gaya coach yang tegas dan jelas, tetap sopan, dan menekankan langkah praktis.',
  };

  const base = map[activePreset] || map.neutral_professional;
  const custom = aiPromptConfig?.adaptiveResultTonePrompt;
  return custom && String(custom).trim().length > 0
    ? `${base}\nInstruksi tambahan khusus: ${String(custom).trim()}`
    : base;
};

export const normalizeAdaptiveAssessmentPayload = (payload: any) => {
  const source = payload && typeof payload === 'object' ? payload : {};

  const normalizeActionSteps = (value: any) => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item === 'object')
      .slice(0, 10)
      .map((item: any) => ({
        timeframe: typeof item?.timeframe === 'string' ? item.timeframe.trim() : 'Langkah berikutnya',
        task: typeof item?.task === 'string' ? item.task.trim() : '',
      }))
      .filter((item) => item.task.length > 0);
  };

  const normalizeRisks = (value: any) => {
    if (!value || typeof value !== 'object') return { criticalRisks: [], mitigationStrategies: [] };
    return {
      criticalRisks: Array.isArray(value.criticalRisks)
        ? value.criticalRisks.filter((item: any) => typeof item === 'string' && item.trim().length > 0).slice(0, 5).map((item: any) => item.trim())
        : [],
      mitigationStrategies: Array.isArray(value.mitigationStrategies)
        ? value.mitigationStrategies.filter((item: any) => typeof item === 'string' && item.trim().length > 0).slice(0, 5).map((item: any) => item.trim())
        : [],
    };
  };

  return {
    executiveSummary: typeof source.executiveSummary === 'string' && source.executiveSummary.trim().length > 0
      ? source.executiveSummary.trim()
      : 'Ringkasan belum tersedia.',
    riskAssessment: normalizeRisks(source.riskAssessment),
    nextActionSteps: normalizeActionSteps(source.nextActionSteps),
  };
};

export const executeAdaptiveAssessment = async (
  assessmentId: string, 
  data: any, 
  DEEPSEEK_API_KEY: string
): Promise<any> => {
  const formData = data.formData || {};
  const aiPromptConfig = data.aiPromptConfig || {};
  const adaptiveToneGuidance = resolveAdaptiveToneGuidance(aiPromptConfig);

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_API_KEY
  });

  const prompt = `Sebagai AI Personal Assessment Expert, evaluasi data formulir berikut khusus untuk target audiens individu/kustomer.
Tugas Anda adalah menghasilkan laporan versi "LITE" yang sangat aplikatif, memotivasi, dan tidak terlalu teknis. DILARANG menggunakan istilah korporat B2B yang rumit.

Data pengguna: ${JSON.stringify(formData)}
Konteks: ${aiPromptConfig?.formPurpose || 'Asesmen Individu'}
Persona: ${aiPromptConfig?.aiPersona || 'Mentor pengembangan diri'}
Tone bahasa wajib: ${adaptiveToneGuidance}

Hasilkan struktur berikut:
1. executiveSummary: Paragraf singkat yang merangkum kondisi saat ini dan apresiasi.
2. riskAssessment: Objek dengan "criticalRisks" (array string) dan "mitigationStrategies" (array string).
3. recommendations: Array of objects dengan "title" dan "content".
4. nextActionSteps: Array of objects dengan "timeframe" dan "task".
5. tipsAndTricks: Array of string (3-5 poin tips harian/praktis pendek).
6. incubationRoute: Nama program/jalur pengembangan (string).
7. readinessLevel: Label singkat tingkat kesiapan (string).
8. totalScore: Angka skor keseluruhan dari 0-100 (number).
9. dataConfidenceScore: Angka 0-100 untuk tingkat keyakinan data.
10. swotAnalysis: Objek dengan strengths, weaknesses, opportunities, threats.
11. customActionPlan: Array rencana tindak lanjut yang siap dipakai UI.

OUTPUT WAJIB BERUPA JSON MURNI YANG VALID. Contoh Struktur:
{
  "executiveSummary": "...",
  "riskAssessment": {
    "criticalRisks": ["..."],
    "mitigationStrategies": ["..."]
  },
  "recommendations": [
    { "title": "...", "content": "..." }
  ],
  "nextActionSteps": [
    { "timeframe": "...", "task": "..." }
  ],
  "tipsAndTricks": ["..."],
  "incubationRoute": "...",
  "readinessLevel": "...",
  "totalScore": 85,
  "dataConfidenceScore": 75,
  "swotAnalysis": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  "customActionPlan": []
}
`;

  const result = await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat", // DeepSeek V3
      messages: [
        { role: "system", content: `Anda adalah AI Personal Assessment Expert. Kembalikan JSON murni saja. Jangan sertakan penjelasan, markdown, atau teks di luar JSON. Semua field wajib konsisten dengan skema, dan field yang tidak tersedia harus memakai array kosong, objek kosong, atau string default yang aman. WAJIB patuhi tone bahasa berikut: ${adaptiveToneGuidance}` },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    let text = response.choices[0].message.content || "{}";
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    }

    const parsed = JSON.parse(text);
    const sanitized = adaptiveAssessmentSchema.parse(parsed);
    return normalizeAdaptiveAssessmentPayload(sanitized);
  });

  return result;
};
