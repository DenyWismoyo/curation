/**
 * ROUTES REGISTRY — Single Source of Truth untuk semua path di aplikasi.
 *
 * Manfaat:
 * - Tidak ada lagi magic string '/assessment/select' di mana-mana
 * - Refactor URL cukup di satu tempat, tidak perlu cari-replace di 50 file
 * - IDE autocomplete otomatis untuk semua route
 */

// ──────────────────────────────────────────
// PUBLIC / AUTH
// ──────────────────────────────────────────
export const ROUTES = {
  // Landing & Auth
  HOME: '/',
  LOGIN: '/login',
  VERIFY_EMAIL: '/verify-email',
  LEGAL: {
    TOS: '/legal/tos',
    PRIVACY: '/legal/privacy',
    CRYPTO_RISK: '/legal/crypto-risk',
  },

  // ── USER AREA (Assessment Module)
  ASSESSMENT: {
    ROOT: '/assessment',
    SELECT: '/assessment/select',
    TRACK: (trackId: string) => `/assessment/${trackId}`,
    RESULT: (id: string) => `/result/${id}`,
    CONSULTATION: (id: string) => `/result/${id}/consultation`,
  },
  DASHBOARD: '/dashboard',
  EXPLORE: '/explore',
  EXPLORE_ITEM: (id: string) => `/explore/${id}`,
  KATALOG: '/katalog',
  PROFIL: '/profil',
  PROGRESS: '/progress',
  RIWAYAT: '/riwayat',
  TOKEN: '/token',
  WORKSPACE: '/workspace',
  ONBOARDING: '/onboarding',
  KOMUNITAS: '/komunitas',
  ROADMAP: '/roadmap',
  FITUR: '/fitur',
  AFFILIATE: '/affiliate',
  AFFILIATE_PROGRAM: '/affiliate/program',
  CHECKOUT: (id: string) => `/checkout/${id}`,

  // ── ASSESSMENT ROLE PORTALS
  ASSESSOR: '/assessor',
  CURATOR: {
    ROOT: '/curator',
    DASHBOARD: '/curator/dashboard',
    ASSESSMENT: (id: string) => `/curator/assessment/${id}`,
  },

  // ── B2B PORTAL
  B2B: {
    ROOT: '/b2b',
    LOGIN: '/b2b/login',
    HR: '/b2b/hr',
    LEADER: '/b2b/leader',
    EXECUTIVE: '/b2b/executive',
  },

  // ── MITRA PORTAL
  MITRA: {
    ROOT: '/mitra',
    SLUG: (slug: string) => `/mitra/${slug}`,
  },

  // ── CRYPTO MODULE
  CRYPTO: {
    ROOT: '/crypto',
    ACADEMY: '/crypto-academy',
    ACADEMY_MODULE: (level: string, module: string) => `/crypto-academy/${level}/${module}`,
    REPORT: {
      ROOT: '/crypto-report',
      SYMBOL: (symbol: string) => `/crypto-report/${symbol}`,
      DANGER_ZONE: '/crypto-report/danger-zone',
      HIDDEN_GEMS: '/crypto-report/hidden-gems',
      LIQUIDITY: '/crypto-report/liquidity',
      NEWS: '/crypto-report/news',
      PERFORMANCE: '/crypto-report/performance',
      REALTIME_RADAR: '/crypto-report/realtime-radar',
      SCALPING_RADAR: '/crypto-report/scalping-radar',
      SMART_MONEY: '/crypto-report/smart-money',
    },
  },

  // ── STUDY MODULE
  STUDY: {
    ROOT: '/study',
    PROJECT: (projectId: string) => `/study/${projectId}`,
  },

  // ── ADMIN
  ADMIN: {
    ROOT: '/admin',
    ASSESSMENT: (id: string) => `/admin/assessment/${id}`,
    ASSESSORS: '/admin/assessors',
    TEMPLATES: '/admin/templates',
    TOKENS: '/admin/tokens',
    B2B_ACCESS: '/admin/b2b-access',
    B2B_ANALYTICS: '/admin/b2b-analytics',
    B2B_PILOT: '/admin/b2b-pilot',
    B2B_TOKENS: '/admin/b2b-tokens',
    AFFILIATE_PROGRAM: '/admin/affiliate-program',
    ARTICLES: '/admin/articles',
    PRICING: '/admin/pricing',
    REFERRALS: '/admin/referrals',
    PARTNERS: '/admin/partners',
    ROADMAP: '/admin/roadmap',
    FEEDBACK: '/admin/feedback',
    ONBOARDING_METRICS: '/admin/onboarding-metrics',
    CRYPTO_ACADEMY: '/admin/crypto-academy',
    CRYPTO_ACADEMY_MODULE: (moduleId: string) => `/admin/crypto-academy/${moduleId}`,
  },
} as const;
