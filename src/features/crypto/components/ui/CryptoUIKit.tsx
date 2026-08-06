'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Lock, Sparkles, Zap, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ==========================================================================
 * 1. CryptoCard (formerly CryptoCard)
 * ========================================================================== */
interface CryptoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glow' | 'glow-indigo' | 'glow-amber' | 'glow-emerald' | 'glow-rose' | 'glow-cyan' | 'glow-purple' | 'subtle' | 'danger' | 'premium';
}

export function CryptoCard({ className, variant = 'default', children, ...props }: CryptoCardProps) {
  const baseClasses = 'rounded-2xl border transition-all duration-300 relative overflow-hidden';
  
  const variants = {
    default: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    elevated: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg',
    subtle: 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10',
    danger: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
    premium: 'bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-slate-950 border-amber-200 dark:border-amber-500/20 shadow-md dark:shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    glow: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]',
    'glow-indigo': 'bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
    'glow-amber': 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/30',
    'glow-emerald': 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/30',
    'glow-rose': 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 hover:bg-rose-50 dark:hover:bg-rose-900/30',
    'glow-cyan': 'bg-cyan-50/50 dark:bg-cyan-950/10 border-cyan-100 dark:border-cyan-900/20 hover:bg-cyan-50 dark:hover:bg-cyan-900/30',
    'glow-purple': 'bg-purple-50/50 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/20 hover:bg-purple-50 dark:hover:bg-purple-900/30',
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

/* ==========================================================================
 * 2. CryptoBadge
 * ========================================================================== */
interface CryptoBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'bullish' | 'bearish' | 'neutral' | 'premium' | 'danger' | 'info' | 'new';
}

export function CryptoBadge({ className, variant = 'info', children, ...props }: CryptoBadgeProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm';
  
  const variants = {
    bullish: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
    bearish: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20',
    neutral: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20',
    premium: 'bg-gradient-to-r from-amber-500 to-orange-400 text-white border-0 shadow-md',
    danger: 'bg-rose-600 text-white border-0',
    info: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20',
    new: 'bg-purple-500 text-white border-0 animate-pulse',
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

/* ==========================================================================
 * 3. CryptoButton
 * ========================================================================== */
interface CryptoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'premium' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function CryptoButton({ className, variant = 'primary', size = 'md', children, ...props }: CryptoButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/50',
    ghost: 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
    premium: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/30 border border-amber-400/50',
    outline: 'border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  };
  
  const sizes = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
  };

  return (
    <button className={cn(baseClasses, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

/* ==========================================================================
 * 4. CryptoPageHeader
 * ========================================================================== */
interface CryptoPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: CryptoBadgeProps['variant'];
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function CryptoPageHeader({ title, subtitle, badge, badgeVariant = 'premium', icon, actions }: CryptoPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              {icon}
            </div>
          )}
          {badge && <CryptoBadge variant={badgeVariant}>{badge}</CryptoBadge>}
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
 * 5. CryptoPremiumGate
 * ========================================================================== */
interface CryptoPremiumGateProps {
  children: React.ReactNode;
  hasAccess: boolean;
  mode?: 'fullscreen' | 'overlay';
  title?: string;
  description?: string;
  onUpgradeClick?: () => void;
  isTrialAvailable?: boolean;
}

export function CryptoPremiumGate({
  children,
  hasAccess,
  mode = 'overlay',
  title = 'Fitur Premium',
  description = 'Upgrade ke Premium untuk membuka akses penuh ke fitur intelijen Crypto.',
  onUpgradeClick,
  isTrialAvailable = false,
}: CryptoPremiumGateProps) {
  if (hasAccess) return <>{children}</>;

  if (mode === 'fullscreen') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 w-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 mb-6">
            <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-2">
            {title} <Sparkles className="w-5 h-5 text-yellow-500" />
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            {description}
          </p>
          <div className="space-y-3">
            <CryptoButton variant="premium" className="w-full h-12" onClick={onUpgradeClick}>
              {isTrialAvailable ? (
                <>Coba Gratis 3 Hari <Zap className="w-4 h-4 ml-1.5 fill-emerald-500 dark:fill-emerald-400 text-emerald-500 dark:text-emerald-400" /></>
              ) : (
                'Lihat Penawaran Premium'
              )}
            </CryptoButton>
          </div>
        </div>
      </div>
    );
  }

  // Overlay mode (blur content)
  return (
    <div className="relative group overflow-hidden rounded-2xl">
      <div className="blur-[8px] opacity-40 select-none pointer-events-none transition-all duration-300 h-full">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/20 dark:bg-slate-950/20 backdrop-blur-[2px]">
        <div className="w-12 h-12 mb-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 shadow-lg dark:shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 mb-2">
          {title} <Sparkles className="w-4 h-4 text-yellow-500" />
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-200 mb-4 max-w-[250px] leading-relaxed">
          {description}
        </p>
        <CryptoButton variant="primary" size="sm" onClick={onUpgradeClick}>
          {isTrialAvailable ? (
            <>Coba Gratis <Zap className="w-3 h-3 ml-1 fill-emerald-400 text-emerald-400" /></>
          ) : (
            'Upgrade Premium'
          )}
        </CryptoButton>
      </div>
    </div>
  );
}

/* ==========================================================================
 * 6. CryptoEmptyState
 * ========================================================================== */
interface CryptoEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function CryptoEmptyState({ icon = <Info className="w-8 h-8" />, title, description, action }: CryptoEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 text-slate-500 border border-slate-200 dark:border-slate-800">
        {icon}
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}

/* ==========================================================================
 * 7. CryptoLoadingState
 * ========================================================================== */
interface CryptoLoadingStateProps {
  type?: 'spinner' | 'skeleton';
  message?: string;
  rows?: number;
}

export function CryptoLoadingState({ type = 'spinner', message = 'Memuat...', rows = 3 }: CryptoLoadingStateProps) {
  if (type === 'skeleton') {
    return (
      <div className="space-y-4 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="w-full h-16 bg-slate-200 dark:bg-slate-800/50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 opacity-70">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
      <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">{message}</p>
    </div>
  );
}

/* ==========================================================================
 * 8. CryptoStatCard
 * ========================================================================== */
interface CryptoStatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'cyan' | 'orange';
  onClick?: () => void;
}

export function CryptoStatCard({ 
  label, 
  value, 
  icon, 
  trend, 
  trendDirection = 'neutral', 
  color = 'indigo',
  onClick 
}: CryptoStatCardProps) {
  
  const colors = {
    indigo: { glow: 'bg-indigo-500/10 dark:bg-indigo-500/20 group-hover:bg-indigo-500/20 dark:group-hover:bg-indigo-500/30', text: 'text-indigo-600 dark:text-indigo-400' },
    emerald: { glow: 'bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' },
    rose: { glow: 'bg-rose-500/10 dark:bg-rose-500/20 group-hover:bg-rose-500/20 dark:group-hover:bg-rose-500/30', text: 'text-rose-600 dark:text-rose-400' },
    amber: { glow: 'bg-amber-500/10 dark:bg-amber-500/20 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
    blue: { glow: 'bg-blue-500/10 dark:bg-blue-500/20 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30', text: 'text-blue-600 dark:text-blue-400' },
    purple: { glow: 'bg-purple-500/10 dark:bg-purple-500/20 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/30', text: 'text-purple-600 dark:text-purple-400' },
    cyan: { glow: 'bg-cyan-500/10 dark:bg-cyan-500/20 group-hover:bg-cyan-500/20 dark:group-hover:bg-cyan-500/30', text: 'text-cyan-600 dark:text-cyan-400' },
    orange: { glow: 'bg-orange-500/10 dark:bg-orange-500/20 group-hover:bg-orange-500/20 dark:group-hover:bg-orange-500/30', text: 'text-orange-600 dark:text-orange-400' },
  };

  const trendColors = {
    up: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10',
    down: 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10',
    neutral: 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200 dark:border-slate-800/60 backdrop-blur-xl shadow-sm dark:shadow-lg rounded-2xl overflow-hidden relative group transition-all duration-500",
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-md dark:hover:shadow-lg"
      )}
    >
      <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-500", colors[color].glow)}></div>
      <div className="p-5 flex flex-col justify-center h-full relative z-10">
         <div className="flex items-center justify-between mb-3">
           <div className={cn("flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest", colors[color].text)}>
             {icon && <span className="w-4 h-4">{icon}</span>}
             {label}
           </div>
           {trend && (
             <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", trendColors[trendDirection])}>
               {trend}
             </div>
           )}
         </div>
         <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
           {value}
         </div>
      </div>
    </div>
  );
}
