"use client";

import React from "react";
import { Activity, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from "lucide-react";
import { CryptoStatCard, CryptoBadge } from "../ui/CryptoUIKit";

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
  const fgColor = fgCurrent?.value >= 70 ? "text-emerald-500" : fgCurrent?.value <= 30 ? "text-rose-500" : "text-amber-500";

  return (
    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 card-solid/60 dark:bg-slate-900/40 backdrop-blur-md border border-border/50 dark:border-slate-800/50 rounded-2xl p-4 sm:p-5 mb-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      {/* Total Market Cap */}
      <div className="flex items-center gap-3 flex-1 min-w-[140px]">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-xl">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Market Cap</p>
          <p className="text-sm sm:text-base font-black text-foreground">{formatCompact(totalMarketCap)}</p>
        </div>
      </div>

      <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800"></div>

      {/* 24H Volume */}
      <div className="flex items-center gap-3 flex-1 min-w-[140px]">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">24H Volume</p>
          <p className="text-sm sm:text-base font-black text-foreground">{formatCompact(totalVolume)}</p>
        </div>
      </div>

      <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800"></div>

      {/* Dominance */}
      <div className="flex items-center gap-3 flex-1 min-w-[140px]">
        <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-xl">
          <PieChart className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">BTC</p>
            <p className="text-xs sm:text-sm font-black text-foreground">{btcDominance ? btcDominance.toFixed(1) + '%' : '-'}</p>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">ETH</p>
            <p className="text-xs sm:text-sm font-black text-foreground">{ethDominance ? ethDominance.toFixed(1) + '%' : '-'}</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800"></div>

      {/* Fear & Greed */}
      <div className="flex items-center gap-3 flex-1 min-w-[140px]">
        <div className="p-2.5 bg-secondary text-secondary-foreground text-muted-foreground dark:text-slate-400 rounded-xl">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Fear & Greed</p>
          <p className="text-sm sm:text-base font-black flex items-center gap-1.5">
            <span className={fgColor}>{fgCurrent?.value || '-'}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{fgCurrent?.value_classification || '-'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
