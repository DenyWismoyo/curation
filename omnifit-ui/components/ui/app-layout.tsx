'use client';

import React from 'react';
import { cn } from "../../utils/cn";
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AppPageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function AppPageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  onBack,
  showBackButton = false,
  className,
}: AppPageHeaderProps) {
  const router = useRouter();

  const handleBack = onBack || (() => router.back());

  return (
    <div className={cn("flex flex-col gap-4 mb-6 sm:mb-8", className)}>
      {breadcrumbs && (
        <div className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          {(onBack !== undefined || showBackButton) && (
            <button
              onClick={handleBack}
              className="w-10 h-10 mt-1 sm:mt-0 flex items-center justify-center rounded-xl card-solid ring-1 ring-border shadow-sm text-muted-foreground hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all shrink-0"
              title="Kembali"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <div className="text-sm text-muted-foreground font-medium mt-1">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface AppPageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthMap = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-[96rem]',
  full: 'max-w-full',
};

const paddingMap = {
  none: '',
  sm: 'px-4 py-4 sm:px-6 sm:py-6',
  md: 'px-4 py-6 sm:px-8 sm:py-8 lg:px-12',
  lg: 'px-6 py-8 sm:px-10 sm:py-12 lg:px-16',
};

export function AppPageContainer({
  children,
  className,
  maxWidth = 'lg',
  padding = 'md',
}: AppPageContainerProps) {
  return (
    <div className={cn("w-full mx-auto", maxWidthMap[maxWidth], paddingMap[padding], className)}>
      {children}
    </div>
  );
}
