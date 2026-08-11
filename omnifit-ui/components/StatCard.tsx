'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '../utils/cn';

interface StatCardProps {
  value: number;
  label: string;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  color?: 'indigo' | 'amber' | 'emerald';
  className?: string;
}

export function StatCard({
  value,
  label,
  icon: Icon,
  prefix,
  suffix,
  color = 'indigo',
  className
}: StatCardProps) {
  const colorMap = {
    indigo: 'text-indigo-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
  };

  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700", colorMap[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}
