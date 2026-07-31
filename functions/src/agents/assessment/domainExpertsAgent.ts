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
  
  const rawFileParts: any[] = geminiFiles.map((f: any) => ({ fileData: { mimeType: f.mimeType, fileUri: f.uri } }));
  const fileInstruction = rawFileParts.length > 0 ? `\n\nDokumen lampiran telah disertakan sebagai bukti dukung. Anda WAJIB memvalidasi klaim teks dengan dokumen ini sebelum memberikan skor. JANGAN HANYA PERCAYA PADA KLAIM TEKS.` : ``;

  // 1. Worker B (Radar Metrics)
  const schemaB = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING, ...(aiPromptConfig.expectedMetrics?.length > 0 && { enum: aiPromptConfig.expectedMetrics }) }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
  const promptB = `TUGAS ANDA:
1. Anda HANYA BOLEH menghasilkan persis ${aiPromptConfig.expectedMetrics?.length || 6} metrik.
2. Daftar metrik yang WAJIB Anda hasilkan adalah: ${JSON.stringify(aiPromptConfig.expectedMetrics)}. DILARANG KERAS menambah atau mengurangi metrik dari daftar ini!
3. Berikan justifikasi evaluasi naratif dan skor (0-100) HANYA untuk metrik-metrik tersebut berdasarkan Data berikut.

Data Subjek: ${dataString}.${fileInstruction}`;

  // ═══════════════════════════════════════════════════════════════════
  // PERBAIKAN: Worker C sekarang di-align dengan expectedAnalysisBlocks
  // agar evaluasi per-field terhubung ke blok analisis admin
  // ═══════════════════════════════════════════════════════════════════
  // 2. Worker C (Field Arguments / Analisis Detail yang aligned dengan Analysis Blocks)
  const schemaC = { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, required: ["label", "score", "description"], properties: { label: { type: SchemaType.STRING }, score: { type: SchemaType.INTEGER }, description: { type: SchemaType.STRING } } } };
  
  const analysisBlocksContext = aiPromptConfig.expectedAnalysisBlocks?.length > 0
    ? `\n\nKERANGKA BLOK ANALISIS YANG HARUS DIEVALUASI (gunakan ini sebagai panduan untuk menentukan relevansi setiap field):\n${aiPromptConfig.expectedAnalysisBlocks.map((b: string) => `- ${b}`).join('\n')}`
    : '';
    
  const promptC = `TUGAS ANDA:
Lakukan evaluasi mendalam pada SETIAP poin data/jawaban yang ada di form berikut. Untuk setiap poin data, buatkan satu entri yang berisi:
- label: (Nama atau pertanyaan dari poin data tersebut)
- score: (Nilai 0-100 untuk poin ini, selaras dengan rubrik penilaian: ${aiPromptConfig.customScoringRubric || 'Standar objektif'})
- description: (Analisis/argumen tajam AI tentang poin ini, dan kaitannya dengan blok analisis yang relevan)
${analysisBlocksContext}

Data Subjek: ${dataString}.${fileInstruction}`;

  // 3. Worker D (File Forensics)
  const fileParts: any[] = [];
  let schemaD: any = null;
  if (geminiFiles.length > 0) {
    schemaD = { type: SchemaType.OBJECT, required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"], properties: { documentQuality: { type: SchemaType.STRING }, keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, discrepancies: { type: SchemaType.STRING } } };
    fileParts.push({ text: `Lakukan analisis FORENSIK dokumen lampiran. Bandingkan isinya dengan klaim teks berikut: ${dataString}.` });
    fileParts.push(...rawFileParts);
  }

  const safeParseJSON = (text: string, isArray: boolean = true) => {
    try {
      return JSON.parse(text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim());
    } catch (e) {
      console.warn("JSON Parse failed, attempting fallback extraction", e);
      try {
        const startChar = isArray ? '[' : '{';
        const endChar = isArray ? ']' : '}';
        const cleanText = text.substring(text.indexOf(startChar), text.lastIndexOf(endChar) + 1);
        return JSON.parse(cleanText);
      } catch (fallbackError) {
        console.error("Fallback JSON Parse also failed", fallbackError);
        return isArray ? [] : {};
      }
    }
  };

  const storageFilePaths = data.storageFilePaths || [];

  const [metricsResult, fieldArgsResult, finalFiles] = await Promise.all([
    withRetry(async () => {
      const contents = [{ role: "user", parts: [{ text: promptB }, ...rawFileParts] }];
      const res = await getWorkerModel(schemaB).generateContent({ contents } as any);
      return safeParseJSON(res.response.text().trim(), true);
    }),
    withRetry(async () => {
      const contents = [{ role: "user", parts: [{ text: promptC }, ...rawFileParts] }];
      const res = await getWorkerModel(schemaC).generateContent({ contents } as any);
      return safeParseJSON(res.response.text().trim(), true);
    }),
    (async () => {
      if (geminiFiles.length === 0) {
        if (storageFilePaths.length > 0) {
          // File ada di storage, tapi gagal di-upload ke Gemini
          return {
            documentQuality: "Dokumen terlampir tersedia tetapi tidak dapat diproses oleh AI karena format file tidak didukung atau terjadi kegagalan sistem saat mengimpor data.",
            keyFindingsFromFiles: ["File dapat diakses secara manual melalui tab 'Data Input Peserta' untuk validasi oleh kurator."],
            discrepancies: ""
          };
        }
        return null;
      }
      return withRetry(async () => {
        const res = await getWorkerModel(schemaD).generateContent({ contents: [{ role: "user", parts: fileParts }] });
        return safeParseJSON(res.response.text().trim(), false);
      });
    })()
  ]);

  return { metricsResult, fieldArgsResult, finalFiles };
};