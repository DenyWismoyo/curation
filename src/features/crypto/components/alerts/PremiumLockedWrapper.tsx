"use client";

import React from "react";
import { Lock, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PremiumLockedWrapperProps {
  children: React.ReactNode;
  hasAccess: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export function PremiumLockedWrapper({ 
  children, 
  hasAccess, 
  title = "Fitur Premium", 
  description = "Upgrade ke Premium untuk membuka fitur ini.",
  className = ""
}: PremiumLockedWrapperProps) {
  const { cryptoTrialUsed } = useAuth();
  
  return (
    <div className={className}>
      {hasAccess ? (
        children
      ) : (
        <div className="relative group overflow-hidden rounded-2xl">
          <div className="blur-[8px] opacity-40 select-none pointer-events-none transition-all duration-300 h-full">
            {children}
          </div>
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center card-solid/20 dark:bg-slate-950/20 backdrop-blur-[2px]">
            <div className="w-12 h-12 mb-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-200 dark:border-amber-500/30 shadow-lg dark:shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2 mb-2">
              {title} <Sparkles className="w-4 h-4 text-yellow-500" />
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-200 mb-4 max-w-[250px] leading-relaxed">
              {description}
            </p>
            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-amber-500 text-white hover:bg-amber-600 h-9 px-4 py-2">
              {!cryptoTrialUsed ? (
                <>Coba Gratis <Zap className="w-3 h-3 ml-1 fill-emerald-400 text-emerald-400" /></>
              ) : (
                'Upgrade Premium'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
