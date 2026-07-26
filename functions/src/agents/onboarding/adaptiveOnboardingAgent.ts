import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

type CatalogModule = {
  id: string;
  trackName: string;
  trackDescription?: string;
  category?: string;
  price?: number;
  isPaid?: boolean;
};

type AdaptiveStep = {
  title: string;
  whyNow: string;
  action: string;
};

type AdaptiveRecommendation = {
  moduleId: string;
  moduleName: string;
  reason: string;
  estimatedImpact: string;
};

type ResolvedUserRole = "user" | "admin_omnifit" | "admin_csrs" | "assessor";

const ALLOWED_ROLES: ResolvedUserRole[] = ["user", "admin_omnifit", "admin_csrs", "assessor"];

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_CALLS = 6;

const resolveUserRole = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
  email: string,
): Promise<ResolvedUserRole | null> => {
  const refs = [db.collection("users").doc(uid)];
  if (email) refs.push(db.collection("users").doc(email));

  const snaps = await Promise.all(refs.map((ref) => ref.get().catch(() => null)));
  for (const snap of snaps) {
    const role = String(snap?.data()?.role || "").trim() as ResolvedUserRole;
    if (ALLOWED_ROLES.includes(role)) return role;
  }

  return null;
};

const enforceRateLimit = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<{ count: number; remaining: number }> => {
  const now = Date.now();
  const rateRef = db.collection("security_rate_limits").doc(`onboarding_${uid}`);

  const result = await db.runTransaction(async (trx) => {
    const snap = await trx.get(rateRef);
    const raw = snap.data() || {};
    const windowStartMs = Number(raw.windowStartMs || 0);
    const currentCount = Number(raw.count || 0);
    const windowActive = windowStartMs > 0 && now - windowStartMs <= RATE_LIMIT_WINDOW_MS;
    const nextCount = windowActive ? currentCount + 1 : 1;
    const nextWindowStart = windowActive ? windowStartMs : now;

    if (windowActive && currentCount >= RATE_LIMIT_MAX_CALLS) {
      throw new HttpsError(
        "resource-exhausted",
        "Terlalu banyak permintaan onboarding adaptif. Coba lagi beberapa menit lagi.",
      );
    }

    trx.set(rateRef, {
      endpoint: "generateAdaptiveOnboardingPlan",
      uid,
      count: nextCount,
      windowStartMs: nextWindowStart,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      count: nextCount,
      remaining: Math.max(0, RATE_LIMIT_MAX_CALLS - nextCount),
    };
  });

  return result;
};

const writeQualityLog = async (
  db: FirebaseFirestore.Firestore,
  payload: {
    uid: string;
    role: ResolvedUserRole;
    purpose: string;
    sector: string;
    source: string;
    stepCount: number;
    recommendationCount: number;
    latencyMs: number;
    fallback: boolean;
    warning?: string;
  },
) => {
  try {
    const sourceField = payload.source.replace(/[^a-zA-Z0-9_]/g, "_") || "unknown";
    const today = new Date().toISOString().slice(0, 10);
    const metricsRef = db.collection("onboarding_agent_metrics").doc(`daily_${today}`);
    const logRef = db.collection("onboarding_agent_logs").doc();

    const batch = db.batch();
    batch.set(metricsRef, {
      totalCalls: admin.firestore.FieldValue.increment(1),
      fallbackCalls: admin.firestore.FieldValue.increment(payload.fallback ? 1 : 0),
      [`sources.${sourceField}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    batch.set(logRef, {
      uid: payload.uid,
      role: payload.role,
      purpose: payload.purpose,
      sector: payload.sector,
      source: payload.source,
      stepCount: payload.stepCount,
      recommendationCount: payload.recommendationCount,
      latencyMs: payload.latencyMs,
      fallback: payload.fallback,
      warning: payload.warning || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    console.warn("[adaptiveOnboarding] Logging quality non-fatal error:", error);
  }
};

const FALLBACK_STEPS: Record<string, AdaptiveStep[]> = {
  B2B: [
    { title: "Tegaskan Target Value", whyNow: "Tim perlu satu narasi nilai yang konsisten.", action: "Tuliskan 3 masalah utama klien enterprise yang ingin diselesaikan." },
    { title: "Audit Funnel Penjualan", whyNow: "Kebocoran pipeline biasanya terjadi di tahap awal dan proposal.", action: "Catat konversi tiap tahap funnel selama 30 hari terakhir." },
    { title: "Validasi Proses Delivery", whyNow: "Skala B2B gagal jika delivery belum repeatable.", action: "Dokumentasikan SOP delivery inti maksimum 1 halaman per proses." },
    { title: "Sinkronkan KPI Tim", whyNow: "Pertumbuhan cepat butuh KPI lintas fungsi yang selaras.", action: "Pilih 5 KPI utama yang ditinjau mingguan oleh tim eksekusi." },
    { title: "Rancang Agenda 90 Hari", whyNow: "Prioritas harus konkret agar tim bergerak.", action: "Pecah 3 sasaran utama ke milestone mingguan selama 90 hari." },
  ],
  Personal: [
    { title: "Tetapkan Fokus Kompetensi", whyNow: "Pengembangan diri efektif dimulai dari fokus yang jelas.", action: "Pilih 1 kompetensi inti dan 2 kompetensi pendukung yang ingin ditingkatkan." },
    { title: "Petakan Gap Saat Ini", whyNow: "Anda perlu tahu titik awal untuk mengukur progres.", action: "Nilai kemampuan saat ini dari 1-10 pada area inti yang dipilih." },
    { title: "Bangun Rutinitas Belajar", whyNow: "Konsistensi lebih penting dari intensitas sesaat.", action: "Jadwalkan sesi belajar 30-45 menit minimal 4 kali seminggu." },
    { title: "Terapkan Uji Praktik", whyNow: "Kompetensi tumbuh saat langsung dipakai.", action: "Buat 1 proyek kecil untuk menguji kemampuan baru dalam 14 hari." },
    { title: "Evaluasi Berkala", whyNow: "Refleksi membuat peningkatan lebih terarah.", action: "Buat review mingguan: apa yang berhasil, hambatan, dan langkah berikutnya." },
  ],
  Startup: [
    { title: "Validasi Problem", whyNow: "Pertumbuhan tidak sehat jika problem belum jelas.", action: "Lakukan 10 wawancara pelanggan untuk memvalidasi problem utama." },
    { title: "Tegaskan Positioning", whyNow: "Positioning menentukan kualitas akuisisi pengguna awal.", action: "Buat 1 kalimat positioning yang spesifik untuk segmen target." },
    { title: "Fokus pada Traction Metric", whyNow: "Tim butuh satu metrik utama untuk sinkronisasi.", action: "Pilih north star metric dan baseline saat ini." },
    { title: "Optimalkan Eksperimen", whyNow: "Eksperimen cepat meminimalkan biaya salah arah.", action: "Rancang 3 eksperimen mingguan dengan hipotesis terukur." },
    { title: "Siapkan Sistem Eksekusi", whyNow: "Scale butuh ritme kerja dan prioritas jelas.", action: "Buat sprint board 2 mingguan dengan owner dan target hasil." },
  ],
  Komunitas: [
    { title: "Definisikan Dampak Utama", whyNow: "Komunitas efektif saat dampaknya terukur.", action: "Tentukan 3 indikator dampak yang ingin dicapai semester ini." },
    { title: "Segmentasi Anggota", whyNow: "Program tepat sasaran butuh pemahaman profil anggota.", action: "Kelompokkan anggota berdasarkan kebutuhan dan tahap kontribusi." },
    { title: "Perkuat Program Inti", whyNow: "Fokus pada program bernilai tinggi meningkatkan retensi.", action: "Pilih 2 program inti dan ukur partisipasi aktif per bulan." },
    { title: "Bangun Kolaborasi Mitra", whyNow: "Dampak tumbuh lebih cepat lewat kolaborasi.", action: "Daftarkan 5 calon mitra dan rancang proposal kolaborasi singkat." },
    { title: "Review Kinerja Komunitas", whyNow: "Evaluasi berkala menjaga arah dan kualitas eksekusi.", action: "Lakukan review bulanan berbasis data partisipasi dan outcome." },
  ],
  Pemerintah: [
    { title: "Peta Prioritas Layanan", whyNow: "Layanan publik perlu fokus pada dampak tertinggi.", action: "Pilih 3 area layanan dengan urgensi tertinggi untuk triwulan ini." },
    { title: "Audit Proses Internal", whyNow: "Bottleneck internal menurunkan kualitas pelayanan.", action: "Identifikasi 5 hambatan utama pada alur kerja layanan." },
    { title: "Standarisasi SOP", whyNow: "Standar yang konsisten mempercepat pelayanan.", action: "Susun SOP ringkas untuk proses layanan prioritas." },
    { title: "Penguatan Monitoring", whyNow: "Transparansi kinerja membantu akuntabilitas.", action: "Tentukan indikator monitoring mingguan untuk unit pelaksana." },
    { title: "Rencana Perbaikan Bertahap", whyNow: "Perubahan bertahap lebih realistis dan terukur.", action: "Rancang roadmap 90 hari dengan milestone dan PIC per area." },
  ],
};

const normalizeModules = (raw: any[]): CatalogModule[] => {
  return raw.map((item) => ({
    id: String(item.id || "").trim(),
    trackName: String(item.trackName || "").trim(),
    trackDescription: String(item.trackDescription || "").trim(),
    category: String(item.category || "").trim(),
    price: Number(item.price || 0),
    isPaid: Boolean(item.isPaid),
  })).filter((m) => m.id && m.trackName);
};

const createFallbackRecommendations = (purpose: string, modules: CatalogModule[]): AdaptiveRecommendation[] => {
  const keyword = purpose.toLowerCase();

  const scored = modules
    .map((m) => {
      const text = `${m.trackName} ${m.trackDescription || ""} ${m.category || ""}`.toLowerCase();
      let score = 0;
      if (text.includes(keyword)) score += 3;
      if (keyword === "startup" && /startup|inovasi|mvp|traction/.test(text)) score += 4;
      if (keyword === "b2b" && /b2b|enterprise|bisnis/.test(text)) score += 4;
      if (keyword === "personal" && /personal|diri|karier|talent/.test(text)) score += 4;
      if (keyword === "komunitas" && /komunitas|organisasi|sosial/.test(text)) score += 4;
      if (keyword === "pemerintah" && /pemerintah|layanan|governance|kebijakan/.test(text)) score += 4;
      return { module: m, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return scored.map((row) => ({
    moduleId: row.module.id,
    moduleName: row.module.trackName,
    reason: "Modul ini relevan dengan prioritas profil onboarding Anda.",
    estimatedImpact: "Membantu mempercepat validasi kebutuhan dan prioritas tindakan.",
  }));
};

export const generateAdaptiveOnboardingPlan = onCall({
  memory: "512MiB",
  timeoutSeconds: 120,
  region: "asia-southeast2",
  secrets: [geminiApiKeySecret],
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak.");
  }

  const startedAt = Date.now();

  const purpose = String(request.data?.purpose || "").trim();
  const sector = String(request.data?.sector || "").trim();

  if (!purpose || !sector) {
    throw new HttpsError("invalid-argument", "purpose dan sector wajib diisi.");
  }

  const db = getFirestore(admin.app(), "curation");
  const uid = request.auth.uid;
  const email = String(request.auth.token.email || "").trim();

  const resolvedRole = await resolveUserRole(db, uid, email);
  if (!resolvedRole) {
    throw new HttpsError("permission-denied", "Role akun belum valid untuk menjalankan onboarding adaptif.");
  }

  const rate = await enforceRateLimit(db, uid);
  console.info("[adaptiveOnboarding] request accepted", {
    uid,
    role: resolvedRole,
    purpose,
    sector,
    rateCount: rate.count,
    rateRemaining: rate.remaining,
  });

  const modulesSnap = await db
    .collection("form_templates")
    .where("isActive", "==", true)
    .where("isDisplayedOnLanding", "==", true)
    .limit(120)
    .get();

  const modules = normalizeModules(modulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

  const fallbackSteps = FALLBACK_STEPS[purpose] || FALLBACK_STEPS.Personal;
  const fallbackRecommendations = createFallbackRecommendations(purpose, modules);

  if (modules.length === 0) {
    await writeQualityLog(db, {
      uid,
      role: resolvedRole,
      purpose,
      sector,
      source: "fallback_no_modules",
      stepCount: fallbackSteps.length,
      recommendationCount: 0,
      latencyMs: Date.now() - startedAt,
      fallback: true,
    });

    console.info("[adaptiveOnboarding] completed", {
      uid,
      source: "fallback_no_modules",
      stepCount: fallbackSteps.length,
      recommendationCount: 0,
      latencyMs: Date.now() - startedAt,
    });

    return {
      success: true,
      summary: "Belum ada modul katalog aktif. Gunakan langkah prioritas ini sebagai panduan awal.",
      steps: fallbackSteps,
      recommendedModules: [],
      source: "fallback_no_modules",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKeySecret.value());
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: "Anda adalah Strategic Onboarding Agent. Pilih 5 langkah paling relevan dan rekomendasikan modul katalog secara presisi.",
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          required: ["summary", "steps", "recommendedModules"],
          properties: {
            summary: { type: SchemaType.STRING },
            steps: {
              type: SchemaType.ARRAY,
              minItems: 5,
              maxItems: 5,
              items: {
                type: SchemaType.OBJECT,
                required: ["title", "whyNow", "action"],
                properties: {
                  title: { type: SchemaType.STRING },
                  whyNow: { type: SchemaType.STRING },
                  action: { type: SchemaType.STRING },
                },
              },
            },
            recommendedModules: {
              type: SchemaType.ARRAY,
              minItems: 1,
              maxItems: 4,
              items: {
                type: SchemaType.OBJECT,
                required: ["moduleId", "moduleName", "reason", "estimatedImpact"],
                properties: {
                  moduleId: { type: SchemaType.STRING },
                  moduleName: { type: SchemaType.STRING },
                  reason: { type: SchemaType.STRING },
                  estimatedImpact: { type: SchemaType.STRING },
                },
              },
            },
          },
        },
      },
    });

    const prompt = [
      "PROFIL ONBOARDING",
      `- Purpose: ${purpose}`,
      `- Sector: ${sector}`,
      "",
      "DAFTAR MODUL KATALOG (gunakan moduleId yang valid)",
      JSON.stringify(modules.slice(0, 80)),
      "",
      "ATURAN",
      "1) Kembalikan tepat 5 langkah prioritas (steps).",
      "2) Prioritaskan langkah yang actionable dalam 30-90 hari.",
      "3) Rekomendasikan 1-4 modul katalog paling relevan.",
      "4) Dilarang mengarang moduleId di luar daftar.",
      "5) Semua output dalam Bahasa Indonesia yang ringkas dan jelas.",
    ].join("\n");

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(json)?/gi, "").replace(/```$/g, "").trim();
    }

    const parsed = JSON.parse(raw);
    const steps = Array.isArray(parsed?.steps) ? parsed.steps.slice(0, 5) : fallbackSteps;

    const moduleMap = new Map(modules.map((m) => [m.id, m]));
    const recommendedModulesRaw = Array.isArray(parsed?.recommendedModules) ? parsed.recommendedModules : [];
    const recommendedModules = recommendedModulesRaw
      .filter((item: any) => moduleMap.has(String(item?.moduleId || "")))
      .slice(0, 4)
      .map((item: any) => ({
        moduleId: String(item.moduleId || ""),
        moduleName: String(item.moduleName || moduleMap.get(String(item.moduleId || ""))?.trackName || "").trim(),
        reason: String(item.reason || "").trim().slice(0, 240),
        estimatedImpact: String(item.estimatedImpact || "").trim().slice(0, 200),
      }));

    const safeSteps = steps.length === 5 ? steps : fallbackSteps;
    const safeModules = recommendedModules.length > 0 ? recommendedModules : fallbackRecommendations;
    const source = "gemini_3_1_flash_lite";

    await writeQualityLog(db, {
      uid,
      role: resolvedRole,
      purpose,
      sector,
      source,
      stepCount: safeSteps.length,
      recommendationCount: safeModules.length,
      latencyMs: Date.now() - startedAt,
      fallback: safeModules === fallbackRecommendations || safeSteps === fallbackSteps,
    });

    console.info("[adaptiveOnboarding] completed", {
      uid,
      source,
      stepCount: safeSteps.length,
      recommendationCount: safeModules.length,
      latencyMs: Date.now() - startedAt,
    });

    return {
      success: true,
      summary: String(parsed?.summary || "Rencana prioritas onboarding Anda telah disusun.").trim().slice(0, 320),
      steps: safeSteps,
      recommendedModules: safeModules,
      source,
    };
  } catch (error: any) {
    const source = "fallback_error";
    const warning = error?.message || "Adaptive agent fallback aktif.";

    await writeQualityLog(db, {
      uid,
      role: resolvedRole,
      purpose,
      sector,
      source,
      stepCount: fallbackSteps.length,
      recommendationCount: fallbackRecommendations.length,
      latencyMs: Date.now() - startedAt,
      fallback: true,
      warning,
    });

    console.warn("[adaptiveOnboarding] fallback", {
      uid,
      source,
      warning,
      latencyMs: Date.now() - startedAt,
    });

    return {
      success: true,
      summary: "Rencana adaptif sementara disusun dari rule-based fallback.",
      steps: fallbackSteps,
      recommendedModules: fallbackRecommendations,
      source,
      warning,
    };
  }
});
