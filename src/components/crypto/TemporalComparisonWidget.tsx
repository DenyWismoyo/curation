"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { History, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TemporalComparisonWidgetProps {
  reportData?: any;
}

export default function TemporalComparisonWidget({ reportData }: TemporalComparisonWidgetProps) {
  const temporal = reportData?.temporalComparison;
  
  if (!temporal) {
     return (
       <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-3xl">
          <History className="w-12 h-12 mb-4 opacity-30" />
          <p>Data perbandingan temporal belum tersedia di laporan ini.</p>
       </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
         <History className="w-6 h-6 text-indigo-500" />
         <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Kemarin vs Hari Ini</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Sentiment Change */}
         <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <CardContent className="p-6 relative z-10">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pergeseran Sentimen</div>
               <div className="text-lg font-medium text-slate-300 leading-relaxed">
                 {temporal.sentimentChange || "Tidak ada data sentimen."}
               </div>
            </CardContent>
         </Card>

         {/* BTC Price Delta */}
         <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
            <CardContent className="p-6 relative z-10">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Perubahan Harga BTC</div>
               <div className="text-lg font-medium text-slate-300 leading-relaxed">
                 {temporal.btcPriceDelta || "Tidak ada data perubahan harga BTC."}
               </div>
            </CardContent>
         </Card>

         {/* Notable Movers */}
         <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <CardContent className="p-6 relative z-10">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Notable Movers</div>
               <div className="text-lg font-medium text-slate-300 leading-relaxed">
                 {temporal.notableMovers || "Tidak ada data movers yang menonjol."}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
