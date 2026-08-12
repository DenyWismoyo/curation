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
  
  // Determine text size based on content length
  const valueStr = String(value);
  const isLongText = valueStr.length > 15;
  const isMediumText = valueStr.length > 8;
  const textSizeClass = isLongText ? "text-lg md:text-xl font-semibold leading-tight" : isMediumText ? "text-2xl md:text-3xl font-bold" : "text-4xl md:text-5xl font-black";
  const alignmentClass = isLongText ? "items-start" : "items-center";

  return (
    <div className={`bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col h-full ${className}`}>
      <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 ${colors.bg} rounded-full blur-2xl`}></div>
      <h3 className="text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-wider mb-3 md:mb-4 shrink-0">{label}</h3>
      <div className={`${textSizeClass} text-white flex ${alignmentClass} justify-between flex-1`}>
        <span className="flex-1">{value}</span>
        {Icon && <Icon className={`ml-3 md:ml-4 h-6 w-6 md:h-8 md:w-8 shrink-0 ${colors.icon}`} />}
      </div>
      {subtitle && <p className={`text-xs ${colors.text} mt-3 shrink-0`}>{subtitle}</p>}
    </div>
  );
}
