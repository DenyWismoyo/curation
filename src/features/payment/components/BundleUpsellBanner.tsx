'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface BundleUpsellBannerProps {
  onSelectBundle: (bundleId: 'BUNDLE_3' | 'BUNDLE_5') => void;
  className?: string;
}

export function BundleUpsellBanner({ onSelectBundle, className = '' }: BundleUpsellBannerProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Paket 3 Modul */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="relative card-premium-light card-interactive p-6 flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-2xl"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Terlaris
          </div>
          <h3 className="text-xl font-black text-indigo-950 dark:text-indigo-50 mb-2">Bundle 3 Modul</h3>
          <p className="text-sm text-muted-foreground font-medium mb-4">
            Pilih 3 asesmen apapun dari katalog. Cocok untuk mengukur kesiapan bisnis dan kompetensi dasar.
          </p>
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={16} className="text-indigo-500" /> Bebas pilih modul apapun
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={16} className="text-indigo-500" /> Masa aktif kuota selamanya
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-auto">
          <div className="flex items-end gap-2 mb-4">
            <span className="text-2xl font-black text-foreground">Rp 149.000</span>
            <span className="text-sm text-slate-400 line-through font-medium mb-1">Rp 171.000</span>
          </div>
          <button 
            onClick={() => onSelectBundle('BUNDLE_3')}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200 dark:shadow-[0_4px_20px_rgba(79,70,229,0.3)]"
          >
            Beli Bundle 3 Modul <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>

      {/* Paket 5 Modul */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="relative card-premium-dark card-interactive p-6 flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-32 h-32 card-solid/10 rounded-bl-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/20 rounded-tr-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Paling Hemat
          </div>
          <h3 className="text-xl font-black text-white mb-2">Bundle 5 Modul</h3>
          <p className="text-sm text-slate-300 font-medium mb-4">
            Dapatkan evaluasi 360 derajat untuk individu atau startup. Analisis menyeluruh dengan harga terbaik.
          </p>
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 size={16} className="text-emerald-400" /> Bebas pilih modul apapun
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 size={16} className="text-emerald-400" /> Harga per modul hanya ~39rb
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-auto">
          <div className="flex items-end gap-2 mb-4">
            <span className="text-2xl font-black text-white">Rp 199.000</span>
            <span className="text-sm text-slate-400 line-through font-medium mb-1">Rp 285.000</span>
          </div>
          <button 
            onClick={() => onSelectBundle('BUNDLE_5')}
            className="w-full h-12 card-solid hover:bg-secondary text-secondary-foreground text-foreground rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-black/20"
          >
            Beli Bundle 5 Modul <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
