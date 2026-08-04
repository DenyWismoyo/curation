import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { withRetry } from "../../utils/retry";

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
      for (const symbol of topCoins) {
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
                 oversoldCandidates.push({
                     symbol,
                     price: currentPrice,
                     rsi1d: rsi1d ? rsi1d.toFixed(2) : "N/A",
                     rsi4h: rsi4h ? rsi4h.toFixed(2) : "N/A",
                     stochRsi4h: stochRSI4h ? stochRSI4h.k.toFixed(2) : "N/A",
                     obvTrend: "Accumulating"
                 });
             }
         } catch (e) {
             console.error(`Failed to fetch klines for ${symbol}`, e);
         }
         // Delay to avoid rate limits
         await new Promise(r => setTimeout(r, 100));
      }

      if (oversoldCandidates.length === 0) {
          console.log("No oversold candidates found today.");
          await db.collection("cryptoHiddenGems").add({
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              marketCondition: "Tidak ada koin dengan kriteria oversold harian (RSI 1D/4H) yang terdeteksi. Pasar cenderung stabil, berada dalam fase distribusi, atau overbought.",
              hiddenGems: [],
              rawCandidates: []
          });
          return;
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

KONTEKS MAKRO:
Tren BTC dalam 7 Hari Terakhir: ${btcMacroTrend} (${btcChangePct})
PERINGATAN: Jika Tren BTC sedang BEARISH, sangat berbahaya untuk mencari reversal pada altcoin. Rekomendasi Anda harus sangat konservatif jika makro sedang buruk.

Berikut adalah daftar koin kripto yang saat ini berada di area jenuh jual (Oversold) berdasarkan RSI (Relative Strength Index) harian dan 4 jam:
${JSON.stringify(oversoldCandidates, null, 2)}

TUGAS ANDA:
1. Analisis koin-koin di atas berdasarkan naratif fundamental terkini, potensi ekosistemnya, dan kondisi makro pasar (BTC Trend).
2. Tentukan *Catalyst* (Pemicu) potensial untuk setiap koin. Oversold saja tidak cukup, harus ada alasan kuat mengapa harga akan berbalik (misal: event yang akan datang, rotasi naratif, partnership).
3. Pilih TEPAT 1 hingga 3 koin yang menurut Anda merupakan "Hidden Gem" terbaik untuk potensi pembalikan arah (reversal) jangka menengah.
4. Berikan alasan tajam bergaya hedge fund, sebutkan katalisnya secara spesifik.
5. Tentukan target reversal (harga Take Profit medium-term) dan area invalidasi (Stop Loss) yang rasional berdasarkan kondisi harganya saat ini.

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
        model: "deepseek-reasoner", // Menggunakan model Reasoner Pro v4 sesuai permintaan
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
