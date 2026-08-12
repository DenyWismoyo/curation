'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '../utils/cn';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  snapPoints?: number[]; // e.g., [0.5, 0.9] for 50% and 90% of screen height
  className?: string;
  showHandle?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.8], // Default to 80% screen height
  className,
  showHandle = true,
}: BottomSheetProps) {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints[0]);
  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentSnapPoint(snapPoints[0]);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, snapPoints]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const isDraggingDown = info.velocity.y > 0;
    const isFastDrag = Math.abs(info.velocity.y) > 500;
    const distance = info.offset.y;

    if (isDraggingDown && (isFastDrag || distance > 100)) {
      onClose();
    }
  };

  const sheetHeight = typeof window !== 'undefined' ? window.innerHeight * currentSnapPoint : 600;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center pointer-events-none">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          
          {/* Sheet */}
          <m.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.25, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "w-full sm:w-[90%] max-w-2xl bg-background/95 backdrop-blur-xl border border-border sm:rounded-2xl rounded-t-3xl shadow-2xl relative z-10 pointer-events-auto flex flex-col overflow-hidden",
              className
            )}
            style={{ 
              height: sheetHeight,
              maxHeight: 'calc(100vh - 40px)', 
              touchAction: 'none'
            }}
          >
            {/* Drag Handle area */}
            {showHandle && (
              <div 
                className="w-full h-8 sm:h-12 flex justify-center items-center cursor-grab active:cursor-grabbing touch-none shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-12 h-1.5 bg-border rounded-full" />
              </div>
            )}

            {/* Title Bar */}
            {title && (
              <div className="px-6 pb-4 pt-2 shrink-0 border-b border-border/50">
                <div className="text-lg font-bold text-foreground">{title}</div>
              </div>
            )}

            {/* Content - Scrollable */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent overscroll-contain"
            >
              {children}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
