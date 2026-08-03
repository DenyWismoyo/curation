import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

export const cryptoCopilotChat = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  secrets: [deepseekApiKeySecret],
}, async (request) => {
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

    const systemPrompt = `
      Anda adalah "The Hedge Fund Copilot", asisten AI jenius yang menganalisa cryptocurrency.
      Gunakan nada yang profesional, tajam, kuantitatif, dan *actionable* seperti manajer hedge fund Wall Street.
      Gunakan bahasa Indonesia.

      [REKAM JEJAK KINERJA ANDA]
      Total WIN (Kena Target): ${globalStats?.totalWins || 0}
      Total LOSS (Kena Stoploss): ${globalStats?.totalLosses || 0}
      (Jika user menanyakan akurasi Anda, gunakan data di atas untuk menjawab dengan persentase yang pasti).

      Konteks Laporan Market Saat Ini:
      ${context ? JSON.stringify(context, null, 2) : "Tidak ada konteks."}

      Jawablah pertanyaan user dengan mengacu pada konteks laporan di atas. 
      Jika user bertanya rekomendasi portofolio, analisis koin tersebut berdasarkan data di atas, dan berikan panduan alokasi ukuran posisi (Position Sizing) yang ketat.
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
    ];

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
        if (toolCall.type === "function" && toolCall.function?.name === "get_live_price") {
           const args = JSON.parse(toolCall.function.arguments);
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

    const responseText = responseMessage.content || "Maaf, saya tidak dapat merespon saat ini.";

    return { success: true, reply: responseText };
  } catch (error: any) {
    console.error("Crypto Copilot Error:", error);
    throw new HttpsError("internal", "Gagal memproses obrolan Copilot.");
  }
});
