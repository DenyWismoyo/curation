import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { gatherCryptoMarketData } from "./cryptoOrchestrator";
import { withRetry } from "../../utils/retry"; 

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

export const cryptoCronAgent = onSchedule(
  {
    schedule: "0 3,7,11,15,19,23 * * *",
    timeZone: "Asia/Jakarta", 
    secrets: [deepseekApiKeySecret],
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

    const { fearAndGreed, latestNews, stablecoinGrowth, dexVolumeGrowth, marketData, scalpingCandidatesData, weeklyMarketData } = await gatherCryptoMarketData(isWeekly);
    
    // Fetch Macro Economic Calendar
    let macroCalendar = [];
    try {
      const calRes = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
      if (calRes.ok) macroCalendar = await calRes.json();
    } catch (e) {
      console.error("Gagal mengambil Macro Calendar:", e);
    }

    // Ambil laporan sebelumnya untuk self-correction dan win-rate tracking
    let previousReport = null;
    let previousScalpingStatus = "";
    
    try {
      const prevSnapshot = await db.collection("cryptoReports")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
        
      if (!prevSnapshot.empty) {
        previousReport = prevSnapshot.docs[0].data();
        const prevScalps = previousReport.reportData?.scalpingOpportunities;
        
        if (prevScalps && Array.isArray(prevScalps) && prevScalps.length > 0) {
          // Fetch current prices for previous scalps to evaluate win/loss
          try {
            const symbols = prevScalps.map((s: any) => s.symbol.replace(/[^A-Z0-9]/g, '') + 'USDT');
            let totalWins = 0;
            let totalLosses = 0;
            let totalPending = 0;

            const evaluatedScalpsPromises = prevScalps.map(async (scalp: any) => {
              const target = parseFloat(scalp.targetPrice);
              const sl = parseFloat(scalp.stopLossPrice);
              const entry = parseFloat(scalp.entryPrice);
              let status = "PENDING";
              let currentPrice = 0;
              
              try {
                // Ambil Klines histori 4 jam ke belakang untuk cek High/Low
                const klinesRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${scalp.symbol}&interval=1h&limit=4`);
                const klines = klinesRes.data;
                
                if (klines && klines.length > 0) {
                   currentPrice = parseFloat(klines[klines.length - 1][4]); // Close price terakhir
                   
                   let highestHigh = 0;
                   let lowestLow = Infinity;
                   
                   for (const candle of klines) {
                      const high = parseFloat(candle[2]);
                      const low = parseFloat(candle[3]);
                      if (high > highestHigh) highestHigh = high;
                      if (low < lowestLow) lowestLow = low;
                   }
                   
                   if (target > 0 && sl > 0) {
                      // Asumsi Long Position
                      if (highestHigh >= target) {
                         status = "WIN";
                      } else if (lowestLow <= sl) {
                         status = "LOSS";
                      }
                   }
                }
              } catch (e) {
                 console.error("Gagal mengambil klines untuk " + scalp.symbol, e);
              }
              
              if (status === "WIN") totalWins++;
              else if (status === "LOSS") totalLosses++;
              else totalPending++;

              return {
                symbol: scalp.symbol,
                entryPrice: entry,
                targetPrice: target,
                stopLossPrice: sl,
                currentPrice,
                status
              };
            });
            
            const evaluatedScalps = await Promise.all(evaluatedScalpsPromises);
            
            const totalFinished = totalWins + totalLosses;
            const winRate = totalFinished > 0 ? ((totalWins / totalFinished) * 100).toFixed(2) + "%" : "N/A";

            previousScalpingStatus = `
Evaluasi Kinerja Scalping (Otomatis Dihitung oleh Sistem):
- Total Sinyal: ${prevScalps.length}
- WIN (Hit Target): ${totalWins}
- LOSS (Hit Stoploss): ${totalLosses}
- PENDING (Floating): ${totalPending}
- WIN RATE: ${winRate}

Rincian Evaluasi:
${JSON.stringify(evaluatedScalps, null, 2)}

(Tugas Anda: Analisis secara singkat mengapa sinyal WIN berhasil dan mengapa LOSS gagal berdasarkan pergerakan market terbaru di bagian 'selfCorrection'. JANGAN hitung ulang Win Rate, gunakan data di atas.)`;
            
            // Simpan akumulasi metrik ini ke koleksi terpisah untuk dibaca oleh Copilot
            await db.collection("cryptoPerformanceMetrics").doc("global_stats").set({
               totalWins: admin.firestore.FieldValue.increment(totalWins),
               totalLosses: admin.firestore.FieldValue.increment(totalLosses),
               lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

          } catch (e) {
            console.error("Failed to fetch current prices for evaluation", e);
          }
        }
      }
    } catch (e) {
      console.log("No previous report found for correction", e);
    }

    const client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: deepseekApiKeySecret.value(),
    });

    const systemPrompt = `Anda adalah Konsultan Ahli dan Analis Keuangan Kripto Institusional.
Tugas Anda adalah merangkum sentimen pasar dari K-lines, Fear & Greed Index, dan Berita Utama, serta membuat proyeksi 4 jam ke depan.
Anda JUGA harus mengevaluasi seberapa akurat prediksi Anda pada 4 jam sebelumnya (jika data sebelumnya diberikan).
Output Anda WAJIB berupa JSON rapi tanpa markdown block (seperti \`\`\`json):
{
  "title": "Judul laporan (misal: Rekap Pasar & Sinyal Trading)",
  "sentiment": "BULLISH / BEARISH / NEUTRAL",
  "marketRegime": "Fase pasar (Bullish Trend / Bearish Trend / Choppy / High Volatility)",
  "macroInsight": "Analisis singkat tentang pengaruh makro (Fear & Greed, Long/Short ratio, Stablecoin flow) terhadap pasar",
  "whaleActivity": "Aktivitas uang besar (Heavy Accumulation / Distribution / Trap / Neutral)",
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
       "stopLossPrice": 64000.5,
       "targetPrice": 68000.0
     }
  ],
  "scalpingOpportunities": [
     {
       "symbol": "Nama Koin",
       "momentum": "Alasan singkat (Evaluasi juga dari EMA, MACD, Bollinger Bands, dan Funding Rate/Long-Short Ratio jika ada)",
       "entryPrice": 65000.0,
       "targetPrice": 66000.0,
       "stopLossPrice": 64500.0,
       "allocationPercentage": "10% (Contoh ukuran posisi dari total modal)",
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
  ] // HANYA diisi jika siklus mingguan, jika tidak biarkan array kosong []
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

Fear & Greed Index: ${fearAndGreed ? fearAndGreed.value + " - " + fearAndGreed.value_classification : "Tidak tersedia"}

Data Pasar Utama (Candlestick 4-Jam Terakhir + Indikator Teknikal + Derivatif):
${JSON.stringify(marketData, null, 2)}

${isWeekly ? `Data Makro Mingguan (Candlestick 1-Minggu Terakhir):\n${JSON.stringify(weeklyMarketData, null, 2)}\n` : ""}
Data Altcoin Volatil (Kandidat Scalping, Candlestick 1-Jam Terakhir):
${JSON.stringify(scalpingCandidatesData, null, 2)}

Proyeksi Anda Sebelumnya (Untuk Evaluasi Akurasi, bandingkan dengan harga terkini!):
${previousReport ? JSON.stringify(previousReport.projection) + "\\nSinyal Koin Sebelumnya: " + JSON.stringify(previousReport.coinsAnalysis) : "Tidak ada data sebelumnya."}

Buatkan laporan JSON yang komprehensif, actionable, dan jujur!
`;

    try {
      const response = await withRetry(() => client.chat.completions.create({
        model: "deepseek-reasoner",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }));

      let content = response.choices[0]?.message?.content || "{}";
      if (content.startsWith("\`\`\`")) {
        content = content.replace(/^\`\`\`(json)?/gi, "").replace(/\`\`\`$/g, "").trim();
      }
      
      const parsed = JSON.parse(content);
      
      await db.collection("cryptoReports").add({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isDaily,
        isWeekly,
        reportData: parsed,
        rawMarketData: marketData,
        rawScalpingData: scalpingCandidatesData,
        rawWeeklyData: weeklyMarketData || null,
        rawFundamental: { fearAndGreed, latestNews, stablecoinGrowth, dexVolumeGrowth, macroCalendar }
      });
      
      // Kirim Push Notification ke Admin
      if (parsed.scalpingOpportunities && parsed.scalpingOpportunities.length > 0) {
        try {
           const tokensSnap = await db.collection("admin_fcm_tokens").get();
           const tokens = tokensSnap.docs.map(d => d.data().token);
           if (tokens.length > 0) {
              const bestScalp = parsed.scalpingOpportunities[0];
              await admin.messaging().sendEachForMulticast({
                 tokens: tokens,
                 notification: {
                    title: `🚨 Peluang Scalping: ${bestScalp.symbol}`,
                    body: `Target: ${bestScalp.targetPrice} | Stop Loss: ${bestScalp.stopLossPrice}\n${bestScalp.momentum}`
                 }
              });
              
              // Simpan ke riwayat peringatan
              await db.collection("cryptoAlerts").add({
                 title: `Peluang Scalping: ${bestScalp.symbol}`,
                 body: `Target: ${bestScalp.targetPrice} | Stop Loss: ${bestScalp.stopLossPrice}\n${bestScalp.momentum}`,
                 symbol: bestScalp.symbol,
                 targetPrice: bestScalp.targetPrice,
                 stopLossPrice: bestScalp.stopLossPrice,
                 momentum: bestScalp.momentum,
                 createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              console.log("Push notifications sent to admins.");
           }
        } catch (fcmErr) {
           console.error("Failed to send FCM:", fcmErr);
        }
      }

      console.log("cryptoCronAgent finished successfully.");
    } catch (error: any) {
      console.error("cryptoCronAgent err:", error);
    }
  }
);
