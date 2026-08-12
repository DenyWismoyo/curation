'use client';

import React, { useRef } from 'react';
import { m, useInView, Variants } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';
import { AnimatedCounter } from './AnimatedCounter';

interface SparklineCardProps {
  title: string;
  value: number | string;
  data: number[]; // Array of values for the sparkline
  color?: OmnifitColor;
  className?: string;
}

const colorMap: Record<OmnifitColor, { line: string; fill: string; glow: string }> = {
  indigo: { line: OMNIFIT_COLORS.indigo.base, fill: 'rgba(99,102,241,0.2)', glow: 'drop-shadow(0 -4px 8px rgba(99,102,241,0.3))' },
  amber:  { line: OMNIFIT_COLORS.amber.base,  fill: 'rgba(245,158,11,0.2)', glow: 'drop-shadow(0 -4px 8px rgba(245,158,11,0.3))' },
  emerald:{ line: OMNIFIT_COLORS.emerald.base,fill: 'rgba(16,185,129,0.2)', glow: 'drop-shadow(0 -4px 8px rgba(16,185,129,0.3))' },
  rose:   { line: OMNIFIT_COLORS.rose.base,   fill: 'rgba(244,63,94,0.2)', glow: 'drop-shadow(0 -4px 8px rgba(244,63,94,0.3))' },
  slate:  { line: '#64748b', fill: 'rgba(100,116,139,0.2)', glow: 'drop-shadow(0 -4px 8px rgba(100,116,139,0.3))' },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export function SparklineCard({
  title,
  value,
  data,
  color = 'indigo',
  className,
}: SparklineCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const theme = colorMap[color];

  // SVG Calculations
  const width = 200;
  const height = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const fillPathD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return (
    <m.div
      ref={ref}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={cn('card-solid p-5 flex flex-col justify-between overflow-hidden relative', className)}
    >
      <div className="z-10 relative">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
        <div className="text-3xl font-black tracking-tight text-foreground mt-1">
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-80 mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {/* Fill Gradient */}
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.fill} stopOpacity={1} />
              <stop offset="100%" stopColor={theme.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <m.path
            d={fillPathD}
            fill={`url(#gradient-${color})`}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          />

          {/* Stroke Line */}
          <m.path
            d={pathD}
            fill="none"
            stroke={theme.line}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
            style={{ filter: theme.glow }}
          />
        </svg>
      </div>
    </m.div>
  );
}
