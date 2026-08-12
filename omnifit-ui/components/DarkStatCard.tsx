import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DarkStatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'blue';
  className?: string;
  subtitle?: string;
}

const colorMap = {
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', icon: 'text-indigo-500/50' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: 'text-emerald-500/50' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: 'text-amber-500/50' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: 'text-blue-500/50' },
};

export function DarkStatCard({ label, value, icon: Icon, accentColor = 'indigo', className = '', subtitle }: DarkStatCardProps) {
  const colors = colorMap[accentColor];

  return (
    <div className={`bg-slate-900 rounded-none p-6 border border-slate-800 shadow-2xl relative overflow-hidden ${className}`}>
      <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 ${colors.bg} rounded-full blur-2xl`}></div>
      <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">{label}</h3>
      <div className="text-5xl font-black text-white flex items-center">
        {value} {Icon && <Icon className={`ml-4 h-8 w-8 ${colors.icon}`} />}
      </div>
      {subtitle && <p className={`text-xs ${colors.text} mt-3`}>{subtitle}</p>}
    </div>
  );
}
