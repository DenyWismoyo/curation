'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SubscriptionGateProps {
  isPremium: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
  ctaText?: string;
  onUpgrade?: () => void;
  className?: string;
  blurContent?: boolean;
}

export function SubscriptionGate({
  isPremium,
  children,
  fallback,
  title = "Premium Feature",
  description = "Upgrade your account to unlock this advanced feature and get exclusive insights.",
  ctaText = "Upgrade Now",
  onUpgrade,
  className,
  blurContent = true,
}: SubscriptionGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback && !blurContent) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn("relative rounded-2xl overflow-hidden group", className)}>
      {/* Blurred background content */}
      <div className={cn(
        "transition-all duration-500",
        blurContent && "blur-md opacity-40 select-none pointer-events-none scale-[0.98]"
      )}>
        {blurContent ? children : null}
      </div>

      {/* Paywall Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-background/40 backdrop-blur-[2px]">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-background border border-indigo-500/20 shadow-2xl rounded-2xl p-6 md:p-8 text-center relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-indigo-500/20 blur-[40px] rounded-full" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            
            <h3 className="text-xl font-bold tracking-tight mb-2">
              {title}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {description}
            </p>
            
            <button
              onClick={onUpgrade}
              className="btn-primary-rich w-full flex items-center justify-center gap-2 group/btn"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              {ctaText}
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </m.div>
      </div>
    </div>
  );
}
