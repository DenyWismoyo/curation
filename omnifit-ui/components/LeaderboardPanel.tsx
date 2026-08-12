'use client';

import React from 'react';
import { m, Variants } from 'framer-motion';
import { cn } from '../utils/cn';
import { Trophy } from 'lucide-react';
import { OmnifitColor } from '../tokens/colors';

interface LeaderboardItem {
  id: string | number;
  name: string;
  score: number | string;
  avatar?: React.ReactNode;
  subtitle?: string;
}

interface LeaderboardPanelProps {
  title: string;
  items: LeaderboardItem[];
  color?: OmnifitColor;
  className?: string;
}

const rankColors = {
  1: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-300 dark:border-amber-500/50',
  2: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-300 dark:border-slate-500/50',
  3: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700/50',
};

const getRankStyle = (index: number) => {
  const rank = index + 1;
  if (rank === 1) return rankColors[1];
  if (rank === 2) return rankColors[2];
  if (rank === 3) return rankColors[3];
  return 'bg-transparent text-muted-foreground border-transparent';
};

const containerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariant: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export function LeaderboardPanel({
  title,
  items,
  color = 'indigo',
  className
}: LeaderboardPanelProps) {
  
  return (
    <div className={cn('card-solid p-0 overflow-hidden flex flex-col', className)}>
      <div className="p-5 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Trophy className={cn("w-4 h-4", `text-${color}-500`)} />
          {title}
        </h3>
      </div>
      
      <m.div
        variants={containerVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-20px' }}
        className="flex flex-col p-2"
      >
        {items.map((item, index) => (
          <m.div 
            key={item.id} 
            variants={itemVariant}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2",
              getRankStyle(index)
            )}>
              {index + 1}
            </div>
            
            {item.avatar && (
              <div className="flex-shrink-0">
                {item.avatar}
              </div>
            )}
            
            <div className="flex-grow min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              )}
            </div>
            
            <div className="flex-shrink-0 text-right">
              <span className="text-sm font-black tracking-tight text-foreground">{item.score}</span>
            </div>
          </m.div>
        ))}
      </m.div>
    </div>
  );
}
