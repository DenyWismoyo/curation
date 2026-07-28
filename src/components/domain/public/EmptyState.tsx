import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-[2rem] p-12 sm:p-16 text-center ring-1 ring-slate-200/60 shadow-sm',
        className
      )}
    >
      {icon && <div className="mx-auto mb-4 opacity-60 grayscale">{icon}</div>}
      <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="brand" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
