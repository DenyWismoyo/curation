import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

function calculateATR(klines: any[], period = 14) {
    if (klines.length < period + 1) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < klines.length; i++) {
        const high = parseFloat(klines[i][2]);
        const low = parseFloat(klines[i][3]);
        const prevClose = parseFloat(klines[i-1][4]);
        
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
    }
    
    const recentTRs = trueRanges.slice(-period);
    const sum = recentTRs.reduce((a, b) => a + b, 0);
    return sum / period;
}

export const cryptoPremiumIntelligenceAgent = onSchedule(
  {
    schedule: "15 7 * * *", 
    timeZone: "Asia/Jakarta", 
    secrets: [deepseekApiKeySecret],
    region: "asia-southeast2",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    try {
      const db = getFirestore(admin.app(), "curation");
      
      const tickerRes = await axios.get("https://api.binance.com/api/v3/ticker/24hr");
      let allTickers = tickerRes.data.filter((t: any) => t.symbol.endsWith("USDT") && parseFloat(t.quoteVolume) > 20000000);
      
      allTickers.sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      const topCoins = allTickers.slice(0, 40).map((t: any) => t.symbol);

      const coinMetrics = [];

      for (const symbol of topCoins) {
         try {
             const klines1dRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
             const klines = klines1dRes.data;
             const closes = klines.map((k: any) => parseFloat(k[4]));
             const volumes = klines.map((k: any) => parseFloat(k[5]));
             
             const currentPrice = closes[closes.length - 1];
             const currentVolume = volumes[volumes.length - 1];
             const prevVolume = volumes[volumes.length - 2] || 1;
             
             const volumeSpikeRatio = currentVolume / prevVolume;
             const atr = calculateATR(klines, 14);
             const volatilityPct = (atr / currentPrice) * 100;
             
             const priceChangePct = ((currentPrice - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;

             coinMetrics.push({
                 symbol,
                 price: currentPrice,
                 volumeSpikeRatio: volumeSpikeRatio.toFixed(2),
                 volatilityPct: volatilityPct.toFixed(2),
                 priceChangePct: priceChangePct.toFixed(2)
             });
         } catch (e) {
             console.error(`Failed to fetch klines for ${symbol}`, e);
         }
         await new Promise(r => setTimeout(r, 100));
      }

      const apiKey = deepseekApiKeySecret.value();
      if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");

      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
      });

      const prompt = `
Anda adalah "Hedge Fund AI Architect" yang merancang laporan intelijen premium (Smart Money, Liquidity Heatmap, dan Danger Zone).
Berikut adalah matriks data dari Top 40 aset kripto berdasarkan anomali volume, volatilitas (ATR), dan persentase perubahan harga (Price Change):
${JSON.stringify(coinMetrics, null, 2)}

TUGAS ANDA:
Sintesis data di atas dan identifikasi kandidat terbaik untuk 3 kategori ini:

1. "Smart Money Tracker": Pilih 2 koin di mana "volumeSpikeRatio" tinggi tetapi "priceChangePct" relatif kecil atau tertahan, mengindikasikan bandar (whale) sedang melakukan akumulasi diam-diam sebelum breakout.
2. "Liquidity Hunter": Pilih 2 koin dengan "volatilityPct" (ATR) tertinggi. Kalkulasikan area "Liquidity Sweep" (Zona Long & Short yang rawan tersapu/likuidasi) berdasarkan harga saat ini.
3. "Danger Zone": Pilih 2 koin dengan momentum harga yang buruk atau risiko makro tinggi (koin yang mungkin mengalami Token Unlock atau tekanan jual berat). Buat narasi rasional tentang bahaya tersebut.

PENTING: Output Anda HARUS murni berformat JSON tanpa teks pengantar, markdown blok, atau penutup. 
Skema JSON yang harus dikembalikan:
{
  "smartMoney": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "accumulationReason": "Alasan tajam mengapa ini terdeteksi sebagai akumulasi Whale (2-3 kalimat)",
      "breakoutTarget": "Harga target jika akumulasi selesai"
    }
  ],
  "liquidityZones": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "shortLiquidityZone": "Harga di atas (resistance) tempat stop loss terkumpul",
      "longLiquidityZone": "Harga di bawah (support) tempat stop loss terkumpul",
      "hunterStrategy": "Cara cerdas institusi mengambil keuntungan di zona ini"
    }
  ],
  "dangerZone": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "dangerReason": "Alasan fundamental/teknikal potensi dump atau bahaya",
      "action": "Avoid | Short"
    }
  ]
}
`;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-reasoner",
        messages: [{ role: "user", content: prompt }],
      }));

      const responseText = result.choices[0].message.content || "{}";
      
      let parsedData;
      try {
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanJson);
      } catch (e) {
          console.error("Gagal parse output Deepseek:", responseText);
          parsedData = { smartMoney: [], liquidityZones: [], dangerZone: [] };
      }

      const batch = db.batch();
      const serverTime = admin.firestore.FieldValue.serverTimestamp();

      const smRef = db.collection("cryptoSmartMoney").doc();
      batch.set(smRef, { createdAt: serverTime, coins: parsedData.smartMoney || [] });

      const lqRef = db.collection("cryptoLiquidity").doc();
      batch.set(lqRef, { createdAt: serverTime, coins: parsedData.liquidityZones || [] });

      const dzRef = db.collection("cryptoDangerZone").doc();
      batch.set(dzRef, { createdAt: serverTime, coins: parsedData.dangerZone || [] });

      await batch.commit();

      console.log("Premium Intelligence Reports generated successfully.");
    } catch (error) {
      console.error("Error in cryptoPremiumIntelligenceAgent:", error);
    }
  }
);
