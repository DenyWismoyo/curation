'use client';

import React, { useRef } from 'react';
import { m, useInView } from 'framer-motion';
import { cn } from '../utils/cn';
import { Check } from 'lucide-react';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';

export interface MilestoneStep {
  id: string | number;
  label: string;
  sublabel?: string;
}

interface ProgressMilestoneProps {
  steps: MilestoneStep[];
  currentStepIndex: number; // 0-based index
  color?: OmnifitColor;
  className?: string;
}

const colorActiveMap = {
  indigo: 'bg-indigo-600 text-white border-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.5)]',
  amber:  'bg-amber-500 text-white border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
  emerald:'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
  rose:   'bg-rose-500 text-white border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]',
};

const colorCompletedMap = {
  indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 dark:border-indigo-700',
  amber:  'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-700',
  emerald:'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700',
  rose:   'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:border-rose-700',
};

const barColorMap = {
  indigo: OMNIFIT_COLORS.indigo.base,
  amber:  OMNIFIT_COLORS.amber.base,
  emerald:OMNIFIT_COLORS.emerald.base,
  rose:   OMNIFIT_COLORS.rose.base,
};

export function ProgressMilestone({
  steps,
  currentStepIndex,
  color = 'indigo',
  className
}: ProgressMilestoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const validCurrentStep = Math.max(0, Math.min(currentStepIndex, steps.length - 1));
  const progressPercentage = steps.length > 1 ? (validCurrentStep / (steps.length - 1)) * 100 : 100;

  return (
    <div ref={ref} className={cn('w-full py-4', className)}>
      <div className="relative">
        {/* Background Track Line */}
        <div className="absolute top-4 left-0 w-full h-1 bg-border rounded-full -z-10" />
        
        {/* Animated Progress Line */}
        <m.div 
          className="absolute top-4 left-0 h-1 rounded-full -z-10"
          style={{ backgroundColor: barColorMap[color] }}
          initial={{ width: '0%' }}
          animate={isInView ? { width: `${progressPercentage}%` } : { width: '0%' }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />

        <div className="flex justify-between relative z-10">
          {steps.map((step, index) => {
            const isCompleted = index < validCurrentStep;
            const isActive = index === validCurrentStep;
            const isUpcoming = index > validCurrentStep;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + (index * 0.1) }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300",
                    isCompleted && colorCompletedMap[color],
                    isActive && colorActiveMap[color],
                    isUpcoming && "bg-card text-muted-foreground border-border"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : (index + 1)}
                </m.div>
                
                <div className="mt-3 text-center">
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                      {step.sublabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
