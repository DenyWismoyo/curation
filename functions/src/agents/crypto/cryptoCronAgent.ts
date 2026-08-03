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
    let finalEvaluatedScalps: any[] = [];
    
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
                // Ambil Klines histori 4 jam ke belakang dengan interval 1 menit untuk akurasi tertinggi
                const klinesRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${scalp.symbol}&interval=1m&limit=240`);
                const klines = klinesRes.data;
                
                if (klines && klines.length > 0) {
                   currentPrice = parseFloat(klines[klines.length - 1][4]); // Close price terakhir
                   
                   if (target > 0 && sl > 0) {
                      // Asumsi Long Position: Cek kronologis per 1m candle
                      for (const candle of klines) {
                         const high = parseFloat(candle[2]);
                         const low = parseFloat(candle[3]);
                         
                         if (low <= sl) {
                            status = "LOSS";
                            break; // Stop loss kena duluan
                         } else if (high >= target) {
                            status = "WIN";
                            break; // Target kena duluan
                         }
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
            finalEvaluatedScalps = evaluatedScalps;
            
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
       "momentum": "Alasan memilih koin ini. WAJIB gabungkan data 'setupReasoning' (dari sistem) dengan analisis teknikal & berita Anda sendiri.",
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
      let finalContent = "{}";
      
      try {
        console.log("Starting Multi-Agent Pipeline...");
        
        // ==========================================
        // AGENT 1: The Fast Quant (DeepSeek V4)
        // ==========================================
        console.log("Agent 1 (Fast Quant) analyzing technicals...");
        const agent1Prompt = `Anda adalah Quant AI (Agent 1).
Tugas Anda HANYA membedah teknikal dari data koin berikut dan memilih TOP 3 terbaik berdasarkan setupScore dan setupReasoning.
Berikan output JSON ketat: { "draftScalpingOpportunities": [ { "symbol": "...", "technicalThesis": "..." } ] }

Data Koin:
${JSON.stringify(scalpingCandidatesData, null, 2)}`;

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
             reason: ev.status === 'WIN' ? `Harga menyentuh target ${ev.targetPrice}` : ev.status === 'LOSS' ? `Harga mengenai Stop Loss ${ev.stopLossPrice}` : `Sedang berjalan, harga terkini ${ev.currentPrice}`
         }));
      }
      
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
      
      // Simpan Riwayat Peringatan & Kirim Push Notification ke Admin
      if (parsed.scalpingOpportunities && parsed.scalpingOpportunities.length > 0) {
        // 1. Selalu simpan ke riwayat peringatan (Notification Center UI)
        for (const bestScalp of parsed.scalpingOpportunities) {
           try {
              await db.collection("cryptoAlerts").add({
                 title: `Peluang Scalping: ${bestScalp.symbol}`,
                 body: `Target: ${bestScalp.targetPrice} | Stop Loss: ${bestScalp.stopLossPrice}\n${bestScalp.momentum}`,
                 symbol: bestScalp.symbol,
                 targetPrice: bestScalp.targetPrice,
                 stopLossPrice: bestScalp.stopLossPrice,
                 momentum: bestScalp.momentum,
                 createdAt: admin.firestore.FieldValue.serverTimestamp()
              });
           } catch (alertErr) {
              console.error("Failed to save cryptoAlerts:", alertErr);
           }
        }

        // 2. Coba kirim Push Notification FCM
        try {
           const tokensSnap = await db.collection("admin_fcm_tokens").get();
           const tokens = tokensSnap.docs.map(d => d.data().token);
           if (tokens.length > 0) {
              for (const bestScalp of parsed.scalpingOpportunities) {
                 await admin.messaging().sendEachForMulticast({
                    tokens: tokens,
                    notification: {
                       title: `🚨 Peluang Scalping: ${bestScalp.symbol}`,
                       body: `Target: ${bestScalp.targetPrice} | Stop Loss: ${bestScalp.stopLossPrice}\n${bestScalp.momentum}`
                    }
                 });
              }
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
