import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: 'indigo' | 'emerald' | 'amber';
  showLabel?: boolean;
  className?: string;
}

const colorMap = {
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
};

export function ProgressBar({ value, label, color = 'indigo', showLabel = false, className = '' }: ProgressBarProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showLabel) && (
        <div className="flex justify-between text-sm">
          {label && <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>}
          {showLabel && <span className="text-slate-500">{value}%</span>}
        </div>
      )}
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-none h-2.5 overflow-hidden">
        <div 
          className={`${colorMap[color]} h-full transition-all duration-300 ease-out`} 
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
