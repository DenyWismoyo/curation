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
    const { formData, trackType, aiPromptConfig } = body;

    const textData: Record<string, any> = {};
    const fileUrls: string[] = [];

    for (const key in formData) {
      const val = formData[key];
      if (typeof val === 'string' && val.startsWith('http') && val.includes('firebasestorage')) {
        fileUrls.push(val);
      } else if (val !== null && val !== undefined && val !== '') {
        const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
        textData[readableKey] = val;
      }
    }

    const dataString = Object.entries(textData)
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");

    const trackContext = trackType || "Model Bisnis Umum";

// Set fallback metrik & rekomendasi dengan tipe data string[] secara eksplisit
    const targetMetrics: string[] = aiPromptConfig?.expectedMetrics && aiPromptConfig.expectedMetrics.length > 0
      ? aiPromptConfig.expectedMetrics
      : ["Inovasi Produk", "Potensi Pasar", "Kesehatan Finansial", "Kapabilitas Tim", "Skalabilitas Operasional", "Legalitas & Kepatuhan"];

    const targetSections: string[] = aiPromptConfig?.expectedRecommendations && aiPromptConfig.expectedRecommendations.length > 0
      ? aiPromptConfig.expectedRecommendations
      : ["Strategi Go-To-Market", "Product Roadmap", "Optimasi Finansial", "Kesiapan Investasi"];

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

    // Pembuatan Prompt Terpimpin berdasarkan Parameter Dinamis Array
// Pembuatan Prompt Terpimpin berdasarkan Parameter Dinamis Array
    const promptText = `Anda adalah Partner di Venture Capital Tier-1, Analis Bisnis, dan Pakar Hilirisasi Sektor Utama.
Evaluasi raw data pengajuan kurasi dari entitas bisnis berikut dalam kategori fokus industri: "${trackContext}".

DATA INPUT ENTITAS:
${dataString}

TUGAS ANALISIS UTAMA ANDA (WAJIB MEMATUHI STRUKTUR DINAMIS BERIKUT):

1. EVALUASI ARRAY METRIK (Skala 0-100):
   Anda WAJIB memberikan penilaian skor (0-100) dan deskripsi argumentatif singkat untuk masing-masing item metrik berikut ini:
   ${targetMetrics.map((m: string) => `- "${m}"`).join("\n")}

2. STRATEGIC INSIGHT SECTIONS:
   Anda WAJIB membuat narasi solusi/analisis mendalam untuk masing-masing judul blok rekomendasi berikut ini:
   ${targetSections.map((s: string) => `- "${s}"`).join("\n")}

3. SKOR AKHIR & READINESS LEVEL (MATEMATIS MUTLAK):
   - Nilai "totalScore" HARUS MERUPAKAN RATA-RATA DARI KESELURUHANN SKOR METRIK YANG ANDA BUAT (Total akumulasi nilai dibagi ${targetMetrics.length}). Rentang harus persis 0 hingga 100.
   - Tentukan "readinessLevel" berdasarkan nilai totalScore tersebut:
      * 0-40: "Early / Idea Stage"
      * 41-60: "Validation Stage"
      * 61-80: "Market Ready"
      * 81-100: "Investment / Scale-up Ready"

4. SWOT, RISIKO & RUTE PEMBINAAN:
   - Rumuskan Strengths, Weaknesses, Opportunities, Threats spesifik dari data pengusul.
   - Analisis Critical Risks beserta strategi mitigasinya.
   - Tentukan satu nama rute pembinaan (incubationRoute) paling cocok (Contoh: "Akselerator Teknologi", "Inkubasi Koperasi Digital", "Hilirisasi Komersial Industri").`;

    parts.unshift({ text: promptText });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "Anda adalah analis investasi elit. Selalu patuhi logika matematis dan kembalikan respon murni dalam format JSON sesuai skema array dinamis yang diminta. Dilarang menghasilkan teks penjelasan di luar format JSON.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            readinessLevel: { type: SchemaType.STRING },
            totalScore: { type: SchemaType.INTEGER },
            incubationRoute: { type: SchemaType.STRING },
            metrics: {
              type: SchemaType.ARRAY,
              description: "Daftar skor per metrik sesuai daftar instruksi input prompt.",
              items: {
                type: SchemaType.OBJECT,
                required: ["label", "score", "description"],
                properties: {
                  label: { type: SchemaType.STRING },
                  score: { type: SchemaType.INTEGER },
                  description: { type: SchemaType.STRING }
                }
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
              type: SchemaType.ARRAY,
              description: "Blok narasi rekomendasi taktis sesuai judul seksi yang diminta.",
              items: {
                type: SchemaType.OBJECT,
                required: ["title", "content"],
                properties: {
                  title: { type: SchemaType.STRING },
                  content: { type: SchemaType.STRING }
                }
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