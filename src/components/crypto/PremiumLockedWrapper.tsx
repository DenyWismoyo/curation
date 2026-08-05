"use client";

import React from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={`relative group overflow-hidden rounded-2xl ${className}`}>
      {/* Konten Asli (Di-blur) */}
      <div className="blur-[8px] opacity-40 select-none pointer-events-none transition-all duration-300 h-full">
        {children}
      </div>

      {/* Overlay Gembok */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/20 backdrop-blur-[2px]">
        <div className="w-12 h-12 mb-3 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <Lock className="w-5 h-5 text-indigo-400" />
        </div>
        
        <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2 mb-2">
          {title} <Sparkles className="w-4 h-4 text-yellow-500" />
        </h3>
        
        <p className="text-xs text-slate-200 mb-4 max-w-[250px] leading-relaxed">
          {description}
        </p>

        <Button 
          onClick={() => router.push('/crypto')}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg"
        >
          Lihat Penawaran
        </Button>
      </div>
    </div>
  );
}
