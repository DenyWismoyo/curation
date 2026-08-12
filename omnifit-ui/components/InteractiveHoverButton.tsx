'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface InteractiveHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  shimmer?: boolean;
}

export function InteractiveHoverButton({
  children,
  variant = 'primary',
  shimmer = true,
  className,
  ...props
}: InteractiveHoverButtonProps) {
  
  const baseClasses = "relative overflow-hidden rounded-none px-6 py-3 font-bold transition-all duration-300 active:scale-95";
  
  const variantMap = {
    primary: "bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:bg-indigo-500",
    secondary: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
    danger: "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] hover:bg-rose-500",
  };

  return (
    <button 
      className={cn(baseClasses, variantMap[variant], className)} 
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
      
      {shimmer && (
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-shimmer" />
      )}
    </button>
  );
}
