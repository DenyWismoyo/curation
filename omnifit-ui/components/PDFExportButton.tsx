'use client';

import React, { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface PDFExportButtonProps {
  onExport: () => Promise<void>;
  filename?: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function PDFExportButton({
  onExport,
  filename = 'export.pdf',
  label = 'Export PDF',
  className,
  variant = 'outline',
  size = 'md'
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const variants = {
    primary: 'btn-primary-rich',
    outline: 'btn-outline-rich bg-background',
    ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      aria-label={`Export ${filename}`}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      
      <span>{isExporting ? 'Generating...' : label}</span>
    </button>
  );
}
