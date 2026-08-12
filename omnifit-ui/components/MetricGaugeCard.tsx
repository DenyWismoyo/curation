'use client';

import React, { useRef } from 'react';
import { m, useInView, Variants } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';
import { AnimatedCounter } from './AnimatedCounter';

interface MetricGaugeCardProps {
  title: string;
  value: number; // 0-100
  label?: string; // misal: "Health Score"
  color?: OmnifitColor;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const colorMap: Record<OmnifitColor, { stroke: string; glow: string }> = {
  indigo: { stroke: OMNIFIT_COLORS.indigo.base, glow: 'drop-shadow(0 0 12px rgba(99,102,241,0.6))' },
  amber:  { stroke: OMNIFIT_COLORS.amber.base, glow: 'drop-shadow(0 0 12px rgba(245,158,11,0.6))' },
  emerald:{ stroke: OMNIFIT_COLORS.emerald.base, glow: 'drop-shadow(0 0 12px rgba(16,185,129,0.6))' },
  rose:   { stroke: OMNIFIT_COLORS.rose.base, glow: 'drop-shadow(0 0 12px rgba(244,63,94,0.6))' },
};

const sizeMap = {
  sm: { width: 160, height: 80, stroke: 12, text: 'text-3xl' },
  md: { width: 220, height: 110, stroke: 16, text: 'text-5xl' },
  lg: { width: 280, height: 140, stroke: 20, text: 'text-6xl' },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export function MetricGaugeCard({
  title,
  value,
  label,
  color = 'indigo',
  className,
  size = 'md',
}: MetricGaugeCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const theme = colorMap[color];
  const { width, height, stroke, text } = sizeMap[size];
  
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius; // Setengah lingkaran
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <m.div
      ref={ref}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={cn('card-solid p-6 flex flex-col items-center text-center', className)}
    >
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 w-full text-left">
        {title}
      </h3>

      <div className="relative mt-2" style={{ width, height }}>
        <svg width={width} height={width} className="absolute bottom-0 left-0">
          {/* Background Track (Setengah lingkaran) */}
          <path
            d={`M ${stroke/2} ${width/2} A ${radius} ${radius} 0 0 1 ${width - stroke/2} ${width/2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="chart-track"
          />
          
          {/* Progress Fill (Setengah lingkaran) */}
          <m.path
            d={`M ${stroke/2} ${width/2} A ${radius} ${radius} 0 0 1 ${width - stroke/2} ${width/2}`}
            fill="none"
            stroke={theme.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
            style={{ filter: theme.glow }}
          />
        </svg>

        {/* Value Text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 flex flex-col items-center">
          <m.span 
            className={cn("font-black tracking-tighter text-foreground leading-none", text)}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {isInView ? <AnimatedCounter value={clampedValue} /> : '0'}
          </m.span>
        </div>
      </div>

      {label && (
        <m.p 
          className="text-xs font-bold text-muted-foreground mt-6 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {label}
        </m.p>
      )}
    </m.div>
  );
}
