import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

interface SectionPanelProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  border?: 'indigo' | 'blue' | 'teal' | 'default';
  className?: string;
}

const borderMap = {
  indigo: 'border-t-4 border-t-indigo-500',
  blue: 'border-t-4 border-t-blue-500',
  teal: 'border-t-4 border-t-teal-500',
  default: '',
};

export function SectionPanel({ title, icon: Icon, iconColor = 'text-slate-500', children, footer, border = 'default', className = '' }: SectionPanelProps) {
  return (
    <GlassPanel intensity="medium" className={`!p-0 ${borderMap[border]} ${className}`}>
      <div className="p-6">
        <h2 className="text-lg font-semibold flex items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3 text-slate-900 dark:text-white">
          {Icon && <Icon className={`mr-2 h-5 w-5 ${iconColor}`} />}
          {title}
        </h2>
        <div>
          {children}
        </div>
      </div>
      {footer && (
        <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          {footer}
        </div>
      )}
    </GlassPanel>
  );
}
