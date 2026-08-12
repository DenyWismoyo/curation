import React from 'react';
import { cn } from '../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullscreen?: boolean;
  className?: string;
}

export function LoadingSpinner({ size = 'md', label, fullscreen = false, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
  };

  const spinner = (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={cn("animate-spin rounded-full border-indigo-600 dark:border-indigo-500 border-t-transparent dark:border-t-transparent mb-4", sizeClasses[size])}></div>
      {label && <p className="text-slate-500 dark:text-slate-400 text-sm">{label}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center bg-transparent">
        {spinner}
      </div>
    );
  }

  return spinner;
}
