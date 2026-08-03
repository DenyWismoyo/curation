import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");
const getDb = () => getFirestore(admin.app(), "curation");

const DEFAULT_PREMIUM_CHAT_CREDITS = 120;

const personaSchema = z.object({
  version: z.string().default("v1"),
  personaCore: z.object({
    communicationStyle: z.string().default("Ramah, jelas, dan suportif"),
    decisionStyle: z.string().default("Pragmatis, bertahap, dan berbasis prioritas"),
    riskTolerance: z.string().default("Moderat dengan mitigasi bertahap"),
    learningPreference: z.string().default("Contoh konkret dan checklist"),
    motivationTrigger: z.string().default("Progress kecil yang terukur"),
  }).default({
    communicationStyle: "Ramah, jelas, dan suportif",
    decisionStyle: "Pragmatis, bertahap, dan berbasis prioritas",
    riskTolerance: "Moderat dengan mitigasi bertahap",
    learningPreference: "Contoh konkret dan checklist",
    motivationTrigger: "Progress kecil yang terukur",
  }),
  contextBoundaries: z.object({
    whatToPrioritize: z.array(z.string()).default([]),
    whatToAvoid: z.array(z.string()).default([]),
  }).default({ whatToPrioritize: [], whatToAvoid: [] }),
  userGoals: z.object({
    shortTerm: z.array(z.string()).default([]),
    midTerm: z.array(z.string()).default([]),
    longTerm: z.array(z.string()).default([]),
  }).default({ shortTerm: [], midTerm: [], longTerm: [] }),
  recommendedPromptHints: z.array(z.string()).default([]),
  safetyFlags: z.array(z.string()).default([]),
}).passthrough();

const estimateCreditCost = (totalTokens?: number) => {
  if (!totalTokens || totalTokens <= 0) return 1;
  return Math.max(1, Math.ceil(totalTokens / 1000));
};

const mapToneGuidance = (config: any) => {
  const map: Record<string, string> = {
    consultative: "Gunakan bahasa konsultatif premium: empatik, jelas, dan selalu tutup dengan langkah konkret.",
    investigative: "Gunakan bahasa investigatif: tegas, runtut, membongkar akar masalah tanpa bertele-tele.",
    academic: "Gunakan bahasa akademis: sistematis, bernalar, dengan struktur argumentasi rapi.",
  };
  return map[config?.reportTone || "consultative"] || map.consultative;
};

const mapAdaptiveToneGuidance = (config: any) => {
  const preset = config?.adaptiveLanguageStylePreset || "auto";
  const purpose = String(config?.formPurpose || "assessment").toLowerCase();
  const audience = String(config?.targetAudience || "company").toLowerCase();

  const autoPreset = purpose === "counseling"
    ? "friendly_counseling"
    : (audience === "individual" || audience === "student")
      ? "friendly_self_assessment"
      : "neutral_professional";

  const activePreset = preset === "auto" ? autoPreset : preset;
  const map: Record<string, string> = {
    friendly_counseling: "Bahasa empatik, lembut, aman, dan tidak menghakimi.",
    friendly_self_assessment: "Bahasa membumi, ringan, mudah dipahami pengguna awam.",
    warm_supportive: "Bahasa suportif yang memotivasi dan menjaga momentum progres.",
    neutral_professional: "Bahasa profesional yang ringan dan jelas.",
    direct_coach: "Bahasa tegas ala coach, ringkas, praktis, tetap sopan.",
  };

  const base = map[activePreset] || map.neutral_professional;
  const custom = config?.adaptiveResultTonePrompt;
  return custom && String(custom).trim().length > 0
    ? `${base} Instruksi tambahan: ${String(custom).trim()}`
    : base;
};

