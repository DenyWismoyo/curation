// functions/src/outputService.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { withRetry } from "./utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const resolveImpactGuidance = (mode: unknown): string => {
  const value = String(mode || "bold").toLowerCase();
  if (value === "soft") {
    return "Gunakan narasi halus, empatik, aman, dan elegan. Tetap jelas namun tidak terlalu provokatif.";
  }
  if (value === "aggressive") {
    return "Gunakan narasi high-impact, sangat tajam, berenergi tinggi, sangat conversion-oriented, namun tetap profesional.";
  }
  return "Gunakan narasi tegas, kuat, menjual, dan mudah dipahami, dengan keseimbangan antara kredibilitas dan emosi.";
};

// 1. FUNGSI EKSISTING: Generate Selling Points (Output)
export const generateTemplateSellingPoints = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { trackName, trackDescription, aiPromptConfig } = request.data;
    const promptImpactMode = aiPromptConfig?.promptImpactMode || "bold";
    const impactGuidance = resolveImpactGuidance(promptImpactMode);

    if (!aiPromptConfig) throw new HttpsError("invalid-argument", "Konfigurasi Otak AI tidak ditemukan.");

    try {
      const deepseekClient = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: deepseekApiKeySecret.value(),
      });

      const systemInstruction = `Anda adalah Senior Growth Copywriter untuk produk assessment.
Tugas: hasilkan poin benefit yang sangat kuat, jelas, dan menjual.

Aturan mutlak:
1. Output WAJIB JSON valid.
2. Berikan TEPAT 4 poin benefit.
3. Setiap poin harus berbentuk objek: { "title": string, "description": string }.
4. Title: 3-6 kata, tajam, bernilai tinggi.
5. Description: 1 kalimat yang menjelaskan dampak praktis ke pengguna.
6. Hindari jargon generik, wajib konkret dan relevan konteks.
7. Gaya dampak (impact mode): ${impactGuidance}
`;

      const prompt = `
Konteks Modul: "${trackName || "Modul Asesmen"}"
Deskripsi: "${trackDescription || "-"}"
Metrik: ${JSON.stringify(aiPromptConfig.expectedMetrics || [])}
Fokus Risiko: ${aiPromptConfig.riskFramework || "Risiko umum"}
Target Rekomendasi: ${JSON.stringify(aiPromptConfig.expectedRecommendations || [])}

Output format:
{
  "sellingPoints": [
    { "title": "...", "description": "..." }
  ]
}
`;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.65,
        response_format: { type: "json_object" },
      }));

      let rawText = result.choices[0]?.message?.content || "{}";
      rawText = rawText.replace(/^```(json)?/gi, "").replace(/```$/g, "").trim();

      const parsedData = JSON.parse(rawText);
      const sellingPointsRaw = Array.isArray(parsedData)
        ? parsedData
        : (Array.isArray(parsedData?.sellingPoints) ? parsedData.sellingPoints : []);

      const sellingPoints = sellingPointsRaw
        .filter((item: any) => item && typeof item === "object")
        .slice(0, 4)
        .map((item: any, index: number) => ({
          title: typeof item?.title === "string" && item.title.trim().length > 0
            ? item.title.trim()
            : `Benefit Strategis ${index + 1}`,
          description: typeof item?.description === "string" && item.description.trim().length > 0
            ? item.description.trim()
            : "Memberikan dampak nyata dan langkah terarah bagi pengguna.",
        }));

      while (sellingPoints.length < 4) {
        const idx = sellingPoints.length + 1;
        sellingPoints.push({
          title: `Benefit Strategis ${idx}`,
          description: "Membantu pengguna bergerak lebih cepat dari analisis ke eksekusi.",
        });
      }

      return { success: true, sellingPoints };

    } catch (error: any) {
      console.error("Gagal generate copywriting:", error);
      throw new HttpsError("internal", error.message || "Gagal memproses AI.");
    }
  }
);

