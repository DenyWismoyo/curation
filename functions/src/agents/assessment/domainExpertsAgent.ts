import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { withRetry } from "../../utils/retry";

export const executeDomainExperts = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string
): Promise<{ metricsResult: any; fieldArgsResult: any; finalFiles: any }> => {
  const aiResult = data.aiResult || {};
  const aiPromptConfig = data.aiPromptConfig || {};
  const geminiFiles = data.geminiFiles || [];

  const genAI = new GoogleGenerativeAI(API_KEY);

  const getWorkerModel = (schema: any) => genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "Anda adalah AI Content Elaborator berkecepatan tinggi. Ekstrak wawasan menjadi narasi PRESISI dalam format JSON murni. Gunakan '\\n' untuk baris baru.",
    generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema }
  });

  const dataString = JSON.stringify(data.formData || {});

  // 1. Worker B (Radar Metrics)
  const schemaB = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING, ...(aiPromptConfig.expectedMetrics?.length > 0 && { enum: aiPromptConfig.expectedMetrics }) }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
  const promptB = `TUGAS ANDA:
1. Anda HANYA BOLEH menghasilkan persis ${aiPromptConfig.expectedMetrics?.length || 6} metrik.
2. Daftar metrik yang WAJIB Anda hasilkan adalah: ${JSON.stringify(aiPromptConfig.expectedMetrics)}. DILARANG KERAS menambah atau mengurangi metrik dari daftar ini!
3. Berikan justifikasi evaluasi naratif dan skor (0-100) HANYA untuk metrik-metrik tersebut berdasarkan Data berikut.

Data Subjek: ${dataString}.`;

  // 2. Worker C (Field Arguments / Analisis Detil)
  const schemaC = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
  const promptC = `TUGAS ANDA:
Lakukan evaluasi mendalam pada SETIAP poin data/jawaban yang ada di form berikut. Untuk setiap poin data, buatkan satu entri yang berisi:
- label: (Nama atau pertanyaan dari poin data tersebut, misal 'D39. Manajemen Pengetahuan')
- score: (Nilai 0-100 untuk poin ini)
- description: (Analisis/argumen tajam AI tentang poin ini)

Data Subjek: ${dataString}.`;

  // 3. Worker D (File Forensics)
  const fileParts: any[] = [];
  let schemaD: any = null;
  if (geminiFiles.length > 0) {
    schemaD = { type: SchemaType.OBJECT, required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"], properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } } };
    fileParts.push({ text: `Lakukan analisis FORENSIK dokumen lampiran. Bandingkan isinya dengan klaim teks berikut: ${dataString}.` });
    geminiFiles.forEach((f: any) => fileParts.push({ fileData: { mimeType: f.mimeType, fileUri: f.uri } } as any));
  }

  const [metricsResult, fieldArgsResult, finalFiles] = await Promise.all([
    withRetry(async () => {
      const res = await getWorkerModel(schemaB).generateContent(promptB);
      return JSON.parse(res.response.text().replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
    }),
    withRetry(async () => {
      const res = await getWorkerModel(schemaC).generateContent(promptC);
      return JSON.parse(res.response.text().replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
    }),
    (async () => {
      if (geminiFiles.length === 0) return null;
      return withRetry(async () => {
        const res = await getWorkerModel(schemaD).generateContent({ contents: [{ role: "user", parts: fileParts }] });
        let text = res.response.text().trim();
        return JSON.parse(text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
      });
    })()
  ]);

  return { metricsResult, fieldArgsResult, finalFiles };
};