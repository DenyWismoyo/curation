import type { LucideIcon } from 'lucide-react';
import {
  Home, Compass, TrendingUp, Users, User, LibraryBig,
  FolderKanban, KeyRound, MapPinned, HandCoins, Handshake,
  LayoutDashboard, ClipboardCheck, BookOpenText, LineChart,
  ShieldCheck, Settings, Layers, Sparkles,
} from 'lucide-react';
import { ROUTES } from './routes';

// ── Tipe Role yang ada di AuthContext
export type AppRole =
  | 'user'
  | 'admin_omnifit'
  | 'admin_csrs'
  | 'assessor'
  | 'curator'
  | 'study_author'
  | 'study_reviewer'
  | null;

// ── Tipe satu item navigasi
export interface NavItem {
  /** Key unik — dipakai sebagai React key, juga untuk feature flags */
  key: string;
  /** Label yang ditampilkan ke user */
  label: string;
  /** Path tujuan */
  href: string;
  /** Icon (Lucide component) */
  icon: LucideIcon;
  /**
   * Warna aksen untuk item ini.
   * Format: { text, bg, ring } — Tailwind class string.
   */
  accent?: {
    text: string;
    bg: string;
    ring: string;
  };
  /**
   * Jika diisi, menu hanya muncul untuk role yang terdaftar.
   * Undefined / empty array = tampil untuk semua (termasuk guest).
   */
  requiredRoles?: AppRole[];
  /**
   * Jika true, menu hanya muncul jika user sudah login.
   */
  requiresAuth?: boolean;
  /**
   * Jika true, menu hanya muncul jika user punya akses premium.
   */
  requiresPremium?: boolean;
  /**
   * Jika false, menu di-disable / disembunyikan tanpa bergantung pada auth.
   * Berguna untuk fitur WIP / coming-soon.
   * Default: true
   */
  enabled?: boolean;
  /** Label badge opsional, mis. "Baru", "Beta", "Premium" */
  badge?: string;
  /** Sub-menu (nested nav) */
  children?: Omit<NavItem, 'children'>[];
}

// ════════════════════════════════════════════════════════════
// NAVIGATION REGISTRY
// ════════════════════════════════════════════════════════════
/**
 * SATU TEMPAT untuk mendefinisikan semua menu navigasi.
 * BottomNav, PublicNavbar, Sidebar — semuanya membaca dari sini.
 *
 * Cara menambah menu baru:
 * 1. Tambahkan route di `routes.ts`
 * 2. Tambahkan entry baru di `NAV_REGISTRY` (atau grup yang sesuai)
 * 3. Komponen navbar akan langsung merender-nya secara otomatis
 */

// ── 1. BOTTOM NAV (mobile — max 5 item)
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    key: 'home',
    label: 'Beranda',
    href: ROUTES.HOME,
    icon: Home,
  },
  {
    key: 'explore',
    label: 'Explore',
    href: ROUTES.EXPLORE,
    icon: Compass,
  },
  {
    key: 'progress',
    label: 'Progress',
    href: ROUTES.PROGRESS,
    icon: TrendingUp,
    requiresAuth: true,
  },
  {
    key: 'komunitas',
    label: 'Komunitas',
    href: ROUTES.KOMUNITAS,
    icon: Users,
  },
  {
    key: 'profil',
    label: 'Profil',
    href: ROUTES.PROFIL,
    icon: User,
    requiresAuth: true,
  },
];

