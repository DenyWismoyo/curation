import React from 'react'
import { Suspense } from 'react'
import { CryptoNavbar } from '@/components/crypto/CryptoNavbar'
import CryptoAlertsWidget from '@/components/crypto/CryptoAlertsWidget'
import CryptoChat from '@/components/crypto/CryptoChat'
import { CryptoGuard } from '@/components/crypto/CryptoGuard'

import CryptoTrialBanner from '@/components/crypto/CryptoTrialBanner'

export default function CryptoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 selection:bg-purple-500/30 font-sans">
      <CryptoGuard>
        {/* Trial Banner */}
        <CryptoTrialBanner />
        
        {/* Crypto Navbar (Top navigation dedicated to Crypto features) */}
        <CryptoNavbar />

        {/* Main Content Area - offset by navbar height (pt-16 sm:pt-20). Removed heavy bottom padding for mobile. */}
        <main className="pt-16 sm:pt-20 min-h-screen relative pb-6">
          {children}
        </main>

        {/* Global Crypto Widgets */}
        <Suspense fallback={null}>
            <CryptoAlertsWidget />
            <CryptoChat />
        </Suspense>
      </CryptoGuard>
    </div>
  )
}
