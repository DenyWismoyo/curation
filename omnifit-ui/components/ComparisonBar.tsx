'use client';

import React, { useRef } from 'react';
import { m, useInView } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';

interface ComparisonBarProps {
  leftValue: number;
  rightValue: number;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: OmnifitColor;
  rightColor?: OmnifitColor | 'slate';
  title?: string;
  formatValue?: (val: number) => string;
  className?: string;
}

const bgColors: Record<OmnifitColor | 'slate', string> = {
  indigo: 'bg-indigo-500',
  amber:  'bg-amber-500',
  emerald:'bg-emerald-500',
  rose:   'bg-rose-500',
  slate:  'bg-slate-300 dark:bg-slate-700',
};

const textColors: Record<OmnifitColor | 'slate', string> = {
  indigo: 'text-indigo-600 dark:text-indigo-400',
  amber:  'text-amber-600 dark:text-amber-400',
  emerald:'text-emerald-600 dark:text-emerald-400',
  rose:   'text-rose-600 dark:text-rose-400',
  slate:  'text-slate-600 dark:text-slate-400',
};

export function ComparisonBar({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  leftColor = 'indigo',
  rightColor = 'slate',
  title,
  formatValue = (v) => v.toString(),
  className,
}: ComparisonBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const total = leftValue + rightValue;
  const leftPercentage = total === 0 ? 50 : (leftValue / total) * 100;

  return (
    <div ref={ref} className={cn('w-full flex flex-col gap-2', className)}>
      {title && (
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
          {title}
        </h3>
      )}

      {/* Header Labels */}
      <div className="flex justify-between items-end mb-1">
        <div className="flex flex-col">
          <span className={cn("text-2xl font-black tracking-tight", textColors[leftColor])}>
            {formatValue(leftValue)}
          </span>
          {leftLabel && <span className="text-xs font-bold text-muted-foreground uppercase">{leftLabel}</span>}
        </div>
        <div className="flex flex-col text-right">
          <span className={cn("text-2xl font-black tracking-tight", textColors[rightColor])}>
            {formatValue(rightValue)}
          </span>
          {rightLabel && <span className="text-xs font-bold text-muted-foreground uppercase">{rightLabel}</span>}
        </div>
      </div>

      {/* Bar */}
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex relative shadow-inner">
        <m.div
          className={cn("h-full rounded-full absolute left-0 top-0", bgColors[leftColor])}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${leftPercentage}%` } : { width: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
          style={{ zIndex: 10 }}
        />
        <m.div
          className={cn("h-full w-full absolute left-0 top-0", bgColors[rightColor])}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
