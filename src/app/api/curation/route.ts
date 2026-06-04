import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const API_KEY = process.env.GEMINI_API_KEY || "";
export const maxDuration = 60; 

export async function POST(req: Request) {
  const tempFiles: string[] = [];
  const uploadedGeminiFiles: any[] = [];
  let fileManager: GoogleAIFileManager | null = null;

  try {
    const body = await req.json();
    const { formData, trackType } = body;

    // 1. Ekstrak data teks dan URL file
    const textData: Record<string, any> = {};
    const fileUrls: string[] = [];

    // Filter data agar lebih bersih untuk AI
    for (const key in formData) {
      const val = formData[key];
      // Jika itu URL dari Firebase Storage, pisahkan untuk didownload
      if (typeof val === 'string' && val.startsWith('http') && val.includes('firebasestorage')) {
        fileUrls.push(val);
      } else if (val !== null && val !== undefined && val !== '') {
        // Rapikan format camelCase menjadi teks yang bisa dibaca AI (Opsional tapi membantu)
        const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
        textData[readableKey] = val;
      }
    }

    // Format data menjadi string yang mudah dibaca Gemini
    const dataString = Object.entries(textData)
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");

    const trackContext = trackType || "Model Bisnis Umum";

    // 2. Siapkan File ke Gemini melalui File API
    const parts: any[] = [];
    
    if (fileUrls.length > 0 && API_KEY) {
      fileManager = new GoogleAIFileManager(API_KEY);
      
      for (const url of fileUrls) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        
        const contentType = response.headers.get('content-type') || 'application/pdf';
        let ext = ".pdf";
        if (contentType.includes('jpeg')) ext = '.jpg';
        if (contentType.includes('png')) ext = '.png';
        
        const tempFilePath = path.join(os.tmpdir(), `doc_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
        fs.writeFileSync(tempFilePath, Buffer.from(buffer));
        tempFiles.push(tempFilePath);

        const uploadResult = await fileManager.uploadFile(tempFilePath, {
          mimeType: contentType,
          displayName: "Dokumen Pendukung Kurasi",
        });
        
        uploadedGeminiFiles.push(uploadResult.file);
        
        parts.push({
          fileData: {
            mimeType: uploadResult.file.mimeType,
            fileUri: uploadResult.file.uri
          }
        });
      }
    }

    // 3. PROMPT SUPERIOR UNTUK FORM DINAMIS
    const promptText = `Anda adalah Partner di Venture Capital Tier-1 dan Analis Bisnis Senior. 
Berikut adalah raw data pengajuan (Asesmen) dari sebuah entitas bisnis yang masuk dalam kategori: "${trackContext}".

DATA INPUT BISNIS (Key Dinamis):
${dataString}

TUGAS ANALISA MENDALAM ANDA:

1. METRIK RADAR 6 DIMENSI (0-100):
   Evaluasi data di atas dan petakan secara cerdas ke dalam 6 metrik ini. WAJIB menggunakan skala 0-100:
   - productInnovation: Seberapa unik/inovatif solusinya? Apakah ada 'Unfair Advantage'?
   - marketPotential: Seberapa besar omset/target pasarnya? Bagaimana strategi GTM & kanal distribusinya?
   - financialHealth: Bagaimana kondisi kas (runway), model monetisasi, omset, dan unit economics-nya?
   - teamCapability: Seberapa mumpuni komposisi tim/pendiri? Apakah founder-dependent?
   - operationalScalability: Bagaimana kapasitas produksi/sistem kerjanya? Apakah bisa di-scale up?
   - legalAndCompliance: Apakah badan hukum, paten (HAKI), atau sertifikasi (NIB/Halal/BPOM) sudah lengkap?

2. SKOR AKHIR & READINESS LEVEL (ATURAN MATEMATIS MUTLAK):
   - Hitung \`totalScore\`. Nilai ini HARUS MERUPAKAN RATA-RATA DARI KE-6 METRIK RADAR (Total ke-6 metrik dibagi 6). Rentang harus persis 0 hingga 100.
   - Tentukan \`readinessLevel\` berdasarkan totalScore:
      * 0-40: "Early / Idea Stage" (Butuh penguatan fundamental)
      * 41-60: "Validation Stage" (Mencari Product-Market Fit)
      * 61-80: "Market Ready" (Siap ekspansi & skala)
      * 81-100: "Investment / Scale-up Ready" (Sangat matang, siap didanai)

3. SWOT & RISIKO:
   - Buat matriks SWOT (Strengths, Weaknesses, Opportunities, Threats) spesifik berdasarkan input data, BUKAN teori umum.
   - Analisa "Critical Risks" (Risiko terburuk yang bisa membunuh bisnis ini) dan berikan mitigasinya.

4. REKOMENDASI TAKTIS:
   - Berikan rekomendasi spesifik untuk Target Market, Pricing, GTM, Product Roadmap, dan Kesiapan Investasi.
   - Berikan 3-5 "Next Action Steps" (langkah konkrit yang harus dieksekusi bisnis ini dalam 30 hari ke depan).
   - Tentukan "Incubation Route" (Saran rute pembinaan, misalnya: "Inkubasi Intensif", "Akselerator Pendanaan", "Bootcamp Digitalisasi").

5. VERIFIKASI DOKUMEN:
   Jika ada file terlampir (PDF/Gambar Pitchdeck/Legal), gunakan itu untuk memvalidasi skor. Jika tidak ada, jangan kurangi skor secara drastis, cukup beri catatan di rekomendasi.`;

    parts.unshift({ text: promptText });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "Anda adalah analis investasi elit. Selalu patuhi logika matematis dan kembalikan respon murni dalam format JSON. Dilarang menghasilkan teks di luar format JSON.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            readinessLevel: { type: SchemaType.STRING },
            totalScore: { type: SchemaType.INTEGER },
            radarMetrics: {
              type: SchemaType.OBJECT,
              properties: {
                productInnovation: { type: SchemaType.INTEGER },
                marketPotential: { type: SchemaType.INTEGER },
                financialHealth: { type: SchemaType.INTEGER },
                teamCapability: { type: SchemaType.INTEGER },
                operationalScalability: { type: SchemaType.INTEGER },
                legalAndCompliance: { type: SchemaType.INTEGER }
              }
            },
            swotAnalysis: {
              type: SchemaType.OBJECT,
              properties: {
                strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              }
            },
            recommendations: {
              type: SchemaType.OBJECT,
              properties: {
                executiveSummary: { type: SchemaType.STRING },
                targetMarket: { type: SchemaType.STRING },
                pricingAndMonetization: { type: SchemaType.STRING },
                goToMarketStrategy: { type: SchemaType.STRING },
                productRoadmap: { type: SchemaType.STRING },
                financialOptimization: { type: SchemaType.STRING },
                investmentReadiness: { type: SchemaType.STRING },
                incubationRoute: { type: SchemaType.STRING }
              }
            },
            riskAssessment: {
              type: SchemaType.OBJECT,
              properties: {
                criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              }
            },
            nextActionSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          }
        }
      }
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: parts }]
    });

    const text = result.response.text();
    return NextResponse.json(JSON.parse(text));

  } catch (error: any) {
    console.error("Curation API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  } finally {
    // 4. CLEANUP: Hapus file temporary
    for (const tmpFile of tempFiles) {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch (e) { console.error("Gagal menghapus temp file:", e); }
    }
    if (fileManager) {
      for (const geminiFile of uploadedGeminiFiles) {
        try {
          await fileManager.deleteFile(geminiFile.name);
        } catch (e) { console.error("Gagal menghapus file di Gemini:", e); }
      }
    }
  }
}