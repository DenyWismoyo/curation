// functions/src/promptEnhancerService.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { withRetry } from "./utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const resolveImpactGuidance = (mode: unknown): string => {
  const value = String(mode || "bold").toLowerCase();
  if (value === "soft") {
    return "Gunakan gaya aman, empatik, humanis, dan tidak terlalu konfrontatif.";
  }
  if (value === "aggressive") {
    return "Gunakan gaya sangat tajam, eksplisit, berenergi tinggi, dan mendorong tindakan cepat.";
  }
  return "Gunakan gaya tegas, kuat, persuasif, namun tetap seimbang dan profesional.";
};

export const generateAdvancedPrompts = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { trackName, specificTargetContext, methodologyContext, targetAudience, scenario, promptImpactMode } = request.data;
    const impactGuidance = resolveImpactGuidance(promptImpactMode);

    try {

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

        MODE KUALITAS IMPACT:
        ${impactGuidance}

        ATURAN TAMBAHAN UNTUK 'formatInstructions' (UI OPTIMIZATION):
        Anda WAJIB menyisipkan instruksi format visual berikut secara eksplisit ke dalam teks 'formatInstructions':
        "Gunakan Markdown secara maksimal untuk kemudahan membaca: Gunakan penanda **teks tebal** untuk menyoroti nama metrik/istilah penting, *miring* untuk penekanan atau kutipan, dan gunakan awalan ### (Heading 3) untuk memisahkan sub-topik laporan agar sistem merendernya dengan rapi."

        Tugas: Hasilkan 5 komponen Advanced Prompting yang tajam, detail, dan langsung bisa dieksekusi oleh mesin AI. Pastikan seluruh kolom terisi dengan kalimat penuh.

        OUTPUT WAJIB JSON murni:
        {
          "customScoringRubric": "...",
          "customSystemPrompt": "...",
          "negativePrompts": "...",
          "formatInstructions": "...",
          "actionPlanBehavior": "..."
        }
      `;

      const deepseekClient = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: deepseekApiKeySecret.value(),
      });

      const systemInstruction = `Anda adalah Lead Enterprise Prompt Engineer.
Rancang konfigurasi prompt tingkat lanjut yang membuat hasil assessment lebih tajam, elegan, dan actionable.

Aturan mutlak:
1. Keluarkan JSON valid saja.
2. Semua field wajib terisi kalimat penuh, bukan placeholder.
3. Bahasa Indonesia profesional-modern, tidak kaku.
4. Hasil harus terasa premium dan siap pakai di produksi.
5. Gaya dampak yang wajib dipatuhi: ${impactGuidance}
`;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.45,
        response_format: { type: "json_object" },
      }));

      let rawText = result.choices[0]?.message?.content || "{}";
      rawText = rawText.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
      const parsed = JSON.parse(rawText);

      const advancedPrompts = {
        customScoringRubric: typeof parsed?.customScoringRubric === "string" && parsed.customScoringRubric.trim().length > 0
          ? parsed.customScoringRubric.trim()
          : "Gunakan skala 0-100 dengan pembobotan per metrik, penalti untuk gap kritis, dan bonus untuk evidence kuat agar skor mencerminkan kondisi nyata.",
        customSystemPrompt: typeof parsed?.customSystemPrompt === "string" && parsed.customSystemPrompt.trim().length > 0
          ? parsed.customSystemPrompt.trim()
          : "Analisis data secara tajam namun adil. Prioritaskan akar masalah, validasi konsistensi jawaban, lalu berikan rekomendasi bertahap dari quick wins ke strategi menengah.",
        negativePrompts: typeof parsed?.negativePrompts === "string" && parsed.negativePrompts.trim().length > 0
          ? parsed.negativePrompts.trim()
          : "Dilarang memberi jawaban generik, dilarang jargon berlebihan, dilarang rekomendasi tanpa langkah implementasi.",
        formatInstructions: typeof parsed?.formatInstructions === "string" && parsed.formatInstructions.trim().length > 0
          ? parsed.formatInstructions.trim()
          : "Gunakan Markdown dengan struktur rapi: ### untuk sub-topik, **tebal** untuk insight kunci, dan bullet ringkas untuk langkah aksi.",
        actionPlanBehavior: typeof parsed?.actionPlanBehavior === "string" && parsed.actionPlanBehavior.trim().length > 0
          ? parsed.actionPlanBehavior.trim()
          : "Susun rencana aksi yang konkret, berurutan, dan terukur. Setiap langkah wajib memiliki tujuan, indikator hasil, dan prioritas eksekusi.",
      };

      return { success: true, advancedPrompts };
    } catch (error: any) {
      console.error("Gagal generate advanced prompts:", error);
      throw new HttpsError("internal", error.message || "Gagal merumuskan Advanced Prompts.");
    }
  }
);