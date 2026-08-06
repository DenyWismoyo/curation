import React from 'react';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  valueClassName,
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white p-6 rounded-2xl ring-1 ring-slate-200/60 shadow-sm flex flex-col justify-center',
        className
      )}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <p className={cn('text-3xl font-black mb-1 text-slate-900', valueClassName)}>
        {value}
      </p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}
