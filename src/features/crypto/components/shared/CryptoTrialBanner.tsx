'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Zap, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function CryptoTrialBanner() {
  const { isTrial, trialExpiresAt } = useAuth();
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isTrial || !trialExpiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = trialExpiresAt.getTime() - now;

      if (distance < 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [isTrial, trialExpiresAt]);

  if (!isTrial || !timeLeft || dismissed) return null;

  // Sembunyikan banner di halaman pricing itu sendiri
  if (pathname === '/crypto') return null;

  const isWarning = timeLeft.d === 0 && timeLeft.h < 12;

  return (
    <div className={`relative z-50 flex items-center justify-between px-4 py-2 sm:px-6 shadow-md transition-colors duration-500 ${isWarning ? 'bg-rose-100 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-900' : 'bg-emerald-100 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-900'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-full ${isWarning ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'} animate-pulse`}>
          {isWarning ? <Clock size={16} /> : <Zap size={16} />}
        </div>
        <div className="text-xs sm:text-sm text-slate-200">
          <span className="font-bold text-foreground mr-1">Trial Premium Aktif:</span>
          Tersisa <span className={`font-mono font-bold ${isWarning ? 'text-rose-400' : 'text-emerald-400'}`}>
            {timeLeft.d} Hari {timeLeft.h.toString().padStart(2, '0')}:{timeLeft.m.toString().padStart(2, '0')}:{timeLeft.s.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/crypto')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 ${isWarning ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20'}`}
        >
          Upgrade Sekarang
        </button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
