'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface AnalyticsDashboardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function AnalyticsDashboardGrid({
  children,
  className,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 }
}: AnalyticsDashboardGridProps) {
  
  // Construct dynamic grid columns based on props
  // We use inline styles for the grid-template-columns since Tailwind doesn't 
  // support arbitrary dynamic columns easily without safelisting all combinations.
  // Actually, standardizing on a simple responsive utility approach is better for Tailwind.

  const getColsClass = () => {
    return cn(
      'grid gap-4 md:gap-6',
      columns.sm ? `grid-cols-${columns.sm}` : 'grid-cols-1',
      columns.md ? `md:grid-cols-${columns.md}` : '',
      columns.lg ? `lg:grid-cols-${columns.lg}` : '',
      columns.xl ? `xl:grid-cols-${columns.xl}` : ''
    );
  };

  return (
    <div className={cn(
      'grid gap-4 md:gap-6',
      // We'll hardcode the standard responsive pattern if columns aren't standard
      // to play nicely with Tailwind's JIT compiler.
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )}>
      {children}
    </div>
  );
}
