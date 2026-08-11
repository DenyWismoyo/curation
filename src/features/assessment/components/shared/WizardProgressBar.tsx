import React from 'react';
import { m } from 'framer-motion';

interface WizardProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function WizardProgressBar({ currentStep, totalSteps, className = '' }: WizardProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));

  return (
    <div className={`w-full relative ${className}`}>
      {/* Track Background */}
      <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm ring-1 ring-border/50">
        {/* Progress Bar Fill */}
        <m.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 relative"
          style={{ backgroundSize: '200% 100%' }}
        >
          {/* Animated Glow on the tip */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/50 blur-[2px] rounded-full animate-pulse" />
        </m.div>
      </div>

      {/* Step Indicators */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-0.5">
        {Array.from({ length: totalSteps + 1 }).map((_, idx) => {
          // Hanya tampilkan node pertama, tengah, dan akhir, atau semuanya jika total steps sedikit
          if (totalSteps > 5 && idx !== 0 && idx !== Math.floor(totalSteps / 2) && idx !== totalSteps) {
             return <div key={idx} className="w-1.5 h-1.5 opacity-0" />;
          }
          
          const isCompleted = idx <= currentStep;
          return (
            <div 
              key={idx} 
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                isCompleted ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-muted-foreground/30'
              }`}
            />
          );
        })}
      </div>
      
      <div className="mt-2 text-right">
        <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-widest uppercase">
          Progres {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