const buildPersonaPrompt = (assessmentData: any, internalData: any, config: any) => `
Anda adalah Persona Architect untuk AI Copilot premium.
Bangun profil persona pengguna dari data asesmen berikut dalam format JSON murni.

Nama subjek: ${assessmentData?.namaUsaha || "Pengguna"}
Skor: ${assessmentData?.score || assessmentData?.aiResult?.totalScore || 0}
Level: ${assessmentData?.readinessLevel || assessmentData?.aiResult?.readinessLevel || "N/A"}
Target audience: ${config?.targetAudience || "general"}
Form purpose: ${config?.formPurpose || "assessment"}
Tone instruction: ${mapToneGuidance(config)}
Adaptive tone instruction: ${mapAdaptiveToneGuidance(config)}
SWOT: ${JSON.stringify(assessmentData?.aiResult?.swotAnalysis || {})}
Risks: ${JSON.stringify(assessmentData?.aiResult?.riskAssessment || {})}
Action steps: ${JSON.stringify(assessmentData?.aiResult?.nextActionSteps || [])}
Internal reasoning: ${internalData?._internalReasoning || ""}
Contradictions: ${JSON.stringify(internalData?.contradictionsFound || [])}

Output wajib JSON dengan struktur:
{
  "version": "v1",
  "personaCore": {
    "communicationStyle": "...",
    "decisionStyle": "...",
    "riskTolerance": "...",
    "learningPreference": "...",
    "motivationTrigger": "..."
  },
  "contextBoundaries": {
    "whatToPrioritize": ["..."],
    "whatToAvoid": ["..."]
  },
  "userGoals": {
    "shortTerm": ["..."],
    "midTerm": ["..."],
    "longTerm": ["..."]
  },
  "recommendedPromptHints": ["..."],
  "safetyFlags": ["..."]
}
`;

const ensurePersonaProfile = async (
  openai: OpenAI,
  assessmentRef: FirebaseFirestore.DocumentReference,
  assessmentData: any,
  internalData: any,
  config: any
) => {
  const personaRef = assessmentRef.collection("premium").doc("persona");
  const personaSnap = await personaRef.get();

  if (personaSnap.exists) {
    return personaSchema.parse(personaSnap.data() || {});
  }

  const personaPrompt = buildPersonaPrompt(assessmentData, internalData, config);

  const response = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content: "Anda adalah arsitek persona premium. Keluarkan JSON valid saja tanpa markdown.",
      },
      { role: "user", content: personaPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.35,
  });

  let content = response.choices[0]?.message?.content || "{}";
  if (content.startsWith("```")) {
    content = content.replace(/^```(json)?/gi, "").replace(/```$/g, "").trim();
  }

  const parsed = personaSchema.parse(JSON.parse(content));
  await personaRef.set({
    ...parsed,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    model: "deepseek-v4-flash",
  }, { merge: true });

  return parsed;
};

const buildSystemPrompt = (assessmentData: any, internalData: any, config: any, persona: any) => `
Anda adalah Premium Copilot berbasis DeepSeek untuk sesi konsultasi berbayar.

[Persona Pengguna]
${JSON.stringify(persona, null, 2)}

[Konteks Assessment]
Subjek: ${assessmentData?.namaUsaha || "Pengguna"}
Skor: ${assessmentData?.score || assessmentData?.aiResult?.totalScore || 0}
Level: ${assessmentData?.readinessLevel || assessmentData?.aiResult?.readinessLevel || "N/A"}
SWOT: ${JSON.stringify(assessmentData?.aiResult?.swotAnalysis || {})}
Risiko: ${JSON.stringify(assessmentData?.aiResult?.riskAssessment || {})}
Action Plan Saat Ini: ${JSON.stringify(assessmentData?.aiResult?.nextActionSteps || [])}

[Data Internal]
Internal reasoning: ${internalData?._internalReasoning || "-"}
Anomali: ${JSON.stringify(internalData?.contradictionsFound || [])}

[Aturan Jawaban Premium]
1. Boleh menjawab topik universal di luar assessment, selama tetap dipersonalisasi ke persona pengguna.
2. Jika data eksternal real-time dibutuhkan, jangan halusinasi; jelaskan asumsi dan langkah riset praktis.
3. Jawaban wajib actionable, berstruktur, dan kreatif (nilai premium).
4. Gaya bahasa: ${mapToneGuidance(config)}
5. Gaya adaptif tambahan: ${mapAdaptiveToneGuidance(config)}
6. Jika relevan, berikan 3 opsi: konservatif, seimbang, agresif.
`;

