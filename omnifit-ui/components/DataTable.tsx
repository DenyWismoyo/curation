import React from 'react';
import { SpotlightCard } from './SpotlightCard';

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <SpotlightCard className={`p-1 ${className}`}>
      <div className="bg-white/60 dark:bg-slate-900/40 rounded-none overflow-hidden backdrop-blur-md">
        {children}
      </div>
    </SpotlightCard>
  );
}
