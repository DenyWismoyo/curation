import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { withRetry } from "../../utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const fetchRss = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    
    // Simple regex parsing for <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    const items = [];
    
    while ((match = itemRegex.exec(text)) !== null) {
      const itemBlock = match[1];
      const titleMatch = itemBlock.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemBlock.match(/<link>(.*?)<\/link>/);
      const descMatch = itemBlock.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1] || titleMatch[2],
          link: linkMatch[1],
          description: descMatch ? (descMatch[1] || descMatch[2]) : ""
        });
      }
      if (items.length >= 10) break; // Limit to top 10 per source
    }
    return items;
  } catch (error) {
    console.error("Failed to fetch RSS:", url, error);
    return [];
  }
};

export const cryptoNewsAgent = onSchedule(
  {
    schedule: "0 6,12,18,0 * * *", 
    timeZone: "Asia/Jakarta", 
    secrets: [deepseekApiKeySecret],
    region: "asia-southeast2",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    try {
      const db = getFirestore(admin.app(), "curation");
      
      const [ctNews, newsBtc, coinDesk] = await Promise.all([
        fetchRss("https://cointelegraph.com/rss"),
        fetchRss("https://www.newsbtc.com/feed/"),
        fetchRss("https://www.coindesk.com/arc/outboundfeeds/rss/")
      ]);
      
      const allNews = [...ctNews, ...newsBtc, ...coinDesk];
      if (allNews.length === 0) {
        console.log("No news fetched.");
        return;
      }
      
      // Keyword scoring for macro/market moving events
      const highImpactKeywords = ["etf", "fed", "cpi", "sec", "regulation", "hack", "exploit", "approve", "reject", "rate", "inflation", "sue", "lawsuit", "binance", "coinbase", "ftx", "bank", "treasury"];
      
      const scoreNews = (title: string, desc: string) => {
         let score = 0;
         const text = (title + " " + desc).toLowerCase();
         highImpactKeywords.forEach(kw => {
            if (text.includes(kw)) score += 5;
         });
         return score;
      };

      const scoredNews = allNews.map(n => ({ ...n, score: scoreNews(n.title, n.description) }));
      
      // Sort by score (descending), then random to break ties, pick top 15
      const topNewsItems = scoredNews
         .sort((a, b) => b.score - a.score || 0.5 - Math.random())
         .slice(0, 15);
         
      const newsContext = topNewsItems.map(n => `- ${n.title}\n  ${n.description.replace(/<[^>]*>?/gm, '').substring(0, 200)}...\n  Link: ${n.link}`).join('\n\n');

      const apiKey = deepseekApiKeySecret.value();
      if (!apiKey) throw new Error("API Key tidak dikonfigurasi.");

      const deepseekClient = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
      });

      const prompt = `
Anda adalah "Crypto AI Editor". Tugas Anda adalah merangkum berita-berita terbaru berikut menjadi ringkasan cerdas yang sangat berguna bagi trader (actionable).

Berita Mentah:
${newsContext}

TUGAS ANDA:
Sintesis berita di atas ke dalam output JSON ketat berikut.
Setiap berita harus dinilai "impactScore" nya dari 1 hingga 10 (10 = sangat menggerakkan pasar).
Berikan "impactAnalysis" yang berfokus pada "Apa yang harus dilakukan trader?" (Actionable insight).

ATURAN KERAS (TIDAK BOLEH DILANGGAR):
- Output Anda HARUS murni JSON valid. JANGAN membungkus JSON dengan markdown block (\`\`\`json). JANGAN menambahkan teks pengantar atau penutup.

{
  "marketSentiment": "BULLISH | BEARISH | NEUTRAL | MIXED",
  "sentimentStrength": "Skala kekuatan sentimen, contoh: BULLISH (8/10)",
  "marketMovingEvent": "1 paragraf merangkum peristiwa tunggal yang paling berdampak besar hari ini (jika ada).",
  "headlineSummary": "2-3 kalimat ringkasan tajam tentang kondisi fundamental pasar saat ini.",
  "topNews": [
    {
      "title": "Judul Berita (dibuat lebih clicky/menarik)",
      "summary": "Ringkasan tajam 1-2 kalimat dari isi berita.",
      "impact": "BULLISH | BEARISH | NEUTRAL",
      "impactScore": 8, // Angka 1-10
      "impactAnalysis": "Actionable insight: Apa yang harus dilakukan trader dengan berita ini? (1-2 kalimat)",
      "originalLink": "URL sumber berita asli"
    }
  ] // Pilih HANYA 6-8 berita paling penting/berdampak
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
          parsedData = { marketSentiment: "UNKNOWN", headlineSummary: "Gagal memproses berita.", topNews: [] };
      }

      await db.collection("cryptoNews").add({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          marketSentiment: parsedData.marketSentiment || "NEUTRAL",
          sentimentStrength: parsedData.sentimentStrength || "NEUTRAL (5/10)",
          marketMovingEvent: parsedData.marketMovingEvent || "Tidak ada pergerakan dominan hari ini.",
          headlineSummary: parsedData.headlineSummary || "",
          newsItems: parsedData.topNews || []
      });

      console.log("Crypto News Report generated successfully.");
    } catch (error) {
      console.error("Error in cryptoNewsAgent:", error);
    }
  }
);
