'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface Step {
  id: number;
  title: string;
  desc: string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
}

interface StepTimelineProps {
  steps: Step[];
  className?: string;
}

export function StepTimeline({ steps, className }: StepTimelineProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Desktop connector line */}
      <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border dark:via-slate-700 to-transparent -translate-y-1/2" />
      
      {/* Mobile vertical line */}
      <div className="md:hidden absolute top-0 bottom-0 left-[2rem] w-px bg-border dark:bg-slate-800" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex md:flex-col items-start md:items-center text-left md:text-center group">
            
            {/* Number indicator */}
            <div className="hidden md:flex absolute -top-8 left-1/2 -translate-x-1/2 text-[3rem] font-black text-slate-100 dark:text-slate-800/50 -z-10 transition-transform duration-500 group-hover:scale-110">
              0{step.id}
            </div>

            {/* Icon Container */}
            <div className={cn(
              "w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center mb-0 md:mb-6 z-10 border border-white/10 dark:border-white/5 shadow-xl transition-all duration-300 group-hover:-translate-y-2",
              step.bg || "bg-slate-100 dark:bg-slate-800",
              "mr-6 md:mr-0"
            )}>
              <step.icon className={cn("w-7 h-7", step.color || "text-slate-600 dark:text-slate-300")} />
            </div>
            
            {/* Content */}
            <div className="flex-1 mt-2 md:mt-0">
              <div className="flex items-center gap-2 mb-2 md:justify-center">
                <span className="md:hidden text-xs font-black text-slate-400">0{step.id}</span>
                <h3 className="text-lg font-bold text-foreground leading-tight">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
