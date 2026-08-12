'use client';

import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

export interface HoverCardProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function HoverCard({
  trigger,
  children,
  openDelay = 200,
  closeDelay = 300,
  className,
  position = 'bottom',
  align = 'center',
}: HoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, openDelay);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full mb-2',
      bottom: 'top-full mt-2',
      left: 'right-full mr-2',
      right: 'left-full ml-2',
    };
    
    const aligns = {
      start: position === 'top' || position === 'bottom' ? 'left-0' : 'top-0',
      center: position === 'top' || position === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
      end: position === 'top' || position === 'bottom' ? 'right-0' : 'bottom-0',
    };

    return cn(positions[position], aligns[align]);
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={triggerRef}
    >
      {trigger}
      
      <AnimatePresence>
        {isOpen && (
          <m.div
            ref={cardRef}
            initial={{ opacity: 0, y: position === 'bottom' ? -10 : position === 'top' ? 10 : 0, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "absolute z-50 min-w-[320px] rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-xl p-4",
              getPositionClasses(),
              className
            )}
            style={{ willChange: 'transform, opacity' }}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
