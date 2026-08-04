import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

// Using process.env for token loaded from .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const AUTHORIZED_CHATS = (process.env.TELEGRAM_AUTHORIZED_CHATS || "").split(",").filter(c => c.trim() !== "");

async function sendMessage(chatId: number, text: string, parseMode: string = "Markdown", replyMarkup?: any) {
    try {
        const payload: any = {
            chat_id: chatId,
            text: text,
            parse_mode: parseMode,
            disable_web_page_preview: true
        };
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, payload);
    } catch (e: any) {
        console.error("Failed to send telegram message", e.response?.data || e.message);
    }
}

export const telegramWebhook = onRequest(
  { region: "asia-southeast2", maxInstances: 5 },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
        const body = req.body;
        
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const text = body.message.text.trim();
            const command = text.split(" ")[0].toLowerCase();
            
            // Perintah untuk mendapatkan Chat ID (sangat berguna untuk setup Channel/Group)
            if (command === "/getid") {
                await sendMessage(chatId, `🆔 *Chat ID:* \`${chatId}\`\n\nGunakan ID ini untuk menambahkannya ke Whitelist atau target Broadcast Anda.`);
                res.status(200).send("OK");
                return;
            }

            // Whitelist Check
            if (AUTHORIZED_CHATS.length > 0 && !AUTHORIZED_CHATS.includes(chatId.toString())) {
                await sendMessage(chatId, "⛔ *Akses Ditolak*\n\nAnda tidak memiliki izin (Premium Access) untuk menggunakan bot ini.");
                res.status(200).send("OK");
                return;
            }

            // Inisialisasi admin app jika belum
            if (!admin.apps.length) {
                admin.initializeApp();
            }
            const db = getFirestore(admin.app(), "curation");

            const mainMenuKeyboard = {
                keyboard: [
                    [{ text: "🎯 Scalping Radar" }, { text: "🐋 Smart Money" }],
                    [{ text: "🚨 Danger Zone" }, { text: "🌊 Liquidity" }]
                ],
                resize_keyboard: true,
                persistent: true
            };

            if (command === "/start" || command === "/help") {
                const welcomeMsg = `🤖 *Welcome to Omnifit Crypto Insight Bot!* 🤖\n\nSaya adalah asisten AI Anda untuk memantau pasar crypto secara profesional.\n\nSilakan gunakan tombol menu di bawah untuk bernavigasi.`;
                await sendMessage(chatId, welcomeMsg, "Markdown", mainMenuKeyboard);
            } 
            else if (command === "/scalping" || text === "🎯 Scalping Radar") {
                const snapshot = await db.collection("cryptoScalpingRadar").orderBy("createdAt", "desc").limit(1).get();
                if (snapshot.empty) {
                    await sendMessage(chatId, "❌ Belum ada data Scalping Radar hari ini.");
                } else {
                    const data = snapshot.docs[0].data();
                    const coins = data.coins || [];
                    
                    let reply = `🎯 *LIVE SCALPING RADAR* 🎯\n\n`;
                    coins.forEach((c: any) => {
                        const icon = c.recommendation === "BUY" ? "🟢" : "🔴";
                        reply += `${icon} *${c.symbol}* | ${c.currentPrice}\n`;
                        reply += `Action: *${c.recommendation}* | Target: ${c.targetPrice} | SL: ${c.stopLoss}\n`;
                        if (c.quantitativeMetrics) {
                            reply += `Vol Spike: ${c.quantitativeMetrics.volumeSpikeRatio}x | Funding: ${c.quantitativeMetrics.fundingRate}\n`;
                        }
                        reply += `\n`;
                    });
                    
                    await sendMessage(chatId, reply);
                }
            }
            else if (command === "/smartmoney" || text === "🐋 Smart Money") {
                const snapshot = await db.collection("cryptoSmartMoney").orderBy("createdAt", "desc").limit(1).get();
                if (snapshot.empty) {
                    await sendMessage(chatId, "❌ Belum ada data Smart Money hari ini.");
                } else {
                    const data = snapshot.docs[0].data();
                    const coins = data.coins || [];
                    
                    let reply = `🐋 *SMART MONEY TRACKER* 🐋\n\n`;
                    coins.forEach((c: any) => {
                        reply += `💎 *${c.symbol}* | ${c.currentPrice}\n`;
                        reply += `Breakout Target: *${c.breakoutTarget}*\n`;
                        reply += `_Analisis:_ ${c.accumulationReason}\n\n`;
                    });
                    
                    await sendMessage(chatId, reply);
                }
            }
            else if (command === "/dangerzone" || text === "🚨 Danger Zone") {
                const snapshot = await db.collection("cryptoDangerZone").orderBy("createdAt", "desc").limit(1).get();
                if (snapshot.empty) {
                    await sendMessage(chatId, "❌ Belum ada data Danger Zone hari ini.");
                } else {
                    const data = snapshot.docs[0].data();
                    const coins = data.coins || [];
                    
                    let reply = `🚨 *DANGER ZONE (HIGH RISK)* 🚨\n\n`;
                    coins.forEach((c: any) => {
                        reply += `⚠️ *${c.symbol}* | ${c.currentPrice}\n`;
                        reply += `Action: *${c.action}*\n`;
                        reply += `_Alasan:_ ${c.dangerReason}\n\n`;
                    });
                    
                    await sendMessage(chatId, reply);
                }
            }
            else if (command === "/liquidity" || text === "🌊 Liquidity") {
                const snapshot = await db.collection("cryptoLiquidity").orderBy("createdAt", "desc").limit(1).get();
                if (snapshot.empty) {
                    await sendMessage(chatId, "❌ Belum ada data Liquidity Heatmap hari ini.");
                } else {
                    const data = snapshot.docs[0].data();
                    const coins = data.coins || [];
                    
                    let reply = `🌊 *LIQUIDITY HEATMAP* 🌊\n\n`;
                    coins.forEach((c: any) => {
                        reply += `🎯 *${c.symbol}* | ${c.currentPrice}\n`;
                        reply += `Shorts (Upper): *${c.shortLiquidityZone}*\n`;
                        reply += `Longs (Lower): *${c.longLiquidityZone}*\n`;
                        reply += `_Strategi:_ ${c.hunterStrategy}\n\n`;
                    });
                    
                    await sendMessage(chatId, reply);
                }
            }
            else {
                // Specific Coin Analysis (On-Demand)
                const symbolInput = text.toUpperCase();
                // Validasi singkat apakah itu format koin (misal: BTC, SOL)
                if (/^[A-Z0-9]{2,10}$/.test(symbolInput)) {
                    await sendMessage(chatId, `🔍 Menganalisis *${symbolInput}*...\n(Fitur ini akan segera diaktifkan penuh berdasarkan data AI)`);
                } else {
                    await sendMessage(chatId, "Perintah tidak dikenali. Silakan gunakan menu di bawah.", "Markdown", mainMenuKeyboard);
                }
            }
        }
        
        // Always respond 200 OK so Telegram knows we received it
        res.status(200).send("OK");
    } catch (error) {
        console.error("Error processing telegram webhook:", error);
        res.status(500).send("Internal Server Error");
    }
  }
);
