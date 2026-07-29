import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const adminGenerateMockData = onCall({
  memory: "256MiB",
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const data = request.data as any;
  const fields = data.fields || [];

  if (!fields || fields.length === 0) {
    throw new HttpsError("invalid-argument", "Fields tidak boleh kosong.");
  }

  const API_KEY = geminiApiKeySecret.value();
  const genAI = new GoogleGenerativeAI(API_KEY);

  const properties: Record<string, any> = {};
  const requiredFields: string[] = [];

  fields.forEach((field: any) => {
    if (field.type === 'multiselect') {
      properties[field.id] = { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } };
    } else {
      properties[field.id] = { type: SchemaType.STRING };
    }
    requiredFields.push(field.id);
  });

  const schema = {
    type: SchemaType.OBJECT,
    properties,
    required: requiredFields
  };

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: "Anda adalah asisten QA tester. Hasilkan mock data berupa jawaban hipotetis untuk formulir asesmen bisnis. Berikan jawaban yang detail, masuk akal dan komprehensif untuk pertanyaan esai (textarea), dan pilih salah satu/beberapa opsi logis untuk select/multiselect. Semua jawaban harus saling berhubungan untuk satu perusahaan.",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: schema as any
      }
    });

    const prompt = `Hasilkan JSON berisi mock data untuk field formulir berikut. Pastikan value yang dihasilkan sesuai dengan ID field.
    
    Fields: ${JSON.stringify(fields.map((f: any) => ({ id: f.id, label: f.label, type: f.type, options: f.options })))}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return JSON.parse(text);

  } catch (error: any) {
    console.error("Gagal men-generate mock data:", error);
    throw new HttpsError("internal", error.message || "Gagal menghubungi AI.");
  }
});
