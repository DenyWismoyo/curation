// src/app/components/shared/BottomNav.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Compass,
  TrendingUp,
  Users,
  User,
  X,
  LibraryBig,
  FolderKanban,
  KeyRound,
  LogOut,
  Settings,
  HandCoins,
  MapPinned,
  ChevronRight,
  LayoutDashboard,
  ClipboardCheck,
  Handshake,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUserActivity } from '@/contexts/UserActivityContext'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  activeIcon: React.ReactNode
  requiresAuth?: boolean
  notifKey?: string
}

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Sembunyikan di halaman admin / assessor / curator / crypto-report / premium
  const hiddenRoutes = ['/admin', '/assessor', '/curator', '/crypto-report', '/premium']
  const shouldHide = hiddenRoutes.some((r) => pathname?.startsWith(r))

  const { pendingAssessmentsCount: pendingAssessments, unreadCount } = useUserActivity()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  if (shouldHide) return null

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Beranda',
      icon: <Home size={20} strokeWidth={1.5} />,
      activeIcon: <Home size={20} strokeWidth={2.5} />,
    },
    {
      href: '/explore',
      label: 'Explore',
      icon: <Compass size={20} strokeWidth={1.5} />,
      activeIcon: <Compass size={20} strokeWidth={2.5} />,
    },
    {
      href: '/progress',
      label: 'Progress',
      icon: <TrendingUp size={20} strokeWidth={1.5} />,
      activeIcon: <TrendingUp size={20} strokeWidth={2.5} />,
      requiresAuth: true,
    },
    {
      href: '/komunitas',
      label: 'Komunitas',
      icon: <Users size={20} strokeWidth={1.5} />,
      activeIcon: <Users size={20} strokeWidth={2.5} />,
    },
    {
      href: '/profil',
      label: 'Profil',
      icon: <User size={20} strokeWidth={1.5} />,
      activeIcon: <User size={20} strokeWidth={2.5} />,
      requiresAuth: true,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const handleLogout = async () => {
    setDrawerOpen(false)
    await logout()
    router.push('/')
  }

  // ── Drawer menu items ────────────────────────────────────────────────────────
  const drawerLinks = [
    {
      href: '/katalog',
      label: 'Katalog Modul',
      icon: <LibraryBig size={18} />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      href: '/mitra',
      label: 'Ekosistem Mitra',
      icon: <Handshake size={18} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      href: '/dashboard',
      label: 'Brankas Modul',
      icon: <FolderKanban size={18} />,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      href: '/token',
      label: 'Gunakan Token',
      icon: <KeyRound size={18} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      href: '/roadmap',
      label: 'Roadmap AI',
      icon: <MapPinned size={18} />,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      href: '/affiliate',
      label: 'Portal Affiliate',
      icon: <HandCoins size={18} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    ...(role === 'admin_omnifit' || role === 'admin_csrs'
      ? [
          {
            href: '/admin',
            label: 'Dasbor Admin',
            icon: <LayoutDashboard size={18} />,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
        ]
      : []),
    ...(role === 'assessor'
      ? [
          {
            href: '/assessor',
            label: 'Ruang Asesor',
            icon: <ClipboardCheck size={18} />,
            color: 'text-teal-600',
            bg: 'bg-teal-50',
          },
        ]
      : []),
  ]

  return (
    <>
      {/* ── BOTTOM NAV BAR (Gaya Pill & Glassmorphism Selaras PublicNavbar) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-2 bg-gradient-to-t from-white/95 via-white/80 to-transparent backdrop-blur-md pointer-events-none">
        <div
          className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xl shadow-slate-900/5 rounded-2xl p-1 max-w-lg mx-auto ring-1 ring-slate-100 pointer-events-auto"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
        >
          <div className="flex items-stretch justify-around relative bg-slate-50/60 p-0.5 rounded-xl">
            {navItems.map((item) => {
              const active = isActive(item.href)
              const isProfileTab = item.href === '/profil'
              const hasNotif =
                isProfileTab && (unreadCount > 0 || pendingAssessments > 0)
              const totalBadge = unreadCount + pendingAssessments

              // Profile tab → opens drawer instead of navigating
              if (isProfileTab) {
                return (
                  <button
                    key={item.href}
                    onClick={() => setDrawerOpen(true)}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 flex-1 relative transition-all duration-200 min-h-[52px] rounded-xl font-bold text-xs ${
                      drawerOpen ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {drawerOpen && (
                      <motion.div
                        layoutId="bottom-nav-active"
                        className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200/60 rounded-xl -z-10"
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 40,
                        }}
                      />
                    )}
                    <div className="relative">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="avatar"
                          className="w-5 h-5 rounded-lg object-cover ring-1 ring-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <motion.div
                          animate={{ scale: drawerOpen ? 1.1 : 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 20,
                          }}
                        >
                          {drawerOpen ? item.activeIcon : item.icon}
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
                    <span
                      className={`text-[10px] font-bold tracking-tight ${drawerOpen ? 'text-slate-900' : 'text-slate-500'}`}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 flex-1 relative transition-all duration-200 min-h-[52px] rounded-xl font-bold text-xs ${
                    active
                      ? 'text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200/60 rounded-xl -z-10"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: active ? 1.1 : 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      {active ? item.activeIcon : item.icon}
                    </motion.div>
                    <AnimatePresence>
                      {item.href === '/progress' && pendingAssessments > 0 && (
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
                  <span
                    className={`text-[10px] font-bold tracking-tight ${active ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── PROFILE DRAWER (Menggunakan shadcn UI Sheet untuk Aksesibilitas & Performansi) ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="p-0 border-none bg-white rounded-t-[2.5rem] overflow-hidden max-h-[85vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi Utama Mobile</SheetTitle>
          </SheetHeader>

          {/* Drag handle visual */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-slate-200/80 rounded-full" />
          </div>

          {/* User identity */}
          <div className="px-6 pt-2 pb-4 border-b border-slate-100">
            {user ? (
              <div className="flex items-center gap-3.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-200 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base font-black ring-1 ring-indigo-100 shadow-sm shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {user.displayName || 'Pengguna'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigation</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">Menu Utama Publik</p>
              </div>
            )}
          </div>

          {/* Nav links */}
          <div className="px-4 py-3 space-y-1 max-h-[55vh] overflow-y-auto">
            {/* Profile link */}
            {user && (
              <Link
                href="/profil"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-slate-100/80 rounded-xl flex items-center justify-center ring-1 ring-slate-200/60 group-hover:ring-indigo-200 transition-colors">
                  <Settings
                    size={16}
                    className="text-slate-500 group-hover:text-indigo-600 transition-colors"
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex-1">
                  Profil & Pengaturan
                </span>
                <ChevronRight
                  size={14}
                  className="text-slate-300 group-hover:text-indigo-400 transition-colors"
                />
              </Link>
            )}

            {/* Divider */}
            {user && <div className="h-px bg-slate-100 mx-3 my-1" />}

            {/* Dynamic links */}
            {drawerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors group"
              >
                <div
                  className={`w-9 h-9 ${link.bg} rounded-xl flex items-center justify-center ring-1 ring-white/60 shadow-sm`}
                >
                  <span className={link.color}>{link.icon}</span>
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors flex-1">
                  {link.label}
                </span>
                <ChevronRight
                  size={14}
                  className="text-slate-300 group-hover:text-slate-500 transition-colors"
                />
              </Link>
            ))}

            {/* Guest: login CTA */}
            {!user && (
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all mt-3"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>

          {/* Logout */}
          {user && (
            <div className="px-4 pt-2 pb-6 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl hover:bg-rose-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center ring-1 ring-rose-100">
                  <LogOut size={16} className="text-rose-500" />
                </div>
                <span className="text-sm font-bold text-rose-600 flex-1 text-left">
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
