// src/app/(public)/layout.tsx
import React from 'react'
import { Suspense } from 'react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { GlobalFloatingWidget } from '@/components/common/GlobalFloatingWidget';
import { ReferralAttributionTracker } from '@/components/common/ReferralAttributionTracker';

/**
 * Layout untuk semua public routes (/, /katalog, /progress, /komunitas, /profil, dll.)
 * Tanggung jawab:
 * - Desktop: Top Navbar (PublicNavbar) + Widget khusus desktop
 * - Mobile: tanpa header (BottomNav sudah ada di root layout.tsx)
 * - pb-20 untuk clearance BottomNav di mobile dengan safe-area-inset
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ReferralAttributionTracker />
      </Suspense>

      {/* Desktop Top Navbar - hidden on mobile */}
      <PublicNavbar />

      {/* Content area - offset by navbar height on desktop (pt-20) */}
      <main className="md:pt-20 relative min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
        {children}
      </main>

      {/* Widget Gabungan AI & Feedback - Hanya dirender di desktop agar tidak bentrok dengan Mobile UI */}
      <div className="hidden md:block">
        <GlobalFloatingWidget />
      </div>
    </div>
  )
}
