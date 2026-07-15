// functions/src/emailService.ts
import * as nodemailer from "nodemailer";

export interface EmailData {
  targetEmail: string;
  namaUsaha: string;
  totalScore: number;
  readinessLevel: string;
  trackType: string;
  assessmentUrl: string;
}

export const sendAssessmentEmail = async (
  smtpEmail: string,
  smtpPassword: string,
  data: EmailData
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    const mailOptions = {
      // REBRANDING: Nama Pengirim Email
      from: `"Omnifit Notification" <${smtpEmail}>`,
      to: data.targetEmail,
      subject: `🚀 Laporan Hasil Asesmen AI: ${data.namaUsaha}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 900;">O M N I F I T</h1>
            <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Smart Assessment System</p>
          </div>
          
          <h2 style="color: #0f172a; font-size: 20px;">Halo, Tim ${data.namaUsaha}!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">Terima kasih telah menyelesaikan evaluasi Due Diligence. Mesin AI kami telah berhasil membedah parameter operasional Anda dan menyintesis cetak biru strategis.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 24px; border-radius: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Nama Entitas</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${data.namaUsaha}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">AI Score</td>
                <td style="padding: 8px 0; color: #4f46e5; font-size: 20px; font-weight: 900; text-align: right; border-bottom: 1px solid #e2e8f0;">${data.totalScore}/100</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Level Kesiapan</td>
                <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${data.readinessLevel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Kategori Program</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold; text-align: right;">${data.trackType}</td>
              </tr>
            </table>
          </div>

          <p style="color: #475569; font-size: 15px; margin-bottom: 24px;">Laporan matriks lengkap, pemetaan risiko (SWOT), dan rekomendasi <i>Action Plan</i> dapat Anda akses melalui tautan permanen di bawah ini:</p>
          
          <div style="text-align: center;">
            <a href="${data.assessmentUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
              Buka Dashboard Laporan
            </a>
          </div>

          <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            * Terimakasih Telah Berpartisipasi.<br><br>
            © ${new Date().getFullYear()} Omnifit Analytics
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email berhasil dikirim ke: ${data.targetEmail}`);
  } catch (error) {
    console.error("❌ Kesalahan saat mengirim email:", error);
  }
};