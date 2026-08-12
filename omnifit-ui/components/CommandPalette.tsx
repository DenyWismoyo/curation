'use client';

import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';
import { m, AnimatePresence } from 'framer-motion';

export interface CommandPaletteOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  shortcut?: string[];
}

export interface CommandPaletteGroup {
  heading: string;
  items: CommandPaletteOption[];
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CommandPaletteGroup[];
  placeholder?: string;
  className?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  groups,
  placeholder = "Search commands...",
  className
}: CommandPaletteProps) {
  
  // Close on escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "w-full max-w-xl relative z-50 rounded-2xl border border-border shadow-2xl bg-background/95 backdrop-blur-xl overflow-hidden",
              className
            )}
          >
            <Command 
              className="w-full h-full flex flex-col"
              filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                return 0;
              }}
            >
              <div className="flex items-center border-b border-border/50 px-4">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <Command.Input 
                  placeholder={placeholder} 
                  autoFocus
                  className="flex-1 h-14 bg-transparent border-none outline-none ring-0 px-3 text-foreground placeholder:text-muted-foreground/60 text-base"
                />
                <div className="text-[10px] font-medium px-2 py-1 bg-muted rounded-md text-muted-foreground border border-border/50 hidden sm:block">
                  ESC
                </div>
              </div>
              
              <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground font-medium">
                  No results found.
                </Command.Empty>

                {groups.map((group) => (
                  <Command.Group 
                    key={group.heading} 
                    heading={group.heading}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
                  >
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.label} // for filtering
                        onSelect={() => {
                          item.onSelect();
                          onClose();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer aria-selected:bg-indigo-500/10 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors group"
                      >
                        {item.icon && (
                          <div className="text-muted-foreground group-aria-selected:text-indigo-600 dark:group-aria-selected:text-indigo-400">
                            {item.icon}
                          </div>
                        )}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.shortcut && (
                          <div className="flex items-center gap-1">
                            {item.shortcut.map((key, i) => (
                              <kbd key={i} className="px-2 py-1 bg-background/50 border border-border/50 rounded text-[10px] font-sans text-muted-foreground font-semibold">
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
