'use client';

import React from 'react';
import { m, Variants } from 'framer-motion';
import { LucideIcon, SearchX, Inbox, AlertCircle, FileSearch } from 'lucide-react';
import { cn } from '../utils/cn';

export type EmptyStateVariant = 'default' | 'search' | 'error' | 'loading' | 'doc';

interface EmptyStatePlaceholderProps {
  icon?: LucideIcon;
  title: string;
  description: string | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: EmptyStateVariant;
  className?: string;
  card?: boolean; // If true, wraps in a card-glass
}

const variantConfig: Record<EmptyStateVariant, { icon: LucideIcon; iconBg: string; iconColor: string }> = {
  default: {
    icon: Inbox,
    iconBg: 'bg-slate-100 dark:bg-slate-800/50',
    iconColor: 'text-slate-500 dark:text-slate-400',
  },
  search: {
    icon: SearchX,
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconColor: 'text-indigo-500 dark:text-indigo-400',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-rose-50 dark:bg-rose-900/20',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
  loading: {
    icon: Inbox,
    iconBg: 'bg-slate-100 dark:bg-slate-800/50',
    iconColor: 'text-slate-400 dark:text-slate-500',
  },
  doc: {
    icon: FileSearch,
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 25,
      staggerChildren: 0.1 
    } 
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export function EmptyStatePlaceholder({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  card = false,
}: EmptyStatePlaceholderProps) {
  const config = variantConfig[variant];
  const IconComponent = icon || config.icon;
  const ActionIcon = action?.icon;

  const content = (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 w-full max-w-md mx-auto',
        className
      )}
    >
      <m.div variants={itemVariants} className="relative mb-6">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center rotate-3 transition-transform hover:rotate-6",
          config.iconBg,
          variant === 'loading' && "animate-pulse"
        )}>
          <IconComponent className={cn("w-8 h-8", config.iconColor)} strokeWidth={1.5} />
        </div>
        
        {/* Decorative elements behind the icon */}
        <div className={cn(
          "absolute inset-0 rounded-2xl -rotate-6 -z-10 opacity-50",
          config.iconBg
        )} />
      </m.div>

      <m.h3 
        variants={itemVariants}
        className="text-lg font-black tracking-tight mb-2 text-foreground"
      >
        {title}
      </m.h3>
      
      <m.div 
        variants={itemVariants}
        className="text-sm font-medium text-muted-foreground mb-6"
      >
        {description}
      </m.div>

      {action && (
        <m.button
          variants={itemVariants}
          onClick={action.onClick}
          className={cn(
            "btn-primary-rich flex items-center gap-2 px-6 py-2.5 rounded-xl",
            variant === 'error' && "btn-danger-rich"
          )}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </m.button>
      )}
    </m.div>
  );

  if (card) {
    return (
      <div className="card-glass flex min-h-[300px] w-full">
        {content}
      </div>
    );
  }

  return content;
}
