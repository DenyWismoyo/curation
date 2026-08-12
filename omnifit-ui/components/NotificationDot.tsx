'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';

interface NotificationDotProps {
  count?: number;
  color?: OmnifitColor | 'rose';
  ping?: boolean;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'relative';
}

const colorMap = {
  indigo: 'bg-indigo-500',
  amber:  'bg-amber-500',
  emerald:'bg-emerald-500',
  rose:   'bg-rose-500',
};

export function NotificationDot({
  count,
  color = 'rose',
  ping = true,
  className,
  position = 'top-right'
}: NotificationDotProps) {
  
  const positionClass = {
    'top-right': 'absolute -top-1 -right-1',
    'top-left': 'absolute -top-1 -left-1',
    'bottom-right': 'absolute -bottom-1 -right-1',
    'bottom-left': 'absolute -bottom-1 -left-1',
    'relative': 'relative'
  }[position];

  const bgColor = colorMap[color];

  return (
    <div className={cn("z-10", positionClass, className)}>
      <div className="relative flex items-center justify-center">
        {ping && (
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            bgColor
          )} />
        )}
        
        {count !== undefined && count > 0 ? (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "relative inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1.5 py-0.5 min-w-[18px] min-h-[18px] border-2 border-background",
              bgColor
            )}
          >
            {count > 99 ? '99+' : count}
          </m.span>
        ) : (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "relative inline-flex rounded-full w-2.5 h-2.5 border-2 border-background",
              bgColor
            )}
          />
        )}
      </div>
    </div>
  );
}
