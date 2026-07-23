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
              actionPlanBehavior: { type: SchemaType.STRING, description: "Instruksi KHUSUS bagaimana AI harus menulis rencana aksi. Apakah berupa SOP bisnis, atau rutinitas psikologi individu." }
            }
          }
        }
      });

      // Menerjemahkan skema pilihan admin menjadi instruksi
      let scenarioInstruction = "";
      switch(scenario) {
        case 'b2e_hybrid':
          scenarioInstruction = "SKEMA HYBRID B2E (Business-to-Employee): Atur 'customSystemPrompt' agar AI sangat KRITIS dan OBJEKTIF saat menilai metrik untuk laporan HR. TETAPI, atur 'actionPlanBehavior' agar AI SANGAT SUPORTIF, EMPATIK, dan bertindak layaknya Mentor/Coach untuk pengembangan diri pegawai tersebut.";
          break;
        case 'b2b_audit':
          scenarioInstruction = "SKEMA STRICT AUDIT B2B: Atur SELURUH prompt agar AI bertindak seperti Auditor Eksternal, Venture Capital, atau Investigator Hukum. Sangat ketat, mencari celah risiko, dan action plan wajib berupa SOP strategis/taktis bisnis. Larang penggunaan bahasa emosional.";
          break;
        case 'b2c_counseling':
          scenarioInstruction = "SKEMA EMPATHETIC COUNSELING B2C: Atur SELURUH prompt agar AI bertindak sebagai Psikolog/Konselor. Larang keras penggunaan istilah korporat/bisnis/B2B. Action plan harus berupa kebiasaan harian (habits), mindfulness, atau intervensi psikologis ringan.";
          break;
        case 'edu_coaching':
          scenarioInstruction = "SKEMA EDUCATIONAL COACHING: Atur prompt agar AI bertindak sebagai Dosen/Pelatih Ahli. Evaluasi harus bersifat akademis/evaluatif namun mendidik. Action plan berupa kurikulum belajar, latihan soal, atau perbaikan teknis.";
          break;
        default:
          scenarioInstruction = "SKEMA STANDAR UMUM: Buat instruksi yang seimbang, profesional, dan berorientasi pada hasil.";
      }

      // PERBAIKAN: Melemparkan data audiens utuh agar AI bisa meracik prompt dengan sempurna
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

        Tugas: Hasilkan 5 komponen Advanced Prompting yang tajam, detail, dan langsung bisa dieksekusi oleh mesin AI.
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