'use client';

import React, { useState, useMemo } from 'react';
import { SpotlightCard } from './SpotlightCard';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ColumnDef<T> {
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  children?: React.ReactNode;
  className?: string;
  data?: T[];
  columns?: ColumnDef<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({ 
  children, 
  className,
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Search...",
  onRowClick,
  emptyState
}: DataTableProps<T>) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof T, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    if (!data) return [];
    let result = [...data];

    // Basic search across all string/number values
    if (searchQuery && searchable) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        Object.values(item as any).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(query)
        )
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        const aStr = String(aVal);
        const bStr = String(bVal);
        
        // Try numeric sort if both are numbers
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        return sortConfig.direction === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, searchQuery, sortConfig, searchable]);

  // Backwards compatibility with old usage (just children)
  if (!data || !columns) {
    return (
      <SpotlightCard className={cn("p-[1px]", className)}>
        <div className="bg-white/60 dark:bg-slate-900/40 rounded-3xl overflow-hidden backdrop-blur-md">
          {children}
        </div>
      </SpotlightCard>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background/50 focus:bg-background focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
          />
        </div>
      )}

      <SpotlightCard className="p-[1px] w-full">
        <div className="bg-white/60 dark:bg-slate-900/40 rounded-[23px] overflow-x-auto backdrop-blur-md">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map((col, i) => (
                  <th 
                    key={i} 
                    className={cn(
                      "px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground",
                      col.sortable && col.accessorKey && "cursor-pointer hover:text-foreground transition-colors select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey)}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && col.accessorKey && (
                        <span className="text-muted-foreground/50">
                          {sortConfig?.key === col.accessorKey ? (
                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-foreground" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {processedData.length > 0 ? (
                processedData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "group transition-colors",
                      onRowClick ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" : ""
                    )}
                  >
                    {columns.map((col, colIndex) => (
                      <td 
                        key={colIndex} 
                        className={cn("px-6 py-4 text-sm", col.className)}
                      >
                        {col.cell 
                          ? col.cell(row) 
                          : col.accessorKey 
                            ? (row[col.accessorKey] as React.ReactNode)
                            : null}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                    {emptyState || "No results found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
