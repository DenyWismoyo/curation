'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { OmnifitColor } from '../tokens/colors';

interface AlertBannerProps {
  title: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantConfig = {
  info: {
    color: 'indigo' as OmnifitColor,
    icon: Info,
    bg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500/20',
    text: 'text-indigo-800 dark:text-indigo-300',
    btn: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-800/50 dark:text-indigo-200'
  },
  success: {
    color: 'emerald' as OmnifitColor,
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/20',
    text: 'text-emerald-800 dark:text-emerald-300',
    btn: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-800/50 dark:text-emerald-200'
  },
  warning: {
    color: 'amber' as OmnifitColor,
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-800 dark:text-amber-300',
    btn: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-800/50 dark:text-amber-200'
  },
  danger: {
    color: 'rose' as OmnifitColor,
    icon: AlertCircle,
    bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-500/20',
    text: 'text-rose-800 dark:text-rose-300',
    btn: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-800/50 dark:text-rose-200'
  }
};

export function AlertBanner({
  title,
  description,
  variant = 'info',
  dismissible = true,
  action,
  className
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden w-full"
        >
          <div className={cn(
            "rounded-xl border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4",
            config.bg,
            className
          )}>
            <div className="flex gap-3 items-start">
              <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.text)} />
              <div className="flex flex-col">
                <h4 className={cn("text-sm font-bold", config.text)}>{title}</h4>
                {description && (
                  <p className={cn("text-sm mt-1 opacity-90", config.text)}>{description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
              {action && (
                <button
                  onClick={action.onClick}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto", config.btn)}
                >
                  {action.label}
                </button>
              )}
              {dismissible && (
                <button
                  onClick={() => setIsVisible(false)}
                  className={cn("p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10", config.text)}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