// ── 2. DRAWER / HAMBURGER ITEMS (mobile extended menu)
export const DRAWER_NAV_ITEMS: NavItem[] = [
  {
    key: 'katalog',
    label: 'Katalog Modul',
    href: ROUTES.KATALOG,
    icon: LibraryBig,
    accent: { text: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
  },
  {
    key: 'mitra',
    label: 'Ekosistem Mitra',
    href: ROUTES.MITRA.ROOT,
    icon: Handshake,
    accent: { text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
  },
  {
    key: 'dashboard',
    label: 'Brankas Modul',
    href: ROUTES.DASHBOARD,
    icon: FolderKanban,
    accent: { text: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' },
    requiresAuth: true,
  },
  {
    key: 'token',
    label: 'Gunakan Token',
    href: ROUTES.TOKEN,
    icon: KeyRound,
    accent: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    requiresAuth: true,
  },
  {
    key: 'roadmap',
    label: 'Roadmap AI',
    href: ROUTES.ROADMAP,
    icon: MapPinned,
    accent: { text: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-100' },
  },
  {
    key: 'affiliate',
    label: 'Portal Affiliate',
    href: ROUTES.AFFILIATE,
    icon: HandCoins,
    accent: { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    requiresAuth: true,
  },
  // ── Role-specific
  {
    key: 'admin',
    label: 'Dasbor Admin',
    href: ROUTES.ADMIN.ROOT,
    icon: LayoutDashboard,
    accent: { text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-100' },
    requiredRoles: ['admin_omnifit', 'admin_csrs'],
  },
  {
    key: 'assessor',
    label: 'Ruang Asesor',
    href: ROUTES.ASSESSOR,
    icon: ClipboardCheck,
    accent: { text: 'text-teal-600', bg: 'bg-teal-50', ring: 'ring-teal-100' },
    requiredRoles: ['assessor'],
  },
  {
    key: 'curator',
    label: 'Dasbor Curator',
    href: ROUTES.CURATOR.ROOT,
    icon: Settings,
    accent: { text: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
    requiredRoles: ['curator'],
  },
  {
    key: 'study',
    label: 'Study Workspace',
    href: ROUTES.STUDY.ROOT,
    icon: BookOpenText,
    accent: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    requiredRoles: ['study_author', 'study_reviewer'],
  },
];

// ── 3. DESKTOP NAVBAR — group berdasarkan mega menu
export const NAVBAR_GROUPS = {
  direct: [] satisfies NavItem[],

  /** Mega Menu: "Asesmen & Produk" */
  assessmentMenu: [
    {
      key: 'fitur',
      label: 'Fitur Aplikasi',
      href: ROUTES.FITUR,
      icon: Layers,
      badge: 'Baru',
      accent: { text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-100' },
    },
    {
      key: 'katalog',
      label: 'Katalog Modul',
      href: ROUTES.KATALOG,
      icon: LibraryBig,
      badge: 'Koleksi',
      accent: { text: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
    },
    {
      key: 'explore',
      label: 'Explore Insight',
      href: ROUTES.EXPLORE,
      icon: Compass,
      accent: { text: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-100' },
    },
    {
      key: 'roadmap',
      label: 'Roadmap AI',
      href: ROUTES.ROADMAP,
      icon: MapPinned,
      badge: 'Futuristik',
      accent: { text: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' },
    },
  ] satisfies NavItem[],

  /** Mega Menu: "Ekosistem & Solusi" */
  ecosystemMenu: [
    {
      key: 'mitra',
      label: 'Ekosistem Mitra',
      href: ROUTES.MITRA.ROOT,
      icon: Handshake,
      accent: { text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
    },
    {
      key: 'affiliate',
      label: 'Portal Affiliate',
      href: ROUTES.AFFILIATE,
      icon: HandCoins,
      accent: { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    },
    {
      key: 'crypto',
      label: 'Crypto Intelligence',
      href: ROUTES.CRYPTO.ROOT,
      icon: LineChart,
      badge: 'Premium',
      accent: { text: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100' },
    },
    {
      key: 'study',
      label: 'Study Workspace',
      href: ROUTES.STUDY.ROOT,
      icon: BookOpenText,
      badge: 'Terbatas',
      accent: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    },
  ] satisfies NavItem[],

  /** Menu role-based (di dropdown user avatar) */
  rolePortals: [
    {
      key: 'admin',
      label: 'Dasbor Admin',
      href: ROUTES.ADMIN.ROOT,
      icon: ShieldCheck,
      requiredRoles: ['admin_omnifit', 'admin_csrs'] as AppRole[],
    },
    {
      key: 'assessor',
      label: 'Ruang Asesor',
      href: ROUTES.ASSESSOR,
      icon: ClipboardCheck,
      requiredRoles: ['assessor'] as AppRole[],
    },
    {
      key: 'curator',
      label: 'Dasbor Curator',
      href: ROUTES.CURATOR.ROOT,
      icon: Settings,
      requiredRoles: ['curator'] as AppRole[],
    },
  ] satisfies NavItem[],
};

// ════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ════════════════════════════════════════════════════════════

/**
 * Filter nav items berdasarkan role dan status auth.
 * Gunakan ini di dalam komponen Navbar/BottomNav.
 */
export function filterNavItems(
  items: NavItem[],
  options: {
    role: AppRole;
    isLoggedIn: boolean;
    isPremium?: boolean;
  }
): NavItem[] {
  const { role, isLoggedIn, isPremium = false } = options;

  return items.filter((item) => {
    // Cek feature flag
    if (item.enabled === false) return false;

    // Cek auth requirement
    if (item.requiresAuth && !isLoggedIn) return false;

    // Cek premium requirement
    if (item.requiresPremium && !isPremium) return false;

    // Cek role requirement
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      return item.requiredRoles.includes(role);
    }

    return true;
  });
}
