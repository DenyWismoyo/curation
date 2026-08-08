import { GoogleGenerativeAI } from '@google/generative-ai'
import { withRetry } from '../../../shared/utils/retry'
import { z } from 'zod'

const adaptiveAssessmentSchema = z
  .object({
    executiveSummary: z.string().default('Ringkasan belum tersedia.'),
    motivationalQuote: z.string().default('Teruslah berkembang dan jadikan setiap langkah sebagai progres.'),
    keyFocusArea: z.string().default('Fokus pada langkah kecil yang konsisten.'),
    riskAssessment: z
      .object({
        criticalRisks: z.array(z.string()).default([]),
        mitigationStrategies: z.array(z.string()).default([]),
      })
      .default({ criticalRisks: [], mitigationStrategies: [] }),
    recommendations: z
      .array(
        z.object({
          title: z.string().default(''),
          content: z.string().default(''),
        })
      )
      .default([]),
    nextActionSteps: z
      .array(
        z.object({
          timeframe: z.string().default('Langkah berikutnya'),
          task: z.string().default(''),
        })
      )
      .default([]),
    tipsAndTricks: z.array(z.string()).default([]),
    incubationRoute: z.string().default('Belum Ditentukan'),
    readinessLevel: z.string().default('N/A'),
    totalScore: z.number().default(0),
    dataConfidenceScore: z.number().default(0),
    swotAnalysis: z
      .object({
        strengths: z.array(z.string()).default([]),
        weaknesses: z.array(z.string()).default([]),
        opportunities: z.array(z.string()).default([]),
        threats: z.array(z.string()).default([]),
      })
      .default({ strengths: [], weaknesses: [], opportunities: [], threats: [] }),
    customActionPlan: z.array(z.any()).default([]),
    formPurpose: z.string().optional(),
  })
  .passthrough()

const resolveAdaptiveToneGuidance = (aiPromptConfig: any): string => {
  const preset = aiPromptConfig?.adaptiveLanguageStylePreset || 'auto'
  const formPurpose = String(
    aiPromptConfig?.formPurpose || 'assessment'
  ).toLowerCase()
  const audience = String(
    aiPromptConfig?.targetAudience || 'company'
  ).toLowerCase()

  const autoPreset =
    formPurpose === 'counseling'
      ? 'friendly_counseling'
      : audience === 'individual' || audience === 'student'
        ? 'friendly_self_assessment'
        : 'neutral_professional'

  const activePreset = preset === 'auto' ? autoPreset : preset

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
  }

  const base = map[activePreset] || map.neutral_professional
  const custom = aiPromptConfig?.adaptiveResultTonePrompt
  return custom && String(custom).trim().length > 0
    ? `${base}\nInstruksi tambahan khusus: ${String(custom).trim()}`
    : base
}

