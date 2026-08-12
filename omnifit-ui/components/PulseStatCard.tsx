'use client';

import React from 'react';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';

interface PulseStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  color?: OmnifitColor;
}

export function PulseStatCard({
  icon,
  label,
  value,
  subValue,
  color = 'indigo',
  className,
  ...props
}: PulseStatCardProps) {
  const colorMap = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
    orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500',
    slate: 'bg-slate-50 dark:bg-slate-500/10 text-slate-500',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 flex-1 min-w-[140px] group cursor-default',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'p-2.5 rounded-xl transition-colors duration-300 group-hover:scale-105',
          colorMap[color] || colorMap.indigo
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm sm:text-base font-black text-foreground flex items-center gap-1.5">
          {value}
          {subValue && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              {subValue}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
