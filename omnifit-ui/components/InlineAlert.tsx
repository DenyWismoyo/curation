'use client';

import React from 'react';
import { m, AnimatePresence, Variants } from 'framer-motion';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface InlineAlertProps {
  variant: AlertVariant;
  title?: string;
  message: string | React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { wrapper: string; icon: React.ReactNode; closeBtn: string }> = {
  info: {
    wrapper: 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-200',
    icon: <Info className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
    closeBtn: 'hover:bg-indigo-100 text-indigo-500 dark:hover:bg-indigo-900/50 dark:text-indigo-400',
  },
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-200',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
    closeBtn: 'hover:bg-emerald-100 text-emerald-500 dark:hover:bg-emerald-900/50 dark:text-emerald-400',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
    closeBtn: 'hover:bg-amber-100 text-amber-500 dark:hover:bg-amber-900/50 dark:text-amber-400',
  },
  error: {
    wrapper: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-200',
    icon: <XCircle className="h-5 w-5 text-rose-500 dark:text-rose-400" />,
    closeBtn: 'hover:bg-rose-100 text-rose-500 dark:hover:bg-rose-900/50 dark:text-rose-400',
  },
};

const alertVariants: Variants = {
  hidden: { opacity: 0, height: 0, scale: 0.95, overflow: 'hidden' },
  visible: { 
    opacity: 1, 
    height: 'auto', 
    scale: 1,
    overflow: 'visible',
    transition: { type: 'spring', stiffness: 400, damping: 30 } 
  },
  exit: { 
    opacity: 0, 
    height: 0, 
    scale: 0.95, 
    overflow: 'hidden',
    transition: { duration: 0.2, ease: 'easeOut' } 
  }
};

export function InlineAlert({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  className
}: InlineAlertProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const styles = variantStyles[variant];

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      setTimeout(onDismiss, 200); // Allow animation to finish
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          variants={alertVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 shadow-sm',
            styles.wrapper,
            className
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {styles.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-bold mb-1">
                {title}
              </h4>
            )}
            <div className={cn(
              "text-sm", 
              title ? "opacity-90" : "font-medium"
            )}>
              {message}
            </div>
          </div>

          {dismissible && (
            <button
              onClick={handleDismiss}
              className={cn(
                "flex-shrink-0 p-1 rounded-full transition-colors",
                styles.closeBtn
              )}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
