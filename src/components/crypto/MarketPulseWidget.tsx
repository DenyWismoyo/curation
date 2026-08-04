"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MarketPulseWidgetProps {
  globalMarket?: any;
  fearAndGreed?: any;
}

export default function MarketPulseWidget({ globalMarket, fearAndGreed }: MarketPulseWidgetProps) {
  if (!globalMarket && !fearAndGreed) return null;

  const btcDominance = globalMarket?.market_cap_percentage?.btc;
  const ethDominance = globalMarket?.market_cap_percentage?.eth;
  const totalMarketCap = globalMarket?.total_market_cap?.usd;
  const totalVolume = globalMarket?.total_volume?.usd;
  
  const formatCompact = (num?: number) => {
    if (!num) return "-";
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    return `$${(num / 1e6).toFixed(2)}M`;
  };

  const fgCurrent = fearAndGreed?.current || (fearAndGreed?.value ? fearAndGreed : null); 
  const fgHistory = fearAndGreed?.history || [];
  
  const fgColor = fgCurrent?.value >= 70 ? "text-emerald-500" : fgCurrent?.value <= 30 ? "text-rose-500" : "text-amber-500";
  const fgBgColor = fgCurrent?.value >= 70 ? "bg-emerald-500/10 border-emerald-500/20" : fgCurrent?.value <= 30 ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
      {/* Total Market Cap */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800/60 backdrop-blur-xl shadow-lg overflow-hidden relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-indigo-500/10">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-500"></div>
        <CardContent className="p-5 flex flex-col justify-center h-full relative z-10">
           <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">
             <DollarSign className="w-4 h-4 text-indigo-400" /> Total Market Cap
           </div>
           <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
             {formatCompact(totalMarketCap)}
           </div>
        </CardContent>
      </Card>

      {/* 24H Volume */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800/60 backdrop-blur-xl shadow-lg overflow-hidden relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-blue-500/10">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/30 transition-all duration-500"></div>
        <CardContent className="p-5 flex flex-col justify-center h-full relative z-10">
           <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">
             <BarChart3 className="w-4 h-4 text-blue-400" /> 24H Volume
           </div>
           <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
             {formatCompact(totalVolume)}
           </div>
        </CardContent>
      </Card>

      {/* BTC Dominance */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800/60 backdrop-blur-xl shadow-lg overflow-hidden relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-orange-500/10">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/25 transition-all duration-500"></div>
        <CardContent className="p-5 flex flex-col justify-center h-full relative z-10">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">
               <PieChart className="w-4 h-4 text-orange-400" /> Dominance
             </div>
           </div>
           <div className="flex items-end gap-4">
              <div>
                 <span className="text-[10px] text-slate-500 font-bold block mb-0.5">BTC</span>
                 <span className="text-xl sm:text-2xl font-black text-white tracking-tight">{btcDominance ? btcDominance.toFixed(1) + '%' : '-'}</span>
              </div>
              <div className="w-px h-8 bg-slate-800"></div>
              <div>
                 <span className="text-[10px] text-slate-500 font-bold block mb-0.5">ETH</span>
                 <span className="text-xl sm:text-2xl font-black text-white tracking-tight">{ethDominance ? ethDominance.toFixed(1) + '%' : '-'}</span>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Fear & Greed */}
      <Card className={`bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl shadow-lg border-slate-800/60 overflow-hidden relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-lg`}>
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${fgBgColor}`}></div>
        <CardContent className="p-5 flex flex-col justify-center h-full relative z-10">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">
               <Activity className={`w-4 h-4 ${fgColor}`} /> Fear & Greed
             </div>
             {fgHistory.length > 1 && (
               <Badge variant="outline" className="text-[9px] bg-slate-950/50 border-slate-800/80 uppercase px-1.5 py-0 shadow-inner">
                 {parseInt(fgCurrent.value) > parseInt(fgHistory[1].value) ? <TrendingUp className="w-3 h-3 text-emerald-400 mr-1" /> : <TrendingDown className="w-3 h-3 text-rose-400 mr-1" />}
                 vs Kemarin
               </Badge>
             )}
           </div>
           <div className="flex items-end gap-2">
             <span className={`text-3xl font-black tracking-tight ${fgColor}`}>{fgCurrent?.value || '-'}</span>
             <span className="text-xs sm:text-sm font-black text-slate-300 pb-1.5 uppercase tracking-wider">{fgCurrent?.value_classification || '-'}</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
