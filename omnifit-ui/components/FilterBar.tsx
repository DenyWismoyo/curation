import React from 'react';
import { GlassPanel } from './GlassPanel';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <GlassPanel className={`!p-4 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full ${className}`}>
      {children}
    </GlassPanel>
  );
}
