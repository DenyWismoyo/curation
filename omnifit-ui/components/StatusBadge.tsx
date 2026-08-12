import React from 'react';

interface StatusBadgeProps {
  variant: 'online' | 'offline' | 'pending' | 'info' | 'action';
  label: string;
  className?: string;
}

export function StatusBadge({ variant, label, className = '' }: StatusBadgeProps) {
  const baseClass = "inline-flex items-center rounded-none px-2 py-1 text-xs font-medium ring-1 ring-inset shadow-sm";
  
  const variantMap = {
    online: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    offline: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    pending: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    info: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    action: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
  };

  return (
    <span className={`${baseClass} ${variantMap[variant]} ${className}`}>
      {label}
    </span>
  );
}
