'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface GlassCardLayoutProps {
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
}

export function GlassCardLayout({
  children,
  className,
  cardClassName,
}: GlassCardLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden',
        className
      )}
    >
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'max-w-md w-full card-solid/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-indigo-500/10 ring-1 ring-border relative z-10',
          cardClassName
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
