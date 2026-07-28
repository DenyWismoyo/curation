import React from 'react';
import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-[1200px]',
} as const;

export type PageShellSize = keyof typeof sizeMap;

interface PageShellProps {
  children: React.ReactNode;
  size?: PageShellSize;
  className?: string;
  contentClassName?: string;
  /** When true, children fill the shell without inner max-width container */
  fullBleed?: boolean;
}

export function PageShell({
  children,
  size = 'lg',
  className,
  contentClassName,
  fullBleed = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-background font-sans selection:bg-indigo-100 selection:text-indigo-900',
        className
      )}
    >
      {fullBleed ? (
        children
      ) : (
        <div
          className={cn(
            'mx-auto px-6 lg:px-12',
            sizeMap[size],
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