export const premiumConsultationChat = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  secrets: [deepseekApiKeySecret],
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Harap login untuk mengakses fitur ini.");
  }

  const { assessmentId, message, history = [] } = request.data;
  if (!assessmentId || !message) {
    throw new HttpsError("invalid-argument", "assessmentId dan message wajib diisi.");
  }

  const db = getDb();
  const assessmentRef = db.collection("assessments").doc(assessmentId);
  
  // Ambil data publik asesmen
  const assessmentDoc = await assessmentRef.get();
  if (!assessmentDoc.exists) {
    throw new HttpsError("not-found", "Asesmen tidak ditemukan.");
  }
  
  const assessmentData = assessmentDoc.data() || {};
  
  // Validasi Kepemilikan & Status Pembayaran
  if (assessmentData.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Anda tidak memiliki akses ke asesmen ini.");
  }
  
  if (!assessmentData.hasPaidForPremiumConsultation) {
    throw new HttpsError("permission-denied", "Anda belum membeli akses Konsultasi Premium untuk asesmen ini.");
  }

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: deepseekApiKeySecret.value(),
  });

  // Ambil data internal / rahasia asesmen (jika ada)
  const internalDoc = await assessmentRef.collection("internal").doc("details").get();
  const internalData = internalDoc.exists ? internalDoc.data() : {};

  const config = assessmentData.aiPromptConfig || {};

  const persona = await ensurePersonaProfile(openai, assessmentRef, assessmentData, internalData, config);
  const systemPrompt = buildSystemPrompt(assessmentData, internalData, config, persona);

  const normalizedHistory = Array.isArray(history)
    ? history.slice(-12).map((msg: any) => {
        const role: "assistant" | "user" = msg?.role === "model" ? "assistant" : "user";
        const content = Array.isArray(msg?.parts)
          ? msg.parts.map((p: any) => p?.text || "").join("\n").trim()
          : (msg?.content || "");
        return { role, content };
      }).filter((msg: any) => msg.content && msg.content.length > 0)
    : [];

  try {
    const messagesPayload: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...normalizedHistory,
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: messagesPayload,
      temperature: 0.75,
    });

    const replyText = completion.choices[0]?.message?.content?.trim() || "Saya siap bantu. Coba spesifikkan target yang ingin dicapai.";
    const totalTokens = completion.usage?.total_tokens || 0;
    const creditCost = estimateCreditCost(totalTokens);

    let remainingCredits = 0;
    await db.runTransaction(async (trx) => {
      const fresh = await trx.get(assessmentRef);
      if (!fresh.exists) {
        throw new HttpsError("not-found", "Asesmen tidak ditemukan saat update kuota premium.");
      }

      const latest = fresh.data() || {};
      if (!latest.hasPaidForPremiumConsultation) {
        throw new HttpsError("permission-denied", "Akses premium belum aktif.");
      }

      const available = typeof latest.premiumChatCredits === "number"
        ? latest.premiumChatCredits
        : DEFAULT_PREMIUM_CHAT_CREDITS;

      if (available < creditCost) {
        throw new HttpsError("resource-exhausted", "Kuota chat premium Anda tidak cukup. Silakan top-up paket premium.");
      }

      remainingCredits = available - creditCost;
      trx.update(assessmentRef, {
        premiumChatCredits: remainingCredits,
        premiumChatUsedTokens: admin.firestore.FieldValue.increment(totalTokens),
        premiumChatLastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Simpan history ke Firestore (User & AI)
    const historyRef = assessmentRef.collection("consultation_history");
    const premiumChatsRef = assessmentRef.collection("premium").doc("chat-index").collection("chats");
    const batch = db.batch();
    
    const userMsgRef = historyRef.doc();
    batch.set(userMsgRef, {
      role: "user",
      parts: [{ text: message }],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const userPremiumRef = premiumChatsRef.doc();
    batch.set(userPremiumRef, {
      role: "user",
      content: message,
      model: "deepseek-v4-pro",
      creditCost: 0,
      tokenCost: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const aiMsgRef = historyRef.doc();
    batch.set(aiMsgRef, {
      role: "model",
      parts: [{ text: replyText }],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const aiPremiumRef = premiumChatsRef.doc();
    batch.set(aiPremiumRef, {
      role: "model",
      content: replyText,
      model: "deepseek-v4-pro",
      creditCost,
      tokenCost: totalTokens,
      personaVersion: persona.version || "v1",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      success: true,
      reply: replyText,
      remainingCredits,
      creditCost,
      persona
    };

  } catch (error: any) {
    console.error("Premium Consultation Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Gagal menghubungi layanan konsultasi premium.");
  }
});
