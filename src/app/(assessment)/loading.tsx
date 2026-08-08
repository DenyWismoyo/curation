// src/app/(public)/loading.tsx
import React from 'react';

/**
 * Loading state global untuk semua public routes.
 * Ditampilkan saat Next.js streaming SSR atau lazy loading.
 */
export default function PublicLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen card-solid">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 dark:border-indigo-500/20 border-t-indigo-600 animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">Memuat...</span>
      </div>
    </div>
  );
}
