"use client";

import React from "react";
import { History } from "lucide-react";
import { SpotlightCard } from "@omnifit-ui/components";

interface TemporalComparisonWidgetProps {
  reportData?: any;
}

export default function TemporalComparisonWidget({ reportData }: TemporalComparisonWidgetProps) {
  const temporal = reportData?.temporalComparison;
  
  if (!temporal) {
     return (
       <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
         <History className="w-8 h-8 text-muted-foreground mb-4" />
         <h3 className="text-lg font-bold text-foreground">Belum Tersedia</h3>
         <p className="text-muted-foreground">Data perbandingan temporal belum tersedia di laporan ini.</p>
       </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
         <History className="w-6 h-6 text-indigo-500" />
         <h2 className="text-2xl font-black text-foreground tracking-tight">Kemarin vs Hari Ini</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Sentiment Change */}
         <SpotlightCard color="indigo" className="p-6">
            <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Pergeseran Sentimen</div>
            <div className="text-lg font-medium text-foreground leading-relaxed">
              {temporal.sentimentChange || "Tidak ada data sentimen."}
            </div>
         </SpotlightCard>

         {/* BTC Price Delta */}
         <SpotlightCard color="amber" className="p-6">
            <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Perubahan Harga BTC</div>
            <div className="text-lg font-medium text-foreground leading-relaxed">
              {temporal.btcPriceDelta || "Tidak ada data perubahan harga BTC."}
            </div>
         </SpotlightCard>

         {/* Notable Movers */}
         <SpotlightCard color="emerald" className="p-6">
            <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Notable Movers</div>
            <div className="text-lg font-medium text-foreground leading-relaxed">
              {temporal.notableMovers || "Tidak ada data movers yang menonjol."}
            </div>
         </SpotlightCard>
      </div>
    </div>
  );
}
