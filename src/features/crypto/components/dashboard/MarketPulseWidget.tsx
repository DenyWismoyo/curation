"use client";

import React from "react";
import { Activity, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from "lucide-react";
import { PulseStatCard } from "@omnifit-ui/components";

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
      <PulseStatCard
        icon={<DollarSign className="w-5 h-5" />}
        label="Market Cap"
        value={formatCompact(totalMarketCap)}
        color="indigo"
      />
      <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800"></div>

      <PulseStatCard
        icon={<BarChart3 className="w-5 h-5" />}
        label="24H Volume"
        value={formatCompact(totalVolume)}
        color="indigo"
      />
      <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800"></div>

      <PulseStatCard
        icon={<PieChart className="w-5 h-5" />}
        label="Dominance"
        color="amber"
        value={
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">BTC</span>
              <span>{btcDominance ? btcDominance.toFixed(1) + '%' : '-'}</span>
            </div>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">ETH</span>
              <span>{ethDominance ? ethDominance.toFixed(1) + '%' : '-'}</span>
            </div>
          </div>
        }
      />
      <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-slate-800"></div>

      <PulseStatCard
        icon={<Activity className="w-5 h-5 text-amber-500" />}
        label="Fear & Greed"
        value={<span className={fgColor}>{fgCurrent?.value || '-'}</span>}
        subValue={fgCurrent?.value_classification || '-'}
        color="amber"
      />
    </div>
  );
}
