'use client';

import React from 'react';
import { m, Variants } from 'framer-motion';
import { cn } from '../utils/cn';

interface HeatmapData {
  date: string;
  count: number;
}

interface HeatmapGridProps {
  data: HeatmapData[];
  title?: string;
  color?: 'indigo' | 'amber' | 'emerald' | 'rose';
  className?: string;
}

const colorIntensityMap = {
  indigo: [
    'bg-slate-100 dark:bg-slate-800/50', // 0
    'bg-indigo-200 dark:bg-indigo-900/40', // 1
    'bg-indigo-300 dark:bg-indigo-800/60', // 2
    'bg-indigo-400 dark:bg-indigo-600', // 3
    'bg-indigo-500 dark:bg-indigo-500', // 4
    'bg-indigo-600 dark:bg-indigo-400', // 5+
  ],
  amber: [
    'bg-slate-100 dark:bg-slate-800/50',
    'bg-amber-200 dark:bg-amber-900/40',
    'bg-amber-300 dark:bg-amber-800/60',
    'bg-amber-400 dark:bg-amber-600',
    'bg-amber-500 dark:bg-amber-500',
    'bg-amber-600 dark:bg-amber-400',
  ],
  emerald: [
    'bg-slate-100 dark:bg-slate-800/50',
    'bg-emerald-200 dark:bg-emerald-900/40',
    'bg-emerald-300 dark:bg-emerald-800/60',
    'bg-emerald-400 dark:bg-emerald-600',
    'bg-emerald-500 dark:bg-emerald-500',
    'bg-emerald-600 dark:bg-emerald-400',
  ],
  rose: [
    'bg-slate-100 dark:bg-slate-800/50',
    'bg-rose-200 dark:bg-rose-900/40',
    'bg-rose-300 dark:bg-rose-800/60',
    'bg-rose-400 dark:bg-rose-600',
    'bg-rose-500 dark:bg-rose-500',
    'bg-rose-600 dark:bg-rose-400',
  ],
};

const containerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const itemVariant: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } }
};

export function HeatmapGrid({ data, title, color = 'emerald', className }: HeatmapGridProps) {
  const intensities = colorIntensityMap[color];
  const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid division by zero

  const getIntensityClass = (count: number) => {
    if (count === 0) return intensities[0];
    const normalized = Math.ceil((count / maxCount) * 5);
    return intensities[Math.min(normalized, 5)];
  };

  return (
    <div className={cn('card-solid p-5', className)}>
      {title && (
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      <m.div
        variants={containerVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-20px' }}
        className="flex flex-wrap gap-1.5"
      >
        {data.map((item, index) => (
          <m.div
            key={`${item.date}-${index}`}
            variants={itemVariant}
            className={cn('w-3 h-3 sm:w-4 sm:h-4 rounded-sm sm:rounded-md transition-colors hover:scale-125 hover:z-10 cursor-pointer', getIntensityClass(item.count))}
            title={`${item.date}: ${item.count} items`}
          />
        ))}
      </m.div>
      
      <div className="mt-4 flex items-center justify-end gap-2 text-xs font-semibold text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {intensities.map((cls, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', cls)} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
