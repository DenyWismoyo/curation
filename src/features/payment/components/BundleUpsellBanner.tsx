'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface BundleUpsellBannerProps {
  onSelectBundle: (bundleId: 'BUNDLE_3' | 'BUNDLE_5') => void;
  className?: string;
}

export function BundleUpsellBanner({ onSelectBundle, className = '' }: BundleUpsellBannerProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      {/* Paket 3 Modul */}
      <motion.div 
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-border to-transparent overflow-hidden group shadow-lg"
      >
        <div className="absolute inset-0 bg-background rounded-[2rem]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 h-full p-8 flex flex-col justify-between"
        >
          <div>
            <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest mb-6 border border-indigo-100 dark:border-indigo-500/20">
              <Sparkles size={14} className="animate-soft-pulse" /> Terlaris
            </motion.div>
            <motion.h3 variants={itemVariants} className="text-2xl font-black text-foreground mb-3 tracking-tight">Bundle 3 Modul</motion.h3>
            <motion.p variants={itemVariants} className="text-sm text-muted-foreground font-medium mb-6 leading-relaxed">
              Pilih 3 asesmen apapun dari katalog. Cocok untuk mengukur kesiapan bisnis dan kompetensi dasar.
            </motion.p>
            <motion.div variants={containerVariants} className="space-y-3 mb-8">
              <motion.div variants={itemVariants} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="mt-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-1">
                  <CheckCircle2 size={14} />
                </div>
                Bebas pilih modul apapun
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="mt-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-1">
                  <CheckCircle2 size={14} />
                </div>
                Masa aktif kuota selamanya
              </motion.div>
            </motion.div>
          </div>
          
          <motion.div variants={itemVariants} className="mt-auto">
            <div className="flex items-end gap-3 mb-6">
              <span className="text-3xl font-black text-foreground tracking-tight">Rp 149.000</span>
              <span className="text-sm text-slate-400 line-through font-bold mb-1">Rp 171.000</span>
            </div>
            <button 
              onClick={() => onSelectBundle('BUNDLE_3')}
              className="w-full h-14 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border border-indigo-200 dark:border-indigo-500/30 group-hover:shadow-[0_0_20px_rgba(79,70,229,0.15)]"
            >
              Beli Bundle 3 Modul <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Paket 5 Modul (Premium) */}
      <motion.div 
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative p-[1.5px] rounded-[2rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-400 overflow-hidden group shadow-xl shadow-indigo-500/10"
      >
        <div className="absolute inset-0 bg-background/90 dark:bg-background/95 backdrop-blur-3xl rounded-[2rem]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/30 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-700"></div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 h-full p-8 flex flex-col justify-between"
        >
          <div>
            <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-6 shadow-lg shadow-indigo-500/25">
              <Sparkles size={14} className="animate-pulse" /> Paling Hemat & Lengkap
            </motion.div>
            <motion.h3 variants={itemVariants} className="text-2xl font-black text-foreground mb-3 tracking-tight">Bundle 5 Modul</motion.h3>
            <motion.p variants={itemVariants} className="text-sm text-muted-foreground font-medium mb-6 leading-relaxed">
              Dapatkan evaluasi 360 derajat untuk individu atau startup. Analisis menyeluruh dengan harga terbaik.
            </motion.p>
            <motion.div variants={containerVariants} className="space-y-3 mb-8">
              <motion.div variants={itemVariants} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="mt-0.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-1 shadow-md">
                  <CheckCircle2 size={14} />
                </div>
                Bebas pilih modul apapun
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="mt-0.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-1 shadow-md">
                  <CheckCircle2 size={14} />
                </div>
                Harga per modul hanya ~39rb
              </motion.div>
            </motion.div>
          </div>
          
          <motion.div variants={itemVariants} className="mt-auto">
            <div className="flex items-end gap-3 mb-6">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tight">Rp 199.000</span>
              <span className="text-sm text-slate-400 line-through font-bold mb-1">Rp 285.000</span>
            </div>
            <button 
              onClick={() => onSelectBundle('BUNDLE_5')}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/25 group-hover:shadow-indigo-500/40 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out mix-blend-overlay"></div>
              Beli Bundle 5 Modul <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
