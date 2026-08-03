import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

function calculateRSI(closes: number[], period = 14) {
    if (closes.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

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
      let allTickers = tickerRes.data.filter((t: any) => t.symbol.endsWith("USDT") && parseFloat(t.quoteVolume) > 10000000);
      
      // Sort by volume descending and take top 50
      allTickers.sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      const topCoins = allTickers.slice(0, 50).map((t: any) => t.symbol);

      const oversoldCandidates = [];

      // 2. Fetch Klines (1d and 4h) for each coin to calculate RSI
      for (const symbol of topCoins) {
         try {
             // 1D Klines
             const klines1dRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
             const closes1d = klines1dRes.data.map((k: any) => parseFloat(k[4]));
             const rsi1d = calculateRSI(closes1d);

             // 4H Klines
             const klines4hRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=30`);
             const closes4h = klines4hRes.data.map((k: any) => parseFloat(k[4]));
             const rsi4h = calculateRSI(closes4h);
             
             const currentPrice = closes1d[closes1d.length - 1];

             if ((rsi1d !== null && rsi1d < 35) || (rsi4h !== null && rsi4h < 30)) {
                 oversoldCandidates.push({
                     symbol,
                     price: currentPrice,
                     rsi1d: rsi1d ? rsi1d.toFixed(2) : "N/A",
                     rsi4h: rsi4h ? rsi4h.toFixed(2) : "N/A"
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
Berikut adalah daftar koin kripto yang saat ini berada di area jenuh jual (Oversold) berdasarkan RSI (Relative Strength Index) harian dan 4 jam:
${JSON.stringify(oversoldCandidates, null, 2)}

TUGAS ANDA:
1. Analisis koin-koin di atas berdasarkan naratif fundamental terkini, potensi ekosistemnya, dan kondisi makro pasar.
2. Pilih TEPAT 1 hingga 3 koin yang menurut Anda merupakan "Hidden Gem" terbaik untuk potensi pembalikan arah (reversal) jangka menengah.
3. Berikan alasan tajam bergaya hedge fund.
4. Tentukan target reversal (harga Take Profit medium-term) dan area invalidasi (Stop Loss) yang rasional berdasarkan kondisi harganya saat ini.

PENTING: Output Anda HARUS murni berformat JSON tanpa teks pengantar, markdown blok, atau penutup. 
Skema JSON yang harus dikembalikan:
{
  "marketConditionSummary": "Ringkasan kondisi pasar secara keseluruhan hari ini dalam 2-3 kalimat tajam.",
  "hiddenGems": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga dari data",
      "rsi1d": "rsi dari data",
      "rsi4h": "rsi dari data",
      "reasoning": "Alasan fundamental dan teknikal tajam kenapa koin ini siap reversal (minimal 3 kalimat).",
      "targetPrice": "Angka target pembalikan (reversal) menengah",
      "stopLoss": "Angka stop loss invalidasi teknikal"
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
