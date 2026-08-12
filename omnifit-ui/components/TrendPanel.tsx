'use client';

import React from 'react';
import { m, Variants } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';

interface TrendPanelProps {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: {
    value: number | string;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: OmnifitColor;
  sparkline?: React.ReactNode;
  className?: string;
}

const colorMap: Record<OmnifitColor, { iconBg: string; iconColor: string }> = {
  indigo: { iconBg: 'bg-indigo-50 dark:bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  amber:  { iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
  emerald:{ iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  rose:   { iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400' },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export function TrendPanel({
  title,
  value,
  icon: Icon,
  trend,
  color = 'indigo',
  sparkline,
  className,
}: TrendPanelProps) {
  const theme = colorMap[color];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="w-3.5 h-3.5" />;
    if (trend.direction === 'down') return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendClass = () => {
    if (!trend) return '';
    if (trend.direction === 'up') return 'trend-positive';
    if (trend.direction === 'down') return 'trend-negative';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  return (
    <m.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      className={cn('card-solid p-5 flex flex-col justify-between group', className)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
        {Icon && (
          <div className={cn('p-2 rounded-xl transition-transform duration-300 group-hover:scale-110', theme.iconBg, theme.iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-baseline gap-2 mb-2">
          {value}
        </div>
        
        <div className="flex items-center gap-3 mt-1">
          {trend && (
            <span className={cn('inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-md tracking-wider', getTrendClass())}>
              {getTrendIcon()}
              {trend.value}
            </span>
          )}
          {trend?.label && (
            <span className="text-xs font-semibold text-muted-foreground">{trend.label}</span>
          )}
        </div>
      </div>

      {sparkline && (
        <div className="mt-5 h-12 w-full">
          {sparkline}
        </div>
      )}
    </m.div>
  );
}
