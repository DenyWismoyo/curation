// functions/src/agents/promo/pricingAgent.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { withRetry } from "../../../shared/utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

export const batchGenerateSmartPricing = onCall({
  memory: "512MiB",
  timeoutSeconds: 300,
  region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

  const { templates } = request.data;
  
  if (!templates || !Array.isArray(templates)) {
    throw new HttpsError("invalid-argument", "Data templates tidak valid atau kosong.");
  }

  try {
    const API_KEY = deepseekApiKeySecret.value();
    const deepseekClient = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: API_KEY,
    });

    const systemInstruction = `
Anda adalah Enterprise Pricing Strategist & Katalog Organizer.
Tugas: Tentukan Kategori Baku (berbasis Audiens/Objek), Harga Jual (Rupiah), Diskon, dan Judul Modul yang Konsisten secara MASSAL untuk array modul asesmen yang diberikan.

PANTANGAN & ATURAN KATEGORI BAKU (WAJIB DIPATUHI 100%):
Anda WAJIB memilih SALAH SATU dari 6 kategori audiens di bawah ini. DILARANG KERAS MENCIPTAKAN KATEGORI LAIN.
1. "Mahasiswa & Akademisi"
2. "Pekerja & Profesional"
3. "Parenting & Keluarga"
4. "UMKM & Pengusaha"
5. "Korporasi (B2B)"
6. "Umum & Personal"

ATURAN STRATEGI HARGA & DISKON:
1. Klien Korporasi (B2B): Harga premium (Rp 499.000 - Rp 1.500.000).
2. Klien UMKM: Harga menengah (Rp 199.000 - Rp 499.000).
3. Klien Mahasiswa/Parenting/Umum/Pekerja: Harga massal terjangkau (Rp 49.000 - Rp 149.000).
4. Berikan diskon promosi yang logis untuk memicu FOMO (15% hingga 60%).

ATURAN KONSISTENSI JUDUL (consistentTitle):
Berdasarkan kategori audiens yang Anda pilih, rapikan dan buat judul (trackName) menjadi seragam, profesional, dan menonjolkan objeknya. Maksimal 60 karakter. 
Misalnya, jika aslinya "Asesmen Kinerja", ubah menjadi "Asesmen Kinerja: Profesional" atau "Evaluasi Kinerja Pekerja".
Jika modul tentang Mindfulness untuk mahasiswa, jadikan "Mindfulness Mahasiswa". Pastikan judul sangat spesifik ke target audiens.

OUTPUT JSON WAJIB MENGGUNAKAN FORMAT INI:
{
  "results": [
    {
      "templateId": "string",
      "category": "Mahasiswa & Akademisi",
      "consistentTitle": "string",
      "price": 100000,
      "discountPercentage": 20,
      "aiReasoning": "alasan singkat (maks 2 kalimat)"
    }
  ]
}
`;

    const prompt = `
DATA ARRAY MODUL YANG HARUS DIANALISA:
${JSON.stringify(templates.map((t: any) => ({
  templateId: t.id,
  trackName: t.trackName,
  trackDescription: t.trackDescription,
  expectedOutputs: t.expectedOutputs
})), null, 2)}
`;

    const result = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      temperature: 0.2, // Rendah agar konsisten dengan aturan baku
      response_format: { type: "json_object" },
    }));

    let rawText = result.choices[0]?.message?.content || "{}";
    rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();

    return { success: true, ...JSON.parse(rawText) };
  } catch (error: any) {
    console.error("Gagal batchGenerateSmartPricing:", error);
    throw new HttpsError("internal", error.message);
  }
});