'use client'

// src/components/layout/BottomNav.tsx
// Setelah refactor: semua menu dibaca dari navigation.config, tidak ada lagi hardcode

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut, Settings, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUserActivity } from '@/contexts/UserActivityContext'

// ── Import dari config terpusat ──────────────────────────────
import {
  BOTTOM_NAV_ITEMS,
  DRAWER_NAV_ITEMS,
  ROUTES,
  filterNavItems,
} from '@/config'

// ── Route-route yang menyembunyikan BottomNav ────────────────
// Tambah route baru di sini jika ada halaman yang tidak perlu BottomNav
const HIDDEN_ON_ROUTES = [
  '/admin',
  '/assessor',
  '/curator',
  '/crypto-report',
  '/crypto',
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, isPremium, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pendingAssessmentsCount: pendingAssessments, unreadCount } = useUserActivity()

  // Close drawer saat pindah halaman
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Sembunyikan di route tertentu & landing hub
  const shouldHide = HIDDEN_ON_ROUTES.some((r) => pathname?.startsWith(r))
  const isLandingHub = pathname === '/'
  if (shouldHide || isLandingHub) return null

  // ── Filter nav items berdasarkan auth/role ────────────────
  const visibleNavItems = filterNavItems(BOTTOM_NAV_ITEMS, {
    role,
    isLoggedIn: !!user,
    isPremium,
  })

  const visibleDrawerItems = filterNavItems(DRAWER_NAV_ITEMS, {
    role,
    isLoggedIn: !!user,
    isPremium,
  })

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const handleLogout = async () => {
    setDrawerOpen(false)
    await logout()
    router.push(ROUTES.HOME)
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
            {visibleNavItems.map((item) => {
              const active = isActive(item.href)
              const isProfileTab = item.href === ROUTES.PROFIL
              const hasNotif = isProfileTab && (unreadCount > 0 || pendingAssessments > 0)
              const totalBadge = unreadCount + pendingAssessments

              // Tab Profil → buka drawer
              if (isProfileTab) {
                return (
                  <button
                    key={item.key}
                    onClick={() => setDrawerOpen(true)}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 flex-1 relative transition-all duration-200 min-h-[52px] rounded-xl font-bold text-xs ${
                      drawerOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {drawerOpen && (
                      <motion.div
                        layoutId="bottom-nav-active"
                        className="absolute inset-0 card-solid shadow-sm ring-1 ring-border rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                    <div className="relative">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="avatar"
                          className="w-5 h-5 rounded-lg object-cover ring-1 ring-border"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <motion.div
                          animate={{ scale: drawerOpen ? 1.1 : 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <item.icon
                            size={20}
                            strokeWidth={drawerOpen ? 2.5 : 1.5}
                          />
                        </motion.div>
                      )}
                      <AnimatePresence>
                        {hasNotif && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm"
                          >
                            {totalBadge > 9 ? '9+' : totalBadge}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight ${drawerOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              }

              // Tab biasa → navigasi
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 flex-1 relative transition-all duration-200 min-h-[52px] rounded-xl font-bold text-xs ${
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 card-solid shadow-sm ring-1 ring-border rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: active ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                    </motion.div>
                    <AnimatePresence>
                      {item.href === ROUTES.PROGRESS && pendingAssessments > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── PROFILE DRAWER ─────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="p-0 border-none card-solid rounded-t-[2.5rem] overflow-hidden max-h-[85vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi Utama Mobile</SheetTitle>
          </SheetHeader>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-slate-200/80 rounded-full" />
          </div>

          {/* User identity */}
          <div className="px-6 pt-2 pb-4 border-b border-border">
            {user ? (
              <div className="flex items-center gap-3.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-border shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base font-black ring-1 ring-indigo-100 shadow-sm shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground truncate">
                    {user.displayName || 'Pengguna'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigation</p>
                <p className="text-sm font-black text-foreground mt-0.5">Menu Utama Publik</p>
              </div>
            )}
          </div>

          {/* Nav links */}
          <div className="px-4 py-3 space-y-1 max-h-[55vh] overflow-y-auto">
            {/* Profil & Pengaturan */}
            {user && (
              <Link
                href={ROUTES.PROFIL}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-muted text-muted-foreground transition-colors group"
              >
                <div className="w-9 h-9 bg-secondary text-secondary-foreground/80 rounded-xl flex items-center justify-center ring-1 ring-border group-hover:ring-indigo-200 dark:ring-indigo-500/20 transition-colors">
                  <Settings size={16} className="text-muted-foreground group-hover:text-indigo-600 dark:text-indigo-400 transition-colors" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 dark:text-indigo-400 transition-colors flex-1">
                  Profil & Pengaturan
                </span>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </Link>
            )}

            {user && <div className="h-px bg-secondary text-secondary-foreground mx-3 my-1" />}

            {/* Dynamic links dari config */}
            {visibleDrawerItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-muted text-muted-foreground transition-colors group"
              >
                <div
                  className={`w-9 h-9 ${item.accent?.bg ?? 'bg-secondary text-secondary-foreground'} rounded-xl flex items-center justify-center ring-1 ring-white/60 shadow-sm`}
                >
                  <item.icon
                    size={16}
                    className={item.accent?.text ?? 'text-muted-foreground'}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-foreground transition-colors flex-1">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={14} className="text-slate-300 group-hover:text-muted-foreground transition-colors" />
              </Link>
            ))}

            {/* Guest: login CTA */}
            {!user && (
              <Link
                href={ROUTES.LOGIN}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all mt-3"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>

          {/* Logout */}
          {user && (
            <div className="px-4 pt-2 pb-6 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-rose-50 dark:bg-rose-500/10 transition-colors group"
              >
                <div className="w-9 h-9 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center ring-1 ring-rose-100">
                  <LogOut size={16} className="text-rose-500" />
                </div>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex-1 text-left">
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
