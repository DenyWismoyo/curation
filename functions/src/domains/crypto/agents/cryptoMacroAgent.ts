import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import OpenAI from "openai";
import { withRetry } from "../../../shared/utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const telegramBotTokenSecret = defineSecret("TELEGRAM_BOT_SECRET");

export const cryptoMacroAgent = onSchedule(
  {
    schedule: "0 * * * *", // Setiap jam (hourly)
    timeZone: "Asia/Jakarta", 
    secrets: [deepseekApiKeySecret, telegramBotTokenSecret],
    region: "asia-southeast2",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event) => {
    try {
      const db = getFirestore(admin.app(), "curation");
      const now = new Date();
      // Look forward up to 65 minutes to catch events happening before the next hourly run
      const lookahead = new Date(now.getTime() + 65 * 60 * 1000);

      // 1. Ambil data dari kalender makro
      const calRes = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
      if (!calRes.ok) throw new Error("Gagal mengambil kalender makro");
      const macroCalendar = await calRes.json();
      
      try {
        await db.collection("cryptoMacroCalendar").doc("latest").set({
           data: macroCalendar,
           updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn("Failed to save calendar to Firestore", e);
      }

      // 2. Filter event penting yang relevan dengan crypto (USD, EUR, CNY, dll) & berdampak "High" 
      // yang terjadi dalam waktu < 65 menit ke depan.
      const relevantCountries = ["USD", "EUR", "CNY", "GBP", "JPY"];
      
      const upcomingImportantEvents = macroCalendar.filter((ev: any) => {
        if (ev.impact !== "High") return false;
        if (!relevantCountries.includes(ev.country)) return false;
        
        const eventDate = new Date(ev.date);
        return eventDate > now && eventDate <= lookahead;
      });

      if (upcomingImportantEvents.length === 0) {
        console.log("Tidak ada event makro krusial dalam 1 jam ke depan.");
        return;
      }

      console.log(`Menemukan ${upcomingImportantEvents.length} event penting yang akan rilis segera.`);

      // 3. Gunakan AI untuk memberikan proyeksi/historis korelasi
      const apiKey = deepseekApiKeySecret.value();
      if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");

      const client = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
      });

      const eventsJsonStr = JSON.stringify(upcomingImportantEvents, null, 2);

      const prompt = `
Anda adalah "Macro Crypto Analyst". Dalam waktu 1 jam ke depan, akan ada rilis data ekonomi makro yang berstatus HIGH IMPACT (Sangat Berpengaruh).

Data Event yang akan rilis:
${eventsJsonStr}

TUGAS ANDA:
Berikan analisis prediktif dan korelasi historis dari event tersebut terhadap pergerakan harga kripto (khususnya BTC dan ETH).
Gunakan format JSON murni TANPA markdown block (\`\`\`json) dan TANPA teks pengantar.

Format JSON Wajib:
{
  "events": [
    {
      "title": "Nama Event",
      "country": "Mata Uang (USD/EUR)",
      "releaseTime": "Waktu Rilis",
      "historicalImpact": "Analisis Historis (Misal: 'Ketika CPI AS dirilis lebih tinggi dari ekspektasi, BTC biasanya turun rata-rata 3% dalam 4 jam berikutnya karena fear the Fed akan hawkish.')",
      "whatToWatch": "Nilai apa yang perlu diperhatikan trader? (Misal: 'Perhatikan jika aktual > forecast (3.4%), market berpotensi dump.')",
      "volatilityAlert": true
    }
  ],
  "summaryAlert": "Pesan darurat pendek (1 kalimat) untuk di-broadcast ke trader via Push Notification/Telegram."
}
      `;

      const result = await withRetry(() => client.chat.completions.create({
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
          return;
      }

      // 4. Simpan hasil analisis ke koleksi cryptoAlerts agar muncul di Notification Center user
      for (const ev of parsedData.events || []) {
         await db.collection("cryptoAlerts").add({
             title: `[MACRO ALERT] ${ev.title} rilis sebentar lagi!`,
             body: `${ev.whatToWatch}\n\nHistoris: ${ev.historicalImpact}`,
             type: "MACRO",
             impact: "HIGH",
             createdAt: admin.firestore.FieldValue.serverTimestamp()
         });
      }

      // 5. Kirim Push Notification & Telegram
      const alertMsg = parsedData.summaryAlert || `Peringatan Volatilitas! Data Makro penting akan rilis dalam 1 jam ke depan.`;
      
      // Push Notification ke Admin (Bisa diganti token semua user jika diinginkan)
      try {
         const tokensSnap = await db.collection("admin_fcm_tokens").get();
         const tokens = tokensSnap.docs.map(d => d.data().token);
         if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
               tokens: tokens,
               notification: {
                  title: `⏳ Macro Event 1 Jam Lagi!`,
                  body: alertMsg
               }
            });
         }
      } catch (fcmErr) {
         console.error("Failed to send FCM:", fcmErr);
      }

      // Telegram Auto-Broadcast
      try {
         const telegramToken = telegramBotTokenSecret.value();
         const telegramChats = (process.env.TELEGRAM_AUTHORIZED_CHATS || "").split(",").filter((c: string) => c.trim() !== "");
         
         if (telegramToken && telegramChats.length > 0) {
            const tgMsg = `🚨 *MACRO ECONOMIC ALERT* 🚨\n\n${alertMsg}\n\nBersiap untuk volatilitas market dalam 1 jam ke depan.`;
            for (const chatId of telegramChats) {
               await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                  chat_id: chatId,
                  text: tgMsg,
                  parse_mode: "Markdown"
               }).catch(e => console.error(`Telegram error to ${chatId}:`, e.message));
            }
         }
      } catch (tgErr) {
         console.error("Failed to send Telegram Broadcast:", tgErr);
      }

      console.log("cryptoMacroAgent finished successfully.");

    } catch (error) {
      console.error("Error in cryptoMacroAgent:", error);
    }
  }
);
