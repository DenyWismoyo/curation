import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const cryptoCopilotChat = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  secrets: [deepseekApiKeySecret, geminiApiKeySecret],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak. Silakan login sebagai admin.");
  }
  
  const { message, history, context } = request.data;

  if (!message) {
    throw new HttpsError("invalid-argument", "Pesan wajib diisi.");
  }

  try {
    const apiKey = deepseekApiKeySecret.value();
    if (!apiKey) throw new HttpsError("internal", "API Key tidak dikonfigurasi.");

    const db = getFirestore(admin.app(), "curation");
    let globalStats = null;
    try {
       const statsSnap = await db.collection("cryptoPerformanceMetrics").doc("global_stats").get();
       if (statsSnap.exists) {
         globalStats = statsSnap.data();
       }
    } catch (e) {
       console.log("No global stats found yet.");
    }

    const deepseekClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey,
    });

    // RAG Context memory (extract symbols from message)
    const symbolsMatch = message.match(/\b[A-Z]{2,5}\b/g);
    let pastContext = "";
    if (symbolsMatch && symbolsMatch.length > 0) {
      const targetSymbol = symbolsMatch[0]; // Take the first matched symbol
      try {
        const pastReportsSnap = await db.collection("cryptoReports")
          .orderBy("createdAt", "desc")
          .limit(5)
          .get();
          
        let mentions: string[] = [];
        pastReportsSnap.forEach(doc => {
           const reportData = doc.data().reportData;
           if (reportData && reportData.scalpingOpportunities) {
              const opp = reportData.scalpingOpportunities.find((s:any) => s.symbol.includes(targetSymbol));
              if (opp) mentions.push(`- Laporan masa lalu: Prediksi ${opp.symbol} target ${opp.targetPrice}. Alasan: ${opp.momentum}`);
           }
        });
        
        // Add Premium Intel RAG
        try {
            const premiumSnap = await db.collection("cryptoSmartMoney").orderBy("createdAt", "desc").limit(2).get();
            premiumSnap.forEach(doc => {
                const coins = doc.data().coins || [];
                const opp = coins.find((s:any) => s.symbol.includes(targetSymbol));
                if (opp) mentions.push(`- Smart Money Intel: ${opp.symbol} terdeteksi akumulasi. Alasan: ${opp.accumulationReason}`);
            });
            const dangerSnap = await db.collection("cryptoDangerZone").orderBy("createdAt", "desc").limit(2).get();
            dangerSnap.forEach(doc => {
                const coins = doc.data().coins || [];
                const opp = coins.find((s:any) => s.symbol.includes(targetSymbol));
                if (opp) mentions.push(`- Danger Zone Intel: ${opp.symbol} terdeteksi bahaya (${opp.action}). Alasan: ${opp.dangerReason}`);
            });
        } catch(e) {
            console.error("Failed to fetch Premium Intel for RAG", e);
        }
        
        if (mentions.length > 0) {
           pastContext = `\n\n[INGATAN RAG MASA LALU TENTANG ${targetSymbol}]:\n${mentions.join('\n')}\nGunakan ingatan masa lalu ini HANYA jika relevan untuk membandingkan pergerakan harga saat ini.`;
        }
      } catch (e) {
         console.error("Failed to get RAG context", e);
      }
    }

    const systemPrompt = `
      Anda adalah "The Hedge Fund Copilot", asisten AI jenius yang menganalisa cryptocurrency.
      Gunakan nada yang profesional, tajam, kuantitatif, dan *actionable* seperti manajer hedge fund Wall Street.
      Gunakan bahasa Indonesia.

      KERANGKA BERPIKIR (MENTAL MODELS) & ATURAN KERAS:
      1. RISK-FIRST FRAMEWORK: Selalu jelaskan skenario terburuk (downside risk) atau area invalidasi SEBELUM Anda menjelaskan potensi keuntungan (upside).
      2. Selalu pertimbangkan likuiditas, risk/reward, dan sentimen makro sebelum menjawab.
      3. Jangan pernah memberikan saran finansial pasti tanpa peringatan risiko. Selalu berikan probabilitas dan skenario (Jika X terjadi, maka Y).
      4. HANYA berikan saran berdasarkan data yang ada di "Konteks Laporan Market Saat Ini" atau dari Tool Call (Harga Live).
      5. Jika data tidak tersedia atau koin tidak ada di laporan, jujurlah dan JANGAN berhalusinasi menebak-nebak harga.
      6. SELALU tegaskan bahwa jawaban Anda adalah edukasi dan analisis probabilistik, BUKAN nasihat keuangan/investasi, khususnya jika user bertanya "apa yang harus dibeli/dijual".

      [REKAM JEJAK KINERJA ANDA]
      Total WIN (Kena Target): ${globalStats?.totalWins || 0}
      Total LOSS (Kena Stoploss): ${globalStats?.totalLosses || 0}
      (Jika user menanyakan akurasi Anda, gunakan data di atas untuk menjawab dengan persentase yang pasti).

      Konteks Laporan Market Saat Ini:
      ${context ? JSON.stringify(context, null, 2) : "Tidak ada konteks."}
      ${pastContext}

      Jawablah pertanyaan user dengan mengacu pada konteks laporan di atas. 
      Jika user bertanya panduan portofolio, analisis koin tersebut berdasarkan data di atas, dan berikan edukasi alokasi ukuran posisi (Position Sizing) yang ketat.
      Jika koin tidak ada di laporan, beritahu bahwa koin tersebut di luar jangkauan pantauan saat ini. 
      Berikan jawaban yang ringkas dan padat.
    `;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        messages.push({
          role: h.role === "model" ? "assistant" : "user",
          content: h.text
        });
      });
    }

    messages.push({ role: "user", content: message });

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "get_live_price",
          description: "Mendapatkan harga terbaru saat ini dari koin/pasangan aset (contoh: BTCUSDT). Gunakan ini jika user menanyakan harga saat ini atau pergerakan yang baru saja terjadi.",
          parameters: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Simbol pasangan koin, contoh: BTCUSDT, SOLUSDT",
              },
            },
            required: ["symbol"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "calculate_position_size",
          description: "Menghitung ukuran posisi (position size) berdasarkan modal, risiko yang ditoleransi, harga masuk (entry), dan stop loss. Gunakan alat ini ketika user meminta panduan alokasi modal atau rekomendasi ukuran lot perdagangan.",
          parameters: {
            type: "object",
            properties: {
              capital: { type: "number", description: "Total modal (contoh: 10000)" },
              riskPercentage: { type: "number", description: "Persentase risiko yang ditoleransi dari modal, dalam bentuk angka 1-100 (misal: 1 atau 2)" },
              entryPrice: { type: "number", description: "Harga saat masuk posisi" },
              stopLossPrice: { type: "number", description: "Harga saat stop loss dipicu" }
            },
            required: ["capital", "riskPercentage", "entryPrice", "stopLossPrice"]
          }
        }
      }
    ];

    let responseText = "Maaf, saya tidak dapat merespon saat ini.";

    try {
      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-chat", // standard model
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
      }));

      let responseMessage = result.choices[0].message;

      // Handle tool calling
      if (responseMessage.tool_calls) {
        messages.push(responseMessage as any); // append assistant message with tool_calls
        
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === "function") {
             const args = JSON.parse(toolCall.function.arguments);
             
             if (toolCall.function?.name === "get_live_price") {
                try {
                   // Fetch live price from Binance
                   const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${args.symbol.toUpperCase()}`);
                   if (!res.ok) throw new Error("Gagal mengambil harga");
                   const data = await res.json();
                   messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      content: `Harga live ${args.symbol} saat ini adalah $${data.price}`,
                   });
                } catch (e) {
                   messages.push({
                      role: "tool",
                      tool_call_id: toolCall.id,
                      content: `Gagal mendapatkan harga untuk ${args.symbol}. Beritahu user harga tidak tersedia saat ini.`,
                   });
                }
             } else if (toolCall.function?.name === "calculate_position_size") {
                const { capital, riskPercentage, entryPrice, stopLossPrice } = args;
                const riskAmount = capital * (riskPercentage / 100);
                const priceDifference = Math.abs(entryPrice - stopLossPrice);
                const positionSizeCoins = riskAmount / priceDifference;
                const positionSizeUsdt = positionSizeCoins * entryPrice;
                
                messages.push({
                   role: "tool",
                   tool_call_id: toolCall.id,
                   content: `Risk Amount: $${riskAmount.toFixed(2)}. Position Size: ${positionSizeCoins.toFixed(4)} Koin atau setara $${positionSizeUsdt.toFixed(2)}. Leverage efektif (jika diperlukan): ${(positionSizeUsdt / capital).toFixed(2)}x. Beritahu rincian ini secara profesional ke user.`
                });
             }
          }
        }

        // Second call to get final answer
        const secondResponse = await withRetry(() => deepseekClient.chat.completions.create({
          model: "deepseek-chat",
          messages: messages,
          temperature: 0.7,
        }));
        responseMessage = secondResponse.choices[0].message;
      }
      responseText = responseMessage.content || "Maaf, saya tidak dapat merespon saat ini.";
    } catch (deepseekErr) {
      console.error("Deepseek Chat failed, falling back to Gemini Flash:", deepseekErr);
      const geminiClient = new GoogleGenerativeAI(geminiApiKeySecret.value());
      const geminiModel = geminiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const geminiHistory = (history || []).map((h: any) => ({
         role: h.role === "model" ? "model" : "user",
         parts: [{ text: h.text }]
      }));
      
      const chatSession = geminiModel.startChat({
         history: geminiHistory,
         systemInstruction: systemPrompt
      });
      
      const geminiResponse = await chatSession.sendMessage(message);
      responseText = geminiResponse.response.text();
    }

    return { success: true, reply: responseText };
  } catch (error: any) {
    console.error("Crypto Copilot Error:", error);
    throw new HttpsError("internal", "Gagal memproses obrolan Copilot.");
  }
});

export const cryptoCopilotSuggestions = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  secrets: [deepseekApiKeySecret, geminiApiKeySecret],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }
  
  const { context } = request.data;
  
  try {
    const apiKey = deepseekApiKeySecret.value();
    if (!apiKey) throw new HttpsError("internal", "API Key tidak dikonfigurasi.");

    const deepseekClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey,
    });

    const systemPrompt = `
      Anda adalah "The Hedge Fund Copilot", asisten AI jenius yang menganalisa cryptocurrency.
      Tugas Anda saat ini: berdasarkan konteks laporan pasar terbaru di bawah, buatlah tepat 3 pertanyaan (hot topics) pendek, tajam, dan *actionable* yang bisa ditanyakan oleh pengguna kepada Anda.
      Pertanyaan harus relevan dengan data laporan. Misalnya menanyakan analisis tren koin tertentu, sentimen pasar, atau insight volatilitas hari ini.
      Kembalikan HANYA array JSON berisi 3 string. Tanpa markdown, tanpa teks tambahan.
      Contoh format output: ["Bagaimana arah tren BTC hari ini?", "Koin apa yang berpotensi volatil hari ini?", "Apa sentimen pasar keseluruhan?"]
      
      Konteks Laporan:
      ${context ? JSON.stringify(context) : "Tidak ada konteks."}
    `;

    try {
      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.7,
      }));

      const responseText = result.choices[0].message.content || '["Apa koin potensial hari ini?", "Bagaimana sentimen Bitcoin?", "Koin apa yang harus saya hindari?"]';
      
      let parsed = [];
      try {
         const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
         parsed = JSON.parse(cleanJson);
      } catch (e) {
         parsed = ["Apa koin potensial hari ini?", "Bagaimana sentimen Bitcoin?", "Koin apa yang harus saya hindari?"];
      }

      return { success: true, suggestions: parsed };
    } catch (deepseekErr) {
      console.error("Deepseek suggestions failed, falling back to Gemini:", deepseekErr);
      const geminiClient = new GoogleGenerativeAI(geminiApiKeySecret.value());
      const geminiModel = geminiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
      const geminiResponse = await geminiModel.generateContent(systemPrompt);
      const responseText = geminiResponse.response.text();
      
      let parsed = [];
      try {
         const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
         parsed = JSON.parse(cleanJson);
      } catch (e) {
         parsed = ["Apa koin potensial hari ini?", "Bagaimana sentimen Bitcoin?", "Koin apa yang harus saya hindari?"];
      }
      return { success: true, suggestions: parsed };
    }
  } catch (error: any) {
    console.error("Crypto Copilot Suggestions Error:", error);
    return { success: true, suggestions: ["Apa koin potensial hari ini?", "Bagaimana sentimen Bitcoin?", "Koin apa yang harus saya hindari?"] }; // Graceful fallback
  }
});
