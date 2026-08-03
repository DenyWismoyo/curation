import * as admin from "firebase-admin";
import OpenAI from "openai";
import { gatherCryptoMarketData } from "../src/agents/crypto/cryptoOrchestrator";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Initialize Firebase Admin (use default credentials)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function testAgent() {
  console.log("Running manual crypto agent test...");
  const db = admin.firestore();
  const date = new Date();
  const isDaily = date.getHours() === 7 || date.getUTCHours() === 0;

  console.log("Gathering market data...");
  const { fearAndGreed, latestNews, marketData } = await gatherCryptoMarketData();
  
  let previousReport = null;
  try {
    const prevQuery = await db.collection("cryptoReports")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (!prevQuery.empty) {
      previousReport = prevQuery.docs[0].data().reportData;
    }
  } catch (e) {
    console.log("No previous report found for correction", e);
  }

  console.log("Calling DeepSeek AI...");
  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY, 
  });

  const systemPrompt = `Anda adalah Konsultan Ahli dan Analis Keuangan Kripto Institusional.
Tugas Anda adalah merangkum sentimen pasar dari K-lines, Fear & Greed Index, dan Berita Utama, serta membuat proyeksi 4 jam ke depan.
Anda JUGA harus mengevaluasi seberapa akurat prediksi Anda pada 4 jam sebelumnya (jika data sebelumnya diberikan).
Output Anda WAJIB berupa JSON rapi tanpa markdown block (seperti \`\`\`json):
{
  "title": "Judul laporan (misal: Rekap Pasar & Sinyal Trading)",
  "sentiment": "BULLISH / BEARISH / NEUTRAL",
  "summary": "Ringkasan markdown (analisis mendalam 4 jam terakhir + berita + fear & greed)",
  "projection": "Proyeksi 4 jam ke depan (markdown)",
  "accuracyScore": "Tingkat akurasi dari tebakan sebelumnya (0-100), atau null jika belum ada data sebelumnya",
  "selfCorrection": "Evaluasi jujur mengapa proyeksi sebelumnya benar/salah dan apa yang dipelajari",
  "coinsAnalysis": [
     {
       "symbol": "BTCUSDT",
       "analysis": "Analisis singkat & teknikal",
       "recommendation": "HOLD/BUY/SELL",
       "supportLevel": "Angka spesifik atau range",
       "resistanceLevel": "Angka spesifik",
       "stopLoss": "Angka pembatasan risiko",
       "takeProfit": "Target harga"
     }
  ],
  "dailyRecap": "Ringkasan fundamental 24 jam terakhir (jika siklus harian, jika tidak kosongkan)",
  "dailyProjection": "Proyeksi 1 hari penuh (jika siklus harian, jika tidak kosongkan)"
}`;

  const userPrompt = `
Konteks Waktu Saat Ini: ${date.toISOString()}
Siklus Harian?: ${isDaily ? "YA (Isi field daily)" : "TIDAK"}

Fundamental Data:
Fear & Greed Index: ${JSON.stringify(fearAndGreed)}
Berita Utama (4 Jam Terakhir): ${JSON.stringify(latestNews)}

Data Pasar (Candlestick 4-Jam Terakhir):
${JSON.stringify(marketData, null, 2)}

Proyeksi Anda Sebelumnya (Untuk Evaluasi Akurasi, bandingkan dengan harga terkini!):
${previousReport ? JSON.stringify(previousReport.projection) + "\\nSinyal Koin Sebelumnya: " + JSON.stringify(previousReport.coinsAnalysis) : "Tidak ada data sebelumnya."}

Buatkan laporan JSON yang komprehensif, actionable, dan jujur!
`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    });

    let content = response.choices[0]?.message?.content || "{}";
    if (content.startsWith("\`\`\`")) {
      content = content.replace(/^\`\`\`(json)?/gi, "").replace(/\`\`\`$/g, "").trim();
    }
    
    console.log("Raw Response:");
    console.log(content);
    const parsed = JSON.parse(content);
    
    console.log("Saving to Firestore...");
    await db.collection("cryptoReports").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isDaily,
      reportData: parsed,
      rawMarketData: marketData,
      rawFundamental: { fearAndGreed, latestNews }
    });
    
    console.log("Test finished successfully.");
  } catch (error: any) {
    console.error("Test failed:", error);
  }
}

testAgent();
