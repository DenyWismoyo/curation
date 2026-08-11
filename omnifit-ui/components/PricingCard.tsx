'use client';

import React from 'react';
import { m } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface PricingCardProps {
  title: string;
  badge?: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaText: string;
  highlighted?: boolean;
  color?: 'indigo' | 'amber' | 'emerald';
  onClickCTA?: () => void;
}

export function PricingCard({
  title,
  badge,
  price,
  period,
  description,
  features,
  ctaText,
  highlighted = false,
  color = 'indigo',
  onClickCTA,
}: PricingCardProps) {
  const colorMap = {
    indigo: {
      border: 'border-indigo-500/50',
      bg: 'bg-indigo-950/20',
      glow: 'glow-indigo',
      text: 'text-indigo-400',
      btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    amber: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-950/20',
      glow: 'glow-amber',
      text: 'text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    emerald: {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/20',
      glow: 'glow-emerald',
      text: 'text-emerald-400',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }
  };

  const theme = colorMap[color];

  return (
    <div
      className={cn(
        'relative rounded-[2rem] p-8 flex flex-col h-full border overflow-hidden transition-all duration-300 hover:-translate-y-1',
        highlighted
          ? `card-premium-dark border-transparent ${theme.glow}`
          : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
      )}
    >
      {/* Scan line effect for highlighted card */}
      {highlighted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
          <div className="w-full h-[10%] bg-gradient-to-b from-transparent via-white/10 to-transparent animate-scan" />
        </div>
      )}

      {badge && (
        <div className="mb-4">
          <span className={cn('px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border', theme.badge)}>
            {badge}
          </span>
        </div>
      )}

      <h3 className="text-2xl font-black text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 h-10">{description}</p>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black">{price}</span>
          {period && <span className="text-muted-foreground font-medium">{period}</span>}
        </div>
      </div>

      <div className="flex-grow">
        <ul className="space-y-4 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className={cn("w-5 h-5 shrink-0 mt-0.5", theme.text)} />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onClickCTA}
        className={cn(
          'w-full py-3 px-6 rounded-xl font-bold transition-all duration-200 mt-auto shadow-sm',
          highlighted
            ? `${theme.btn} hover:shadow-lg shadow-black/20`
            : 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100'
        )}
      >
        {ctaText}
      </button>
    </div>
  );
}
