'use client';

import React from 'react';
import { cn } from '../utils/cn';
import { m, HTMLMotionProps } from 'framer-motion';

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  intensity?: 'light' | 'medium' | 'heavy';
  border?: boolean;
}

export function GlassPanel({ 
  children, 
  intensity = 'medium',
  border = true,
  className,
  ...props
}: GlassPanelProps) {
  
  const intensityMap = {
    light: 'bg-white/30 dark:bg-slate-900/30 backdrop-blur-md',
    medium: 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl',
    heavy: 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl',
  };

  return (
    <m.div 
      className={cn(
        'rounded-2xl overflow-hidden shadow-xl',
        intensityMap[intensity],
        border && 'border border-white/20 dark:border-slate-700/50',
        className
      )}
      {...props}
    >
      {/* Optional Noise Overlay for texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
      
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </m.div>
  );
}
