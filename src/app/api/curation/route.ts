// src/app/api/curation/route.ts
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
    const { formData, trackType, aiPromptConfig, aiModelType = 'pro' } = body;

    const isPro = aiModelType === 'pro';
    const selectedModelName = isPro ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

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

    const trackContext = trackType || "Evaluasi Umum";

    const aiPersona = aiPromptConfig?.aiPersona || "AHLI ANALISIS DAN DUE DILIGENCE KELAS DUNIA";
    const assessmentGoal = aiPromptConfig?.assessmentGoal || "Melakukan evaluasi kelayakan yang ketat, menganalisis potensi, dan memberikan rekomendasi strategis.";

    // MENGAMBIL BLUEPRINT BLOK ANALISIS DARI ADMIN
    const targetAnalysisBlocks = aiPromptConfig?.expectedAnalysisBlocks && aiPromptConfig.expectedAnalysisBlocks.length > 0
      ? aiPromptConfig.expectedAnalysisBlocks.map((block: string) => `- ${block}`).join("\n")
      : "- Posisi Pasar (Fokus Indikator: Niche Pasar, Keunggulan)\n- Kesehatan Finansial (Fokus Indikator: Pendapatan, Runway)\n- Kapabilitas Tim (Fokus Indikator: Keahlian, Hambatan)";

    const targetMetrics: string[] = aiPromptConfig?.expectedMetrics && aiPromptConfig.expectedMetrics.length > 0
      ? aiPromptConfig.expectedMetrics
      : ["Kualitas & Inovasi", "Validasi Pasar", "Kesehatan Finansial / Pendanaan", "Kapabilitas Tim", "Skalabilitas", "Legalitas / Kepatuhan"];

    const targetSections: string[] = aiPromptConfig?.expectedRecommendations && aiPromptConfig.expectedRecommendations.length > 0
      ? aiPromptConfig.expectedRecommendations
      : ["Strategi Pelaksanaan", "Optimasi Proses", "Rencana Pengembangan"];

    const parts: any[] = [];
    
    if (fileUrls.length > 0 && API_KEY) {
      fileManager = new GoogleAIFileManager(API_KEY);
      for (const url of fileUrls) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/pdf';
        let ext = contentType.includes('jpeg') ? '.jpg' : contentType.includes('png') ? '.png' : '.pdf';
        
        const tempFilePath = path.join(os.tmpdir(), `doc_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
        fs.writeFileSync(tempFilePath, Buffer.from(buffer));
        tempFiles.push(tempFilePath);

        const uploadResult = await fileManager.uploadFile(tempFilePath, { mimeType: contentType, displayName: "Dokumen Lampiran Asesmen" });
        uploadedGeminiFiles.push(uploadResult.file);
        parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
      }
    }

    const promptText = `
ANDA ADALAH: ${aiPersona}.
Tugas Anda adalah melakukan penilaian terhadap profil/entitas/peserta berikut dalam kategori: "${trackContext}".
Tujuan Utama Analisis: ${assessmentGoal}

DATA TEKS FORM:
${dataString}

${fileUrls.length > 0 ? "DOKUMEN TERLAMPIR TELAH DISERTAKAN. ANDA WAJIB MEMBACA DAN MENYILANGKAN DATANYA DENGAN TEKS FORM." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. BERIKAN PENILAIAN BERDASARKAN TEKS SAJA."}

INSTRUKSI FORMAT ANALISIS:
1. EXECUTIVE SUMMARY: Buat ringkasan padat tentang entitas ini sesuai tujuan asesmen.
2. FILE ANALYSIS: Nilai validitas dokumen. Catat jika ada ketidaksesuaian (Discrepancies).
3. CUSTOM ANALYSIS BLOCKS: Hasilkan blok analisis dengan MERUJUK SANGAT KETAT pada daftar berikut. Pastikan Anda menjabarkan nilai indikator (label) secara mendetail dan spesifik:
${targetAnalysisBlocks}
4. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${targetMetrics.join(", ")}]. 
   -> Deskripsi alasan skor WAJIB spesifik.
5. SWOT & RISKS: Petakan SWOT. Buat daftar 'Critical Risks' dan 'Mitigation Strategies' yang berpasangan.
6. ACTION PLAN: Buat rekomendasi dengan Timeframe spesifik.
7. SCORING: Berikan "totalScore" (0-100) dan "readinessLevel". Tentukan "incubationRoute" (Rute rekomendasi selanjutnya).

ATURAN WAJIB:
- Output MURNI dalam format JSON.
- SELURUH TEKS JAWABAN WAJIB MENGGUNAKAN BAHASA INDONESIA.
`;

    parts.unshift({ text: promptText });

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const systemPrompt = isPro 
      ? "Anda adalah AI Evaluator Premium. Analisis mendalam, kritis, deteksi celah logika, dan berikan strategi level mahir. Format output hanya JSON berbahasa Indonesia."
      : "Anda adalah AI Evaluator Standar. Evaluasi secara komprehensif, suportif, dan akurat berdasarkan fakta. Format output hanya JSON berbahasa Indonesia.";

    const model = genAI.getGenerativeModel({
      model: selectedModelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: [
            "readinessLevel", "totalScore", "incubationRoute", "executiveSummary",
            "customAnalysisBlocks", "fileAnalysisInsights",
            "metrics", "swotAnalysis", "recommendations", "riskAssessment", "nextActionSteps"
          ],
          properties: {
            executiveSummary: { type: SchemaType.STRING },
            readinessLevel: { type: SchemaType.STRING },
            totalScore: { type: SchemaType.INTEGER },
            incubationRoute: { type: SchemaType.STRING },
            customAnalysisBlocks: {
              type: SchemaType.ARRAY,
              description: "Blok analisis dinamis menyesuaikan ekspektasi yang diwajibkan",
              items: {
                type: SchemaType.OBJECT,
                required: ["title", "iconType", "metrics"],
                properties: {
                  title: { type: SchemaType.STRING, description: "Judul analitik sesuai blueprint, misal: 'Potensi Pasar', 'Kesehatan Finansial'" },
                  iconType: { type: SchemaType.STRING, description: "Pilih salah satu string ini yang paling cocok: 'finance', 'target', 'users', 'idea', 'document', 'award', 'shield'" },
                  metrics: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        label: { type: SchemaType.STRING, description: "Indikator spesifik sesuai fokus, misal: 'Target Niche', 'Skalabilitas'" },
                        value: { type: SchemaType.STRING, description: "Penjelasan mendetail dari label tersebut" }
                      }
                    }
                  }
                }
              }
            },
            fileAnalysisInsights: {
              type: SchemaType.OBJECT,
              required: ["documentQuality", "keyFindingsFromFiles", "discrepancies"],
              properties: {
                documentQuality: { type: SchemaType.STRING },
                keyFindingsFromFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                discrepancies: { type: SchemaType.STRING }
              }
            },
            metrics: {
              type: SchemaType.ARRAY,
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
              required: ["strengths", "weaknesses", "opportunities", "threats"],
              properties: {
                strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                opportunities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                threats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              }
            },
            recommendations: {
              type: SchemaType.ARRAY,
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
              required: ["criticalRisks", "mitigationStrategies"],
              properties: {
                criticalRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                mitigationStrategies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              }
            },
            nextActionSteps: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                required: ["timeframe", "task"],
                properties: {
                  timeframe: { type: SchemaType.STRING },
                  task: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      }
    });

    const result = await model.generateContent({ contents: [{ role: "user", parts: parts }] });
    const text = result.response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      return NextResponse.json(JSON.parse(cleanText));
    } catch (parseError) {
      console.error("Gagal melakukan parsing JSON. Raw Output AI:", cleanText);
      throw new Error("AI gagal memformat hasil analisis. Silakan coba lagi.");
    }

  } catch (error: any) {
    console.error("Curation API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  } finally {
    for (const tmpFile of tempFiles) {
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
    }
    if (fileManager) {
      for (const geminiFile of uploadedGeminiFiles) {
        try { await fileManager.deleteFile(geminiFile.name); } catch (e) {}
      }
    }
  }
}