import { NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY || "";

// Jika aplikasi dijalankan di Vercel, pastikan timeout dinaikkan
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { formData, trackType, filesBase64 } = body;

    // Bersihkan data dari field file yang mungkin masih tersisa di string form
    const textData: Record<string, any> = {};
    for (const key in formData) {
      if (!key.toLowerCase().includes('file')) {
        textData[key] = formData[key];
      }
    }

    // Ubah object menjadi format string yang mudah dibaca AI
    const dataString = Object.entries(textData)
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");

    const trackContext = trackType === "Startup" 
      ? "Startup Teknologi (SaaS/Aplikasi)" 
      : trackType === "UMKM" 
        ? "UMKM Produk Fisik" 
        : "Bisnis Jasa / Agensi";

    const promptText = `Berikut adalah data pendaftaran lengkap untuk kategori: ${trackContext}\n\nDATA BISNIS:\n${dataString}\n\nTUGAS ANALISIS ANDA:\n1. Evaluasi metrik kritis (seperti LTV:CAC, MRR, Cap Table untuk Startup; atau AOV, Retention untuk Jasa; atau Konsistensi Produksi untuk UMKM).\n2. Jika ada dokumen PDF/Gambar terlampir, baca dan jadikan bahan pertimbangan utama.\n3. Berikan skor yang realistis dan tajam layaknya seorang konsultan bisnis atau Venture Capitalist profesional.`;
    
    const systemInstruction = `Anda adalah Kurator Inkubator & Analis Investasi Profesional. Tugas Anda menganalisis kelayakan bisnis. 
    
Matriks Skor (Sangat Ketat):
0-59: Pre-Incubation (Masih tahap ideasi, metrik bisnis buruk, rute: Pra-Inkubasi)
60-74: Market Ready (Sudah ada traksi, metrik cukup sehat, rute: Inkubasi Reguler)
75-100: Scalable / Investable (Traction kuat, Unit Economics sangat sehat, siap didanai VC/Investor, rute: Akselerasi).

Berikan output dalam format JSON sesuai schema yang diminta. Pastikan nilai scoreBreakdown memiliki batas maksimal 100 per kategori. Berikan rekomendasi (targetMarket, productImprovement, dll) secara spesifik, terstruktur, dan actionable berdasarkan data yang diinput.`;

    // Susun input "parts" untuk Gemini
    const parts: any[] = [{ text: promptText }];

    // Jika ada file (dari konversi base64 klien), masukkan ke mata AI
    if (filesBase64 && Array.isArray(filesBase64) && filesBase64.length > 0) {
      filesBase64.forEach((file: any) => {
        parts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        });
      });
    }

    const payload = {
      contents: [{ parts: parts }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            readinessLevel: { type: "STRING" },
            totalScore: { type: "INTEGER" },
            scoreBreakdown: {
              type: "OBJECT",
              properties: {
                productAndTech: { type: "INTEGER" },
                marketAndFinancial: { type: "INTEGER" },
                legalAndCompliance: { type: "INTEGER" }
              }
            },
            recommendations: {
              type: "OBJECT",
              properties: {
                targetMarket: { type: "STRING" },
                pricingAndMonetization: { type: "STRING" },
                distributionAndGrowth: { type: "STRING" },
                productImprovement: { type: "STRING" },
                investmentReadiness: { type: "STRING" },
                nextActionSteps: { type: "ARRAY", items: { type: "STRING" } },
                incubationRoute: { type: "STRING" }
              }
            }
          }
        }
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      throw new Error("API call failed");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error("Empty response from AI");

    return NextResponse.json(JSON.parse(text));

  } catch (error: any) {
    console.error("Curation API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}