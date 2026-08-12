'use client';

import React from 'react';
import { m, Variants } from 'framer-motion';
import { LucideIcon, Circle, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '../utils/cn';

export type TimelineEventType = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface TimelineEventItem {
  id: string | number;
  date: string;
  title: string;
  description?: string | React.ReactNode;
  type?: TimelineEventType;
  icon?: LucideIcon;
  metadata?: React.ReactNode;
}

interface TimelineEventProps {
  events: TimelineEventItem[];
  className?: string;
  animate?: boolean;
}

const typeConfig: Record<TimelineEventType, { icon: LucideIcon; bg: string; iconColor: string; border: string }> = {
  default: { icon: Circle, bg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-500 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
  success: { icon: CheckCircle2, bg: 'bg-emerald-100 dark:bg-emerald-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-500/20', iconColor: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' },
  error: { icon: XCircle, bg: 'bg-rose-100 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/30' },
  info: { icon: Info, bg: 'bg-indigo-100 dark:bg-indigo-500/20', iconColor: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/30' },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1 } 
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  }
};

export function TimelineEvent({ events, className, animate = true }: TimelineEventProps) {
  if (!events || events.length === 0) return null;

  return (
    <div className={cn("relative pl-4 sm:pl-6", className)}>
      {/* Vertical Line */}
      <div className="absolute left-[15px] sm:left-[23px] top-6 bottom-6 w-[2px] bg-border/60" />

      <m.div
        variants={animate ? containerVariants : undefined}
        initial={animate ? "hidden" : "visible"}
        animate="visible"
        className="space-y-8"
      >
        {events.map((event, index) => {
          const type = event.type || 'default';
          const config = typeConfig[type];
          const Icon = event.icon || config.icon;
          const isLast = index === events.length - 1;

          return (
            <m.div 
              key={event.id}
              variants={animate ? itemVariants : undefined}
              className="relative"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                {/* Timeline Dot */}
                <div className="relative z-10 flex-shrink-0 mt-1">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border shadow-sm",
                    config.bg,
                    config.border
                  )}>
                    <Icon className={cn("w-4 h-4", config.iconColor)} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1.5 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1.5">
                    <h4 className="text-base font-bold text-foreground">
                      {event.title}
                    </h4>
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {event.date}
                    </span>
                  </div>
                  
                  {event.description && (
                    <div className="text-sm font-medium text-muted-foreground/90 mt-1 mb-2">
                      {event.description}
                    </div>
                  )}

                  {event.metadata && (
                    <div className="mt-3">
                      {event.metadata}
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          );
        })}
      </m.div>
    </div>
  );
}
