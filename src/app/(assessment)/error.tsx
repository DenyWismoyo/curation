'use client'

// src/app/(public)/error.tsx
import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error boundary global untuk semua public routes.
 * Ditampilkan saat unhandled runtime error di subtree ini.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-screen card-solid px-6">
      <div className="flex flex-col items-center gap-4 max-w-xs text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground mb-1">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error.message ||
              'Sesuatu tidak berjalan sebagaimana mestinya. Silakan coba lagi.'}
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => router.push('/')}
          >
            <Home size={14} />
            Beranda
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
            onClick={reset}
          >
            <RefreshCw size={14} />
            Coba Lagi
          </Button>
        </div>
      </div>
    </div>
  )
}
