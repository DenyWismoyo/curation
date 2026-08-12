'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/cn';

export interface RichMarkdownRendererProps {
  content: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RichMarkdownRenderer({
  content,
  className,
  size = 'md',
}: RichMarkdownRendererProps) {
  
  const sizeClasses = {
    sm: 'prose-sm',
    md: 'prose-base',
    lg: 'prose-lg',
  };

  return (
    <div className={cn(
      "prose dark:prose-invert max-w-none w-full",
      "prose-headings:font-bold prose-headings:tracking-tight",
      "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
      "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline",
      "prose-strong:text-foreground prose-strong:font-bold",
      "prose-code:text-rose-600 dark:prose-code:text-rose-400 prose-code:bg-rose-50 dark:prose-code:bg-rose-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none",
      "prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:border prose-pre:border-slate-800",
      "prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic",
      "prose-li:marker:text-indigo-500",
      "prose-table:overflow-hidden prose-table:rounded-xl prose-table:border prose-table:border-border",
      "prose-th:bg-muted prose-th:p-3 prose-th:text-left",
      "prose-td:p-3 prose-td:border-t prose-td:border-border",
      sizeClasses[size],
      className
    )}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
