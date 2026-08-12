'use client';

import React from 'react';
import { m, Variants } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';

export interface ActivityItem {
  id: string | number;
  title: string;
  description?: string;
  time: string;
  icon?: React.ReactNode;
  color?: OmnifitColor | 'slate';
}

interface ActivityFeedProps {
  title?: string;
  items: ActivityItem[];
  className?: string;
}

const colorIconBg = {
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400',
  amber:  'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  emerald:'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
  rose:   'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400',
  slate:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const containerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export function ActivityFeed({ title, items, className }: ActivityFeedProps) {
  
  return (
    <div className={cn('card-solid p-6', className)}>
      {title && (
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
          {title}
        </h3>
      )}
      
      <m.div
        variants={containerVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-20px' }}
        className="relative"
      >
        {/* Continuous Line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border z-0" />
        
        <div className="flex flex-col gap-6 relative z-10">
          {items.map((item) => (
            <m.div key={item.id} variants={itemVariant} className="flex gap-4">
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-card",
                colorIconBg[item.color || 'slate']
              )}>
                {item.icon ? item.icon : <div className="w-2 h-2 rounded-full bg-current" />}
              </div>
              
              <div className="flex flex-col pt-2 min-w-0 flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
            </m.div>
          ))}
        </div>
      </m.div>
    </div>
  );
}
