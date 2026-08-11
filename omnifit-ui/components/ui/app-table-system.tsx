'use client';

import React, { useState } from 'react';
import { cn } from "../../utils/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { AppEmptyState } from './app-data-display';
import { AppSpinner } from './design-system';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface AppDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  onRowClick?: (item: T) => void;
  // Pagination
  pagination?: boolean;
  pageSize?: number;
}

export function AppDataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyIcon,
  emptyTitle = 'Data Tidak Ditemukan',
  emptyDescription = 'Belum ada data yang tersedia untuk ditampilkan saat ini.',
  emptyAction,
  className,
  onRowClick,
  pagination = false,
  pageSize = 10,
}: AppDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return (
      <div className={cn("w-full card-solid rounded-2xl ring-1 ring-border shadow-sm flex items-center justify-center min-h-[400px]", className)}>
        <AppSpinner size="lg" message="Memuat Data..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <AppEmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={cn("card-solid border-border ring-1 ring-border shadow-sm", className)}
      />
    );
  }

  // Handle Pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const currentData = pagination
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(onRowClick && 'cursor-pointer hover:bg-muted text-muted-foreground/80 transition-colors')}
            >
              {columns.map((col, idx) => {
                const cellContent = col.cell
                  ? col.cell(item)
                  : col.accessorKey
                  ? (item[col.accessorKey] as React.ReactNode)
                  : null;

                return (
                  <TableCell key={idx} className={col.className}>
                    {cellContent}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
          <div className="text-xs font-bold text-muted-foreground">
            Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data.length)} dari {data.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg card-solid ring-1 ring-border text-muted-foreground hover:bg-muted text-muted-foreground hover:text-indigo-600 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-700 w-10 text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg card-solid ring-1 ring-border text-muted-foreground hover:bg-muted text-muted-foreground hover:text-indigo-600 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// AppActionMenu
// ==========================================
export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface AppActionMenuProps {
  actions: ActionMenuItem[];
}

export function AppActionMenu({ actions }: AppActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 transition-colors"
          onClick={(e) => e.stopPropagation()} // Prevent row click
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl ring-1 ring-border shadow-xl">
        {actions.map((action, idx) => (
          <DropdownMenuItem
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors focus:bg-muted text-muted-foreground",
              action.variant === 'danger'
                ? "text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:text-rose-300 focus:bg-rose-50 dark:bg-rose-500/10"
                : "text-slate-700 focus:text-indigo-700 dark:text-indigo-300 focus:bg-indigo-50 dark:bg-indigo-500/10"
            )}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
