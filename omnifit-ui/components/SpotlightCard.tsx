'use client';

import React, { useRef, useState } from 'react';
import { m, useMotionTemplate, useMotionValue } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  color?: OmnifitColor | 'rose';
}

export function SpotlightCard({
  children,
  color = 'indigo',
  className,
  ...props
}: SpotlightCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const spotColor = {
    indigo: 'rgba(99, 102, 241, 0.15)',
    amber: 'rgba(245, 158, 11, 0.15)',
    emerald: 'rgba(16, 185, 129, 0.15)',
    rose: 'rgba(244, 63, 94, 0.15)',
  }[color];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative overflow-hidden rounded-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 p-8 transition-all duration-500 hover:-translate-y-1',
        {
          'hover:border-indigo-500/40 glow-indigo-sm': color === 'indigo',
          'hover:border-amber-500/40 glow-amber': color === 'amber',
          'hover:border-emerald-500/40 glow-emerald': color === 'emerald',
          'hover:border-rose-500/40 glow-rose': color === 'rose',
        },
        className
      )}
      {...props}
    >
      <m.div
        className="pointer-events-none absolute -inset-px rounded-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${spotColor},
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
}
