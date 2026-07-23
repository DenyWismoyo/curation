// functions/src/promptEnhancerService.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

export const generateAdvancedPrompts = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
    secrets: [geminiApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { trackName, specificTargetContext, methodologyContext, targetAudience, scenario } = request.data;

    try {
      const API_KEY = geminiApiKeySecret.value();
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: "Anda adalah 'Lead Enterprise Prompt Engineer'. Tugas Anda adalah merumuskan instruksi sistem (system prompts), aturan kuantifikasi, dan batasan (negative prompts) untuk menyetel kepribadian sebuah AI Assessor agar 100% sesuai dengan skema yang diminta klien.",
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["customScoringRubric", "customSystemPrompt", "negativePrompts", "formatInstructions", "actionPlanBehavior"],
            properties: {
              customScoringRubric: { type: SchemaType.STRING, description: "Panduan cara AI memberikan skor angka 0-100 secara spesifik berdasarkan metodologi." },
              customSystemPrompt: { type: SchemaType.STRING, description: "Aturan logika IF-THEN dan cara AI menganalisis data (Apakah mencari celah/kritis, atau suportif)." },
              negativePrompts: { type: SchemaType.STRING, description: "Larangan mutlak / Red Flags / Kata-kata yang tidak boleh digunakan oleh AI." },
              formatInstructions: { type: SchemaType.STRING, description: "Instruksi format penulisan. Wajib menginstruksikan AI untuk menggunakan markdown **tebal**, *miring*, dan ### sub-heading." },
              
              // PERBAIKAN: Mempertegas instruksi untuk memastikan AI merespons dengan kalimat lengkap, bukan placeholder
              actionPlanBehavior: { type: SchemaType.STRING, description: "Instruksi KHUSUS berupa 1-2 kalimat detail tentang bagaimana AI harus menulis rencana aksi. (CONTOH: 'Fokuskan action plan pada pembuatan SOP, metrik KPI, dan taktik efisiensi biaya. Gunakan bahasa korporat yang asertif.')" }
            }
          }
        }
      });

      // PERBAIKAN: Menerjemahkan opsi skenario baru ke dalam instruksi prompt builder
      let scenarioInstruction = "";
      switch(scenario) {
        case 'b2e_hybrid':
          scenarioInstruction = "SKEMA HYBRID B2E: Atur 'customSystemPrompt' agar AI kritis terhadap metrik HR, tetapi atur 'actionPlanBehavior' agar suportif dan empatik (layaknya Mentor).";
          break;
        case 'b2b_audit':
          scenarioInstruction = "SKEMA STRICT AUDIT B2B: Atur AI layaknya Auditor Eksternal. 'actionPlanBehavior' WAJIB diinstruksikan untuk membuat SOP bisnis, perbaikan operasional, dan taktik ROI.";
          break;
        case 'b2c_counseling':
          scenarioInstruction = "SKEMA EMPATHETIC COUNSELING B2C: AI bertindak sebagai Psikolog/Konselor. 'actionPlanBehavior' WAJIB diinstruksikan untuk merumuskan intervensi psikologis, kebiasaan harian (habits), dan mindfulness.";
          break;
        case 'edu_coaching':
          scenarioInstruction = "SKEMA EDUCATIONAL: AI bertindak sebagai Dosen/Pelatih. 'actionPlanBehavior' WAJIB difokuskan pada kurikulum belajar, tugas latihan, dan perbaikan teknis/akademik.";
          break;
        case 'gov_policy':
          scenarioInstruction = "SKEMA PEMERINTAHAN: AI bertindak sebagai Analis Kebijakan Publik. 'actionPlanBehavior' WAJIB difokuskan pada rekomendasi tata kelola, transparansi, dan efisiensi birokrasi.";
          break;
        case 'startup_pitch':
          scenarioInstruction = "SKEMA STARTUP: AI bertindak sebagai Venture Capitalist. 'actionPlanBehavior' WAJIB berfokus pada strategi growth hacking, pivot produk, mitigasi burn-rate, dan go-to-market strategy.";
          break;
        case 'creative_portfolio':
          scenarioInstruction = "SKEMA KREATIF: AI bertindak sebagai Art Director/Kurator. 'actionPlanBehavior' WAJIB berfokus pada eksplorasi ide, perbaikan estetika karya, dan penetrasi audiens kreatif.";
          break;
        case 'financial_risk':
          scenarioInstruction = "SKEMA FINANSIAL: AI bertindak sebagai Financial Advisor/Risk Analyst. 'actionPlanBehavior' WAJIB berfokus pada diversifikasi portofolio, efisiensi cashflow, dan strategi lindung nilai (hedging).";
          break;
        default:
          scenarioInstruction = "SKEMA STANDAR UMUM: Buat instruksi yang seimbang dan berorientasi pada hasil.";
      }

      const prompt = `
        Konteks Program Asesmen: "${trackName || 'Umum'}"
        Target Audiens: "${targetAudience || 'Perusahaan / Organisasi'}"
        Profil Subjek: "${specificTargetContext || '-'}"
        Metodologi: "${methodologyContext || '-'}"

        INSTRUKSI SKEMA KEPRIBADIAN (MUTLAK):
        ${scenarioInstruction}

        ATURAN TAMBAHAN UNTUK 'formatInstructions' (UI OPTIMIZATION):
        Anda WAJIB menyisipkan instruksi format visual berikut secara eksplisit ke dalam teks 'formatInstructions':
        "Gunakan Markdown secara maksimal untuk kemudahan membaca: Gunakan penanda **teks tebal** untuk menyoroti nama metrik/istilah penting, *miring* untuk penekanan atau kutipan, dan gunakan awalan ### (Heading 3) untuk memisahkan sub-topik laporan agar sistem merendernya dengan rapi."

        Tugas: Hasilkan 5 komponen Advanced Prompting yang tajam, detail, dan langsung bisa dieksekusi oleh mesin AI. Pastikan seluruh kolom terisi dengan kalimat penuh.
      `;

      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```')) rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      
      const advancedPrompts = JSON.parse(rawText);

      return { success: true, advancedPrompts };
    } catch (error: any) {
      console.error("Gagal generate advanced prompts:", error);
      throw new HttpsError("internal", error.message || "Gagal merumuskan Advanced Prompts.");
    }
  }
);