import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import axios from "axios";
import { gatherCryptoMarketData } from "./cryptoOrchestrator";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const checkAdminAuth = (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Harap login.");
  }
  const email = request.auth.token.email;
  const role = request.auth.token.role;
  if (email !== "deny.wismoyo@gmail.com" && role !== "admin_csrs") {
    throw new HttpsError("permission-denied", "Akses ditolak! Menu ini hanya untuk admin_csrs.");
  }
};

export const generateRealtimeScalping = onCall({
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [deepseekApiKeySecret],
}, async (request) => {
  checkAdminAuth(request);
  const db = getFirestore(admin.app(), "curation");
  
  try {
    const marketData = await gatherCryptoMarketData(false, false);
    const { fearAndGreed, latestNews, scalpingCandidatesData } = marketData;
    const fearGreedValue = fearAndGreed?.current?.value || "UNKNOWN";

    const safeScalpingCandidates = scalpingCandidatesData.map(c => {
       const clone = { ...c };
       if (clone.klines && clone.klines.length > 5) {
          clone.klines = clone.klines.slice(-5);
       }
       return clone;
    });

    const apiKey = deepseekApiKeySecret.value();
    if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");

    const deepseekClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: apiKey });

    // AI 1: Technical Analysis
    const agent1Prompt = `Anda adalah Quant AI (Agent 1).
Tugas Anda HANYA membedah teknikal dari data koin berikut dan memilih TOP 3 terbaik berdasarkan setupScore dan setupReasoning.
PERHATIKAN KONTEKS MAKRO SAAT INI: Fear & Greed Index berada di angka ${fearGreedValue}. JANGAN menyarankan setup LONG agresif jika makro sedang ketakutan ekstrim (< 30).
Berikan output JSON ketat: { "draftScalpingOpportunities": [ { "symbol": "...", "technicalThesis": "..." } ] }

Data Koin:
${JSON.stringify(safeScalpingCandidates, null, 2)}`;

    const result1 = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-chat", messages: [{ role: "user", content: agent1Prompt }]
    }));
    
    let draftScalping = { draftScalpingOpportunities: [] };
    try {
      const cleanJson1 = (result1.choices[0].message.content || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
      draftScalping = JSON.parse(cleanJson1);
    } catch (e) { console.error("Agent 1 failed to parse"); }

    // AI 2: Executive Summary
    const agent2Prompt = `Anda adalah Konsultan Ahli dan Analis Keuangan Kripto Institusional.
Tugas Anda merangkum sentimen pasar dan menyusun laporan Realtime Scalping.

ALUR BERPIKIR WAJIB (CHAIN OF THOUGHT):
1. Fase Makro: Evaluasi Fear & Greed (${fearGreedValue}), berita.
2. Fase Seleksi: Cross-check rekomendasi scalping dari Quant AI dengan kondisi makro.

ATURAN KERAS UNTUK SCALPING OPPORTUNITIES:
1. Minimum Risk:Reward Ratio = 1:2.
2. Stop Loss WAJIB berbasis ATR: SL = entryPrice ± (1.5 × ATR).
3. JANGAN rekomendasikan LONG jika makro BEARISH.
4. Entry price HARUS dekat dengan harga terkini.
5. Maksimal 2 sinyal scalping.

Output Anda WAJIB berupa JSON rapi tanpa markdown block:
{
  "title": "Realtime Radar Scalping",
  "sentiment": "BULLISH / BEARISH / NEUTRAL",
  "marketRegime": "Fase pasar (Bullish Trend / Bearish Trend / Choppy / High Volatility)",
  "macroInsight": "Analisis mendalam (2-3 kalimat)",
  "whaleActivity": "Aktivitas uang besar",
  "summary": "Ringkasan komprehensif (markdown)",
  "projection": "Proyeksi 1 jam ke depan",
  "scalpingOpportunities": [
    {
      "symbol": "simbol",
      "direction": "LONG/SHORT",
      "entryPrice": "angka",
      "targetPrice": "angka",
      "stopLoss": "angka",
      "leverage": "Rekomendasi leverage (Max 10x)",
      "confidenceScore": "HIGH / MEDIUM",
      "momentum": "Alasan singkat mengapa masuk sekarang"
    }
  ]
}

Data Berita: ${JSON.stringify(latestNews)}
Draft Scalping dari Agent 1:
${JSON.stringify(draftScalping.draftScalpingOpportunities)}

Data Harga Terkini (PENTING untuk Entry Price):
${JSON.stringify(safeScalpingCandidates.map(c => ({ symbol: c.symbol, currentPrice: c.klines[c.klines.length-1]?.close, atr: c.atr })), null, 2)}
`;

    const result2 = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-chat", messages: [{ role: "user", content: agent2Prompt }]
    }));

    let finalReport;
    try {
      const cleanJson2 = (result2.choices[0].message.content || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
      finalReport = JSON.parse(cleanJson2);
    } catch (e) { throw new HttpsError("internal", "Agent 2 output invalid JSON"); }

    const docRef = await db.collection("adminRealtimeScalping").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: request.auth.token.email,
      reportData: finalReport
    });

    return { success: true, data: finalReport, docId: docRef.id };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

