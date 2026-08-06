"use client";

import React from "react";
import { CalendarDays, CalendarClock, TrendingUp, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CryptoCard, CryptoBadge, CryptoEmptyState } from "../ui/CryptoUIKit";

interface WeeklyMonthlyOutlookWidgetProps {
  reportData?: any;
}

export default function WeeklyMonthlyOutlookWidget({ reportData }: WeeklyMonthlyOutlookWidgetProps) {
  const weeklyStrategy = reportData?.weeklyStrategy;
  const weeklyWatchlist = reportData?.weeklyWatchlist || [];
  const monthlyOutlook = reportData?.monthlyOutlook;
  const monthlyKeyLevels = reportData?.monthlyKeyLevels || [];

  if (!weeklyStrategy && !monthlyOutlook) {
     return (
       <CryptoEmptyState
         icon={<CalendarDays className="w-8 h-8" />}
         title="Belum Ada Outlook"
         description="Laporan outlook mingguan/bulanan belum dibuat. Sinkronisasi AI berikutnya akan menyediakannya."
       />
     );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* WEEKLY OUTLOOK */}
      {weeklyStrategy && (
        <section>
          <div className="flex items-center gap-3 mb-6">
             <CalendarDays className="w-6 h-6 text-indigo-500" />
             <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Outlook Mingguan</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <CryptoCard variant="elevated" className="lg:col-span-2 p-6 md:p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Macro Strategy & Narrative</h3>
                <div className="prose prose-sm md:prose-base prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed relative z-10">
                   <ReactMarkdown>{weeklyStrategy}</ReactMarkdown>
                </div>
             </CryptoCard>
             
             {weeklyWatchlist.length > 0 && (
               <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Watchlist Mingguan</h3>
                  {weeklyWatchlist.map((item: any, idx: number) => {
                     const isBuy = item.action.includes("BUY");
                     const isSell = item.action.includes("SELL");
                     const badgeColor = isBuy ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                      : isSell ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                                      : "bg-amber-500/20 text-amber-400 border-amber-500/30";
                     
                     return (
                       <CryptoCard key={idx} variant="subtle" className="p-4">
                             <div className="flex justify-between items-start mb-3">
                                <span className="font-black text-lg text-slate-900 dark:text-white">{item.symbol}</span>
                                <CryptoBadge variant={isBuy ? "bullish" : isSell ? "danger" : "neutral"}>
                                   {item.action}
                                </CryptoBadge>
                             </div>
                             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                                {item.reason}
                             </p>
                             <div className="flex gap-4 text-xs font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div><span className="text-slate-600">Entry:</span> <span className="text-indigo-400">{item.entryPrice}</span></div>
                                <div><span className="text-slate-600">Target:</span> <span className="text-emerald-400">{item.targetPrice}</span></div>
                             </div>
                       </CryptoCard>
                     )
                  })}
               </div>
             )}
          </div>
        </section>
      )}

      {/* MONTHLY OUTLOOK */}
      {monthlyOutlook && (
        <section>
          <div className="flex items-center gap-3 mb-6 pt-8 border-t border-slate-200 dark:border-slate-800/50">
             <CalendarClock className="w-6 h-6 text-fuchsia-500" />
             <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Outlook Bulanan</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <CryptoCard variant="elevated" className="lg:col-span-2 p-6 md:p-8">
                <div className="absolute top-0 left-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Monthly Trend Forecast</h3>
                <div className="prose prose-sm md:prose-base prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed relative z-10">
                   <ReactMarkdown>{monthlyOutlook}</ReactMarkdown>
                </div>
             </CryptoCard>
             
             {monthlyKeyLevels.length > 0 && (
               <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Level Kritis Bulanan</h3>
                  {monthlyKeyLevels.map((item: any, idx: number) => (
                     <CryptoCard key={idx} variant="subtle" className="p-4">
                           <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                              <span className="font-black text-slate-900 dark:text-white">{item.symbol}</span>
                           </div>
                           <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                              {item.narrative}
                           </p>
                           <div className="space-y-2 text-xs font-mono">
                              <div className="flex justify-between items-center bg-emerald-100 dark:bg-emerald-950/20 p-2 rounded border border-emerald-300 dark:border-emerald-900/30">
                                 <span className="text-emerald-500/70">Critical Res</span>
                                 <span className="text-emerald-400 font-bold">{item.criticalResistance}</span>
                              </div>
                              <div className="flex justify-between items-center bg-rose-100 dark:bg-rose-950/20 p-2 rounded border border-rose-900/30">
                                 <span className="text-rose-500/70">Critical Sup</span>
                                 <span className="text-rose-400 font-bold">{item.criticalSupport}</span>
                              </div>
                           </div>
                     </CryptoCard>
                  ))}
               </div>
             )}
          </div>
        </section>
      )}

    </div>
  );
}