export const normalizeAdaptiveAssessmentPayload = (payload: any) => {
  const source = payload && typeof payload === 'object' ? payload : {}

  const ensureExactLength = (
    arr: string[],
    size: number,
    fallbackFactory: (index: number) => string
  ) => {
    const clean = arr
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)

    if (clean.length >= size) return clean.slice(0, size)

    const padded = [...clean]
    while (padded.length < size) {
      padded.push(fallbackFactory(padded.length))
    }
    return padded
  }

  const normalizeActionSteps = (value: any) => {
    const parsed = Array.isArray(value)
      ? value
      .filter((item) => item && typeof item === 'object')
      .slice(0, 5)
      .map((item: any) => ({
        timeframe:
          typeof item?.timeframe === 'string'
            ? item.timeframe.trim()
            : 'Langkah berikutnya',
        task: typeof item?.task === 'string' ? item.task.trim() : '',
      }))
      .filter((item) => item.task.length > 0)
      : []

    const padded = [...parsed]
    while (padded.length < 5) {
      const index = padded.length + 1
      padded.push({
        timeframe: `Langkah ${index}`,
        task: `Ambil satu tindakan kecil yang realistis untuk langkah ${index}, lalu evaluasi hasilnya di akhir hari.`,
      })
    }

    return padded.slice(0, 5)
  }

  const normalizeStringArray = (arr: any, max: number = 5) => {
    return Array.isArray(arr)
      ? arr.filter((item: any) => typeof item === 'string' && item.trim().length > 0).slice(0, max).map((item: any) => item.trim())
      : []
  }

  const normalizeRisks = (value: any) => {
    if (!value || typeof value !== 'object')
      return {
        criticalRisks: ensureExactLength([], 4, (index) => `Risiko prioritas ${index + 1} belum teridentifikasi secara detail.`),
        mitigationStrategies: ensureExactLength([], 4, (index) => `Mulai mitigasi ${index + 1} dengan tindakan sederhana, terukur, dan bisa dilakukan hari ini.`),
      }

    const normalizedRisks = normalizeStringArray(value.criticalRisks, 4)
    const normalizedMitigations = normalizeStringArray(value.mitigationStrategies, 4)

    return {
      criticalRisks: ensureExactLength(
        normalizedRisks,
        4,
        (index) => `Risiko prioritas ${index + 1} belum teridentifikasi secara detail.`
      ),
      mitigationStrategies: ensureExactLength(
        normalizedMitigations,
        4,
        (index) => `Mulai mitigasi ${index + 1} dengan tindakan sederhana, terukur, dan bisa dilakukan hari ini.`
      ),
    }
  }

  const normalizeRecommendations = (value: any) => {
    if (!Array.isArray(value)) return []
    return value
      .filter((item) => item && typeof item === 'object' && item.title && item.content)
      .slice(0, 5)
      .map((item: any) => ({
        title: String(item.title).trim(),
        content: String(item.content).trim(),
      }))
  }

  const normalizeSwot = (value: any) => {
    if (!value || typeof value !== 'object') return { strengths: [], weaknesses: [], opportunities: [], threats: [] }
    return {
      strengths: normalizeStringArray(value.strengths, 3),
      weaknesses: normalizeStringArray(value.weaknesses, 3),
      opportunities: normalizeStringArray(value.opportunities, 3),
      threats: normalizeStringArray(value.threats, 3),
    }
  }

  return {
    executiveSummary:
      typeof source.executiveSummary === 'string' &&
      source.executiveSummary.trim().length > 0
        ? source.executiveSummary.trim()
        : 'Ringkasan belum tersedia.',
    motivationalQuote: typeof source.motivationalQuote === 'string' && source.motivationalQuote.trim().length > 0 ? source.motivationalQuote.trim() : 'Teruslah berkembang dan jadikan setiap langkah sebagai progres.',
    keyFocusArea: typeof source.keyFocusArea === 'string' && source.keyFocusArea.trim().length > 0 ? source.keyFocusArea.trim() : 'Fokus pada langkah kecil yang konsisten.',
    riskAssessment: normalizeRisks(source.riskAssessment),
    nextActionSteps: normalizeActionSteps(source.nextActionSteps),
    recommendations: normalizeRecommendations(source.recommendations),
    tipsAndTricks: normalizeStringArray(source.tipsAndTricks, 5),
    incubationRoute: typeof source.incubationRoute === 'string' ? source.incubationRoute : 'Belum Ditentukan',
    readinessLevel: typeof source.readinessLevel === 'string' ? source.readinessLevel : 'N/A',
    totalScore: typeof source.totalScore === 'number' ? source.totalScore : 0,
    dataConfidenceScore: typeof source.dataConfidenceScore === 'number' ? source.dataConfidenceScore : 0,
    swotAnalysis: normalizeSwot(source.swotAnalysis),
    customActionPlan: Array.isArray(source.customActionPlan) ? source.customActionPlan : [],
  }
}

