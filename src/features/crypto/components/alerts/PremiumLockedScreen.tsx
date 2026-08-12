'use client';

import React from 'react';
import { Lock, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumLockedScreenProps {
  title?: string;
  description?: string;
}

export function PremiumLockedScreen({ 
  title = "Akses Fitur Premium", 
  description = "Halaman ini berisi analitik AI tingkat lanjut yang khusus tersedia untuk pelanggan Premium." 
}: PremiumLockedScreenProps) {
  const { cryptoTrialUsed } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 mb-4 bg-amber-100 dark:bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-500/30 shadow-lg dark:shadow-[0_0_25px_rgba(245,158,11,0.3)]">
        <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-foreground flex items-center justify-center gap-3 mb-3 tracking-tight">
        {title} <Sparkles className="w-6 h-6 text-yellow-500" />
      </h2>
      <p className="text-sm md:text-base text-muted-foreground dark:text-slate-300 mb-8 max-w-[400px] leading-relaxed">
        {description}
      </p>
      
      <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-amber-500 text-white hover:bg-amber-600 h-11 px-8 py-2">
        {!cryptoTrialUsed ? (
          <>Coba Gratis <Zap className="w-4 h-4 ml-2 fill-emerald-400 text-emerald-400" /></>
        ) : (
          'Upgrade ke Premium'
        )}
      </button>
    </div>
  );
}
