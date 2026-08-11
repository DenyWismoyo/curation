'use client';

import React from 'react';

const TECHNOLOGIES = [
  'Google Cloud', 'Firebase', 'Gemini AI', 'Next.js', 'React',
  'Framer Motion', 'Binance API', 'Tailwind CSS', 'DeepSeek', 'CoinGecko',
  'TypeScript', 'Vercel', 'Bybit API', 'Node.js', 'Multi-Agent Framework'
];

export function TechStackBar() {
  return (
    <div className="w-full overflow-hidden bg-background/80 dark:bg-slate-950/80 border-y border-border dark:border-slate-800/50 py-4 flex relative select-none">
      {/* Left/Right Fade Gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background dark:from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background dark:from-slate-950 to-transparent z-10 pointer-events-none" />
      
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Double the list for infinite scroll effect */}
        {[...TECHNOLOGIES, ...TECHNOLOGIES].map((tech, idx) => (
          <span 
            key={idx} 
            className="mx-6 text-sm font-black tracking-widest uppercase text-muted-foreground/40 dark:text-slate-700 flex items-center gap-4"
          >
            <span>{tech}</span>
            <span className="text-border dark:text-slate-800">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
