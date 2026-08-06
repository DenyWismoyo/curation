import React from 'react';
import { cn } from '@/lib/utils/cn';

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-4 sm:p-6',
  md: 'p-6 md:p-8',
  lg: 'p-6 md:p-10',
};

export function ContentCard({
  children,
  className,
  padding = 'md',
}: ContentCardProps) {
  return (
    <div
      className={cn(
        'bg-card ring-1 ring-border rounded-2xl shadow-sm',
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
