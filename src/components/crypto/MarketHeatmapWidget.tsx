"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid, TrendingUp, TrendingDown, Clock } from "lucide-react";
import Link from "next/link";

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
      <div className="flex items-center gap-2 mb-4">
         <Grid className="w-5 h-5 text-indigo-500" />
         <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Market Heatmap (24H Movers)</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {displayData.map((coin, idx) => {
           const isPositive = coin.change >= 0;
           const absChange = Math.abs(coin.change);
           
           // Color intensity based on change magnitude
           let bgColor = "bg-slate-800";
           if (isPositive) {
              if (absChange > 10) bgColor = "bg-emerald-500";
              else if (absChange > 5) bgColor = "bg-emerald-600";
              else bgColor = "bg-emerald-800/80";
           } else {
              if (absChange > 10) bgColor = "bg-rose-500";
              else if (absChange > 5) bgColor = "bg-rose-600";
              else bgColor = "bg-rose-800/80";
           }

           return (
             <Link href={`/crypto-report/${coin.symbol}USDT`} key={idx}>
               <div className={`${bgColor} rounded-xl p-3 flex flex-col items-center justify-center h-24 text-white transition-transform hover:scale-105 hover:shadow-lg hover:z-10 relative group border border-white/10`}>
                 <span className="font-black text-sm md:text-base tracking-tight">{coin.symbol}</span>
                 <span className="text-xs font-medium opacity-90 mt-1">
                    {isPositive ? '+' : ''}{coin.change.toFixed(2)}%
                 </span>
                 
                 {/* Tooltip */}
                 <div className="absolute -top-10 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                    ${coin.price.toFixed(4)}
                 </div>
               </div>
             </Link>
           );
        })}
      </div>
    </div>
  );
}
