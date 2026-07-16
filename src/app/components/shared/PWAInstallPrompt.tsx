'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA berhasil diinstal');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt && !isIOS) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-6 right-4 sm:right-6 z-[200] w-[calc(100%-2rem)] sm:w-[360px]"
        >
          <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/60 p-4 rounded-[1.25rem] shadow-2xl shadow-slate-900/10 relative overflow-hidden group flex items-center gap-4">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl pointer-events-none transition-all group-hover:scale-150"></div>

            {/* Tombol Close */}
            <button 
              onClick={() => setShowPrompt(false)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-colors z-10"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Logo Omnifit */}
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-slate-100 relative z-10 overflow-hidden">
              <Image 
                src="/icon-192x192.png" 
                alt="Omnifit Logo" 
                width={48} 
                height={48} 
                className="w-full h-full object-contain p-1.5"
                priority
              />
            </div>
            
            {/* Teks & Tombol */}
            <div className="flex-1 pr-4 relative z-10">
              <h3 className="text-sm font-black text-slate-900 leading-tight mb-0.5">
                Instal Omnifit
              </h3>
              <p className="text-[10px] font-bold text-slate-500 mb-2.5">
                Akses lebih cepat & tanpa batas.
              </p>
              
              <Button 
                onClick={handleInstallClick} 
                size="sm"
                className="h-8 rounded-xl px-4 bg-slate-900 text-white font-bold text-xs hover:bg-indigo-600 shadow-md shadow-slate-900/10 hover:shadow-indigo-600/20 transition-all flex items-center gap-1.5 w-fit"
              >
                <Download className="w-3 h-3" />
                Pasang
              </Button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}