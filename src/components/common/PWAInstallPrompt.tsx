// src/app/components/shared/PWAInstallPrompt.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// IMPORT CUSTOM ICON
import { TechCardIcon } from '@/components/icon'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. Cek apakah pengguna sudah menutup prompt di sesi ini
    if (sessionStorage.getItem('pwa_prompt_dismissed')) {
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // 2. Cek apakah aplikasi sudah terinstal (berjalan sebagai standalone)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(checkStandalone)

    // Jika sudah diinstal, tidak perlu memunculkan prompt
    if (checkStandalone) return

    // 3. Event Listener untuk Android/Desktop (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Munculkan setelah 2.5 detik
      setTimeout(() => {
        setShowPrompt(true)
      }, 2500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. Fallback khusus untuk iOS (karena iOS tidak memicu 'beforeinstallprompt')
    if (isIosDevice && !checkStandalone) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      // Panduan manual untuk pengguna Apple / iOS
      alert(
        "Untuk menginstal di iOS:\n1. Ketuk tombol 'Share' (ikon panah ke atas) di menu bawah browser Anda.\n2. Pilih 'Add to Home Screen' (Tambah ke Layar Utama)."
      )
      return
    }

    if (!deferredPrompt) return

    // Memunculkan prompt instalasi bawaan browser
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA berhasil diinstal')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  const handleClose = () => {
    setShowPrompt(false)
    // Simpan ke sesi agar tidak terus muncul dan mengganggu
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  // PENTING: Jangan gunakan 'return null' di luar sini agar animasi 'exit' Framer Motion bekerja sempurna
  return (
    <AnimatePresence>
      {showPrompt && !isStandalone && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-6 right-4 sm:right-6 z-[200] w-[calc(100%-2rem)] sm:w-[360px]"
        >
          <div className="card-solid/90 backdrop-blur-2xl border border-border p-4 rounded-[1.25rem] shadow-lg relative overflow-hidden group flex items-center gap-4">
            {/* Ambient Background Glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl pointer-events-none transition-all group-hover:scale-150"></div>

            {/* Tombol Close (Ditambah area klik agar mudah ditekan di Mobile) */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-rose-50 dark:bg-rose-500/10 hover:text-rose-500 rounded-full transition-colors z-20 cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Logo Omnifit */}
            <div className="w-12 h-12 card-solid rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-border relative z-10 overflow-hidden">
              <Image
                src="/icon-192x192.png"
                alt="Omnifit Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain p-1.5"
                priority
              />
            </div>

            {/* Teks & Tombol */}
            <div className="flex-1 pr-6 relative z-10">
              <h3 className="text-sm font-black text-foreground leading-tight mb-0.5">
                Instal Omnifit
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground mb-2.5">
                {isIOS
                  ? 'Ketuk pasang untuk panduan iOS.'
                  : 'Akses lebih cepat & tanpa batas.'}
              </p>

              <Button
                onClick={handleInstallClick}
                size="sm"
                className="h-8 rounded-xl px-4 bg-slate-900 text-white font-bold text-xs hover:bg-indigo-600 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 w-fit"
              >
                <TechCardIcon size={12} />
                {isIOS ? 'Cara Pasang' : 'Pasang'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
