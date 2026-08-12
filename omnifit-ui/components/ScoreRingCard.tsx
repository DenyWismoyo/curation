'use client';

import React from 'react';
import { m, useInView } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';
import { AnimatedCounter } from './AnimatedCounter';
import { getScoreColor } from '../utils/formatters';

interface ScoreRingCardProps {
  score: number;
  maxScore?: number;
  label?: string;
  description?: string;
  color?: OmnifitColor | 'auto'; // 'auto' uses getScoreColor
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPercentage?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'w-24 h-24',
    stroke: 8,
    radius: 36,
    valueText: 'text-2xl',
    label: 'text-xs',
  },
  md: {
    container: 'w-36 h-36',
    stroke: 12,
    radius: 54,
    valueText: 'text-4xl',
    label: 'text-sm',
  },
  lg: {
    container: 'w-48 h-48',
    stroke: 16,
    radius: 72,
    valueText: 'text-6xl',
    label: 'text-base',
  },
};

const colorConfig: Record<OmnifitColor, { ring: string; track: string; text: string; bg: string }> = {
  indigo: { ring: 'text-indigo-500 dark:text-indigo-400', track: 'text-indigo-100 dark:text-indigo-950', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  emerald: { ring: 'text-emerald-500 dark:text-emerald-400', track: 'text-emerald-100 dark:text-emerald-950', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  amber: { ring: 'text-amber-500 dark:text-amber-400', track: 'text-amber-100 dark:text-amber-950', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  rose: { ring: 'text-rose-500 dark:text-rose-400', track: 'text-rose-100 dark:text-rose-950', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  slate: { ring: 'text-slate-500 dark:text-slate-400', track: 'text-slate-100 dark:text-slate-800', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/20' },
};

export function ScoreRingCard({
  score,
  maxScore = 100,
  label,
  description,
  color = 'auto',
  size = 'md',
  className,
  showPercentage = false,
}: ScoreRingCardProps) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  
  const resolvedColor = color === 'auto' ? getScoreColor(score, maxScore) : color;
  const theme = colorConfig[resolvedColor] || colorConfig.indigo;
  const config = sizeConfig[size];
  
  // Clamped percentage 0-100
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  const displayValue = showPercentage ? percentage : score;
  
  // SVG calculation
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      className={cn(
        "card-solid flex flex-col items-center justify-center p-6",
        theme.bg,
        className
      )}
    >
      <div 
        ref={ref}
        className={cn("relative flex items-center justify-center", config.container)}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={config.radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className={theme.track}
          />
          {/* Progress Ring */}
          <m.circle
            cx="80"
            cy="80"
            r={config.radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={theme.ring}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            strokeDasharray={circumference}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline">
            <span className={cn("font-black tracking-tighter", theme.text, config.valueText)}>
              {isInView ? <AnimatedCounter value={displayValue} /> : "0"}
            </span>
            {showPercentage && (
              <span className={cn("font-bold ml-1 opacity-80", theme.text, size === 'sm' ? 'text-xs' : 'text-lg')}>
                %
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Label and Description */}
      {(label || description) && (
        <div className="text-center mt-4 space-y-1">
          {label && (
            <h4 className={cn("font-black uppercase tracking-wider", config.label, theme.text)}>
              {label}
            </h4>
          )}
          {description && (
            <p className="text-sm font-medium text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
