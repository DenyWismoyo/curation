// functions/src/agents/promo/pricingAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const batchGenerateSmartPricing = onCall({
  memory: "512MiB",
  timeoutSeconds: 300, // Waktu dilonggarkan untuk menampung batch besar
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { templates } = request.data;
  
  if (!templates || !Array.isArray(templates)) {
    throw new HttpsError("invalid-argument", "Data templates tidak valid atau kosong.");
  }

  try {
    const API_KEY = geminiApiKeySecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Menggunakan Gemini 3.1 Flash-Lite yang sangat tajam dan responsif
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite", 
      generationConfig: {
        temperature: 0.2, // Dibuat rendah agar AI sangat patuh pada aturan kategori baku
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            results: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  templateId: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING },
                  price: { type: SchemaType.INTEGER },
                  discountPercentage: { type: SchemaType.INTEGER },
                  aiReasoning: { type: SchemaType.STRING }
                },
                required: ["templateId", "category", "price", "discountPercentage", "aiReasoning"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const prompt = `
      Anda adalah Enterprise Pricing Strategist & Katalog Organizer.
      Tugas: Tentukan Kategori Baku, Harga Jual (Rupiah), dan Diskon secara MASSAL untuk array modul asesmen di bawah ini.

      PANTANGAN & ATURAN KATEGORI BAKU (WAJIB DIPATUHI 100%):
      Anda WAJIB memilih SALAH SATU dari 8 kategori di bawah ini. DILARANG KERAS MENCIPTAKAN KATEGORI LAIN.
      1. "Parenting & Keluarga" (Untuk modul anak, toddler, remaja, komunikasi orang tua)
      2. "Zona Gen Z & Karir" (Untuk pemetaan bakat, persiapan kerja, personal branding, kesiapan karir)
      3. "Kesehatan Mental & Diri" (Untuk mindfulness, resiliensi emosional, keseimbangan hidup)
      4. "Startup & Inovasi" (Untuk tech startup, founder, kesiapan produk, technopreneur)
      5. "UMKM & Bisnis" (Untuk bisnis menengah, omzet, pemetaan peran usaha)
      6. "Aparatur Negara (ASN)" (Untuk PNS, keseimbangan kerja ASN, iklim kerja instansi, minat jabatan)
      7. "Riset & Akademik" (Untuk perguruan tinggi, hilirisasi riset, mahasiswa)
      8. "Manajemen Korporasi" (Untuk B2B, audit tata kelola perusahaan besar, leadership)

      ATURAN STRATEGI HARGA & DISKON:
      1. Klien Enterprise/B2B/Startup/ASN: Harga premium (Rp 499.000 - Rp 1.500.000).
      2. Klien B2C/Parenting/Gen Z/UMKM: Harga massal terjangkau (Rp 49.000 - Rp 199.000).
      3. Berikan diskon promosi yang logis untuk memicu FOMO (15% hingga 60%).

      DATA ARRAY MODUL YANG HARUS DIANALISA:
      ${JSON.stringify(templates.map((t: any) => ({
        templateId: t.id,
        trackName: t.trackName,
        trackDescription: t.trackDescription,
        expectedOutputs: t.expectedOutputs
      })), null, 2)}
    `;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});