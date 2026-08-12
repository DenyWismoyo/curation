'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../utils/cn';

interface HeatmapCardProps extends React.HTMLAttributes<HTMLDivElement> {
  symbol: string;
  price: number;
  change: number;
  href?: string;
}

export function HeatmapCard({
  symbol,
  price,
  change,
  href,
  className,
  ...props
}: HeatmapCardProps) {
  const isPositive = change >= 0;
  const absChange = Math.abs(change);
  const isExtreme = absChange > 10;

  // Determine styles based on polarity and extreme change
  let cardStyle = isPositive
    ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40'
    : 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40';

  let textStyle = isPositive
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400';
    
  let changeBg = isPositive
    ? 'bg-emerald-100 dark:bg-emerald-500/20'
    : 'bg-rose-100 dark:bg-rose-500/20';

  if (isExtreme) {
    cardStyle = isPositive
      ? 'bg-emerald-100/50 dark:bg-emerald-500/10 border-emerald-300/60 dark:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
      : 'bg-rose-100/50 dark:bg-rose-500/10 border-rose-300/60 dark:border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]';
    textStyle = isPositive
      ? 'text-emerald-800 dark:text-emerald-300 font-bold'
      : 'text-rose-800 dark:text-rose-300 font-bold';
    changeBg = isPositive
      ? 'bg-emerald-200 dark:bg-emerald-500/30'
      : 'bg-rose-200 dark:bg-rose-500/30';
  }

  const InnerContent = (
    <div
      className={cn(
        'rounded-2xl p-4 flex flex-col justify-between h-[100px] transition-all duration-300 hover:-translate-y-1 relative group border',
        cardStyle,
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <span className="font-black text-base text-foreground dark:text-slate-100 tracking-tight">
          {symbol}
        </span>
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold',
            changeBg,
            textStyle
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {absChange.toFixed(2)}%
        </div>
      </div>

      <div className="flex items-end justify-between mt-2">
        <span className={cn('text-sm font-semibold font-mono', textStyle)}>
          ${price > 1 ? price.toFixed(2) : price.toFixed(4)}
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{InnerContent}</Link>;
  }

  return InnerContent;
}
