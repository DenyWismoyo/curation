// scripts/send-dummy-email.mjs
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Memuat variabel lingkungan dari .env.local[cite: 2]
dotenv.config({ path: '.env.local' });

// Warna Terminal ANSI untuk output yang rapi[cite: 2]
const c = { 
  reset: "\x1b[0m", 
  green: "\x1b[32m", 
  cyan: "\x1b[36m", 
  red: "\x1b[31m", 
  yellow: "\x1b[33m" 
};

// Mengambil kredensial dari .env.local
const smtpEmail = process.env.SMTP_EMAIL;
const smtpPassword = process.env.SMTP_PASSWORD;

if (!smtpEmail || !smtpPassword) {
  console.error(`${c.red}  ERROR: SMTP_EMAIL atau SMTP_PASSWORD tidak ditemukan di .env.local${c.reset}`);
  console.log(`${c.yellow}Pastikan Anda telah menambahkan kredensial email Hostinger di dalam file .env.local Anda.${c.reset}`);
  process.exit(1);
}

async function sendDummyEmail() {
  console.log(`\n${c.cyan}   Membangunkan Agen Pengirim Email (Dummy Test)...${c.reset}`);
  
  // Target pengiriman email Super Admin[cite: 2]
  const targetEmail = "deny.wismoyo@gmail.com";
  
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    const mailOptions = {
      from: `"Omnifit System" <${smtpEmail}>`,
      to: targetEmail,
      subject: "Test Email Dummy - Konfigurasi SMTP Hostinger",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5; margin-top: 0;">Email Uji Coba Berhasil!</h2>
          <p style="color: #475569; line-height: 1.6;">Halo,</p>
          <p style="color: #475569; line-height: 1.6;">Email ini dikirimkan secara otomatis melalui skrip eksekusi <strong>send-dummy-email.mjs</strong> untuk memastikan konfigurasi SMTP Hostinger telah terhubung sempurna dengan aplikasi Omnifit.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Status:</strong> <span style="color: #10b981;">Terkoneksi & Valid</span></p>
          </div>
          <p style="color: #475569; line-height: 1.6;">Anda sudah bisa menutup pesan ini.</p>
          <br/>
          <p style="color: #94a3b8; font-size: 12px;">Tim Infrastruktur Omnifit</p>
        </div>
      `,
    };

    console.log(`Mencoba mengirim email ke ${targetEmail}...\n`);
    
    await transporter.sendMail(mailOptions);
    
    console.log(`${c.green}  BERHASIL: Email dummy sukses terkirim ke ${targetEmail}!${c.reset}\n`);
    console.log(`${c.yellow}  Silakan periksa kotak masuk (atau folder spam) di email Anda.${c.reset}\n`);
    
  } catch (error) {
    console.error(`${c.red}  GAGAL: Terjadi kesalahan saat mengirim email:${c.reset}`, error.message);
  }
}

sendDummyEmail();