export const executeAdaptiveAssessment = async (
  assessmentId: string,
  data: any,
  GEMINI_API_KEY: string
): Promise<any> => {
  const formData = data.formData || {}
  const aiPromptConfig = data.aiPromptConfig || {}
  const adaptiveToneGuidance = resolveAdaptiveToneGuidance(aiPromptConfig)

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

  const prompt = `Sebagai AI Personal Assessment Expert, evaluasi data formulir berikut khusus untuk target audiens individu/kustomer.
Tugas Anda adalah menghasilkan laporan versi "LITE" yang sangat suportif, aplikatif, memotivasi, dan tidak terlalu teknis. DILARANG menggunakan istilah korporat B2B yang rumit.
Gunakan kalimat pendek, sederhana, dan mudah dipahami dalam sekali baca oleh pengguna awam.

Data pengguna: ${JSON.stringify(formData)}
Konteks: ${aiPromptConfig?.formPurpose || 'Asesmen Individu'}
Persona: ${aiPromptConfig?.aiPersona || 'Mentor pengembangan diri'}
Tone bahasa wajib: ${adaptiveToneGuidance}

Hasilkan struktur JSON dengan kolom berikut:
1. executiveSummary: Paragraf singkat yang merangkum kondisi saat ini dan apresiasi.
2. motivationalQuote: 1 kalimat kutipan motivasi yang suportif dan relevan dengan kondisi pengguna.
3. keyFocusArea: 1 kalimat singkat tentang "Fokus Utama Saat Ini" yang paling penting untuk diperhatikan pengguna.
4. riskAssessment: Objek dengan "criticalRisks" (array string) dan "mitigationStrategies" (array string). WAJIB BERISI TEPAT 4 RISIKO KUNCI DAN TEPAT 4 MITIGASI KUNCI.
5. recommendations: Array of objects dengan "title" dan "content".
6. nextActionSteps: Array of objects dengan "timeframe" dan "task". WAJIB BERISI TEPAT 5 LANGKAH STRATEGIS. Setiap langkah harus konkret, realistis, dan dapat dilakukan individu.
7. tipsAndTricks: Array of string (3-5 poin tips harian/praktis pendek).
8. incubationRoute: Nama program/jalur pengembangan (string).
9. readinessLevel: Label singkat tingkat kesiapan (string).
10. totalScore: Angka skor keseluruhan dari 0-100 (number).
11. dataConfidenceScore: Angka 0-100 untuk tingkat keyakinan data.
12. swotAnalysis: Objek dengan strengths, weaknesses, opportunities, threats.
13. customActionPlan: Array rencana tindak lanjut yang siap dipakai UI.

OUTPUT WAJIB BERUPA JSON MURNI YANG VALID. Contoh Struktur:
{
  "executiveSummary": "...",
  "motivationalQuote": "...",
  "keyFocusArea": "...",
  "riskAssessment": {
    "criticalRisks": ["..."],
    "mitigationStrategies": ["...", "...", "...", "..."]
  },
  "recommendations": [
    { "title": "...", "content": "..." }
  ],
  "nextActionSteps": [
    { "timeframe": "Langkah 1", "task": "..." },
    { "timeframe": "Langkah 2", "task": "..." },
    { "timeframe": "Langkah 3", "task": "..." },
    { "timeframe": "Langkah 4", "task": "..." },
    { "timeframe": "Langkah 5", "task": "..." }
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
`

  const result = await withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      systemInstruction: `Anda adalah AI Personal Assessment Expert. Kembalikan JSON murni saja. Jangan sertakan penjelasan, markdown, atau teks di luar JSON. Semua field wajib konsisten dengan skema, dan field yang tidak tersedia harus memakai array kosong, objek kosong, atau string default yang aman. WAJIB patuhi tone bahasa berikut: ${adaptiveToneGuidance}`,
    })

    const response = await model.generateContent(prompt)
    let text = response.response.text() || '{}'

    if (text.startsWith('```')) {
      text = text
        .replace(/^```(json)?/gi, '')
        .replace(/```$/g, '')
        .trim()
    }

    const parsed = JSON.parse(text)
    const sanitized = adaptiveAssessmentSchema.parse(parsed)
    return normalizeAdaptiveAssessmentPayload(sanitized)
  })

  return result
}
