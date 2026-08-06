import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import { z } from "zod";
import { withRetry } from "../../../shared/utils/retry";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const resolveImpactGuidance = (mode: unknown): string => {
  const value = String(mode || "bold").toLowerCase();
  if (value === "soft") {
    return "Pilih diksi lembut, aman, dan empatik; tetap premium namun tidak terlalu menekan.";
  }
  if (value === "aggressive") {
    return "Pilih diksi high-impact, tegas, penuh urgensi, dan sangat memicu tindakan.";
  }
  return "Pilih diksi tegas, menjual, modern, dan memorable.";
};

const inspirationItemSchema = z.object({
  trackName: z.string().default("Program Asesmen Strategis"),
  trackDescription: z.string().default("Program asesmen ini membantu pengguna memetakan kondisi aktual dan menyusun langkah perbaikan yang terukur."),
  trackIcon: z.string().default("Sparkles"),
  angle: z.string().default("Posisi nilai utama"),
});

const inspirationPayloadSchema = z.object({
  inspirations: z.array(inspirationItemSchema).min(3).max(6).default([]),
});

const trimText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const normalizeTopic = (rawTopic: string): string => {
  const cleaned = rawTopic
    .replace(/program\s+asesmen/gi, "")
    .replace(/asesmen/gi, "")
    .replace(/strategis/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Kinerja Tim";
};

const isWeakTitle = (title: string, draftName: string): boolean => {
  const value = title.trim();
  if (!value) return true;

  const lower = value.toLowerCase();
  if (lower === draftName.toLowerCase()) return true;
  if (/^program asesmen( strategis)?$/i.test(value)) return true;
  if (/^asesmen( strategis)?$/i.test(value)) return true;
  if (value.split(/\s+/).length < 2) return true;
  return false;
};

const isWeakDescription = (description: string): boolean => {
  const value = description.trim().toLowerCase();
  if (!value) return true;
  return value.includes("membantu pengguna memetakan kondisi aktual") || value.length < 50;
};

const fallbackTitleFormulas = [
  "X-Ray {topic}: Temukan Titik Buta Anda",
  "Parenting Compass: Formula Terbaik untuk {topic}",
  "Evaluasi {topic}: Peta Jalan Sukses Mahasiswa",
  "Standar Emas {topic}: Blueprint Service Excellence",
  "Masterclass {topic}: Menuju Top 1%",
  "Mesin Transformasi {topic} Anti-Stagnan",
  "Katalisator {topic}: Dari Biasa Jadi Luar Biasa",
];

const fallbackDescriptionFormulas = [
  "Bongkar hambatan tersembunyi pada {topicLower}. Dapatkan diagnosis tajam dan langkah nyata untuk perbaikan instan.",
  "Panduan esensial untuk membedah {topicLower}. Temukan pola yang selama ini terlewat dan ubah menjadi strategi yang berdampak.",
  "Tidak perlu lagi menebak-nebak. Ukur kualitas {topicLower} Anda secara presisi dan dapatkan prioritas aksi yang terarah.",
  "Ubah tantangan pada {topicLower} menjadi peluang. Asesmen ini memberikan peta jalan konkret untuk akselerasi hasil.",
  "Tingkatkan standar {topicLower} dengan pendekatan terukur. Hasil akhir bukan sekadar skor, tapi momentum perubahan nyata.",
];

const pickFallbackTitle = (topic: string, seedIndex: number): string => {
  const formula = fallbackTitleFormulas[seedIndex % fallbackTitleFormulas.length];
  const title = formula.replace("{topic}", topic).replace(/\s+/g, " ").trim();
  return title.slice(0, 70);
};

const pickFallbackDescription = (topic: string, seedIndex: number): string => {
  const formula = fallbackDescriptionFormulas[seedIndex % fallbackDescriptionFormulas.length];
  return formula.replace(/\{topicLower\}/g, topic.toLowerCase());
};

export const generateTemplateIdentityInspirations = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 90,
  secrets: [deepseekApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const trackName = trimText(request.data?.trackName);
  const trackDescription = trimText(request.data?.trackDescription);
  const targetAudience = trimText(request.data?.targetAudience) || "company";
  const formPurpose = trimText(request.data?.formPurpose) || "assessment";
  const promptImpactMode = trimText(request.data?.promptImpactMode) || "bold";
  const impactGuidance = resolveImpactGuidance(promptImpactMode);
  const specificTargetContext = trimText(request.data?.specificTargetContext);
  const methodologyContext = trimText(request.data?.methodologyContext);
  const expectedMetrics = Array.isArray(request.data?.expectedMetrics)
    ? request.data.expectedMetrics.filter((item: any) => typeof item === "string" && item.trim().length > 0).slice(0, 12)
    : [];

  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: deepseekApiKeySecret.value(),
  });

  const systemInstruction = `
Anda adalah Creative Brand Architect dan Copywriter kelas atas untuk platform assessment.
Tugas Anda membuat inspirasi judul dan deskripsi template yang terasa premium, "out of the box", dan sangat menjual (high-conversion).

Aturan wajib:
1. Output WAJIB JSON valid dengan format tepat seperti ini:
{
  "inspirations": [
    {
      "trackName": "Judul yang out of the box, max 70 char",
      "trackDescription": "Deskripsi 2 kalimat singkat yang menjual, menonjolkan masalah + solusi transformatif",
      "trackIcon": "Target",
      "angle": "nama-angle-positioning"
    }
  ]
}
2. Buat TEPAT 5 kandidat yang sangat berbeda sudut nilai (angle), bukan sekadar sinonim.
3. Setiap judul WAJIB unik total. DILARANG memakai judul generik seperti "Program Asesmen Strategis".
4. WAJIB MENGGUNAKAN BAHASA INDONESIA (BAKU TAPI MODERN & MENJUAL) UNTUK SEMUA OUTPUT.
5. Gunakan teknik copywriting yang memancing rasa penasaran (curiosity), urgency, atau janji hasil yang kuat (result-driven).
6. Sesuaikan gaya bahasa dan analogi dengan target audiens atau metodologi. Gunakan metafora menarik seperti 'X-Ray', 'Compass', 'Blueprint', 'Playbook', dsb, namun pastikan tetap relevan dengan konteks aslinya (misalnya parenting, mahasiswa, service excellence, corporate, dll).
7. Deskripsi harus berfokus pada: "Apa masalah yang dipecahkan?" + "Apa transformasi nyata yang didapat?". Hindari bahasa kaku/klise.
8. Pilih trackIcon dari lucide-react (PascalCase), satu ikon yang paling merepresentasikan judul per kandidat.
9. Berikan "angle" (maksimal 2 kata) singkat untuk menjelaskan positioning tiap kandidat (contoh: action-first, empathy-first, growth-driven).
10. Mode kualitas impact wajib diikuti: ${impactGuidance}
`;

  const userPrompt = `
Konteks draft template:
- Nama draft: ${trackName || "(kosong)"}
- Deskripsi draft: ${trackDescription || "(kosong)"}
- Target audience: ${targetAudience}
- Form purpose: ${formPurpose}
- Profil subjek (anchor): ${specificTargetContext || "-"}
- Metodologi (anchor): ${methodologyContext || "-"}
- Metrik utama: ${JSON.stringify(expectedMetrics)}

Hasilkan 5 inspirasi terbaik untuk judul + deskripsi template.
Pastikan setiap kandidat berbeda positioning (misal: compliance-first, growth-first, mentoring-first, risk-first, people-first).
Setiap judul harus siap dipakai sebagai nama produk/layanan yang menjual.
`;

  try {
    const response = await withRetry(() => client.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.65,
      response_format: { type: "json_object" },
    }));

    let content = response.choices[0]?.message?.content || "{}";
    if (content.startsWith("```")) {
      content = content.replace(/^```(json)?/gi, "").replace(/```$/g, "").trim();
    }

    const parsed = inspirationPayloadSchema.parse(JSON.parse(content));
    const topicSource = normalizeTopic(specificTargetContext || trackName || methodologyContext || "Kinerja Tim");
    const usedTitleKeys = new Set<string>();

    const inspirations = parsed.inspirations
      .slice(0, 5)
      .map((item, index) => ({
        id: `inspiration-${index + 1}`,
        trackName: item.trackName.trim(),
        trackDescription: item.trackDescription.trim(),
        trackIcon: item.trackIcon.trim() || "Sparkles",
        angle: item.angle.trim() || "Posisi nilai utama",
      }))
      .filter((item) => item.trackName.length > 0 && item.trackDescription.length > 0)
      .map((item, index) => {
        const draftName = trackName || "";
        const titleNeedsFallback = isWeakTitle(item.trackName, draftName) || usedTitleKeys.has(normalizeKey(item.trackName));
        const finalTitle = titleNeedsFallback ? pickFallbackTitle(topicSource, index) : item.trackName.slice(0, 70);
        const finalTitleKey = normalizeKey(finalTitle);

        const uniqueTitle = usedTitleKeys.has(finalTitleKey)
          ? pickFallbackTitle(topicSource, index + 7)
          : finalTitle;

        usedTitleKeys.add(normalizeKey(uniqueTitle));

        const finalDescription = isWeakDescription(item.trackDescription)
          ? pickFallbackDescription(topicSource, index)
          : item.trackDescription;

        return {
          ...item,
          trackName: uniqueTitle,
          trackDescription: finalDescription,
        };
      });

    while (inspirations.length < 5) {
      const index = inspirations.length;
      inspirations.push({
        id: `inspiration-${index + 1}`,
        trackName: pickFallbackTitle(topicSource, index + 11),
        trackDescription: pickFallbackDescription(topicSource, index + 11),
        trackIcon: "Sparkles",
        angle: "value-first",
      });
    }

    if (inspirations.length < 3) {
      throw new Error("Inspirasi yang dihasilkan tidak memenuhi jumlah minimum.");
    }

    return {
      success: true,
      inspirations,
      model: "deepseek-v4-flash",
    };
  } catch (error: any) {
    console.error("generateTemplateIdentityInspirations error:", error);
    throw new HttpsError("internal", error?.message || "Gagal menghasilkan inspirasi template.");
  }
});
