"use client";

import React from "react";
import { Grid, TrendingUp, TrendingDown, Clock } from "lucide-react";
import Link from "next/link";
import { CryptoCard } from "../ui/CryptoUIKit";

interface MarketHeatmapWidgetProps {
  marketData?: any[]; // Expecting rawScalpingData or similar with klines
}

export default function MarketHeatmapWidget({ marketData }: MarketHeatmapWidgetProps) {
  if (!marketData || marketData.length === 0) return null;

  // Process data to calculate change
  const processedData = marketData.map((coin: any) => {
    const klines = coin.klines || [];
    if (klines.length < 2) return null;
    
    // We want roughly 24h change. If these are 1H klines and we have 50, 
    // index 0 is 50 hours ago. Index 26 is 24 hours ago.
    const startIndex = Math.max(0, klines.length - 24);
    const startPrice = parseFloat(klines[startIndex].close);
    const currentPrice = parseFloat(klines[klines.length - 1].close);
    
    const changePct = ((currentPrice - startPrice) / startPrice) * 100;
    
    return {
       symbol: coin.symbol.replace("USDT", ""),
       price: currentPrice,
       change: changePct
    };
  }).filter(Boolean) as { symbol: string; price: number; change: number }[];

  // Sort by change
  processedData.sort((a, b) => b.change - a.change);
  
  // Take top 10 gainers and top 10 losers (or just top 20 movers)
  const topGainers = processedData.filter(d => d.change > 0).slice(0, 8);
  const topLosers = [...processedData].filter(d => d.change < 0).sort((a, b) => a.change - b.change).slice(0, 8);

  const displayData = [...topGainers, ...topLosers].sort((a, b) => b.change - a.change);

  if (displayData.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
              <Grid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Market Heatmap <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">(24H Movers)</span></h2>
         </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {displayData.map((coin, idx) => {
           const isPositive = coin.change >= 0;
           const absChange = Math.abs(coin.change);
           
           // Elegant enterprise color styling
           let cardStyle = isPositive 
             ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40" 
             : "bg-rose-50/50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40";
           
           let textStyle = isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
           let changeBg = isPositive ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-rose-100 dark:bg-rose-500/20";
           let icon = isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;

           if (absChange > 10) {
              cardStyle = isPositive 
                ? "bg-emerald-100/50 dark:bg-emerald-500/10 border-emerald-300/60 dark:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                : "bg-rose-100/50 dark:bg-rose-500/10 border-rose-300/60 dark:border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]";
              textStyle = isPositive ? "text-emerald-800 dark:text-emerald-300 font-bold" : "text-rose-800 dark:text-rose-300 font-bold";
              changeBg = isPositive ? "bg-emerald-200 dark:bg-emerald-500/30" : "bg-rose-200 dark:bg-rose-500/30";
           }

           return (
             <Link href={`/crypto-report/${coin.symbol}USDT`} key={idx}>
               <div className={`rounded-2xl p-4 flex flex-col justify-between h-[100px] transition-all duration-300 hover:-translate-y-1 relative group border ${cardStyle}`}>
                 <div className="flex items-start justify-between">
                    <span className="font-black text-base text-slate-800 dark:text-slate-100 tracking-tight">{coin.symbol}</span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${changeBg} ${textStyle}`}>
                       {icon} {absChange.toFixed(2)}%
                    </div>
                 </div>
                 
                 <div className="flex items-end justify-between mt-2">
                    <span className={`text-sm font-semibold font-mono ${textStyle}`}>
                       ${coin.price > 1 ? coin.price.toFixed(2) : coin.price.toFixed(4)}
                    </span>
                 </div>
               </div>
             </Link>
           );
         })}
      </div>
    </div>
  );
}
