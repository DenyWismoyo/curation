'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, ChevronRight, Menu, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from "next-themes"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { 
  CRYPTO_BOTTOM_NAV_LINKS, 
  CRYPTO_DRAWER_LINKS,
  CRYPTO_ADMIN_LINKS 
} from '../../config/navigation'

export function CryptoBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, isPremium: authIsPremium, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith('admin')
  const isPremium = authIsPremium || false
  const hasAccess = isAdmin || isPremium

  // Close drawer saat pindah halaman
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/crypto-report') return pathname === '/crypto-report'
    return pathname?.startsWith(href)
  }

  const handleLogout = async () => {
    setDrawerOpen(false)
    await logout()
    router.push('/')
  }

  return (
    <>
      {/* ── BOTTOM NAV BAR ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-2 bg-gradient-to-t from-background/95 via-background/80 to-transparent backdrop-blur-md pointer-events-none">
        <div
          className="card-solid/90 backdrop-blur-xl border border-border/80 shadow-xl shadow-slate-900/5 rounded-2xl p-1 max-w-lg mx-auto ring-1 ring-border pointer-events-auto"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
        >
          <div className="flex items-stretch justify-around relative bg-muted text-muted-foreground/60 p-0.5 rounded-xl">
            {CRYPTO_BOTTOM_NAV_LINKS.map((item) => {
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 flex-1 relative transition-all duration-200 min-h-[52px] rounded-xl font-bold text-xs ${
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="crypto-bottom-nav-active"
                      className="absolute inset-0 card-solid shadow-sm ring-1 ring-border rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: active ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} className={active ? 'text-purple-400' : ''} />
                    </motion.div>
                    {item.requiresPremium && !hasAccess && (
                       <Lock className="w-3 h-3 absolute -top-1 -right-2 text-muted-foreground opacity-80" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
            
            {/* Tab More / Menu */}
            <button
                onClick={() => setDrawerOpen(true)}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 flex-1 relative transition-all duration-200 min-h-[52px] rounded-xl font-bold text-xs ${
                  drawerOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {drawerOpen && (
                    <motion.div
                      layoutId="crypto-bottom-nav-active"
                      className="absolute inset-0 card-solid shadow-sm ring-1 ring-border rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                )}
                <div className="relative">
                  <motion.div
                    animate={{ scale: drawerOpen ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Menu size={20} strokeWidth={drawerOpen ? 2.5 : 1.5} className={drawerOpen ? 'text-purple-400' : ''} />
                  </motion.div>
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${drawerOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                  More
                </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── PROFILE DRAWER (DARK) ─────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="p-0 border-none card-solid rounded-t-[2.5rem] overflow-hidden max-h-[85vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi Ekstra Crypto</SheetTitle>
          </SheetHeader>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* User identity */}
          <div className="px-6 pt-2 pb-4 border-b border-border">
            {user ? (
              <div className="flex items-center gap-3.5">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-white/20 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-purple-900/30 text-purple-400 flex items-center justify-center text-base font-black ring-1 ring-purple-500/30 shadow-sm shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground truncate">
                    {user.displayName || 'Pengguna'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium truncate">{user.email}</p>
                </div>
                {hasAccess && (
                  <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-400 text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                    Premium
                  </span>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Navigation</p>
                <p className="text-sm font-black text-foreground mt-0.5">CryptoHub Menu</p>
              </div>
            )}
          </div>

          {/* Nav links */}
          <div className="px-4 py-3 space-y-1 max-h-[55vh] overflow-y-auto hide-scrollbar">
            {/* Dynamic drawer links */}
            {CRYPTO_DRAWER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:card-solid/5 transition-colors group"
              >
                <div className="w-9 h-9 card-solid/5 rounded-xl flex items-center justify-center ring-1 ring-white/10 shadow-sm">
                  <item.icon size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                </div>
                <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground dark:group-hover:text-white transition-colors flex-1">
                  {item.label}
                </span>
                {item.requiresPremium && !hasAccess && (
                   <Lock className="w-4 h-4 text-muted-foreground" />
                )}
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-slate-400 transition-colors" />
              </Link>
            ))}

            {isAdmin && (
              <>
                <div className="h-px card-solid/5 mx-3 my-2" />
                {CRYPTO_ADMIN_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:card-solid/5 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center ring-1 ring-amber-500/30 shadow-sm">
                      <item.icon size={16} className="text-amber-400" />
                    </div>
                    <span className="text-sm font-bold text-amber-100/80 group-hover:text-amber-400 transition-colors flex-1">
                      {item.label}
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-slate-400 transition-colors" />
                  </Link>
                ))}
              </>
            )}
            
            <div className="h-px card-solid/5 mx-3 my-2" />
            <Link
                href="/crypto"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:card-solid/5 transition-colors group"
              >
                <div className="w-9 h-9 card-solid/5 rounded-xl flex items-center justify-center ring-1 ring-white/10 shadow-sm">
                  <ChevronRight size={16} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
                <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground dark:group-hover:text-white transition-colors flex-1">
                  Kembali ke Main App
                </span>
            </Link>

            {/* Guest: login CTA */}
            {!user && (
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-900/50 transition-all mt-4 mx-2"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:card-solid/5 transition-colors group"
            >
              <div className="w-9 h-9 card-solid/5 rounded-xl flex items-center justify-center ring-1 ring-white/10 shadow-sm">
                {theme === 'dark' ? (
                   <span className="text-amber-500 text-lg">☀️</span>
                ) : (
                   <span className="text-indigo-400 text-lg">🌙</span>
                )}
              </div>
              <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground dark:group-hover:text-white flex-1 text-left">
                {theme === 'dark' ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
              </span>
            </button>
          </div>

          {/* Logout */}
          {user && (
            <div className="px-4 pt-2 pb-6 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-rose-500/10 transition-colors group"
              >
                <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center ring-1 ring-rose-500/20">
                  <LogOut size={16} className="text-rose-400" />
                </div>
                <span className="text-sm font-bold text-rose-400 flex-1 text-left">
                  Keluar dari Sistem
                </span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
