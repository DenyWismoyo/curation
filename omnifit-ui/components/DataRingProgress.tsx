'use client';

import React, { useRef } from 'react';
import { m, useInView, Variants } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';
import { AnimatedCounter } from './AnimatedCounter';

interface DataRingProgressProps {
  value: number;         // 0-100
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: OmnifitColor;
  showValue?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { ring: 80, stroke: 6, text: 'text-xl' },
  md: { ring: 120, stroke: 10, text: 'text-3xl' },
  lg: { ring: 160, stroke: 12, text: 'text-4xl' },
  xl: { ring: 200, stroke: 16, text: 'text-5xl' },
};

const colorMap: Record<OmnifitColor, { stroke: string; glow: string }> = {
  indigo: { stroke: OMNIFIT_COLORS.indigo.base, glow: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' },
  amber:  { stroke: OMNIFIT_COLORS.amber.base, glow: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' },
  emerald:{ stroke: OMNIFIT_COLORS.emerald.base, glow: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' },
  rose:   { stroke: OMNIFIT_COLORS.rose.base, glow: 'drop-shadow(0 0 8px rgba(244,63,94,0.5))' },
  slate:  { stroke: '#64748b', glow: 'drop-shadow(0 0 8px rgba(100,116,139,0.5))' },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export function DataRingProgress({
  value,
  label,
  sublabel,
  size = 'md',
  color = 'indigo',
  showValue = true,
  className,
}: DataRingProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  
  const { ring, stroke, text } = sizeMap[size];
  const theme = colorMap[color];

  const radius = (ring - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <m.div 
      ref={ref} 
      variants={fadeInUp}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={cn('flex flex-col items-center gap-4', className)}
    >
      <div className="relative" style={{ width: ring, height: ring }}>
        <svg width={ring} height={ring} className="-rotate-90">
          {/* Track */}
          <circle
            cx={ring / 2} cy={ring / 2} r={radius}
            fill="none" stroke="currentColor"
            strokeWidth={stroke}
            className="chart-track"
          />
          {/* Progress */}
          <m.circle
            cx={ring / 2} cy={ring / 2} r={radius}
            fill="none"
            stroke={theme.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
            style={{ filter: theme.glow }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <m.span
              className={cn('font-black tracking-tight text-foreground flex items-baseline', text)}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
            >
              {isInView ? <AnimatedCounter value={clampedValue} /> : '0'}
              <span className="text-sm md:text-base font-bold ml-0.5 text-muted-foreground">%</span>
            </m.span>
          </div>
        )}
      </div>
      {(label || sublabel) && (
        <div className="text-center">
          {label && <p className="text-sm font-bold text-foreground">{label}</p>}
          {sublabel && <p className="text-xs font-medium text-muted-foreground mt-0.5">{sublabel}</p>}
        </div>
      )}
    </m.div>
  );
}
