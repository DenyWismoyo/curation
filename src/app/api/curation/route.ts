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

    // Menggunakan Gemini 2.5
    const selectedModelName = aiModelType === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    const textData: Record<string, any> = {};
    const fileUrls: string[] = [];

    // Ekstraksi data form dan URL file
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

    // Dynamic Metrics & Recommendations
    const targetMetrics: string[] = aiPromptConfig?.expectedMetrics && aiPromptConfig.expectedMetrics.length > 0
      ? aiPromptConfig.expectedMetrics
      : ["Inovasi & Value Proposition", "Traction & Validasi Pasar", "Kesehatan Finansial (Unit Economics)", "Kapabilitas Tim", "Skalabilitas & Moat", "Legalitas & Kepatuhan"];

    const targetSections: string[] = aiPromptConfig?.expectedRecommendations && aiPromptConfig.expectedRecommendations.length > 0
      ? aiPromptConfig.expectedRecommendations
      : ["Strategi Go-To-Market", "Optimasi Model Bisnis", "Persiapan Penggalangan Dana"];

    const parts: any[] = [];
    
    // UPLOAD FILES TO GEMINI
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

        const uploadResult = await fileManager.uploadFile(tempFilePath, { mimeType: contentType, displayName: "Dokumen Kurasi (Pitch Deck/Legal/Laporan)" });
        uploadedGeminiFiles.push(uploadResult.file);
        parts.push({ fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } });
      }
    }

    const promptText = `
ANDA ADALAH SENIOR PARTNER DI FIRMA VENTURE CAPITAL TIER-1 DAN AHLI DUE DILIGENCE KELAS DUNIA.
Tugas Anda adalah melakukan penilaian mendalam (Deep Dive Assessment) terhadap entitas bisnis berikut dalam kategori spesifik: "${trackContext}".

DATA TEKS FORM ENTITAS:
${dataString}

${fileUrls.length > 0 ? "DOKUMEN TERLAMPIR (Pitch Deck, Laporan, Legalitas) TELAH DISERTAKAN. ANDA WAJIB MEMBACA DAN MENYILANGKAN DATANYA DENGAN TEKS FORM." : "TIDAK ADA DOKUMEN YANG DILAMPIRKAN. BERIKAN PENILAIAN BERDASARKAN TEKS SAJA."}

INSTRUKSI ANALISIS MATANG, SPESIFIK & KOMPREHENSIF:
Anda TIDAK BOLEH memberikan jawaban generik atau template. Anda wajib merujuk pada detail isian dari "DATA TEKS FORM ENTITAS" untuk setiap analisis Anda.

1. EXECUTIVE SUMMARY & POSITIONING: Buat ringkasan padat tentang entitas ini. Tentukan Niche secara spesifik, Keunggulan Kompetitif berdasarkan data form, dan tingkat Skalabilitas Pasar.
2. FILE ANALYSIS (DUE DILIGENCE): Jika ada lampiran, nilai validitas dan kualitas dokumennya. Sebutkan temuan penting (Key Findings). Catat jika ada ketidaksesuaian (Discrepancies) antara form dan file. Jika tidak ada file, tulis "Dokumen tidak dilampirkan, sehingga validasi data bergantung sepenuhnya pada klaim form."
3. FINANCIAL & TEAM CAPABILITY: 
   - Analisis model pendapatan secara riil berdasarkan data.
   - Analisis efisiensi biaya (Burn rate / Runway).
   - Nilai kecocokan pendiri (Founder-Market Fit) dan tunjukkan kesenjangan keahlian (Skill Gaps) yang perlu diisi.
4. INVESTMENT READINESS: Tentukan stage saat ini secara realistis, instrumen pendanaan yang cocok (Equity, Grant, Loan, dll), dan daya tarik bagi investor.
5. METRICS ARRAY: Berikan skor objektif (0-100) untuk indikator berikut: [${targetMetrics.join(", ")}]. 
   -> PENTING: Deskripsi/alasan skor WAJIB sangat detail dan merujuk pada poin spesifik dari form pengguna (bukan teori umum).
6. SWOT & RISKS: Petakan Kekuatan, Kelemahan, Peluang, dan Ancaman dari bisnis ini.
   -> Buat daftar 'Critical Risks' (Risiko Kritis) spesifik.
   -> Buat daftar 'Mitigation Strategies' (Strategi Mitigasi) spesifik. (Catatan: Indeks ke-0 pada mitigasi harus menjawab risiko pada indeks ke-0, dst).
7. ACTION PLAN: Buat rekomendasi taktis dengan Timeframe spesifik (Contoh: "30 Hari", "60 Hari", "90 Hari") yang menjawab kelemahan entitas.
8. SCORING: Berikan "totalScore" (rata-rata berbobot) dan "readinessLevel" (Early, Validation, Market Ready, Investment Ready). Tentukan "incubationRoute" (Rute program pembinaan yang paling tepat).

ATURAN WAJIB:
- Output MURNI dalam format JSON sesuai skema.
- SELURUH TEKS JAWABAN (Value dalam JSON) WAJIB MENGGUNAKAN BAHASA INDONESIA, kecuali istilah teknis (seperti Runway, Burn Rate, dll).
`;

    parts.unshift({ text: promptText });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: selectedModelName,
      systemInstruction: "Anda adalah sistem analitik bisnis AI. Anda mendeteksi konteks data dan WAJIB membalas SELURUH teks di dalam JSON menggunakan BAHASA INDONESIA. Jadilah sangat detail, jangan gunakan placeholder. Kembalikan HANYA JSON valid.",
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: [
            "readinessLevel", "totalScore", "incubationRoute", "executiveSummary", "marketPositioning", 
            "fileAnalysisInsights", "financialHealth", "teamAssessment", "investmentReadiness",
            "metrics", "swotAnalysis", "recommendations", "riskAssessment", "nextActionSteps"
          ],
          properties: {
            executiveSummary: { type: SchemaType.STRING, description: "Penjelasan mendalam mengenai profil dan status bisnis saat ini." },
            readinessLevel: { type: SchemaType.STRING },
            totalScore: { type: SchemaType.INTEGER },
            incubationRoute: { type: SchemaType.STRING },
            marketPositioning: {
              type: SchemaType.OBJECT,
              required: ["niche", "competitorAdvantage", "marketScalability"],
              properties: {
                niche: { type: SchemaType.STRING },
                competitorAdvantage: { type: SchemaType.STRING },
                marketScalability: { type: SchemaType.STRING, description: "Pilih salah satu: Low, Medium, High, Exponential" }
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
            financialHealth: {
              type: SchemaType.OBJECT,
              required: ["revenueModelViability", "burnRateOrRunwayAssessment", "financialScore"],
              properties: {
                revenueModelViability: { type: SchemaType.STRING },
                burnRateOrRunwayAssessment: { type: SchemaType.STRING },
                financialScore: { type: SchemaType.INTEGER }
              }
            },
            teamAssessment: {
              type: SchemaType.OBJECT,
              required: ["founderMarketFit", "identifiedSkillGaps"],
              properties: {
                founderMarketFit: { type: SchemaType.STRING },
                identifiedSkillGaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              }
            },
            investmentReadiness: {
              type: SchemaType.OBJECT,
              required: ["currentFundingStage", "recommendedInstrument", "investorAttractiveness"],
              properties: {
                currentFundingStage: { type: SchemaType.STRING },
                recommendedInstrument: { type: SchemaType.STRING },
                investorAttractiveness: { type: SchemaType.STRING }
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
                  description: { type: SchemaType.STRING, description: "Alasan komprehensif mengapa skor tersebut diberikan, harus spesifik berdasarkan input pengguna." }
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
                  timeframe: { type: SchemaType.STRING, description: "Batas waktu, misal: 30 Hari, 60 Hari, 1 Tahun" },
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