// 2. FUNGSI BARU: Auto-Generate Prompt Anchors (Profil & Metodologi)
export const generatePromptAnchors = onCall({
    memory: "256MiB",
    region: "asia-southeast2",
  secrets: [deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Akses ditolak.");
    const { trackName, trackDescription, targetAudience, formPurpose, aiPromptConfig } = request.data;
    const promptImpactMode = aiPromptConfig?.promptImpactMode || "bold";
    const impactGuidance = resolveImpactGuidance(promptImpactMode);

    if (!trackName) throw new HttpsError("invalid-argument", "Nama Program wajib diisi untuk merumuskan konteks.");

    // ═══════════════════════════════════════════════════════════════════
    // PERBAIKAN: Baca formPurpose dan aiPromptConfig untuk menghasilkan
    // anchor yang benar-benar spesifik dan relevan sebagai panduan AI
    // ═══════════════════════════════════════════════════════════════════
    const purposeKey = formPurpose || aiPromptConfig?.formPurpose || 'assessment';
    const audienceKey = targetAudience || aiPromptConfig?.targetAudience || 'company';

    const purposeGuide: Record<string, string> = {
      'counseling': 'Ini adalah form KONSELING. Profil subjek harus mencakup kondisi psikologis, latar belakang emosional, dan kebutuhan dukungan. Metodologi dari framework psikologi/konseling (CBT, ACT, Positive Psychology, MBSR, dll).',
      'monitoring': 'Ini adalah form MONITORING/EVALUASI. Profil subjek harus mencakup posisi dalam siklus program, baseline sebelumnya, dan target yang harus dicapai. Metodologi dari framework evaluasi (Kirkpatrick, Logframe, OECD-DAC, dll).',
      'consultation': 'Ini adalah form KONSULTASI PAKAR. Profil subjek harus mencakup masalah spesifik yang dihadapi, konteks industri/domain, dan kesiapan untuk berubah. Metodologi dari framework problem-solving (Design Thinking, Root Cause Analysis, McKinsey 7S, dll).',
      'assessment': 'Ini adalah form ASESMEN/PENILAIAN. Profil subjek harus mencakup karakteristik yang akan dinilai, kondisi baseline, dan aspek yang paling kritis untuk dievaluasi. Metodologi dari framework penilaian yang relevan dengan industri/domain.',
    };

    const audienceGuide: Record<string, string> = {
      'individual': 'Subjek adalah INDIVIDU. Profil mencakup: peran/profesi, tingkat pengalaman, kondisi personal yang relevan, dan motivasi mengikuti asesmen.',
      'student': 'Subjek adalah PELAJAR/MAHASISWA. Profil mencakup: jenjang pendidikan, program studi, tahap akademik, dan tujuan karir/pengembangan.',
      'gen_z': 'Subjek adalah GEN Z / MILENIAL. Profil mencakup: tantangan generasi modern, mental health, tuntutan karir (hustle culture), keseimbangan emosional, dan preferensi value.',
      'parenting': 'Subjek adalah ORANG TUA (PARENTING). Profil mencakup: tahap perkembangan anak, pola asuh, stres pengasuhan, kedekatan keluarga, dan tantangan modern parenting.',
      'couple': 'Subjek adalah PASANGAN. Profil mencakup: tahap hubungan (pra-nikah/menikah), dinamika komunikasi, resolusi konflik, dan tujuan finansial/koneksi emosional bersama.',
      'government': 'Subjek adalah INSTANSI PEMERINTAH/ASN. Profil mencakup: jenis instansi, level jabatan, bidang tugas, dan konteks kebijakan yang relevan.',
      'community': 'Subjek adalah KOMUNITAS/NGO/YAYASAN. Profil mencakup: skala komunitas, isu sosial yang diatasi, model operasional, dan kematangan organisasi.',
      'startup': 'Subjek adalah STARTUP. Profil mencakup: tahap pertumbuhan (ideasi/MVP/growth), sektor industri, model bisnis, dan traksi yang sudah dicapai.',
      'umkm': 'Subjek adalah UMKM/BISNIS KECIL MENENGAH. Profil mencakup: kategori usaha, skala operasional, lama beroperasi, dan tantangan utama yang dihadapi.',
      'company': 'Subjek adalah PERUSAHAAN/KORPORAT. Profil mencakup: ukuran perusahaan, sektor industri, posisi pasar, dan fokus strategis.',
    };

    const extraContext = aiPromptConfig?.expectedMetrics?.length > 0
      ? `\nMetrik yang akan diukur: ${JSON.stringify(aiPromptConfig.expectedMetrics)}`
      : '';
    const blocksContext = aiPromptConfig?.expectedAnalysisBlocks?.length > 0
      ? `\nBlok analisis yang diharapkan: ${JSON.stringify(aiPromptConfig.expectedAnalysisBlocks)}`
      : '';

    try {
      const deepseekClient = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: deepseekApiKeySecret.value(),
      });

      const systemInstruction = `Anda adalah Lead Assessment Architect.
Tugas: merumuskan anchor berkualitas enterprise untuk template builder.

Aturan mutlak:
1. Output WAJIB JSON valid.
2. Wajib isi key: specificTargetContext, methodologyContext, formBuilderInstruction, aiPersona.
3. Gaya bahasa harus konkret, strategis, dan bisa langsung dieksekusi.
4. Hasil harus terasa lebih tajam, relevan, dan bernilai jual tinggi.
5. Gaya dampak (impact mode): ${impactGuidance}
`;

      const prompt = `
        DATA PROGRAM:
        - Nama Program: "${trackName}"
        - Deskripsi: "${trackDescription || '-'}"
        - Tujuan Form: ${purposeKey}
        - Target Audiens: ${audienceKey}
        ${extraContext}
        ${blocksContext}

        PANDUAN KONTEKS TUJUAN:
        ${purposeGuide[purposeKey] || purposeGuide['assessment']}

        PANDUAN KONTEKS AUDIENS:
        ${audienceGuide[audienceKey] || audienceGuide['company']}

        TUGAS:
        1. PROFIL SPESIFIK SUBJEK (specificTargetContext): 
           Rumuskan deskripsi yang sangat tajam dan kaya tentang siapa subjek yang akan dinilai. 
           Harus mencakup: karakteristik spesifik subjek, kondisi atau tahap yang relevan, aspek kritis yang akan dievaluasi, dan nuansa konteks yang perlu dipahami AI.
           CONTOH KUALITAS YANG DIINGINKAN: "Subjek adalah UMKM di sektor kuliner yang telah beroperasi 1-5 tahun dengan omzet Rp50jt-500jt/tahun. Asesmen ini ditujukan untuk memetakan kesiapan mereka dalam memasuki ekosistem digital dan platform e-commerce — mencakup kapasitas produksi, literasi digital, manajemen keuangan informal, serta potensi scaling yang belum dioptimalkan."
           
        2. METODOLOGI (methodologyContext):
           Identifikasi framework atau metodologi TERBAIK yang relevan untuk program ini.
           Harus mencakup: nama framework spesifik, alasan dipilih untuk konteks ini, dan bagaimana kerangkanya diterapkan dalam asesmen.
           CONTOH KUALITAS YANG DIINGINKAN: "Asesmen mengadopsi kerangka Business Model Canvas (BMC) dari Osterwalder dikombinasikan dengan Growth Readiness Framework UNDP. Pemilihan BMC memungkinkan pemetaan 9 elemen bisnis secara holistik, sementara Growth Readiness Framework mengukur kesiapan kapasitas internal. Standar skoring mengacu pada Benchmark UMKM Kemendag 2023 untuk memberikan konteks komparatif yang relevan."
           
        3. INSTRUKSI FORM BUILDER (formBuilderInstruction):
           Berikan instruksi kuat kepada AI pembuat formulir tentang bagaimana meracik soal yang tepat untuk audiens ini. 
           CONTOH KUALITAS: "Gunakan bahasa yang sederhana namun menggali. Hindari jargon teknis yang membingungkan UMKM. Fokus pada validasi lapangan bukan teori."
           
        4. AI PERSONA (aiPersona):
           Sebutkan gelar/identitas pakar yang paling tepat untuk melakukan asesmen ini dan memberikan laporan Action Plan nantinya.
           CONTOH KUALITAS: "Konsultan Strategi Bisnis UMKM & Pakar Digital Marketing"

        OUTPUT WAJIB JSON murni:
        {
          "specificTargetContext": "...",
          "methodologyContext": "...",
          "formBuilderInstruction": "...",
          "aiPersona": "..."
        }
      `;

      const result = await withRetry(() => deepseekClient.chat.completions.create({
        model: "deepseek-v4-pro",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
        response_format: { type: "json_object" },
      }));

      let rawText = result.choices[0]?.message?.content || "{}";
      rawText = rawText.replace(/^```(json)?/gi, "").replace(/```$/g, "").trim();

      const parsed = JSON.parse(rawText);
      const anchors = {
        specificTargetContext: typeof parsed?.specificTargetContext === "string" && parsed.specificTargetContext.trim().length > 0
          ? parsed.specificTargetContext.trim()
          : `Subjek utama program ${trackName || "ini"} memiliki kebutuhan asesmen yang beragam dan membutuhkan diagnosis berbasis konteks nyata agar rekomendasi tidak generik.`,
        methodologyContext: typeof parsed?.methodologyContext === "string" && parsed.methodologyContext.trim().length > 0
          ? parsed.methodologyContext.trim()
          : "Gunakan pendekatan asesmen berbasis evidence, kombinasi maturity model, dan prioritas dampak agar hasil dapat ditindaklanjuti secara bertahap.",
        formBuilderInstruction: typeof parsed?.formBuilderInstruction === "string" && parsed.formBuilderInstruction.trim().length > 0
          ? parsed.formBuilderInstruction.trim()
          : "Rancang pertanyaan bertahap dari konteks dasar ke validasi kritis, utamakan bahasa jelas, dan pastikan setiap seksi menghasilkan data yang dapat ditindaklanjuti.",
        aiPersona: typeof parsed?.aiPersona === "string" && parsed.aiPersona.trim().length > 0
          ? parsed.aiPersona.trim()
          : "Konsultan Strategi Asesmen & Transformasi Kinerja",
      };
      return { success: true, anchors };

    } catch (error: any) {
      console.error("Gagal generate anchors:", error);
      throw new HttpsError("internal", error.message || "Gagal merumuskan Konteks Anchor.");
    }
  }
);