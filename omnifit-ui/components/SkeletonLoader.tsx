'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface SkeletonBaseProps {
  className?: string;
  animate?: 'pulse' | 'skeleton' | 'none';
}

function SkeletonBase({ className, animate = 'skeleton' }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "bg-slate-200/50 dark:bg-slate-800/50 rounded-md",
        animate === 'pulse' && "animate-pulse",
        animate === 'skeleton' && "animate-skeleton",
        className
      )}
    />
  );
}

// 1. Skeleton Card
interface SkeletonCardProps extends SkeletonBaseProps {
  hasHeader?: boolean;
  hasFooter?: boolean;
  lines?: number;
}

export function SkeletonCard({ className, hasHeader = true, hasFooter = false, lines = 3, animate }: SkeletonCardProps) {
  return (
    <div className={cn("card-solid p-6 flex flex-col gap-4", className)}>
      {hasHeader && (
        <div className="flex items-center gap-3 mb-2">
          <SkeletonBase className="w-10 h-10 rounded-full" animate={animate} />
          <div className="space-y-2 flex-1">
            <SkeletonBase className="h-4 w-1/3" animate={animate} />
            <SkeletonBase className="h-3 w-1/4" animate={animate} />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase 
            key={i} 
            className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} 
            animate={animate} 
          />
        ))}
      </div>

      {hasFooter && (
        <div className="mt-4 pt-4 border-t flex justify-end gap-2">
          <SkeletonBase className="h-9 w-20 rounded-lg" animate={animate} />
          <SkeletonBase className="h-9 w-24 rounded-lg" animate={animate} />
        </div>
      )}
    </div>
  );
}

// 2. Skeleton Table Row
interface SkeletonTableRowProps extends SkeletonBaseProps {
  columns?: number;
  hasAvatar?: boolean;
}

export function SkeletonTableRow({ className, columns = 4, hasAvatar = false, animate }: SkeletonTableRowProps) {
  return (
    <div className={cn("flex items-center gap-4 py-3 border-b border-border/50 last:border-0", className)}>
      {hasAvatar && (
        <SkeletonBase className="w-8 h-8 rounded-full flex-shrink-0" animate={animate} />
      )}
      
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className={cn("flex-1", i === 0 && !hasAvatar ? "flex-[2]" : "")}>
          <SkeletonBase className={cn("h-4", i === 0 ? "w-3/4" : "w-1/2")} animate={animate} />
        </div>
      ))}
    </div>
  );
}

// 3. Skeleton Profile
export function SkeletonProfile({ className, animate }: SkeletonBaseProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <SkeletonBase className="w-16 h-16 rounded-full" animate={animate} />
      <div className="space-y-2 flex-1">
        <SkeletonBase className="h-5 w-40" animate={animate} />
        <SkeletonBase className="h-4 w-24" animate={animate} />
      </div>
    </div>
  );
}

// 4. Skeleton Stat Row (for Data Dashboard)
export function SkeletonStatRow({ className, animate }: SkeletonBaseProps) {
  return (
    <div className={cn("flex items-center justify-between p-4 card-base", className)}>
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-20" animate={animate} />
        <SkeletonBase className="h-6 w-32" animate={animate} />
      </div>
      <SkeletonBase className="h-10 w-10 rounded-xl" animate={animate} />
    </div>
  );
}
