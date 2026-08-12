"use client";

import React from "react";
import { Grid } from "lucide-react";
import { HeatmapCard } from "@omnifit-ui/components";

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
            <h2 className="text-xl font-bold text-foreground dark:text-slate-100 tracking-tight">Market Heatmap <span className="text-sm font-medium text-muted-foreground ml-2">(24H Movers)</span></h2>
         </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {displayData.map((coin, idx) => (
          <HeatmapCard
            key={idx}
            symbol={coin.symbol}
            price={coin.price}
            change={coin.change}
            href={`/crypto-report/${coin.symbol}USDT`}
          />
        ))}
      </div>
    </div>
  );
}
