'use client'

// src/components/layout/PublicNavbar.tsx
// Setelah refactor: semua menu dibaca dari navigation.config, tidak ada lagi hardcode JSX per-item

import React, { useState } from 'react'
import Link from 'next/link'
import { SafeLogo } from '@/components/layout/SafeLogo'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  User, KeyRound, LogOut, ChevronDown,
  Receipt, LogIn, Search, Sparkles, Handshake,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem,
  NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { PublicSearchDialog } from '@/components/common/PublicSearchDialog'

// ── Import dari config terpusat ──────────────────────────────
import {
  ROUTES,
  NAVBAR_GROUPS,
  filterNavItems,
  type NavItem,
} from '@/config'

// ── Sub-komponen: satu item di mega menu ─────────────────────
function MegaMenuItem({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={item.href}
        onClick={onClose}
        className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 group-hover:scale-105 transition-transform
            ${item.accent?.bg ?? 'bg-slate-50'} ${item.accent?.ring ?? 'ring-slate-100'}`}
        >
          <item.icon size={18} className={item.accent?.text ?? 'text-slate-500'} />
        </div>
        <div className="flex-1 min-w-0">
          {item.badge ? (
            <div className="flex items-center justify-between">
              <p className={`text-sm font-extrabold text-slate-900 transition-colors group-hover:${item.accent?.text ?? 'text-indigo-600'}`}>
                {item.label}
              </p>
              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                {item.badge}
              </Badge>
            </div>
          ) : (
            <p className={`text-sm font-extrabold text-slate-900 transition-colors group-hover:${item.accent?.text ?? 'text-indigo-600'}`}>
              {item.label}
            </p>
          )}
          {item.badge && (
            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5 hidden" />
          )}
        </div>
      </Link>
    </NavigationMenuLink>
  )
}

// ── Sub-komponen: Direct link di nav pill ────────────────────
function DirectNavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
        isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="navbar-active"
          className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200/60 rounded-xl -z-10"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <item.icon size={14} className={isActive ? 'text-slate-700' : 'text-slate-400'} />
      {item.label}
    </Link>
  )
}

// ── Komponen utama ────────────────────────────────────────────
export function PublicNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, isPremium, logout, assessmentQuota } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const handleLogout = async () => {
    try {
      await logout()
      router.push(ROUTES.HOME)
    } catch {
      // silent
    }
  }

  // ── Filter menu authenticated (auth-required items) ──────
  const authNavItems = filterNavItems(
    [
      { key: 'dashboard', label: 'Brankas', href: ROUTES.DASHBOARD, icon: require('lucide-react').FolderKanban, requiresAuth: true },
      { key: 'progress', label: 'Progres', href: ROUTES.PROGRESS, icon: require('lucide-react').TrendingUp, requiresAuth: true },
    ],
    { role, isLoggedIn: !!user, isPremium }
  )

  // ── Filter role portals (dalam dropdown user) ────────────
  const rolePortals = filterNavItems(NAVBAR_GROUPS.rolePortals, {
    role,
    isLoggedIn: !!user,
    isPremium,
  })

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 items-center justify-between px-6 lg:px-12">
        {/* Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href={ROUTES.HOME} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ring-1 ring-slate-200 group-hover:ring-indigo-200 transition-all overflow-hidden p-1">
              <SafeLogo src="/logo.png" alt="Omnifit" width={24} height={24} className="object-contain w-full h-full" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              Omnifit
            </span>
          </Link>

          {/* ── Menu Pill ───────────────────────────────────── */}
          <nav className="flex items-center gap-1 bg-slate-50/60 p-1 rounded-2xl ring-1 ring-slate-100/80">
            <NavigationMenu>
              <NavigationMenuList>

                {/* Direct links dari config */}
                {NAVBAR_GROUPS.direct.map((item) => (
                  <NavigationMenuItem key={item.key}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className={`group inline-flex h-10 w-max items-center justify-center rounded-xl bg-transparent px-4 py-2 text-xs font-bold transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none ${
                          isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                        }`}
                      >
                        <item.icon size={14} className="mr-1.5 text-indigo-500" />
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}

                {/* Mega Menu: Asesmen & Produk */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900">
                    <Sparkles size={14} className="mr-1.5 text-indigo-500" /> Asesmen & Produk
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-2 p-4 w-[400px] grid-cols-1">
                      {NAVBAR_GROUPS.assessmentMenu.map((item) => (
                        <MegaMenuItem key={item.key} item={item} />
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Mega Menu: Ekosistem & Solusi */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900">
                    <Handshake size={14} className="mr-1.5 text-blue-500" /> Ekosistem & Solusi
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-2 p-4 w-[420px] grid-cols-1">
                      {NAVBAR_GROUPS.ecosystemMenu.map((item) => (
                        <MegaMenuItem key={item.key} item={item} />
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

              </NavigationMenuList>
            </NavigationMenu>

            {/* Auth-only direct links */}
            {user && authNavItems.map((item) => (
              <DirectNavLink key={item.key} item={item} isActive={isActive(item.href)} />
            ))}
          </nav>
        </div>

        {/* ── Area Kanan ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/70 hover:bg-slate-100 text-slate-400 hover:text-slate-700 ring-1 ring-slate-200/60 transition-all text-xs font-medium"
                >
                  <Search size={14} className="text-slate-400" />
                  <span className="hidden lg:inline text-slate-500 font-bold">Cari modul...</span>
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-slate-400 bg-white rounded-md ring-1 ring-slate-200 shadow-2xs font-mono">
                    ⌘K
                  </kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pencarian Cepat Modul & Akses (Cmd+K)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {user ? (
            <>
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200/60">
                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2.5 p-1.5 pr-3 h-auto rounded-[1rem] hover:bg-slate-50 hover:ring-1 hover:ring-slate-200 transition-all"
                    >
                      {user.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          width={32}
                          height={32}
                          className="rounded-xl w-8 h-8 object-cover shadow-sm ring-1 ring-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm ring-1 ring-indigo-100 shadow-sm">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]">
                          {user.displayName?.split(' ')[0] || 'Pengguna'}
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-64 rounded-[1.5rem] p-3 shadow-xl ring-1 ring-slate-200 border-none bg-white"
                    align="end"
                  >
                    {/* Header akun */}
                    <DropdownMenuLabel className="font-normal px-3 py-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Saya</p>
                      <p className="text-sm font-bold text-slate-900 truncate mt-1">{user.email}</p>
                      {assessmentQuota > 0 && (
                        <div className="mt-3 flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-xl ring-1 ring-indigo-200">
                          <span className="text-xs font-bold text-indigo-700">Sisa Kuota:</span>
                          <span className="text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-sm">
                            {assessmentQuota} Modul
                          </span>
                        </div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-100 my-2" />

                    {/* Menu akun standar */}
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5">
                        <Link href={ROUTES.PROFIL} className="flex items-center gap-3">
                          <User size={16} className="text-slate-400" /> Profil Lengkap
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5">
                        <Link href={ROUTES.RIWAYAT} className="flex items-center gap-3">
                          <Receipt size={16} className="text-slate-400" /> Riwayat & Tagihan
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {/* Role-based portals (dinamis dari config) */}
                    {rolePortals.length > 0 && (
                      <>
                        <DropdownMenuSeparator className="bg-slate-100 my-2" />
                        <DropdownMenuGroup>
                          {rolePortals.map((item) => (
                            <DropdownMenuItem
                              key={item.key}
                              asChild
                              className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5"
                            >
                              <Link href={item.href} className="flex items-center gap-3">
                                <item.icon size={16} className="text-slate-400" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </>
                    )}

                    <DropdownMenuSeparator className="bg-slate-100 my-2" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-xl text-rose-600 font-bold focus:bg-rose-50 focus:text-rose-700 py-2.5 cursor-pointer"
                    >
                      <LogOut size={16} className="mr-3" />
                      Keluar Sistem
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                asChild
                className="rounded-xl h-10 px-4 bg-slate-900 hover:bg-indigo-600 text-white font-bold shadow-sm transition-all text-xs"
              >
                <Link href={ROUTES.TOKEN}>
                  <KeyRound size={14} className="mr-1.5" />
                  Gunakan Token
                </Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                asChild
                className="rounded-xl h-10 px-4 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-xs"
              >
                <Link href={ROUTES.LOGIN}>
                  <LogIn size={14} className="mr-1.5" />
                  Masuk
                </Link>
              </Button>
              <Button
                asChild
                className="rounded-xl h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all text-xs"
              >
                <Link href={ROUTES.KATALOG}>Mulai Eksplorasi</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Quick Search Dialog */}
      <PublicSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
