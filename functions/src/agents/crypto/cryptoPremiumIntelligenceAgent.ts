import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

import { calculateATR, calculateOBV } from "./utils/indicators";
import { fetchBinanceOpenInterest, fetchFearAndGreedIndex } from "./cryptoOrchestrator";

export const cryptoPremiumIntelligenceAgent = onSchedule(
  {
    schedule: "0 8 * * *", 
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

      let tokenUnlocks = [];
      try {
         const unlocksRes = await axios.get("https://api.llama.fi/unlocks");
         if (unlocksRes.data) {
             tokenUnlocks = unlocksRes.data.filter((u: any) => topCoins.includes(u.token + "USDT") || topCoins.includes(u.symbol + "USDT"));
         }
      } catch (e) {
         console.warn("Failed to fetch token unlocks");
      }

      const coinMetrics = [];

      let fearGreedValue = "N/A";
      try {
         const fg = await fetchFearAndGreedIndex();
         if (fg && fg.current) fearGreedValue = fg.current.value;
      } catch (e) {
         console.warn("Failed to fetch fear and greed");
      }

      const chunkSize = 5;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      for (let i = 0; i < topCoins.length; i += chunkSize) {
         const chunk = topCoins.slice(i, i + chunkSize);
         await Promise.all(chunk.map(async (symbol) => {
             try {
                 const klines1dRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
                 const klines = klines1dRes.data;
                 const closes = klines.map((k: any) => parseFloat(k[4]));
                 const volumes = klines.map((k: any) => parseFloat(k[5]));
                 
                 const currentPrice = closes[closes.length - 1];
                 const currentVolume = volumes[volumes.length - 1];
                 
                 const last7Volumes = volumes.slice(-8, -1);
                 const avg7dVolume = last7Volumes.length > 0 ? (last7Volumes.reduce((a: number, b: number) => a + b, 0) / last7Volumes.length) : 1;
                 
                 const volumeSpikeRatio = currentVolume / (avg7dVolume || 1);
                 const atr = calculateATR(klines, 14);
                 const volatilityPct = (atr / currentPrice) * 100;
                 
                 const priceChangePct = ((currentPrice - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;

                 // Map back to klines object for OBV
                 const klineObjs = klines.map((k: any) => ({ close: k[4], volume: k[5] }));
                 const obv = calculateOBV(klineObjs);
                 const obvDivergence = (obv[obv.length - 1] > obv[obv.length - 2] && priceChangePct < 0) ? "BULLISH_DIV" : 
                                       (obv[obv.length - 1] < obv[obv.length - 2] && priceChangePct > 0) ? "BEARISH_DIV" : "NONE";

                 const openInterest = await fetchBinanceOpenInterest(symbol);

                 coinMetrics.push({
                     symbol,
                     price: currentPrice,
                     volumeSpikeRatio: volumeSpikeRatio.toFixed(2),
                     volatilityPct: volatilityPct.toFixed(2),
                     priceChangePct: priceChangePct.toFixed(2),
                     obvDivergence,
                     openInterest,
                     atr: atr.toFixed(4)
                 });
             } catch (e) {
                 console.error(`Failed to fetch metrics for ${symbol}`, e);
             }
         }));
         if (i + chunkSize < topCoins.length) await delay(300);
      }

      const apiKey = deepseekApiKeySecret.value();
      if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");

      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
      });

      const prompt = `
Anda adalah "Hedge Fund AI Architect" yang merancang laporan intelijen premium (Smart Money, Liquidity Heatmap, dan Danger Zone).
Gunakan nada yang analitis, kuantitatif, dingin, dan tanpa emosi.

ALUR BERPIKIR (MULTI-TIMEFRAME & MACRO AWARENESS):
- Selalu pertimbangkan apakah anomali volume 1-Hari ini sejalan dengan tren makro pasar.
- Jangan tertipu oleh "Volume Spike" yang ternyata adalah buangan (Distribution) dari Whale. Perhatikan "obvDivergence" dan arah harga ("priceChangePct").

KONTEKS MAKRO SAAT INI: Fear & Greed = ${fearGreedValue}. 
Ini WAJIB menjadi faktor penentu tingkat konviksi di setiap kategori. Jika F&G < 30 (Ketakutan), hindari Smart Money yang agresif ke atas.

Berikut adalah matriks data dari Top 40 aset kripto berdasarkan anomali volume, volatilitas (ATR), persentase perubahan harga, divergensi OBV, dan Open Interest:
${JSON.stringify(coinMetrics, null, 2)}

Data Token Unlock (Jika ada yang relevan untuk koin di atas):
${JSON.stringify(tokenUnlocks.slice(0, 15), null, 2)}

TUGAS ANDA:
Sintesis data di atas dan identifikasi kandidat terbaik untuk 3 kategori ini:

1. "Smart Money Tracker": Pilih 3-4 koin di mana "volumeSpikeRatio" tinggi, "obvDivergence" BULLISH_DIV, atau Open Interest meningkat tetapi harga relatif tertahan. Ini mengindikasikan akumulasi paus (whale).
2. "Liquidity Hunter": Pilih 3-4 koin dengan "volatilityPct" (ATR) tertinggi. Hitung secara matematis "Liquidity Sweep": 'shortLiquidityZone' (Resistance StopLoss) = harga saat ini + (2 * ATR). 'longLiquidityZone' (Support StopLoss) = harga saat ini - (2 * ATR).
3. "Danger Zone": Pilih 3-4 koin dengan risiko makro tinggi (koin yang mungkin mengalami Token Unlock dalam waktu dekat berdasarkan data di atas) atau momentum harga buruk (BEARISH_DIV OBV). Buat narasi bahaya.

ATURAN KERAS (TIDAK BOLEH DILANGGAR):
- "accumulationReason", "hunterStrategy", dan "dangerReason" MAKSIMAL 2 kalimat tajam dan padat (gaya bahasa hedge fund institusional).
- Field "action" pada dangerZone HANYA boleh diisi "AVOID" atau "SHORT".
- Output Anda HARUS murni JSON valid. JANGAN membungkus JSON dengan markdown block (\`\`\`json). JANGAN menambahkan teks pengantar atau penutup.

Setiap item HARUS mengembalikan field 'quantitativeMetrics' yang berisi data numerik (spesifik dan bukan asal-asalan) yang disintesis dari data di atas agar bisa ditampilkan di grafik oleh frontend.
Skema JSON yang harus dikembalikan:
{
  "smartMoney": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "accumulationReason": "Alasan akumulasi Whale (Maks 2 kalimat)",
      "breakoutTarget": "Harga target penembusan jika akumulasi selesai (harga + 3*ATR)",
      "quantitativeMetrics": { "volumeSpikeRatio": "2.5", "priceChangePct": "0.1", "obvTrend": "BULLISH_DIV" }
    }
  ],
  "liquidityZones": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "shortLiquidityZone": "Harga di atas (resistance) tempat stop loss terkumpul (kalkulasi dari harga + 1-2 ATR)",
      "longLiquidityZone": "Harga di bawah (support) tempat stop loss terkumpul (kalkulasi dari harga - 1-2 ATR)",
      "hunterStrategy": "Cara cerdas institusi mengambil keuntungan (Maks 2 kalimat)",
      "quantitativeMetrics": { "openInterest": "150000", "volatilityPct": "4.5", "atr": "0.85" }
    }
  ],
  "dangerZone": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "dangerHorizon": "Timeframe bahaya: '24-48 jam' / '3-7 hari' / '2 minggu'. Tentukan berdasarkan kapan token unlock terjadi atau seberapa cepat OBV divergence biasanya beresolusi.",
      "dangerReason": "Alasan fundamental/teknikal potensi dump (Maks 2 kalimat)",
      "action": "AVOID | SHORT",
      "quantitativeMetrics": { "drawdownPct": "-15.2", "volumeChangePct": "-40.5", "unlockDate": "2024-12-01" }
    }
  ]
}
`;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-chat",
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

      // Cleanup old data (> 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const timestamp3DaysAgo = admin.firestore.Timestamp.fromDate(threeDaysAgo);
      
      const collectionsToClean = ["cryptoSmartMoney", "cryptoLiquidity", "cryptoDangerZone"];
      for (const coll of collectionsToClean) {
         try {
            const oldDocs = await db.collection(coll).where("createdAt", "<", timestamp3DaysAgo).get();
            if (!oldDocs.empty) {
               const cleanupBatch = db.batch();
               oldDocs.forEach(doc => cleanupBatch.delete(doc.ref));
               await cleanupBatch.commit();
               console.log(`Cleaned up ${oldDocs.size} old documents from ${coll}`);
            }
         } catch(e) {
            console.error(`Failed to cleanup ${coll}`, e);
         }
      }

      console.log("Premium Intelligence Reports generated successfully.");
    } catch (error) {
      console.error("Error in cryptoPremiumIntelligenceAgent:", error);
    }
  }
);
