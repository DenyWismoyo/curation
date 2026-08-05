'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumLockedScreenProps {
  title?: string;
  description?: string;
}

export function PremiumLockedScreen({ 
  title = "Akses Fitur Premium", 
  description = "Halaman ini berisi analitik AI tingkat lanjut yang khusus tersedia untuk pelanggan Premium." 
}: PremiumLockedScreenProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full relative overflow-hidden bg-slate-950">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative z-10"
      >
        <div className="w-16 h-16 mx-auto bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 mb-6">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-3 flex items-center justify-center gap-2">
          {title} <Sparkles className="w-5 h-5 text-yellow-500" />
        </h2>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          {description}
          <br /><br />
          Upgrade akun Anda sekarang untuk membuka akses ke <b>Smart Money</b>, <b>Danger Zone</b>, <b>Copilot Chat</b>, dan fitur intelijen Crypto lainnya.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/crypto')} 
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all"
          >
            Lihat Penawaran Premium
          </Button>
          <Button 
            onClick={() => router.back()} 
            variant="ghost"
            className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            Kembali
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
