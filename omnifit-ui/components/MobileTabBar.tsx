'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '../utils/cn';

export interface TabItem {
  id: string | number;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number; // For notification dots or unread counts
}

export interface MobileTabBarProps {
  tabs: TabItem[];
  activeTab: string | number;
  onTabChange: (id: string | number) => void;
  className?: string;
  position?: 'bottom' | 'top';
}

export function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
  position = 'bottom',
}: MobileTabBarProps) {
  return (
    <div 
      className={cn(
        "fixed left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-border px-2 pb-safe pt-2",
        position === 'bottom' ? "bottom-0 border-t" : "top-0 border-b",
        className
      )}
    >
      <div className="flex items-center justify-around w-full max-w-md mx-auto h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active Indicator Background */}
              {isActive && (
                <m.div
                  layoutId="mobile-tab-indicator"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-[0_0_0_2px_var(--background)]">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "text-[10px] font-semibold tracking-wide transition-all",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
