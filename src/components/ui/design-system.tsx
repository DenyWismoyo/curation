'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

// ==========================================
// 1. <AppModal>
// ==========================================
interface AppModalProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen';
  nested?: boolean;
  hideCloseButton?: boolean;
  className?: string;
}

const modalSizeMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
  fullscreen: 'w-full h-full max-w-none rounded-none',
};

export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  header,
  children,
  size = 'md',
  nested = false,
  hideCloseButton = false,
  className,
}: AppModalProps) {
  if (!open) return null;

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300",
      nested ? "z-[60]" : "z-50",
      size === 'fullscreen' ? 'p-0' : 'p-4 sm:p-6'
    )}>
      <div className={cn(
        "bg-slate-50 w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300",
        size === 'fullscreen' ? 'h-full rounded-none' : 'max-h-[95vh] rounded-[2rem]',
        modalSizeMap[size],
        className
      )}>
        {header ? header : (title || onClose) ? (
          <div className="bg-white px-6 py-5 sm:px-8 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div>
              {title && (
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {icon} {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {onClose && !hideCloseButton && (
              <Button onClick={onClose} variant="ghost" className="h-10 w-10 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0 ml-4">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. <AppTabs>
// ==========================================
interface TabOption {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface AppTabsProps {
  tabs: TabOption[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export function AppTabs({ tabs, active, onChange, variant = 'pill', className }: AppTabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn("flex items-center gap-6 border-b border-slate-200 px-6", className)}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
              active === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // Pill variant
  return (
    <div className={cn("flex gap-2 overflow-x-auto hide-scrollbar pb-1", className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
            active === tab.id
              ? "bg-slate-900 text-white shadow-md"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ==========================================
// 3. <StatusBadge>
// ==========================================
interface StatusBadgeProps {
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'premium' | 'default';
  children: React.ReactNode;
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const badgeVariantMap = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/60',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200/60',
  info: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',
  premium: 'bg-amber-50 text-amber-700 ring-amber-200/60', // can customize further
  default: 'bg-slate-50 text-slate-600 ring-slate-200/60',
};

const pulseColorMap = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-indigo-500',
  premium: 'bg-amber-500',
  default: 'bg-slate-500',
};

export function StatusBadge({ variant = 'default', children, icon, pulse, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ring-1 shrink-0",
      badgeVariantMap[variant],
      className
    )}>
      {pulse && (
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", pulseColorMap[variant])} />
      )}
      {icon}
      {children}
    </span>
  );
}

// ==========================================
// 4. <SectionLabel>
// ==========================================
interface SectionLabelProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, icon, className }: SectionLabelProps) {
  return (
    <h3 className={cn(
      "text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2",
      className
    )}>
      {icon}
      {children}
    </h3>
  );
}

// ==========================================
// 5. <AppSpinner>
// ==========================================
interface AppSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const spinnerSizeMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export function AppSpinner({ size = 'md', message, className }: AppSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn(
        "border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin",
        spinnerSizeMap[size]
      )} />
      {message && (
        <p className="font-bold text-xs uppercase tracking-widest text-indigo-400 text-center">
          {message}
        </p>
      )}
    </div>
  );
}

// ==========================================
// 6. <PageAuthGate>
// ==========================================
interface PageAuthGateProps {
  loading: boolean;
  authorized: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
}

export function PageAuthGate({ loading, authorized, loadingMessage = 'Otentikasi...', children }: PageAuthGateProps) {
  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <AppSpinner size="md" message={loadingMessage} />
      </div>
    );
  }
  return <>{children}</>;
}

// ==========================================
// 7. <ContentCard> (Upgraded)
// ==========================================
// Extending the original ContentCard from domain/public
interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'ghost' | 'highlighted';
}

const paddingMap = {
  none: '',
  sm: 'p-4 sm:p-6',
  md: 'p-6 md:p-8',
  lg: 'p-6 md:p-10',
};

const cardVariantMap = {
  default: 'bg-white ring-1 ring-slate-200/60 shadow-sm',
  elevated: 'bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100',
  ghost: 'bg-slate-50 border border-slate-100',
  highlighted: 'bg-indigo-50/50 ring-1 ring-indigo-100',
};

export function ContentCard({
  children,
  className,
  padding = 'md',
  variant = 'default',
}: ContentCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        paddingMap[padding],
        cardVariantMap[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
