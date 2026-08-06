/**
 * APP CONFIG — Konfigurasi global aplikasi Omnifit.cloud
 *
 * File ini adalah entry point utama untuk semua config.
 * Re-export semua config di sini agar import di komponen lebih bersih:
 *
 * ✅ import { ROUTES, FEATURE_FLAGS, ROUTE_PERMISSIONS } from '@/config'
 * ❌ import { ROUTES } from '@/config/routes'
 * ❌ import { FEATURE_FLAGS } from '@/config/features.config'
 */

// ── Re-export semua config dari satu pintu
export * from './routes';
export * from './navigation.config';
export * from './permissions.config';
export * from './features.config';

// ── Metadata aplikasi
export const APP_META = {
  name: 'Omnifit.cloud',
  tagline: 'Satu Ekosistem, Tiga Otak AI',
  domain: 'omnifit.cloud',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://omnifit.cloud',
  logo: '/logo.png',
  supportEmail: 'support@omnifit.cloud',
  socialMedia: {
    telegram: 'https://t.me/omnifit_cloud',
    instagram: 'https://instagram.com/omnifit.cloud',
  },
} as const;

// ── Environment helpers
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
