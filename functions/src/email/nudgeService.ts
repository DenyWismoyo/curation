// functions/src/nudgeService.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import * as nodemailer from "nodemailer";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const smtpEmailSecret = defineSecret("SMTP_EMAIL");
const smtpPasswordSecret = defineSecret("SMTP_PASSWORD");

// ============================================================================
// HELPER: Membuat Link Otomatis ke Google Calendar (Bisa diklik via Email/Web)
// ============================================================================
const createGoogleCalendarUrl = (title: string, description: string) => {
  const eventTitle = encodeURIComponent(`Fokus Eksekusi Omnifit: ${title}`);
  const eventDetails = encodeURIComponent(`${description}\n\nAkses Workspace Anda: https://omnifit.cloud/workspace`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}`;
};

// ============================================================================
// CRON JOB: MONDAY MORNING REFLECTION (Berjalan setiap Senin Jam 08:00 Pagi)
// ============================================================================
export const weeklyActionPlanNudge = onSchedule({
    schedule: "0 8 * * 1", // Cron format: Tiap Senin jam 8 pagi
    timeZone: "Asia/Jakarta",
    region: "asia-southeast2",
    secrets: [deepseekApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
    timeoutSeconds: 540,
    memory: "1GiB"
  },
  async (event) => {
    const db = getFirestore(admin.app(), "curation");
    const DEEPSEEK_API_KEY = deepseekApiKeySecret.value();
    const smtpEmail = smtpEmailSecret.value();
    const smtpPassword = smtpPasswordSecret.value();
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: DEEPSEEK_API_KEY
    });

    try {
      const assessmentsRef = db.collection("assessments");
      const snapshot = await assessmentsRef.where("status", "==", "COMPLETED").get();
      if (snapshot.empty) return;

      // PEMBARUAN: Konfigurasi SMTP Google (Gmail / Google Workspace)
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { 
          user: smtpEmail, 
          pass: smtpPassword 
        },
      });

      const batchPromises = snapshot.docs.map(async (assDoc) => {
        const data = assDoc.data() as any; 
        const userId = data.userId;
        const actionPlan = data.aiResult?.customActionPlan;
        
        if (!actionPlan || !Array.isArray(actionPlan)) return;

        // Ambil preferensi pengguna dari koleksi users
        let sendEmail = true;
        let sendWhatsapp = false;
        let userPhone = '';
        
        if (userId) {
          const userDoc = await db.collection("users").doc(userId).get();
          if (userDoc.exists) {
            const uData = userDoc.data() as any;
            if (uData.nudgePreferences) {
              sendEmail = uData.nudgePreferences.email !== false; // Default true
              sendWhatsapp = uData.nudgePreferences.whatsapp === true;
            }
            userPhone = uData.phone || '';
          }
        }

        // Lewati jika pengguna menonaktifkan kedua preferensi
        if (!sendEmail && !sendWhatsapp) return;
        
        const totalTasks = actionPlan.length;
        const completedTasks = actionPlan.filter((t: any) => t.isCompleted).length;
        
        if (completedTasks === totalTasks) return; 
        
        const pendingTasks = actionPlan.filter((t: any) => !t.isCompleted);
        const focusTasks = pendingTasks.slice(0, 2);
        const task1 = focusTasks[0];
        const task2 = focusTasks[1];
        
        const task1CalUrl = task1 ? createGoogleCalendarUrl(task1.task, task1.contextualTip || '') : '';
        const task2CalUrl = task2 ? createGoogleCalendarUrl(task2.task, task2.contextualTip || '') : '';
        

        
        // [PERBAIKAN 2]: Menghapus backtick (```) di poin nomor 6 agar 
        // tidak mengacaukan pembacaan string (template literal) oleh VS Code
        const prompt = `
          Anda adalah Business Coach / Productivity Mentor yang berempati tinggi.
          Tugas Anda: Tuliskan isi email (HTML format) untuk menyapa klien di hari Senin pagi.
          
          Konteks Klien:
          - Nama Entitas: ${data.namaUsaha}
          - Kategori Asesmen: ${data.trackType}
          - Progres: Telah menyelesaikan ${completedTasks} dari ${totalTasks} taktik eksekusi.
          
          Fokus untuk minggu ini:
          Tugas 1: ${task1?.task || '-'} (${task1?.contextualTip || '-'})
          Link Kalender Tugas 1: ${task1CalUrl}
          
          Tugas 2: ${task2 ? `${task2.task} (${task2.contextualTip || '-'})` : '-'}
          ${task2 ? `Link Kalender Tugas 2: ${task2CalUrl}` : ''}
          
          ATURAN DESAIN & KONTEN (MUTLAK):
          1. Gaya bahasa: Profesional, hangat, dan memotivasi (jangan seperti robot). Singkat saja maksimal 3 paragraf.
          2. Desain HTML: Gunakan inline CSS modern, font sans-serif (Inter/Roboto), background putih, dan sentuhan warna elegan.
          3. FITUR KALENDER: Tepat di bawah setiap deskripsi tugas, buatkan tombol CTA bertuliskan "Tambahkan ke Google Calendar" menggunakan Link Kalender yang disediakan di atas. Pastikan desain tombolnya memikat.
          4. Sisipkan satu tombol utama di bagian paling bawah menuju: [https://omnifit.cloud/workspace](https://omnifit.cloud/workspace)
          5. Tanda Tangan: "Tim Sukses Anda di Omnifit"
          6. OUTPUT HANYA KODE HTML MURNI. JANGAN menggunakan format markdown block.
        `;
        
        const response = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
        });
        let htmlBody = response.choices[0].message.content?.trim() || "";
        
        // Cek dan bersihkan jika AI masih mengirimkan format markdown
        if (htmlBody.startsWith('\`\`\`')) {
            htmlBody = htmlBody.replace(/^\`\`\`(html)?/gi, '').replace(/\`\`\`$/g, '').trim();
        }
        
        if (sendEmail && data.userEmail) {
            await transporter.sendMail({
                // [PERBAIKAN 3]: Gunakan string concatenation standar 
                // agar terhindar dari conflict template literal di pengirim email
                from: '"Omnifit Coach" <support@omnifit.cloud>',
                to: data.userEmail,
                subject: `Fokus Eksekusi Minggu Ini: ${data.namaUsaha}`, // Perbaikan syntax penutup backtick disini
                html: htmlBody,
            });
            console.log(`[NUDGE SENT] Email Senin Pagi + Kalender dikirim ke: ${data.userEmail}`);
        }

        if (sendWhatsapp && userPhone) {
            // [STUB WHATSAPP INTEGRATION]
            // Prompt khusus untuk format teks WhatsApp (Tanpa HTML, pakai asteris *bold* dll)
            const waPrompt = `
              Ringkas tugas ini untuk WhatsApp dalam bahasa yang hangat dan motivatif.
              - Tugas 1: ${task1?.task || '-'}
              - Tugas 2: ${task2?.task || '-'}
              Maksimal 50 kata.
            `;
            const waResponse = await openai.chat.completions.create({
              model: "deepseek-chat",
              messages: [{ role: "user", content: waPrompt }],
            });
            const waText = waResponse.choices[0].message.content?.trim() || "";
            
            console.log(`\n==============================================`);
            console.log(`[WHATSAPP NUDGE MOCK] MENGIRIM KE: ${userPhone}`);
            console.log(`Pesan: ${waText}`);
            console.log(`Status: PENDING_API_KEY (Simulasi)`);
            console.log(`==============================================\n`);
        }
      });
      
      await Promise.all(batchPromises);
      console.log(`Proses Weekly Nudge & Calendar Integration Selesai.`);
    } catch (error) {
      console.error("[NUDGE CRON] Error executing weeklyActionPlanNudge:", error);
    }
});

// ============================================================================
// CRON JOB: CRYPTO TRIAL EXPIRY NUDGE (Berjalan setiap hari jam 10:00 Pagi)
// Mengirim email H-1 sebelum trial habis
// ============================================================================
export const cryptoTrialExpiryNudge = onSchedule({
    schedule: "0 10 * * *", // Cron format: Tiap hari jam 10 pagi
    timeZone: "Asia/Jakarta",
    region: "asia-southeast2",
    secrets: [smtpEmailSecret, smtpPasswordSecret],
    timeoutSeconds: 540,
    memory: "512MiB"
  },
  async (event) => {
    const db = getFirestore(admin.app(), "curation");
    const smtpEmail = smtpEmailSecret.value();
    const smtpPassword = smtpPasswordSecret.value();

    try {
      const now = new Date();
      // Target: Trial yang kedaluwarsa besok (H-1)
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

      const usersRef = db.collection("users");
      const snapshot = await usersRef
        .where("isTrial", "==", true)
        .where("trialExpiresAt", ">=", tomorrowStart.toISOString())
        .where("trialExpiresAt", "<", tomorrowEnd.toISOString())
        .get();

      if (snapshot.empty) return;

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { 
          user: smtpEmail, 
          pass: smtpPassword 
        },
      });

      const batchPromises = snapshot.docs.map(async (userDoc) => {
        const uData = userDoc.data() as any;
        const userEmail = uData.email;
        if (!userEmail) return;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #4f46e5;">Halo ${uData.displayName || 'Trader'},</h2>
            <p>Masa coba gratis akses Premium Crypto Anda akan <strong>segera berakhir besok</strong>.</p>
            <p>Jangan sampai kehilangan akses ke intelijen pasar AI, peringatan dini Danger Zone, dan radar Market Maker (Whale).</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://omnifit.cloud/crypto" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Upgrade Premium Sekarang</a>
            </div>
            <p style="font-size: 14px; color: #666;">
              Tetap untung dan hindari loss beruntun dengan dukungan analis AI 24/7.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">Omnifit Crypto Intelligence</p>
          </div>
        `;

        const mailOptions = {
          from: '"Omnifit Crypto AI" <support@omnifit.cloud>',
          to: userEmail,
          subject: "Akses Trial Premium Anda Akan Berakhir Besok! ⏰",
          html: emailHtml,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`[TRIAL NUDGE] Sent expiry reminder to ${userEmail}`);
        } catch (err) {
          console.error(`[TRIAL NUDGE] Failed to send to ${userEmail}:`, err);
        }
      });

      await Promise.all(batchPromises);

    } catch (error) {
      console.error("[TRIAL NUDGE] Error executing cryptoTrialExpiryNudge:", error);
    }
});