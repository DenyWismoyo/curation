"use client";

import React from "react";
import { History, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { CryptoCard, CryptoEmptyState } from "../ui/CryptoUIKit";

interface TemporalComparisonWidgetProps {
  reportData?: any;
}

export default function TemporalComparisonWidget({ reportData }: TemporalComparisonWidgetProps) {
  const temporal = reportData?.temporalComparison;
  
  if (!temporal) {
     return (
       <CryptoEmptyState
         icon={<History className="w-8 h-8" />}
         title="Belum Tersedia"
         description="Data perbandingan temporal belum tersedia di laporan ini."
       />
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
         <History className="w-6 h-6 text-indigo-500" />
         <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kemarin vs Hari Ini</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Sentiment Change */}
         <CryptoCard className="overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
            <div className="p-6 relative z-10">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pergeseran Sentimen</div>
               <div className="text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:text-white transition-colors">
                 {temporal.sentimentChange || "Tidak ada data sentimen."}
               </div>
            </div>
         </CryptoCard>

         {/* BTC Price Delta */}
         <CryptoCard className="overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors"></div>
            <div className="p-6 relative z-10">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Perubahan Harga BTC</div>
               <div className="text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:text-white transition-colors">
                 {temporal.btcPriceDelta || "Tidak ada data perubahan harga BTC."}
               </div>
            </div>
         </CryptoCard>

         {/* Notable Movers */}
         <CryptoCard className="overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>
            <div className="p-6 relative z-10">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Notable Movers</div>
               <div className="text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:text-white transition-colors">
                 {temporal.notableMovers || "Tidak ada data movers yang menonjol."}
               </div>
            </div>
         </CryptoCard>
      </div>
    </div>
  );
}
