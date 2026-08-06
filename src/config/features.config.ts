/**
 * FEATURE FLAGS — Toggle fitur ON/OFF tanpa deploy ulang.
 *
 * Dua pendekatan yang didukung:
 * 1. STATIC FLAGS — hardcoded di sini, cocok untuk WIP / coming-soon
 * 2. REMOTE FLAGS — dibaca dari Firebase Remote Config (opsional, di masa depan)
 *
 * Cara menambah fitur baru:
 * 1. Tambahkan key baru di FEATURE_FLAGS dengan nilai default
 * 2. Wrap komponen/menu dengan: if (!FEATURE_FLAGS.namaFitur) return null
 * 3. Saat fitur siap, ubah nilai ke true — langsung aktif tanpa menyentuh komponen
 */

// ── Tipe flag
export type FeatureFlagKey =
  // ─ Assessment Module
  | 'assessmentPublicAccess'      // Assessment bisa diakses tanpa login
  | 'assessmentPremiumTracks'     // Track premium di assessment
  | 'assessmentVoiceInput'        // Voice input di wizard
  | 'premiumConsultation'         // Fitur konsultasi premium
  | 'actionPlanBuilder'           // Action Plan Builder
  // ─ Crypto Module
  | 'cryptoModule'                // Seluruh modul crypto
  | 'cryptoAcademy'               // Crypto Academy
  | 'cryptoHiddenGems'            // Hidden Gems scanner
  | 'cryptoRealtimeRadar'         // Real-time radar
  | 'cryptoScalpingRadar'         // Scalping radar
  | 'cryptoSmartMoney'            // Smart money tracking
  | 'cryptoCopilot'               // AI Copilot chat
  // ─ Study Module
  | 'studyModule'                 // Seluruh modul study
  | 'studyVectorSearch'           // Vector/RAG search di study
  // ─ B2B Module
  | 'b2bModule'                   // Seluruh B2B portal
  | 'b2bPilotProgram'             // Program pilot B2B
  // ─ Community
  | 'komunitasModule'             // Komunitas / forum
  // ─ Payment
  | 'xenditPayment'               // Integrasi Xendit
  | 'cryptoSubscription'          // Langganan khusus crypto
  // ─ Affiliate
  | 'affiliateProgram'            // Program affiliate
  // ─ Tools / Misc
  | 'storyboardTool'              // Storyboard (internal)
  | 'omniAiWidget'                // Widget OmniAI mengambang
  | 'pwaInstallPrompt'            // Prompt install PWA
  | 'pushNotifications';          // Firebase Push Notif

// ── Static feature flags
// Ubah nilai di sini untuk mengaktifkan/menonaktifkan fitur
export const FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  // Assessment
  assessmentPublicAccess: true,
  assessmentPremiumTracks: true,
  assessmentVoiceInput: true,
  premiumConsultation: true,
  actionPlanBuilder: true,

  // Crypto
  cryptoModule: true,
  cryptoAcademy: true,
  cryptoHiddenGems: true,
  cryptoRealtimeRadar: true,
  cryptoScalpingRadar: true,
  cryptoSmartMoney: true,
  cryptoCopilot: true,

  // Study
  studyModule: true,
  studyVectorSearch: true,

  // B2B
  b2bModule: true,
  b2bPilotProgram: true,

  // Community
  komunitasModule: true, // Set false jika belum siap

  // Payment
  xenditPayment: true,
  cryptoSubscription: true,

  // Affiliate
  affiliateProgram: true,

  // Tools
  storyboardTool: false, // Internal tool, disable di production
  omniAiWidget: true,
  pwaInstallPrompt: true,
  pushNotifications: true,
};

/**
 * Helper untuk cek flag secara aman.
 * @example
 * if (isFeatureEnabled('cryptoAcademy')) { ... }
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] === true;
}

/**
 * Hook-friendly helper yang mengembalikan object langsung.
 * Berguna di komponen React untuk conditional rendering.
 * @example
 * const flags = getActiveFlags(['cryptoModule', 'studyModule']);
 * if (flags.cryptoModule) { ... }
 */
export function getActiveFlags<T extends FeatureFlagKey>(
  keys: T[]
): Record<T, boolean> {
  return keys.reduce(
    (acc, key) => ({ ...acc, [key]: FEATURE_FLAGS[key] }),
    {} as Record<T, boolean>
  );
}
