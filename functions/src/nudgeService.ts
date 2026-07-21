// functions/src/nudgeService.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as nodemailer from "nodemailer";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
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
    secrets: [geminiApiKeySecret, smtpEmailSecret, smtpPasswordSecret],
    timeoutSeconds: 540,
    memory: "1GiB"
  },
  async (event) => {
    const db = getFirestore(admin.app(), "curation");
    const API_KEY = geminiApiKeySecret.value();
    const smtpEmail = smtpEmailSecret.value();
    const smtpPassword = smtpPasswordSecret.value();
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      const assessmentsRef = db.collection("assessments");
      const snapshot = await assessmentsRef.where("status", "==", "COMPLETED").get();

      if (snapshot.empty) return;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpEmail, pass: smtpPassword },
      });

      const batchPromises = snapshot.docs.map(async (doc) => {
        // [PERBAIKAN 1]: Tambahkan "as any" agar TypeScript berhenti memunculkan garis merah 
        // pada data.userEmail dan data.namaUsaha
        const data = doc.data() as any; 
        const actionPlan = data.aiResult?.customActionPlan;

        if (!actionPlan || !Array.isArray(actionPlan)) return;

        const totalTasks = actionPlan.length;
        const completedTasks = actionPlan.filter((t: any) => t.isCompleted).length;
        
        if (completedTasks === totalTasks) return; 

        const pendingTasks = actionPlan.filter((t: any) => !t.isCompleted);
        const focusTasks = pendingTasks.slice(0, 2);

        const task1 = focusTasks[0];
        const task2 = focusTasks[1];
        
        const task1CalUrl = task1 ? createGoogleCalendarUrl(task1.task, task1.contextualTip || '') : '';
        const task2CalUrl = task2 ? createGoogleCalendarUrl(task2.task, task2.contextualTip || '') : '';

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
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

        const aiResult = await model.generateContent(prompt);
        let htmlBody = aiResult.response.text().trim();
        
        // Cek dan bersihkan jika AI masih mengirimkan format markdown
        if (htmlBody.startsWith('\`\`\`')) {
            htmlBody = htmlBody.replace(/^\`\`\`(html)?/gi, '').replace(/\`\`\`$/g, '').trim();
        }

        if (data.userEmail) {
            await transporter.sendMail({
                // [PERBAIKAN 3]: Gunakan string concatenation standar 
                // agar terhindar dari conflict template literal di pengirim email
                from: '"Omnifit Coach" <' + smtpEmail + '>',
                to: data.userEmail,
                subject: `Fokus Eksekusi Minggu Ini: ${data.namaUsaha} 🚀`,
                html: htmlBody,
            });
            console.log(`[NUDGE SENT] Email Senin Pagi + Kalender dikirim ke: ${data.userEmail}`);
        }
      });

      await Promise.all(batchPromises);
      console.log(`✅ Proses Weekly Nudge & Calendar Integration Selesai.`);

    } catch (error: any) {
      console.error("Gagal menjalankan Weekly Nudge:", error);
    }
  }
);