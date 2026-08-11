'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

interface GradientBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'live' | 'premium' | 'default' | 'indigo' | 'emerald' | 'amber';
  icon?: LucideIcon;
}

export function GradientBadge({ 
  children, 
  variant = 'default',
  icon: Icon,
  className,
  ...props 
}: GradientBadgeProps) {
  
  if (variant === 'live') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(99,102,241,0.2)]",
          className
        )}
        {...props}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        {children}
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-soft-pulse",
          className
        )}
        {...props}
      >
        {Icon && <Icon size={12} className="text-amber-500" />}
        {children}
      </div>
    );
  }

  if (variant === 'indigo') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(99,102,241,0.2)]",
          className
        )}
        {...props}
      >
        {Icon && <Icon size={12} />}
        {children}
      </div>
    );
  }

  if (variant === 'emerald') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]",
          className
        )}
        {...props}
      >
        {Icon && <Icon size={12} />}
        {children}
      </div>
    );
  }

  if (variant === 'amber') {
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 text-[10px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-soft-pulse",
          className
        )}
        {...props}
      >
        {Icon && <Icon size={12} />}
        {children}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black tracking-widest uppercase",
        className
      )}
      {...props}
    >
      {Icon && <Icon size={12} />}
      {children}
    </div>
  );
}
