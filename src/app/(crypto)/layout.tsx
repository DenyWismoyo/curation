import React from 'react'
import { Suspense } from 'react'
import { CryptoNavbar } from '@/features/crypto/components/navigation/CryptoNavbar'
import { CryptoBottomNav } from '@/features/crypto/components/navigation/CryptoBottomNav'

import CryptoChat from '@/features/crypto/components/chat/CryptoChat'
import { CryptoGuard } from '@/features/crypto/components/shared/CryptoGuard'

import CryptoTrialBanner from '@/features/crypto/components/shared/CryptoTrialBanner'

export default function CryptoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted text-muted-foreground dark:bg-background text-foreground text-foreground dark:text-slate-100 font-sans">
      <CryptoGuard>
        {/* Trial Banner */}
        <CryptoTrialBanner />
        
        {/* Crypto Navbar (Top navigation dedicated to Crypto features) */}
        <CryptoNavbar />

        {/* Main Content Area - offset by navbar height (pt-16 sm:pt-20). Added bottom padding for mobile nav. */}
        <main className="pt-16 sm:pt-20 min-h-screen relative pb-24 md:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <CryptoBottomNav />

        {/* Global Crypto Widgets */}
        <Suspense fallback={null}>
            <CryptoChat />
        </Suspense>
      </CryptoGuard>
    </div>
  )
}
