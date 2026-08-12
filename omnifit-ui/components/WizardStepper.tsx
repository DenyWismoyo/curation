'use client';

import React from 'react';
import { m } from 'framer-motion';
import { LucideIcon, Check } from 'lucide-react';
import { cn } from '../utils/cn';

export interface WizardStep {
  id: string | number;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (index: number) => void;
  className?: string;
}

export function WizardStepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  onStepClick,
  className
}: WizardStepperProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={cn("w-full", className)}>
      <div 
        className={cn(
          "flex",
          isHorizontal ? "flex-row items-center justify-between" : "flex-col gap-6"
        )}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          
          const StepIcon = step.icon;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div 
              key={step.id} 
              className={cn(
                "relative flex",
                isHorizontal ? "flex-1 flex-col items-center group" : "flex-row gap-4"
              )}
            >
              {/* Connector Line */}
              {index !== steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute bg-border/50",
                    isHorizontal 
                      ? "top-5 left-[50%] right-[-50%] h-[2px]" 
                      : "left-5 top-10 bottom-[-24px] w-[2px]"
                  )}
                >
                  <m.div
                    initial={{ scaleX: 0, scaleY: 0 }}
                    animate={{ 
                      scaleX: isHorizontal ? (isCompleted ? 1 : 0) : 1,
                      scaleY: !isHorizontal ? (isCompleted ? 1 : 0) : 1,
                    }}
                    style={{ transformOrigin: isHorizontal ? 'left' : 'top' }}
                    className={cn(
                      "bg-indigo-500 w-full h-full transition-all duration-500 ease-in-out",
                    )}
                  />
                </div>
              )}

              {/* Step Circle */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick?.(index)}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-all duration-300",
                  isCompleted ? "border-indigo-500 bg-indigo-500 text-white" : 
                  isCurrent ? "border-indigo-500 ring-4 ring-indigo-500/20" : 
                  "border-border text-muted-foreground",
                  isClickable && "cursor-pointer hover:ring-4 hover:ring-indigo-500/20"
                )}
              >
                {isCompleted ? (
                  <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </m.div>
                ) : StepIcon ? (
                  <StepIcon className={cn("h-5 w-5", isCurrent && "text-indigo-600 dark:text-indigo-400")} />
                ) : (
                  <span className={cn("text-sm font-bold", isCurrent && "text-indigo-600 dark:text-indigo-400")}>
                    {index + 1}
                  </span>
                )}
              </button>

              {/* Step Label */}
              <div 
                className={cn(
                  "mt-3 flex flex-col",
                  isHorizontal ? "items-center text-center" : "justify-center"
                )}
              >
                <span className={cn(
                  "text-sm font-bold tracking-tight transition-colors",
                  isCurrent ? "text-foreground" : 
                  isCompleted ? "text-foreground opacity-80" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {step.description && (
                  <span className={cn(
                    "text-xs font-medium mt-1 transition-colors",
                    isCurrent ? "text-muted-foreground" : "text-muted-foreground/50",
                    isHorizontal ? "max-w-[120px]" : "max-w-md"
                  )}>
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
