import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatherCryptoMarketData } from "./cryptoOrchestrator";
import { withRetry } from "../../utils/retry"; 

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const cryptoCronAgent = onSchedule(
  {
    schedule: "0 3,7,11,15,19,23 * * *",
    timeZone: "Asia/Jakarta", 
    secrets: [deepseekApiKeySecret, geminiApiKeySecret],
    region: "asia-southeast2",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    console.log("cryptoCronAgent started", event.scheduleTime);
    const db = getFirestore(admin.app(), "curation");
    
    const date = new Date();
    const isDaily = date.getHours() === 7 || date.getUTCHours() === 0;
    // Siklus Mingguan: Senin jam 07:00 WIB (00:00 UTC)
    const isWeekly = date.getUTCDay() === 1 && date.getUTCHours() === 0;
    const isMonthly = date.getUTCDate() === 1 && date.getUTCHours() === 0;

    const { fearAndGreed, globalMarket, latestNews, stablecoinGrowth, dexVolumeGrowth, marketData, scalpingCandidatesData, weeklyMarketData, monthlyMarketData } = await gatherCryptoMarketData(isWeekly, isMonthly, db);
    
    // MARKET REGIME GUARD
    const fearGreedValue = fearAndGreed?.current?.value ? parseInt(fearAndGreed.current.value) : 50;
    const isExtremeMarket = fearGreedValue < 20 || fearGreedValue > 80;
    
    // Filter out scalping candidates if market is too extreme
    let safeScalpingCandidates = scalpingCandidatesData;
    if (isExtremeMarket) {
        console.log(`Market regime ekstrim (F&G: ${fearGreedValue}). Skip scalping signals.`);
        safeScalpingCandidates = [];
    }
    
    // Fetch Macro Economic Calendar
    let macroCalendar = [];
    try {
      const calRes = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
      if (calRes.ok) macroCalendar = await calRes.json();
    } catch (e) {
      console.error("Gagal mengambil Macro Calendar:", e);
    }

    // Ambil laporan sebelumnya untuk self-correction dan win-rate tracking
    let previousReport: any = null;
    let previousScalpingStatus = "";
    let finalEvaluatedScalps: any[] = [];
    
    try {
      const prevReportSnap = await db.collection("cryptoReports")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
        
      if (!prevReportSnap.empty) {
         previousReport = prevReportSnap.docs[0].data().reportData;
      }
    } catch (e) {
      console.log("No previous report found");
    }
    
    try {
      // PHASE 1: EVALUATE PENDING TRADES
      const pendingTradesSnap = await db.collection("cryptoActiveTrades")
        .where("status", "==", "PENDING")
        .get();
        
      if (!pendingTradesSnap.empty) {
        const pendingTrades = pendingTradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        let totalWins = 0;
        let totalLosses = 0;
        let totalPending = 0;
        
        const evaluatedScalpsPromises = pendingTrades.map(async (trade: any) => {
          const target = parseFloat(trade.targetPrice);
          const sl = parseFloat(trade.stopLossPrice);
          let status = "PENDING";
          let currentPrice = 0;
          
          try {
            // Ambil Klines histori 12 jam ke belakang (720 menit)
            // Karena cron berjalan tiap 4 jam, ini cukup untuk memantau pergerakan terbaru
            const klinesRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${trade.symbol}&interval=1m&limit=720`);
            const allKlines = klinesRes.data;
            
            if (allKlines && allKlines.length > 0) {
               currentPrice = parseFloat(allKlines[allKlines.length - 1][4]); 
               
               if (target > 0 && sl > 0) {
                  // Filter klines to only include those after the trade was created
                  const tradeCreatedAt = trade.createdAt ? trade.createdAt.toDate().getTime() : 0;
                  const relevantKlines = allKlines.filter((k: any) => parseInt(k[0]) >= tradeCreatedAt);
                  
                  for (const candle of relevantKlines) {
                     const high = parseFloat(candle[2]);
                     const low = parseFloat(candle[3]);
                     
                     if (trade.direction === "SHORT") {
                        if (high >= sl) { status = "LOSS"; break; } 
                        else if (low <= target) { status = "WIN"; break; }
                     } else { // LONG
                        if (low <= sl) { status = "LOSS"; break; } 
                        else if (high >= target) { status = "WIN"; break; }
                     }
                  }
               }
            }
          } catch (e) {
             console.error("Gagal mengambil klines untuk " + trade.symbol, e);
          }

          // Auto-expire zombie trades (> 6 hours)
          if (status === "PENDING" && trade.createdAt) {
             const tradeAgeMs = Date.now() - trade.createdAt.toDate().getTime();
             if (tradeAgeMs > 6 * 60 * 60 * 1000) {
                status = "EXPIRED";
             }
          }
          
          let pnl = 0;
          const entryPrice = parseFloat(trade.entryPrice);
          if (entryPrice > 0) {
             if (status === "WIN") {
                pnl = trade.direction === "SHORT" ? ((entryPrice - target) / entryPrice) * 100 : ((target - entryPrice) / entryPrice) * 100;
             } else if (status === "LOSS") {
                pnl = trade.direction === "SHORT" ? ((entryPrice - sl) / entryPrice) * 100 : ((sl - entryPrice) / entryPrice) * 100;
             } else if (status === "EXPIRED") {
                pnl = trade.direction === "SHORT" ? ((entryPrice - currentPrice) / entryPrice) * 100 : ((currentPrice - entryPrice) / entryPrice) * 100;
             }
          }
          
          if (status === "WIN") totalWins++;
          else if (status === "LOSS") totalLosses++;
          else if (status === "PENDING") totalPending++;
          
          // Update status di Firestore jika sudah tidak PENDING
          if (status !== "PENDING") {
             await db.collection("cryptoActiveTrades").doc(trade.id).update({
                status,
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                resolvedPrice: currentPrice,
                pnlPercent: pnl
             });
          }

          return {
            symbol: trade.symbol,
            entryPrice: trade.entryPrice,
            targetPrice: target,
            stopLossPrice: sl,
            direction: trade.direction || "LONG",
            currentPrice,
            status,
            pnlPercent: pnl.toFixed(2)
          };
        });
        
        finalEvaluatedScalps = await Promise.all(evaluatedScalpsPromises);
        
        const totalFinished = totalWins + totalLosses;
        const winRate = totalFinished > 0 ? ((totalWins / totalFinished) * 100).toFixed(2) + "%" : "N/A";

        previousScalpingStatus = `
Evaluasi Kinerja Scalping (Otomatis Dihitung oleh Sistem dari Active Trades):
- Total Sinyal Dievaluasi: ${pendingTrades.length}
- WIN BARU (Hit Target): ${totalWins}
- LOSS BARU (Hit Stoploss): ${totalLosses}
- MASIH PENDING (Floating): ${totalPending}
- WIN RATE (Sesi Ini): ${winRate}

Rincian Evaluasi:
${JSON.stringify(finalEvaluatedScalps, null, 2)}

(Tugas Anda: Analisis secara singkat mengapa sinyal WIN berhasil dan mengapa LOSS gagal berdasarkan pergerakan market terbaru di bagian 'selfCorrection'. JANGAN hitung ulang Win Rate, gunakan data di atas.)`;
        
        if (totalWins > 0 || totalLosses > 0) {
           await db.collection("cryptoPerformanceMetrics").doc("global_stats").set({
              totalWins: admin.firestore.FieldValue.increment(totalWins),
              totalLosses: admin.firestore.FieldValue.increment(totalLosses),
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
           }, { merge: true });
        }
      }
    } catch (e) {
      console.log("No pending trades found for evaluation", e);
    }

    const client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: deepseekApiKeySecret.value(),
    });

    const systemPrompt = `Anda adalah Konsultan Ahli dan Analis Keuangan Kripto Institusional.
Tugas Anda adalah merangkum sentimen pasar dari K-lines, Fear & Greed Index, dan Berita Utama, serta membuat proyeksi 4 jam ke depan.

ALUR BERPIKIR WAJIB (CHAIN OF THOUGHT):
Sebelum menentukan rekomendasi akhir, pikirkan langkah-langkah berikut:
1. Fase Makro: Evaluasi Fear & Greed, berita, dan data aliran dana. Tentukan apakah pasar sedang akumulasi, distribusi, atau panik.
2. Fase BTC: Gunakan Bitcoin sebagai barometer utama. Apakah tren BTC mendukung pergerakan altcoin?
3. Fase Seleksi Scalping: Cross-check rekomendasi scalping dari Quant AI dengan kondisi makro. Buang posisi LONG jika makro/BTC sangat buruk.

ATURAN KERAS UNTUK SCALPING OPPORTUNITIES (TIDAK BOLEH DILANGGAR):
1. Minimum Risk:Reward Ratio = 1:2 (Jarak Target minimal 2x lebih besar dari jarak Stop Loss).
2. Stop Loss WAJIB berbasis ATR: SL = entryPrice ± (1.5 × ATR). JANGAN gunakan persentase sembarangan!
3. JANGAN rekomendasikan LONG jika marketRegime = "BEARISH" atau sentimen = "BEARISH".
4. Entry price HARUS sangat dekat dengan harga terkini (current price di data kline terakhir).
5. Maksimal hanya berikan 2 sinyal scalping. Kualitas lebih penting dari kuantitas.
6. Minimum confidenceScore untuk masuk: HIGH atau MEDIUM saja. Jika tidak yakin, KOSONGKAN array scalpingOpportunities.
7. Field \`poc\` (Volume Point of Control) menunjukkan level harga dengan volume terbanyak. Jika harga > POC, itu adalah support kuat. Jika harga < POC, itu adalah resistance. Gunakan ini sebagai referensi support/resistance di analisis Anda.
8. DRAWDOWN PROTECTION: Jika pada evaluasi sebelumnya Win Rate < 40% atau LOSS > 2, maka hanya boleh mengeluarkan MAKSIMAL 1 sinyal scalping (Mode Konservatif).

Output Anda WAJIB berupa JSON rapi tanpa markdown block (seperti \`\`\`json):
{
  "title": "Judul laporan (misal: Rekap Pasar & Sinyal Trading)",
  "sentiment": "BULLISH / BEARISH / NEUTRAL",
  "marketRegime": "Fase pasar (Bullish Trend / Bearish Trend / Choppy / High Volatility)",
  "macroInsight": "Analisis mendalam (2-3 kalimat): Apakah ini fase akumulasi/distribusi? Apa sentimen institusional dari berita/F&G?",
  "whaleActivity": "Aktivitas uang besar (Heavy Accumulation / Distribution / Trap / Neutral)",
  "summary": "Ringkasan komprehensif (markdown) mencakup: Kondisi makro, analisis tren BTC, dan dampaknya ke altcoin.",
  "projection": "Proyeksi 4 jam ke depan (markdown)",
  "accuracyScore": "Tingkat akurasi dari tebakan sebelumnya (0-100), atau null jika belum ada data sebelumnya",
  "selfCorrection": "Format WAJIB: '[BENAR/SALAH] untuk [SYMBOL] karena [ALASAN TEKNIKAL SPESIFIK]'. Contoh: 'BENAR untuk BTCUSDT — bounced dari EMA50 seperti diprediksi. SALAH untuk ETHUSDT — dump tak terduga akibat berita FED hawkish 2 jam setelah sinyal.' Jika tidak ada data sebelumnya, isi: null.",
  "btcDominance": "Persentase dominasi BTC terkini, misal: '55.2%'",
  "globalMarketCap": "Global Market Cap kripto, misal: '$2.1T'",
  "fearGreedTrend": "Tren Fear & Greed 7 hari terakhir (meningkat/menurun/stabil)",
  "temporalComparison": {
     "sentimentChange": "Perubahan sentimen dari kemarin",
     "btcPriceDelta": "Perubahan harga BTC vs open kemarin",
     "notableMovers": "Koin yang paling banyak bergerak vs kemarin"
  },
  "coinsAnalysis": [
     {
       "symbol": "BTCUSDT",
       "analysis": "Analisis singkat & teknikal",
       "recommendation": "HOLD/BUY/SELL",
       "supportLevel": "Angka spesifik atau range",
       "resistanceLevel": "Angka spesifik",
       "stopLossPrice": 64000.5,
       "targetPrice": 68000.0
     }
  ],
  "scalpingOpportunities": [
     {
       "symbol": "Nama Koin",
       "direction": "LONG atau SHORT",
       "momentum": "Alasan memilih koin ini (gabungkan setupReasoning). Jika SHORT, jelaskan kenapa berpotensi turun.",
       "entryPrice": 65000.0,
       "targetPrice": 66000.0,
       "stopLossPrice": 64500.0,
       "allocationPercentage": "Jika volatilityPct (ATR/Harga) > 3%, alokasi MAKS 5%. Jika F&G < 35, alokasi MAKS 10%.",
       "confidenceScore": "HIGH / MEDIUM / LOW (Berdasarkan konvergensi indikator teknikal & derivatif)",
       "riskRewardRatio": "Rasio numerik (misal: '1:2.5' atau '1:3')"
     }
  ],
  "dailyRecap": "Ringkasan fundamental 24 jam terakhir (jika siklus harian, jika tidak kosongkan)",
  "dailyProjection": "Proyeksi 1 hari penuh (jika siklus harian, jika tidak kosongkan)",
  "dailyCalendarSummary": "Ringkasan analisis kalender naratif 1-2 paragraf yang merangkum apa yang terjadi KEMARIN vs prediksi untuk HARI INI berdasarkan event makro dan teknikal (hanya jika siklus harian)",
  "weeklyRecap": "Kilas balik makro seminggu terakhir (hanya diisi jika siklus mingguan, jika tidak kosongkan)",
  "weeklyStrategy": "Narasi dan strategi makro untuk seminggu ke depan (hanya jika siklus mingguan)",
  "weeklyMacroCalendarForecast": "Ringkasan naratif (2-3 paragraf) yang menyoroti rilis data ekonomi (Forex Factory) paling kritikal minggu ini dan potensinya terhadap likuiditas/pasar kripto (hanya jika siklus mingguan)",
  "weeklyWatchlist": [
     {
       "symbol": "Nama Koin",
       "action": "MUST BUY / MUST SELL / HOLD",
       "reason": "Alasan kuat (misal: Event penting, pergerakan whale, pola mingguan kuat)",
       "entryPrice": 0.0,
       "targetPrice": 0.0
     }
  ], // HANYA diisi jika siklus mingguan, jika tidak biarkan array kosong []
  "monthlyOutlook": "Narasi panjang (3-4 paragraf) mengenai kondisi makro bulanan dan prediksi tren utama aset kripto untuk 1 bulan ke depan. (Hanya jika siklus bulanan)",
  "monthlyKeyLevels": [
     {
       "symbol": "BTCUSDT",
       "criticalSupport": "Level kritis support bulanan",
       "criticalResistance": "Level kritis resistance bulanan",
       "narrative": "Narasi singkat mengapa level ini sangat penting bulan ini"
     }
  ] // HANYA diisi jika siklus bulanan, jika tidak biarkan array kosong []
}`;

    const userPrompt = `
Konteks Waktu Saat Ini: ${date.toISOString()}
Siklus Harian?: ${isDaily ? "YA (Isi field daily)" : "TIDAK"}
Siklus Mingguan?: ${isWeekly ? "YA (Isi field weekly dan weeklyWatchlist, lihat data mingguan!)" : "TIDAK"}

${previousScalpingStatus ? previousScalpingStatus : "Tidak ada data scalping sebelumnya untuk dievaluasi."}

Berita Fundamental:
${JSON.stringify(latestNews, null, 2)}

Pertumbuhan Stablecoin Makro (Daya Beli Pasar / Inflow):
${stablecoinGrowth ? JSON.stringify(stablecoinGrowth, null, 2) : "Tidak tersedia"}

Data On-Chain Makro (Pertumbuhan Volume DEX 24 Jam):
${dexVolumeGrowth ? JSON.stringify(dexVolumeGrowth, null, 2) : "Tidak tersedia"}

Kalender Ekonomi Makro Global (Minggu Ini):
${macroCalendar && macroCalendar.length > 0 ? JSON.stringify(macroCalendar.slice(0, 50), null, 2) : "Tidak tersedia"}

Fear & Greed Index (Sekarang vs Histori 7 Hari): 
${fearAndGreed ? JSON.stringify(fearAndGreed, null, 2) : "Tidak tersedia"}

Global Market Info (CoinGecko):
${globalMarket ? JSON.stringify({
  market_cap_percentage: globalMarket.market_cap_percentage,
  total_market_cap: globalMarket.total_market_cap?.usd,
  total_volume: globalMarket.total_volume?.usd
}, null, 2) : "Tidak tersedia"}

Data Pasar Utama (Candlestick 4-Jam Terakhir + Indikator Teknikal + Derivatif):
${JSON.stringify(marketData, null, 2)}

${isWeekly ? `Data Makro Mingguan (Candlestick 1-Minggu Terakhir):\n${JSON.stringify(weeklyMarketData, null, 2)}\n` : ""}
${isMonthly ? `Data Makro Bulanan (Candlestick 1-Bulan Terakhir):\n${JSON.stringify(monthlyMarketData, null, 2)}\n` : ""}
Data Altcoin Volatil (Kandidat Scalping, Candlestick 15-Menit Terakhir):
${JSON.stringify(safeScalpingCandidates, null, 2)}

Proyeksi Anda Sebelumnya (Untuk Evaluasi Akurasi, bandingkan dengan harga terkini!):
${previousReport ? JSON.stringify(previousReport.projection) + "\\nSinyal Koin Sebelumnya: " + JSON.stringify(previousReport.coinsAnalysis) : "Tidak ada data sebelumnya."}

PENTING: Untuk 'scalpingOpportunities', WAJIB perhatikan 'setupDirection' dari Data Koin. Jika 'SHORT', maka TargetPrice HARUS LEBIH KECIL dari EntryPrice, dan StopLoss HARUS LEBIH BESAR. 
Gunakan nilai ATR (Average True Range) yang tersedia di data koin untuk menentukan jarak Stop Loss agar terhindar dari volatilitas liar (Whipsaw)!
Buatkan laporan JSON yang komprehensif, actionable, dan jujur!
`;

    try {
      let finalContent = "{}";
      
      try {
        console.log("Starting Multi-Agent Pipeline...");
        
        // ==========================================
        // AGENT 1: The Fast Quant (DeepSeek V4)
        // ==========================================
        console.log("Agent 1 (Fast Quant) analyzing technicals...");
        const agent1Prompt = `Anda adalah Quant AI (Agent 1).
Tugas Anda HANYA membedah teknikal dari data koin berikut dan memilih TOP 3 terbaik berdasarkan setupScore dan setupReasoning.
PERHATIKAN KONTEKS MAKRO SAAT INI: Fear & Greed Index berada di angka ${fearGreedValue}. JANGAN menyarankan setup LONG agresif jika makro sedang ketakutan ekstrim (< 30).
Berikan output JSON ketat: { "draftScalpingOpportunities": [ { "symbol": "...", "setupType": "Breakout / Bounce / Continuation", "timeframeDominant": "15m / 1H", "technicalThesis": "...", "counterArgument": "Satu skenario gagal yang paling mungkin" } ] }

Data Koin:
${JSON.stringify(safeScalpingCandidates, null, 2)}`;

        const response1 = await withRetry(() => client.chat.completions.create({
          model: "deepseek-chat", // DeepSeek V4
          messages: [
            { role: "system", content: "Anda adalah Quant AI murni. Output WAJIB JSON." },
            { role: "user", content: agent1Prompt }
          ],
        }));
        
        let agent1Output = response1.choices[0]?.message?.content || "{}";
        if (agent1Output.startsWith("\`\`\`")) {
           agent1Output = agent1Output.replace(/^\`\`\`(json)?/gi, "").replace(/\`\`\`$/g, "").trim();
        }
        
        let draftScalping = [];
        try {
           draftScalping = JSON.parse(agent1Output).draftScalpingOpportunities || [];
        } catch (e) {
           console.error("Agent 1 JSON parse error", e);
        }

        // ==========================================
        // AGENT 2: The Chief Risk Officer (DeepSeek Reasoner)
        // ==========================================
        console.log("Agent 2 (Risk Officer) reviewing macro and drafts...");
        
        // Memasukkan hasil Agent 1 ke dalam prompt Agent 2
        const enrichedUserPrompt = userPrompt + `\n\nDraft Scalping dari Quant AI (Agent 1):\n${JSON.stringify(draftScalping, null, 2)}\n\nTugas Anda (Agent 2) adalah me-review draft di atas. Buang yang berisiko tinggi terhadap berita makro/fundamental hari ini, dan hasilkan 'scalpingOpportunities' final.`;

        const response = await withRetry(() => client.chat.completions.create({
          model: "deepseek-reasoner",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enrichedUserPrompt }
          ],
        }));
        
        finalContent = response.choices[0]?.message?.content || "{}";
      } catch (multiAgentErr) {
        console.error("Multi-Agent Pipeline failed. Falling back to Single Agent Gemini...", multiAgentErr);
        const geminiClient = new GoogleGenerativeAI(geminiApiKeySecret.value());
        const geminiModel = geminiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
        const geminiResponse = await withRetry(() => geminiModel.generateContent({
           contents: [{ role: "user", parts: [{ text: userPrompt }] }],
           systemInstruction: systemPrompt,
        }));
        finalContent = geminiResponse.response.text();
      }

      if (finalContent.startsWith("\`\`\`")) {
        finalContent = finalContent.replace(/^\`\`\`(json)?/gi, "").replace(/\`\`\`$/g, "").trim();
      }
      
      const parsed = JSON.parse(finalContent);
      
      // Inject struktur evaluasi murni ke hasil parsed agar frontend bisa merendernya
      if (finalEvaluatedScalps && finalEvaluatedScalps.length > 0) {
         parsed.previousScalpingEvaluation = finalEvaluatedScalps.map((ev: any) => ({
             symbol: ev.symbol,
             status: ev.status,
             reason: ev.status === 'WIN' ? `Harga menyentuh target ${ev.targetPrice} (+${ev.pnlPercent}%)` : 
                     ev.status === 'LOSS' ? `Harga mengenai Stop Loss ${ev.stopLossPrice} (${ev.pnlPercent}%)` : 
                     ev.status === 'EXPIRED' ? `Waktu trading habis (12h+). PnL: ${ev.pnlPercent}%` :
                     `Sedang berjalan, harga terkini ${ev.currentPrice}`
         }));
      }

      // VALIDATE R:R PROGRAMMATICALLY
      if (parsed.scalpingOpportunities && parsed.scalpingOpportunities.length > 0) {
        parsed.scalpingOpportunities = parsed.scalpingOpportunities.filter((bestScalp: any) => {
              const entryPrice = parseFloat(bestScalp.entryPrice);
              const targetPrice = parseFloat(bestScalp.targetPrice);
              const slPrice = parseFloat(bestScalp.stopLossPrice);
              
              if (isNaN(entryPrice) || isNaN(targetPrice) || isNaN(slPrice)) return false;
              
              const rr = Math.abs(targetPrice - entryPrice) / Math.abs(slPrice - entryPrice);
              if (rr < 1.8) {
                 console.warn(`Skipping ${bestScalp.symbol}: R:R ratio ${rr.toFixed(2)} < 1.8`);
                 return false;
              }
              
              const isLong = bestScalp.direction === "LONG";
              if (isLong && (targetPrice <= entryPrice || slPrice >= entryPrice)) {
                 console.warn(`Skipping LONG ${bestScalp.symbol}: Target/SL direction invalid`);
                 return false;
              }
              if (!isLong && (targetPrice >= entryPrice || slPrice <= entryPrice)) {
                 console.warn(`Skipping SHORT ${bestScalp.symbol}: Target/SL direction invalid`);
                 return false;
              }
              return true;
        });
      }
      
      await db.collection("cryptoReports").add({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isDaily,
        isWeekly,
        isMonthly,
        reportData: parsed,
        rawMarketData: marketData,
        rawScalpingData: safeScalpingCandidates,
        rawWeeklyData: weeklyMarketData || null,
        rawMonthlyData: monthlyMarketData || null,
        rawFundamental: { fearAndGreed, globalMarket, latestNews, stablecoinGrowth, dexVolumeGrowth, macroCalendar }
      });
      
      // Simpan Riwayat Peringatan & Kirim Push Notification ke Admin
      if (parsed.scalpingOpportunities && parsed.scalpingOpportunities.length > 0) {
        
        // PHASE 2: INJECT NEW TRADES TO ACTIVE TRADES
        for (const bestScalp of parsed.scalpingOpportunities) {
           try {
              // 1. Simpan ke active trades
              await db.collection("cryptoActiveTrades").add({
                 symbol: bestScalp.symbol,
                 direction: bestScalp.direction || "LONG",
                 entryPrice: bestScalp.entryPrice,
                 targetPrice: bestScalp.targetPrice,
                 stopLossPrice: bestScalp.stopLossPrice,
                 momentum: bestScalp.momentum,
                 status: "PENDING",
                 createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              // 2. Simpan ke riwayat peringatan (Notification Center UI)
              const dirBadge = bestScalp.direction === "SHORT" ? "🔴 SHORT" : "🟢 LONG";
              await db.collection("cryptoAlerts").add({
                 title: `Peluang Scalping [${dirBadge}]: ${bestScalp.symbol}`,
                 body: `Target: ${bestScalp.targetPrice} | Stop Loss: ${bestScalp.stopLossPrice}\n${bestScalp.momentum}`,
                 symbol: bestScalp.symbol,
                 direction: bestScalp.direction || "LONG",
                 targetPrice: bestScalp.targetPrice,
                 stopLossPrice: bestScalp.stopLossPrice,
                 momentum: bestScalp.momentum,
                 createdAt: admin.firestore.FieldValue.serverTimestamp()
              });
           } catch (alertErr) {
              console.error("Failed to save cryptoAlerts / activeTrades:", alertErr);
           }
        }

        // 3. Coba kirim Push Notification FCM
        try {
           const tokensSnap = await db.collection("admin_fcm_tokens").get();
           const tokens = tokensSnap.docs.map(d => d.data().token);
           if (tokens.length > 0) {
              for (const bestScalp of parsed.scalpingOpportunities) {
                 const dirBadge = bestScalp.direction === "SHORT" ? "🔴 SHORT" : "🟢 LONG";
                 await admin.messaging().sendEachForMulticast({
                    tokens: tokens,
                    notification: {
                       title: `🚨 Peluang Scalping [${dirBadge}]: ${bestScalp.symbol}`,
                       body: `Target: ${bestScalp.targetPrice} | Stop Loss: ${bestScalp.stopLossPrice}\n${bestScalp.momentum}`
                    }
                 });
              }
              console.log("Push notifications sent to admins.");
           }
        } catch (fcmErr) {
           console.error("Failed to send FCM:", fcmErr);
        }

        // 4. Telegram Auto-Broadcast
        try {
           const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
           const telegramChats = (process.env.TELEGRAM_AUTHORIZED_CHATS || "").split(",").filter((c: string) => c.trim() !== "");
           
           if (telegramToken && telegramChats.length > 0) {
              for (const chatId of telegramChats) {
                 for (const bestScalp of parsed.scalpingOpportunities) {
                    const dirBadge = bestScalp.direction === "SHORT" ? "🔴 SHORT" : "🟢 LONG";
                    const msg = `🚨 *NEW SCALPING SIGNAL* 🚨\n\n${dirBadge}: *${bestScalp.symbol}*\nEntry: ${bestScalp.entryPrice}\nTarget: ${bestScalp.targetPrice}\nSL: ${bestScalp.stopLossPrice}\n\n_Analisis:_ ${bestScalp.momentum}`;
                    await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                       chat_id: chatId,
                       text: msg,
                       parse_mode: "Markdown"
                    }).catch(e => console.error(`Telegram send error to ${chatId}:`, e.message));
                 }
              }
           }
        } catch (tgErr) {
           console.error("Failed to send Telegram Broadcast:", tgErr);
        }
      }

      console.log("cryptoCronAgent finished successfully.");
    } catch (error: any) {
      console.error("cryptoCronAgent err:", error);
    }
  }
);
