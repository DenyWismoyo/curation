/**
 * PERMISSIONS CONFIG — RBAC (Role-Based Access Control)
 *
 * Mendefinisikan aturan akses untuk setiap route secara terpusat.
 * Middleware Next.js atau komponen guard dapat membaca config ini
 * untuk memutuskan apakah user boleh mengakses halaman tertentu.
 *
 * Cara pakai:
 * - Tambahkan route baru di sini dengan role yang diizinkan
 * - ProtectedRoute / middleware akan otomatis menerapkannya
 */
import type { AppRole } from './navigation.config';

export interface RoutePermission {
  /** Prefix path yang diproteksi */
  path: string;
  /**
   * Daftar role yang BOLEH mengakses.
   * Kosong / undefined = semua yang sudah login.
   */
  allowedRoles?: AppRole[];
  /** Jika true, hanya butuh login (tanpa cek role). Default: true */
  requiresAuth: boolean;
  /** Jika true, membutuhkan akses premium */
  requiresPremium?: boolean;
  /** Redirect tujuan jika akses ditolak */
  redirectTo?: string;
}

/**
 * Daftar route yang diproteksi.
 * Diurutkan dari paling spesifik ke paling umum.
 * Middleware akan mencari kecocokan pertama (first-match).
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // ── Admin Area
  {
    path: '/admin',
    requiresAuth: true,
    allowedRoles: ['admin_omnifit', 'admin_csrs'],
    redirectTo: '/dashboard',
  },

  // ── Assessor Portal
  {
    path: '/assessor',
    requiresAuth: true,
    allowedRoles: ['assessor', 'admin_omnifit', 'admin_csrs'],
    redirectTo: '/dashboard',
  },

  // ── Curator Portal
  {
    path: '/curator',
    requiresAuth: true,
    allowedRoles: ['curator', 'admin_omnifit', 'admin_csrs'],
    redirectTo: '/dashboard',
  },

  // ── Study Workspace (restricted)
  {
    path: '/study',
    requiresAuth: true,
    allowedRoles: ['study_author', 'study_reviewer', 'admin_omnifit', 'admin_csrs'],
    redirectTo: '/dashboard',
  },

  // ── Crypto (premium or trial)
  {
    path: '/crypto',
    requiresAuth: true,
    requiresPremium: true,
    redirectTo: '/',
  },
  {
    path: '/crypto-report',
    requiresAuth: true,
    requiresPremium: true,
    redirectTo: '/',
  },

  // ── User area (login required, no role restriction)
  { path: '/dashboard', requiresAuth: true, redirectTo: '/login' },
  { path: '/profil', requiresAuth: true, redirectTo: '/login' },
  { path: '/progress', requiresAuth: true, redirectTo: '/login' },
  { path: '/riwayat', requiresAuth: true, redirectTo: '/login' },
  { path: '/workspace', requiresAuth: true, redirectTo: '/login' },
  { path: '/onboarding', requiresAuth: true, redirectTo: '/login' },
  { path: '/checkout', requiresAuth: true, redirectTo: '/login' },
  { path: '/affiliate', requiresAuth: true, redirectTo: '/login' },
  { path: '/token', requiresAuth: true, redirectTo: '/login' },

  // ── Assessment (login dianjurkan tapi tidak wajib untuk halaman awal)
  { path: '/assessment', requiresAuth: false },
];

/**
 * Cek apakah user memiliki akses ke suatu path.
 * @returns { allowed: boolean; redirectTo?: string }
 */
export function checkRouteAccess(
  path: string,
  options: { role: AppRole; isLoggedIn: boolean; isPremium: boolean }
): { allowed: boolean; redirectTo?: string } {
  const { role, isLoggedIn, isPremium } = options;

  // Cari rule yang cocok (first-match)
  const rule = ROUTE_PERMISSIONS.find((r) => path.startsWith(r.path));

  if (!rule) return { allowed: true }; // Tidak ada rule = public

  // Cek auth
  if (rule.requiresAuth && !isLoggedIn) {
    return { allowed: false, redirectTo: rule.redirectTo ?? '/login' };
  }

  // Cek premium
  if (rule.requiresPremium && !isPremium) {
    return { allowed: false, redirectTo: rule.redirectTo ?? '/' };
  }

  // Cek role
  if (rule.allowedRoles && rule.allowedRoles.length > 0) {
    const hasRole = rule.allowedRoles.includes(role);
    if (!hasRole) {
      return { allowed: false, redirectTo: rule.redirectTo ?? '/dashboard' };
    }
  }

  return { allowed: true };
}
