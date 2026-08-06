import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { withRetry } from "../../../shared/utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

import { calculateRSI, calculateStochRSI, calculateOBV } from "./utils/indicators";

export const cryptoHiddenGemAgent = onSchedule(
  {
    schedule: "0 7 * * *", // Setiap hari jam 7 pagi WIB (00:00 UTC)
    timeZone: "Asia/Jakarta", 
    secrets: [deepseekApiKeySecret],
    region: "asia-southeast2",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    console.log("cryptoHiddenGemAgent started");
    const db = getFirestore(admin.app(), "curation");
    
    try {
      // 1. Fetch top USDT pairs by volume
      const tickerRes = await axios.get("https://api.binance.com/api/v3/ticker/24hr");
      
      // Exclude Top 15 Mega Caps (> $10B) so we actually find "Hidden Gems"
      const megaCaps = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "TRXUSDT", "LINKUSDT", "MATICUSDT", "TONUSDT", "SHIBUSDT", "BCHUSDT"];
      
      let allTickers = tickerRes.data.filter((t: any) => 
         t.symbol.endsWith("USDT") && 
         parseFloat(t.quoteVolume) > 30000000 &&
         !megaCaps.includes(t.symbol)
      );
      
      // Sort by volume descending and take top 50
      allTickers.sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      const topCoins = allTickers.slice(0, 50).map((t: any) => t.symbol);

      const oversoldCandidates = [];

      // 1.5 Fetch BTC Macro Trend
      let btcMacroTrend = "NEUTRAL";
      let btcChangePct = "0%";
      try {
         const btcRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=7`);
         if (btcRes.data && btcRes.data.length >= 7) {
            const btcFirst = parseFloat(btcRes.data[0][4]);
            const btcLast = parseFloat(btcRes.data[6][4]);
            btcChangePct = (((btcLast - btcFirst) / btcFirst) * 100).toFixed(2) + "%";
            btcMacroTrend = btcLast > btcFirst ? "BULLISH" : "BEARISH";
         }
      } catch (e) {
         console.warn("Failed to fetch BTC trend", e);
      }

      // 2. Fetch Klines (1d and 4h) for each coin to calculate RSI
      const chunkSize = 5;
      for (let i = 0; i < topCoins.length; i += chunkSize) {
         const chunk = topCoins.slice(i, i + chunkSize);
         await Promise.all(chunk.map(async (symbol: string) => {
             try {
                 // 1D Klines
                 const klines1dRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
                 const closes1d = klines1dRes.data.map((k: any) => parseFloat(k[4]));
                 const rsi1d = calculateRSI(closes1d);

                 // 4H Klines
                 const klines4hRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=50`);
                 const klines4h = klines4hRes.data;
                 const closes4h = klines4h.map((k: any) => parseFloat(k[4]));
                 const rsi4h = calculateRSI(closes4h);
                 const stochRSI4h = calculateStochRSI(closes4h);
                 
                 // OBV Calculation
                 const klineObjs = klines4h.map((k: any) => ({ close: k[4], volume: k[5] }));
                 const obv = calculateOBV(klineObjs);
                 const obvTrendingUp = obv.length > 5 ? (obv[obv.length - 1] > obv[obv.length - 5]) : false;
                 
                 const currentPrice = closes1d[closes1d.length - 1];

                 const isRsiOversold = (rsi1d !== null && rsi1d !== undefined && rsi1d < 35) || (rsi4h !== null && rsi4h !== undefined && rsi4h < 30);
                 const isStochOversold = stochRSI4h ? (stochRSI4h.k < 20) : false;

                 if (isRsiOversold && isStochOversold && obvTrendingUp) {
                     // Calculate volume spike ratio (current 4H bar vs avg of last 42 bars = ~7 days of 4H)
                     const vol4hCurrent = parseFloat(klines4h[klines4h.length - 1][5]);
                     const vol4hAvg7d = klines4h.slice(-43, -1).reduce((s: number, k: any) => s + parseFloat(k[5]), 0) / Math.max(klines4h.slice(-43, -1).length, 1);
                     const volumeSpikeRatio = (vol4hCurrent / (vol4hAvg7d || 1)).toFixed(2);

                     oversoldCandidates.push({
                         symbol,
                         price: currentPrice,
                         rsi1d: rsi1d ? rsi1d.toFixed(2) : "N/A",
                         rsi4h: rsi4h ? rsi4h.toFixed(2) : "N/A",
                         stochRsi4h: stochRSI4h ? stochRSI4h.k.toFixed(2) : "N/A",
                         obvTrend: "Accumulating",
                         volumeSpikeRatio // >1.5 = genuine interest, <0.8 = dead cat bounce
                     });
                 }
             } catch (e) {
                 console.error(`Failed to fetch klines for ${symbol}`, e);
             }
         }));
         // Delay between chunks to avoid rate limits
         await new Promise(r => setTimeout(r, 200));
      }
      // Filter out recent recommendations (last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const timestamp3DaysAgo = admin.firestore.Timestamp.fromDate(threeDaysAgo);
      let recentGems: string[] = [];
      try {
         const recentDocs = await db.collection("cryptoHiddenGems").where("createdAt", ">=", timestamp3DaysAgo).get();
         recentDocs.forEach(doc => {
            const gems = doc.data().hiddenGems || [];
            gems.forEach((g: any) => recentGems.push(g.symbol));
         });
      } catch (e) {
         console.warn("Failed to fetch recent hidden gems for deduplication", e);
      }
      
      const filteredOversoldCandidates = oversoldCandidates.filter(c => !recentGems.includes(c.symbol));

      if (filteredOversoldCandidates.length === 0) {
          console.log("No new oversold candidates found today (all were recently recommended).");
          await db.collection("cryptoHiddenGems").add({
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              marketCondition: "Tidak ada koin baru dengan kriteria oversold harian (RSI 1D/4H) yang terdeteksi, atau kandidat yang ada sudah direkomendasikan dalam 3 hari terakhir.",
              hiddenGems: [],
              rawCandidates: []
          });
          return;
      }

      // Fetch latest news context
      let newsContext = "Tidak ada berita terbaru yang relevan.";
      try {
          const newsSnapshot = await db.collection("cryptoNews")
             .orderBy("createdAt", "desc")
             .limit(1)
             .get();
          
          if (!newsSnapshot.empty) {
             const latestNews = newsSnapshot.docs[0].data();
             if (latestNews.newsItems && latestNews.newsItems.length > 0) {
                 const newsSummaries = latestNews.newsItems.map((n: any) => `- ${n.title}: ${n.summary} (Impact: ${n.impact})`).join("\n");
                 newsContext = `Berita Pasar Hari Ini:\nSentiment: ${latestNews.marketSentiment}\n${newsSummaries}`;
             }
          }
      } catch (e) {
          console.warn("Failed to fetch news context", e);
      }

      // 3. Analyze with Deepseek Reasoner
      const apiKey = deepseekApiKeySecret.value();
      if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");

      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
      });

      const prompt = `
Anda adalah "Hedge Fund AI Analyst" yang brilian.
Gunakan nada "Contrarian Investor" (mencari peluang saat pasar sedang takut).

KONTEKS MAKRO & BERITA (JANGAN HALUSINASI KATALIS!):
Tren BTC dalam 7 Hari Terakhir: ${btcMacroTrend} (${btcChangePct})

Kondisi Makro & Naratif:
${newsContext}

PERINGATAN: Jika Tren BTC sedang BEARISH, sangat berbahaya untuk mencari reversal pada altcoin. Analisis Anda harus sangat konservatif jika makro sedang buruk.
Gunakan BERITA PASAR di atas sebagai SATU-SATUNYA referensi fundamental (katalis). Jangan mengarang partnership atau event yang tidak ada di berita tersebut.

Berikut adalah daftar koin kripto yang saat ini berada di area jenuh jual (Oversold) berdasarkan RSI (Relative Strength Index) harian dan 4 jam:
${JSON.stringify(filteredOversoldCandidates, null, 2)}

TUGAS ANDA:
1. Analisis koin-koin di atas berdasarkan naratif fundamental terkini, potensi ekosistemnya, dan kondisi makro pasar (BTC Trend).
2. Tentukan *Catalyst* (Pemicu) potensial untuk setiap koin. Oversold saja tidak cukup, harus ada alasan kuat mengapa harga akan berbalik yang HARUS diambil dari data Berita Pasar di atas.
3. Pilih TEPAT 1 hingga 3 koin yang menurut Anda merupakan "Hidden Gem" terbaik untuk potensi pembalikan arah (reversal) jangka menengah.
4. Berikan alasan tajam bergaya hedge fund, sebutkan katalisnya secara spesifik.
5. Tentukan target reversal (harga Take Profit medium-term) dan area invalidasi (Stop Loss) yang rasional berdasarkan kondisi harganya saat ini.

PEDOMAN TARGET PRICE: targetPrice adalah proyeksi target pembalikan dalam rentang 3-7 hari ke depan (bukan target instan intraday). Tentukan berdasarkan level resistance terdekat yang signifikan di chart harian.
PEDOMAN VOLUME: Field "volumeSpikeRatio" menunjukkan volume 4H terkini vs rata-rata 7 hari. Nilai >1.5 mengindikasikan minat beli genuine (reversal lebih meyakinkan). Nilai <0.8 adalah tanda "dead cat bounce" — HINDARI koin ini walau RSI-nya oversold.

ATURAN KERAS (TIDAK BOLEH DILANGGAR):
- Karena ini adalah setup Oversold Reversal (LONG), targetPrice WAJIB lebih besar dari currentPrice, dan stopLoss WAJIB lebih kecil dari currentPrice.
- Rasio jarak target terhadap stop loss (Risk/Reward) minimal 1:2.
- Output Anda HARUS murni JSON valid. JANGAN membungkus JSON dengan markdown block (\`\`\`json). JANGAN menambahkan teks pengantar atau penutup.

Skema JSON yang harus dikembalikan:
{
  "marketConditionSummary": "Ringkasan kondisi pasar secara keseluruhan hari ini dalam 2-3 kalimat tajam.",
  "hiddenGems": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga dari data",
      "rsi1d": "rsi dari data",
      "rsi4h": "rsi dari data",
      "stochRsi4h": "stoch rsi dari data",
      "reasoning": "Alasan fundamental tajam (sebutkan CATALYST pembalikan arah) kenapa koin ini siap reversal (minimal 3 kalimat).",
      "targetPrice": "Angka target pembalikan menengah (HARUS > currentPrice, buat rasio masuk akal berdasarkan chart structure)",
      "stopLoss": "Angka stop loss invalidasi teknikal (HARUS < currentPrice)",
      "riskLevel": "Conservative | Moderate | Aggressive",
      "potentialReturnPct": "Persentase potensi keuntungan (misal: 15.5)"
    }
  ]
}
`;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-reasoner", // Menggunakan reasoner untuk analisa mendalam
        messages: [{ role: "user", content: prompt }],
      }));

      const responseText = result.choices[0].message.content || "{}";
      
      let parsedData;
      try {
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanJson);
      } catch (e) {
          console.error("Gagal parse output Deepseek:", responseText);
          parsedData = { marketConditionSummary: "Gagal memproses data AI.", hiddenGems: [] };
      }

      // 4. Save to Firestore
      await db.collection("cryptoHiddenGems").add({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          marketCondition: parsedData.marketConditionSummary || "",
          hiddenGems: parsedData.hiddenGems || [],
          rawCandidates: oversoldCandidates
      });

      console.log("Hidden Gem Report generated successfully.");
    } catch (error) {
      console.error("Error in cryptoHiddenGemAgent:", error);
    }
  }
);
