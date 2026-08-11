/**
 * Omnifit Design System Color Tokens
 * Digunakan secara standar di seluruh ekosistem aplikasi Omnifit
 */

export const OMNIFIT_COLORS = {
  // Assessment & Self-Service AI
  indigo: {
    base: '#6366f1',
    classes: {
      text: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      border: 'border-indigo-200 dark:border-indigo-500/20',
      glow: 'shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]',
    }
  },
  
  // Crypto Intelligence Hub
  amber: {
    base: '#f59e0b',
    classes: {
      text: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-500/20',
      glow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]',
    }
  },
  
  // Study Workspace
  emerald: {
    base: '#10b981',
    classes: {
      text: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      glow: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]',
    }
  }
} as const;

export type OmnifitColor = keyof typeof OMNIFIT_COLORS;
