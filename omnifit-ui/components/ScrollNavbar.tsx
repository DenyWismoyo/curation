'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface ScrollNavbarProps {
  children: React.ReactNode;
  threshold?: number;
  className?: string;
  scrolledClassName?: string;
  transparentClassName?: string;
}

export function ScrollNavbar({
  children,
  threshold = 50,
  className,
  scrolledClassName = 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm',
  transparentClassName = 'bg-transparent border-transparent'
}: ScrollNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold);
    };
    
    // Initial check
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? scrolledClassName : transparentClassName,
        className
      )}
    >
      {children}
    </header>
  );
}
