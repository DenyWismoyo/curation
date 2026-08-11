import React from 'react';
import { cn } from "../../utils/cn";

// ==========================================
// 1. AppKeyValueList & AppKeyValueItem
// ==========================================
interface AppKeyValueListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'card' | 'striped' | 'divided';
}

const listVariantMap = {
  card: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  striped: 'flex flex-col rounded-2xl overflow-hidden ring-1 ring-border shadow-sm',
  divided: 'flex flex-col space-y-1',
};

export function AppKeyValueList({ children, className, variant = 'card' }: AppKeyValueListProps) {
  // Inject variant into children if they are AppKeyValueItem
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { listVariant: variant } as any);
    }
    return child;
  });

  return (
    <div className={cn(listVariantMap[variant], className)}>
      {childrenWithProps}
    </div>
  );
}

interface AppKeyValueItemProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  listVariant?: 'card' | 'striped' | 'divided'; // injected
  index?: number; // optionally injected if we map
}

export function AppKeyValueItem({ label, value, icon, className, listVariant = 'card', index = 0 }: AppKeyValueItemProps) {
  if (value === null || value === undefined || value === '') return null;

  if (listVariant === 'card') {
    return (
      <div className={cn("bg-muted text-muted-foreground p-4 sm:p-5 rounded-2xl ring-1 ring-border flex flex-col justify-center", className)}>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
          {icon} {label}
        </p>
        <div className="text-sm font-bold text-foreground break-words whitespace-pre-wrap leading-relaxed">
          {value}
        </div>
      </div>
    );
  }

  if (listVariant === 'striped') {
    return (
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 transition-colors",
        className,
        // Using odd/even if we could, but rely on parent or just make it solid white with dividers
        "card-solid border-b border-border last:border-b-0 hover:bg-muted text-muted-foreground/50"
      )}>
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1 sm:mb-0 shrink-0 sm:w-1/3">
          {icon} {label}
        </span>
        <span className="text-sm font-bold text-foreground sm:w-2/3 sm:text-right break-words whitespace-pre-wrap">
          {value}
        </span>
      </div>
    );
  }

  // divided
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border last:border-b-0", className)}>
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 shrink-0 mb-1 sm:mb-0">
        {icon} {label}
      </span>
      <span className="text-sm font-bold text-foreground text-left sm:text-right break-words max-w-full sm:max-w-sm lg:max-w-md">
        {value}
      </span>
    </div>
  );
}

// ==========================================
// 2. AppEmptyState
// ==========================================
interface AppEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  minHeight?: string;
}

export function AppEmptyState({
  icon,
  title,
  description,
  action,
  className,
  minHeight = 'min-h-[300px]'
}: AppEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-muted text-muted-foreground/50", minHeight, className)}>
      {icon && (
        <div className="w-16 h-16 card-solid rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-border mb-5 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-black text-foreground mb-2">{title}</h3>
      <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}

// ==========================================
// 3. AppInfoCard
// ==========================================
interface AppInfoCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const infoCardVariantMap = {
  default: 'card-solid ring-slate-200 text-foreground icon-slate-500',
  primary: 'bg-indigo-50 dark:bg-indigo-500/10 ring-indigo-200 dark:ring-indigo-500/20 text-indigo-900 icon-indigo-600',
  success: 'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/20 text-emerald-900 icon-emerald-600',
  warning: 'bg-amber-50 dark:bg-amber-500/10 ring-amber-200 dark:ring-amber-500/20 text-amber-900 icon-amber-600',
  danger: 'bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/20 text-rose-900 icon-rose-600',
};

export function AppInfoCard({ title, value, icon, trend, variant = 'default', className }: AppInfoCardProps) {
  const classes = infoCardVariantMap[variant].split(' ');
  const bgClass = classes[0];
  const ringClass = classes[1];
  const textClass = classes[2];
  const iconClass = classes[3].replace('icon-', 'text-');

  return (
    <div className={cn("p-4 sm:p-5 rounded-2xl ring-1 shadow-sm flex flex-col justify-between transition-all hover:shadow-md", bgClass, ringClass, className)}>
      <div className="flex items-start justify-between mb-2">
        <p className={cn("text-[11px] font-black uppercase tracking-widest opacity-80", textClass)}>
          {title}
        </p>
        {icon && (
          <div className={cn("w-8 h-8 rounded-lg card-solid/60 flex items-center justify-center shrink-0 shadow-sm", iconClass)}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between gap-4 mt-1">
        <h4 className={cn("text-2xl sm:text-3xl font-black truncate", textClass)}>
          {value}
        </h4>
        {trend && (
          <div className={cn(
            "text-xs font-black px-2 py-1 rounded-md shrink-0",
            trend.isPositive ? "bg-emerald-100 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:text-rose-300"
          )}>
            {trend.isPositive ? '+' : '-'}{trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