export const generateRealtimeHiddenGem = onCall({
  region: "asia-southeast2",
  memory: "1GiB",
  timeoutSeconds: 540,
  secrets: [deepseekApiKeySecret],
}, async (request) => {
  checkAdminAuth(request);
  const db = getFirestore(admin.app(), "curation");

  try {
    const tickerRes = await axios.get("https://api.binance.com/api/v3/ticker/24hr");
    const megaCaps = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "TRXUSDT", "LINKUSDT", "MATICUSDT", "TONUSDT", "SHIBUSDT", "BCHUSDT"];
    
    let allTickers = tickerRes.data.filter((t: any) => 
       t.symbol.endsWith("USDT") && parseFloat(t.quoteVolume) > 20000000 && !megaCaps.includes(t.symbol)
    );
    allTickers.sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
    const topCoins = allTickers.slice(0, 30).map((t: any) => t.symbol);

    const oversoldCandidates = [];
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
    } catch (e) { console.warn("Failed to fetch BTC trend", e); }

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const chunkSize = 5;
    for (let i = 0; i < topCoins.length; i += chunkSize) {
       const chunk = topCoins.slice(i, i + chunkSize);
       await Promise.all(chunk.map(async (symbol) => {
          try {
             const res1d = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
             const closes1d = res1d.data.map((k: any) => parseFloat(k[4]));
             if (closes1d.length < 15) return;
             
             let rsi1d = calculateRSI(closes1d, 14);
             
             if (rsi1d && rsi1d < 45) {
                const res4h = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=50`);
                const closes4h = res4h.data.map((k: any) => parseFloat(k[4]));
                let rsi4h = calculateRSI(closes4h, 14);
                let stochRsi4h = calculateStochRSI(closes4h, 14, 3, 3);
                
                if (rsi4h && rsi4h < 40) {
                   oversoldCandidates.push({
                      symbol,
                      currentPrice: closes1d[closes1d.length-1],
                      rsi1d: rsi1d.toFixed(2),
                      rsi4h: rsi4h.toFixed(2),
                      stochRsi4h: stochRsi4h ? `K:${stochRsi4h.k.toFixed(1)} D:${stochRsi4h.d.toFixed(1)}` : "N/A"
                   });
                }
             }
          } catch(e) {}
       }));
       if (i + chunkSize < topCoins.length) await delay(300);
    }

    if (oversoldCandidates.length === 0) {
       return { success: false, message: "Tidak ada kandidat oversold saat ini." };
    }

    const apiKey = deepseekApiKeySecret.value();
    if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");
    const deepseekClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: apiKey });

    const prompt = `Anda adalah "Hedge Fund AI Analyst" yang mencari "Hidden Gem".
KONTEKS MAKRO: Tren BTC 7 Hari Terakhir: ${btcMacroTrend} (${btcChangePct}). PERINGATAN: Jika Tren BTC BEARISH, rekomendasi harus sangat konservatif.
Kandidat Oversold:
${JSON.stringify(oversoldCandidates, null, 2)}

TUGAS: Pilih 1-2 koin terbaik untuk potensi pembalikan arah (reversal). Sebutkan CATALYST pembalikan.
Output HARUS JSON murni tanpa markdown:
{
  "marketContext": "Konteks singkat (maks 2 kalimat)",
  "topPicks": [
    {
      "symbol": "BTCUSDT",
      "currentPrice": "harga",
      "rsi1d": "rsi dari data",
      "rsi4h": "rsi dari data",
      "stochRsi4h": "stoch rsi dari data",
      "reasoning": "Alasan fundamental tajam (sebutkan CATALYST pembalikan arah) kenapa koin ini siap reversal",
      "targetPrice": "Angka target (HARUS > currentPrice)",
      "stopLoss": "Angka stop loss (HARUS < currentPrice)",
      "riskLevel": "Conservative | Moderate | Aggressive",
      "potentialReturnPct": "Persentase"
    }
  ]
}`;

    const result = await withRetry(() => deepseekClient.chat.completions.create({
      model: "deepseek-chat", messages: [{ role: "user", content: prompt }]
    }));

    let finalReport;
    try {
      const cleanJson = (result.choices[0].message.content || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
      finalReport = JSON.parse(cleanJson);
    } catch (e) { throw new HttpsError("internal", "AI output invalid JSON"); }

    const docRef = await db.collection("adminRealtimeGems").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: request.auth.token.email,
      reportData: finalReport
    });

    return { success: true, data: finalReport, docId: docRef.id };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

const calculateRSI = (closes: number[], period = 14): number | undefined => {
  if (closes.length <= period) return undefined;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change; else losses -= change;
  }
  let avgGain = gains / period; let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
};

const calculateStochRSI = (closes: number[], period = 14, smoothK = 3, smoothD = 3) => {
  const rsiValues = [];
  if (closes.length <= period * 2) return undefined;
  for (let i = 0; i <= closes.length - period; i++) {
    const window = closes.slice(i, i + period * 2);
    const rsi = calculateRSI(window, period);
    if (rsi !== undefined) rsiValues.push(rsi);
  }
  if (rsiValues.length < period) return undefined;
  const stochRSI = [];
  for (let i = period - 1; i < rsiValues.length; i++) {
    const windowRSI = rsiValues.slice(i - period + 1, i + 1);
    const minRSI = Math.min(...windowRSI);
    const maxRSI = Math.max(...windowRSI);
    const currentRSI = rsiValues[i];
    let stoch = 0;
    if (maxRSI !== minRSI) stoch = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
    stochRSI.push(stoch);
  }
  if (stochRSI.length < smoothK) return undefined;
  const kValues = [];
  for (let i = smoothK - 1; i < stochRSI.length; i++) {
    let sum = 0;
    for (let j = 0; j < smoothK; j++) sum += stochRSI[i - j];
    kValues.push(sum / smoothK);
  }
  if (kValues.length < smoothD) return undefined;
  let sumD = 0;
  for (let i = 0; i < smoothD; i++) sumD += kValues[kValues.length - 1 - i];
  return { k: kValues[kValues.length - 1], d: sumD / smoothD };
};
