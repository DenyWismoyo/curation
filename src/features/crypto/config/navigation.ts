import { Activity, Eye, Radar, Flame, Target, LineChart, Globe, Zap, LucideIcon } from 'lucide-react';

export interface CryptoNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresPremium?: boolean;
  requiresAdmin?: boolean;
}

export const CRYPTO_NAV_LINKS: CryptoNavItem[] = [
  { href: '/crypto-report', label: 'Dashboard', icon: Activity },
  { href: '/crypto-report/smart-money', label: 'Smart Money', icon: Eye, requiresPremium: true },
  { href: '/crypto-report/liquidity', label: 'Liquidity', icon: Radar, requiresPremium: true },
  { href: '/crypto-report/danger-zone', label: 'Danger Zone', icon: Flame, requiresPremium: true },
  { href: '/crypto-report/scalping-radar', label: 'Scalping', icon: Target, requiresPremium: true },
  { href: '/crypto-report/hidden-gems', label: 'Hidden Gems', icon: LineChart, requiresPremium: true },
  { href: '/crypto-report/news', label: 'News & Alpha', icon: Globe },
];

export const CRYPTO_ADMIN_LINKS: CryptoNavItem[] = [
  { href: '/crypto-report/realtime-radar', label: 'Realtime Radar', icon: Zap, requiresAdmin: true },
];

export const CRYPTO_BOTTOM_NAV_LINKS: CryptoNavItem[] = [
  { href: '/crypto-report', label: 'Dashboard', icon: Activity },
  { href: '/crypto-report/smart-money', label: 'Smart Money', icon: Eye, requiresPremium: true },
  { href: '/crypto-report/hidden-gems', label: 'Hidden Gems', icon: LineChart, requiresPremium: true },
  { href: '/crypto-report/danger-zone', label: 'Danger', icon: Flame, requiresPremium: true },
];

export const CRYPTO_DRAWER_LINKS: CryptoNavItem[] = [
  { href: '/crypto-report/liquidity', label: 'Liquidity Maps', icon: Radar, requiresPremium: true },
  { href: '/crypto-report/scalping-radar', label: 'Scalping Radar', icon: Target, requiresPremium: true },
  { href: '/crypto-report/news', label: 'News & Alpha', icon: Globe },
];
