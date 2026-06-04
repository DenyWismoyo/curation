import { NextResponse } from 'next/server';

// PENTING: Gunakan GEMINI_API_KEY (tanpa NEXT_PUBLIC_) di file .env Anda
const API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { formData, trackType } = body;

    // Bersihkan data dari object File jika tidak sengaja terbawa (karena AI saat ini membaca teks)
    const textData: Record<string, any> = {};
    for (const key in formData) {
       // Abaikan field yang berakhiran 'File' agar prompt lebih bersih
      if (!key.toLowerCase().includes('file')) {
        textData[key] = formData[key];
      }
    }

    const dataString = Object.entries(textData)
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");

    const trackContext = trackType === "Startup" 
      ? "Startup Teknologi (SaaS/Aplikasi)" 
      : trackType === "UMKM" 
        ? "UMKM Produk Fisik" 
        : "Bisnis Jasa / Agensi";

    const promptText = `Data pendaftaran untuk kategori: ${trackContext}\n\n${dataString}`;
    
    const systemInstruction = `Anda adalah Analis Investasi Inkubator. Analisis kelayakan bisnis ini. \nMatriks Skor:\n0-59: Pre-Incubation (Rute: Pra-Inkubasi)\n60-74: Market Ready (Rute: Inkubasi Reguler)\n75-100: Scalable (Rute: Akselerasi). Berikan output dalam format JSON sesuai schema. Pastikan scoreBreakdown memiliki max value 100 per kategori.`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
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