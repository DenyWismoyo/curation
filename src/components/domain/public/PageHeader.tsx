'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { BackLink } from './BackLink';

interface PageHeaderProps {
  variant?: 'account' | 'content';
  title: React.ReactNode;
  subtitle?: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Extra content below title row (e.g. profile info) */
  children?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function PageHeader({
  variant = 'account',
  title,
  subtitle,
  eyebrow,
  backHref,
  backLabel,
  onBack,
  icon,
  actions,
  children,
  sticky = false,
  className,
}: PageHeaderProps) {
  if (variant === 'content') {
    return (
      <div className={cn('py-8', className)}>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl">{subtitle}</p>
        )}
        {children}
      </div>
    );
  }

  const hasBack = Boolean(backHref || onBack !== undefined);

  return (
    <div
      className={cn(
        'bg-white border-b border-slate-100/60 px-6 lg:px-12 py-8',
        sticky && 'sticky top-20 z-30',
        className
      )}
    >
      <div className="max-w-5xl mx-auto">
        {hasBack && (
          <div className="flex items-center justify-between mb-6">
            <BackLink href={backHref} label={backLabel} onClick={onBack} />
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-14 h-14 bg-indigo-50 rounded-[1.2rem] ring-1 ring-indigo-100 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {eyebrow}
              </p>
            )}
            {title && <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>}
            {subtitle && (
              <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>
            )}
          </div>
          {!hasBack && actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
