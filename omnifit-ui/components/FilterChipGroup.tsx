'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';
import { Check } from 'lucide-react';

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipGroupProps {
  chips: FilterChip[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  multiSelect?: boolean;
  color?: OmnifitColor | 'slate';
  className?: string;
}

const colorMap = {
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-600',
  amber:  'bg-amber-500 text-white hover:bg-amber-400 border-amber-500',
  emerald:'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-600',
  rose:   'bg-rose-600 text-white hover:bg-rose-500 border-rose-600',
  slate:  'bg-slate-800 text-white hover:bg-slate-700 border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200 dark:hover:bg-white',
};

export function FilterChipGroup({
  chips,
  selectedIds,
  onChange,
  multiSelect = true,
  color = 'indigo',
  className
}: FilterChipGroupProps) {

  const handleSelect = (id: string) => {
    if (multiSelect) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter(val => val !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      if (selectedIds.includes(id)) {
        onChange([]); // allow deselection even in single mode? (optional)
      } else {
        onChange([id]);
      }
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => {
        const isSelected = selectedIds.includes(chip.id);
        
        return (
          <m.button
            key={chip.id}
            onClick={() => handleSelect(chip.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative px-4 py-1.5 rounded-full text-sm font-bold border transition-colors flex items-center gap-1.5",
              isSelected 
                ? colorMap[color]
                : "bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <AnimatePresence>
              {isSelected && (
                <m.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden flex items-center"
                >
                  <Check className="w-3.5 h-3.5" />
                </m.div>
              )}
            </AnimatePresence>
            <span>{chip.label}</span>
            {chip.count !== undefined && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none",
                isSelected 
                  ? "bg-white/20 text-white dark:bg-black/20" 
                  : "bg-muted text-muted-foreground"
              )}>
                {chip.count}
              </span>
            )}
          </m.button>
        );
      })}
    </div>
  );
}
