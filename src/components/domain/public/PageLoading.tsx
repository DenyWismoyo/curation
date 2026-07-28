import React from 'react';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message, className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-background flex items-center justify-center',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        {message && (
          <p className="font-bold text-xs uppercase tracking-widest text-indigo-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="bg-white border-b border-slate-100 px-6 lg:px-12 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-8 w-24 bg-slate-100 rounded-xl" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-slate-100 rounded-lg" />
              <div className="h-4 w-64 bg-slate-100 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 mt-8 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl ring-1 ring-slate-100" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl ring-1 ring-slate-100" />
      </div>
    </div>
  );
}
