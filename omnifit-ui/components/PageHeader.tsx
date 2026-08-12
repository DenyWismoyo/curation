import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 mb-2">
          {Icon && <Icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />}
          {title}
        </h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
