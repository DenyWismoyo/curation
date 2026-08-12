'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { cn } from '../utils/cn';

export interface TickerData {
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  flash?: 'up' | 'down' | null;
}

interface TickerTapeProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  items: TickerData[];
  icon?: React.ReactNode;
}

export function TickerTape({
  title = 'Live Market',
  items,
  icon = <Activity className="w-4 h-4 text-amber-500 relative z-10" />,
  className,
  ...props
}: TickerTapeProps) {
  return (
    <div
      className={cn(
        'w-full backdrop-blur-xl card-solid/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm py-2.5 px-5 flex items-center justify-between lg:justify-start gap-6 overflow-hidden rounded-2xl relative',
        className
      )}
      {...props}
    >
      {/* Decorative gradient blur */}
      <div className="absolute -left-20 -top-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-2 text-muted-foreground text-xs font-black uppercase tracking-widest shrink-0 relative z-10">
        <div className="relative flex items-center justify-center">
          {icon}
          <div className="absolute inset-0 bg-amber-500/40 rounded-full blur-sm animate-pulse"></div>
        </div>
        <span>{title}</span>
      </div>

      <div className="flex items-center gap-8 overflow-x-auto no-scrollbar flex-1 relative z-10 [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
        {items.map((ticker) => (
          <div
            key={ticker.symbol}
            className="flex items-center gap-2.5 shrink-0 group transition-transform hover:scale-105 cursor-default"
          >
            <span className="font-bold text-sm text-foreground drop-shadow-sm">
              {ticker.symbol}
            </span>
            <span
              className={cn(
                'font-mono text-sm font-semibold transition-colors duration-300 drop-shadow-sm',
                ticker.flash === 'up'
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : ticker.flash === 'down'
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-muted-foreground'
              )}
            >
              ${ticker.price}
            </span>
            <span
              className={cn(
                'flex items-center text-xs font-black px-1.5 py-0.5 rounded-md transition-colors',
                ticker.isUp
                  ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
              )}
            >
              {ticker.isUp ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {ticker.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
