'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface AvatarRingProps {
  initials: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarRing({ initials, imageUrl, size = 'md', className }: AvatarRingProps) {
  const sizeMap = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-28 h-28 text-4xl',
  };

  const wrapperSize = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  return (
    <div className={cn('relative flex items-center justify-center', wrapperSize[size], className)}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-full animate-border-spin" 
           style={{
             background: 'conic-gradient(from 0deg, rgba(99,102,241,0.1), rgba(16,185,129,0.5), rgba(245,158,11,0.8), rgba(99,102,241,1), rgba(99,102,241,0.1))',
             padding: '2px'
           }}
      >
        <div className="w-full h-full bg-background rounded-full" />
      </div>
      
      {/* Avatar Content */}
      <div className={cn(
        'relative z-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shadow-inner',
        sizeMap[size]
      )}>
        {imageUrl ? (
          <img src={imageUrl} alt={initials} className="w-full h-full object-cover" />
        ) : (
          <span className="font-black text-indigo-600 dark:text-indigo-400 text-glow-indigo">
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
