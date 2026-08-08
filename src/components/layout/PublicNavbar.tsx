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
  FolderKanban
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
import { ThemeToggleCompact } from '@/components/ui/ThemeToggleCompact'

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
        className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-muted text-muted-foreground transition-all group"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 group-hover:scale-105 transition-transform
            ${item.accent?.bg ?? 'bg-muted text-muted-foreground'} ${item.accent?.ring ?? 'ring-slate-100'}`}
        >
          <item.icon size={18} className={item.accent?.text ?? 'text-muted-foreground'} />
        </div>
        <div className="flex-1 min-w-0">
          {item.badge ? (
            <div className="flex items-center justify-between">
              <p className={`text-sm font-extrabold text-foreground transition-colors group-hover:${item.accent?.text ?? 'text-indigo-600 dark:text-indigo-400'}`}>
                {item.label}
              </p>
              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                {item.badge}
              </Badge>
            </div>
          ) : (
            <p className={`text-sm font-extrabold text-foreground transition-colors group-hover:${item.accent?.text ?? 'text-indigo-600 dark:text-indigo-400'}`}>
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

// Komponen removed to match Crypto UI
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
      { key: 'dashboard', label: 'Brankas Modul', href: ROUTES.DASHBOARD, icon: FolderKanban, requiresAuth: true, accent: { text: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' } },
      { key: 'progress', label: 'Progres Asesmen', href: ROUTES.PROGRESS, icon: require('lucide-react').TrendingUp, requiresAuth: true, accent: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' } },
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
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 card-solid/80 backdrop-blur-xl border-b border-border z-50 items-center justify-between px-6 lg:px-12">
        {/* Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href={user ? ROUTES.DASHBOARD : ROUTES.HOME} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl card-solid flex items-center justify-center shadow-sm ring-1 ring-border group-hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all overflow-hidden p-1">
              <SafeLogo src="/logo.png" alt="Omnifit" width={24} height={24} className="object-contain w-full h-full" />
            </div>
            <span className="text-lg font-black text-foreground tracking-tight group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">
              Omnifit
            </span>
          </Link>

          {/* ── Menu Pill ───────────────────────────────────── */}
          <nav className="flex items-center gap-1 bg-muted text-muted-foreground/60 p-1 rounded-2xl ring-1 ring-border/80">
            <NavigationMenu>
              <NavigationMenuList>

                {/* Mega Menu: Asesmen & Produk */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all text-muted-foreground hover:text-foreground hover:card-solid dark:text-slate-400 dark:hover:text-white dark:hover:card-solid/5 outline-none data-[state=open]:card-solid dark:data-[state=open]:card-solid/10 data-[state=open]:text-foreground dark:data-[state=open]:text-white">
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
                  <NavigationMenuTrigger className="group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all text-muted-foreground hover:text-foreground hover:card-solid dark:text-slate-400 dark:hover:text-white dark:hover:card-solid/5 outline-none data-[state=open]:card-solid dark:data-[state=open]:card-solid/10 data-[state=open]:text-foreground dark:data-[state=open]:text-white">
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

                {/* Auth-only grouped menu */}
                {user && authNavItems.length > 0 && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all text-muted-foreground hover:text-foreground hover:card-solid dark:text-slate-400 dark:hover:text-white dark:hover:card-solid/5 outline-none data-[state=open]:card-solid dark:data-[state=open]:card-solid/10 data-[state=open]:text-foreground dark:data-[state=open]:text-white">
                      <FolderKanban size={14} className="mr-1.5 text-emerald-500" /> Progres & Brankas
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-2 p-4 w-[280px] grid-cols-1">
                        {authNavItems.map((item) => (
                          <MegaMenuItem key={item.key} item={item} />
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
        </div>

        {/* ── Area Kanan ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <ThemeToggleCompact />
          {/* Quick Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground/70 hover:bg-secondary text-secondary-foreground text-slate-400 hover:text-slate-700 ring-1 ring-border transition-all text-xs font-medium"
                >
                  <Search size={14} className="text-slate-400" />
                  <span className="hidden lg:inline text-muted-foreground font-bold">Cari modul...</span>
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-slate-400 card-solid rounded-md ring-1 ring-border shadow-2xs font-mono">
                    ⌘K
                  </kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pencarian Cepat Modul & Akses (Cmd+K)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {user ? (
            <>
              <div className="flex items-center gap-3 pl-3 border-l border-border">
                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2.5 p-1.5 pr-3 h-auto rounded-[1rem] hover:bg-secondary text-secondary-foreground dark:hover:card-solid/5 hover:ring-1 hover:ring-slate-200 dark:hover:ring-white/10 transition-all"
                    >
                      {user.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          width={32}
                          height={32}
                          className="rounded-xl w-8 h-8 object-cover shadow-sm ring-1 ring-border"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm ring-1 ring-indigo-100 shadow-sm">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[100px]">
                          {user.displayName?.split(' ')[0] || 'Pengguna'}
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-64 rounded-[1.5rem] p-3 shadow-xl ring-1 ring-border border-none card-solid"
                    align="end"
                  >
                    {/* Header akun */}
                    <DropdownMenuLabel className="font-normal px-3 py-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Saya</p>
                      <p className="text-sm font-bold text-foreground truncate mt-1">{user.email}</p>
                      {assessmentQuota > 0 && (
                        <div className="mt-3 flex items-center justify-between bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 rounded-xl ring-1 ring-indigo-200 dark:ring-indigo-500/20">
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Sisa Kuota:</span>
                          <span className="text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-sm">
                            {assessmentQuota} Modul
                          </span>
                        </div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-secondary text-secondary-foreground my-2" />

                    {/* Menu akun standar */}
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-muted text-muted-foreground font-bold text-slate-700 py-2.5">
                        <Link href={ROUTES.PROFIL} className="flex items-center gap-3">
                          <User size={16} className="text-slate-400" /> Profil Lengkap
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-muted text-muted-foreground font-bold text-slate-700 py-2.5">
                        <Link href={ROUTES.RIWAYAT} className="flex items-center gap-3">
                          <Receipt size={16} className="text-slate-400" /> Riwayat & Tagihan
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {/* Role-based portals (dinamis dari config) */}
                    {rolePortals.length > 0 && (
                      <>
                        <DropdownMenuSeparator className="bg-secondary text-secondary-foreground my-2" />
                        <DropdownMenuGroup>
                          {rolePortals.map((item) => (
                            <DropdownMenuItem
                              key={item.key}
                              asChild
                              className="rounded-xl cursor-pointer hover:bg-muted text-muted-foreground font-bold text-slate-700 py-2.5"
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

                    <DropdownMenuSeparator className="bg-secondary text-secondary-foreground my-2" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-xl text-rose-600 dark:text-rose-400 font-bold focus:bg-rose-50 dark:bg-rose-500/10 focus:text-rose-700 dark:text-rose-300 py-2.5 cursor-pointer"
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
                className="rounded-xl h-10 px-4 font-bold text-muted-foreground hover:text-foreground hover:bg-muted text-muted-foreground transition-all text-xs"
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
