'use client'

// src/components/shared/PublicNavbar.tsx

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SafeLogo } from '@/components/shared/SafeLogo'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LibraryBig,
  FolderKanban,
  TrendingUp,
  Users,
  User,
  KeyRound,
  LogOut,
  Compass,
  ChevronDown,
  Receipt,
  MapPinned,
  LogIn,
  Search,
  Handshake,
  HandCoins,
  Sparkles,
  Layers
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PublicSearchDialog } from '@/components/shared/PublicSearchDialog'

export function PublicNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, assessmentQuota } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch {
      // silent
    }
  }

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 items-center justify-between px-6 lg:px-12">
        {/* Brand & Kiri */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ring-1 ring-slate-200 group-hover:ring-indigo-200 transition-all overflow-hidden p-1">
              <SafeLogo
                src="/logo.png"
                alt="Omnifit"
                width={24}
                height={24}
                className="object-contain w-full h-full"
              />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                Omnifit
              </span>
            </div>
          </Link>

          {/* Navigasi Utama (Mega Menu shadcn UI + Floating Active Pill) */}
          <nav className="flex items-center gap-1 bg-slate-50/60 p-1 rounded-2xl ring-1 ring-slate-100/80">
            <NavigationMenu>
              <NavigationMenuList>
                {/* 0. Link Langsung: Fitur Aplikasi */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/fitur"
                      className={`group inline-flex h-10 w-max items-center justify-center rounded-xl bg-transparent px-4 py-2 text-xs font-bold transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${isActive('/fitur') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
                    >
                      <Layers size={14} className="mr-1.5 text-indigo-500" /> Fitur Aplikasi
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* 1. Mega Menu: Produk & Asesmen */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900">
                    <Sparkles size={14} className="mr-1.5 text-indigo-500" /> Asesmen & Produk
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-2 p-4 w-[400px] grid-cols-1">
                      <NavigationMenuLink asChild>
                        <Link
                          href="/katalog"
                          className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 ring-1 ring-indigo-100 group-hover:scale-105 transition-transform">
                            <LibraryBig size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                Katalog Modul
                              </p>
                              <Badge variant="indigo" className="text-[10px] px-2 py-0">Koleksi</Badge>
                            </div>
                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                              Jelajahi template asesmen cerdas berbasis analitik AI.
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>

                      <NavigationMenuLink asChild>
                        <Link
                          href="/explore"
                          className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 ring-1 ring-sky-100 group-hover:scale-105 transition-transform">
                            <Compass size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors">
                              Explore Insight
                            </p>
                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                              Temukan tren data riset dan ulasan publik terkini.
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>

                      <NavigationMenuLink asChild>
                        <Link
                          href="/roadmap"
                          className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 ring-1 ring-purple-100 group-hover:scale-105 transition-transform">
                            <MapPinned size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
                                Roadmap AI
                              </p>
                              <Badge variant="amber" className="text-[10px] px-2 py-0">Futuristik</Badge>
                            </div>
                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                              Peta jalan inovasi & pengembangan fitur masa depan.
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* 2. Mega Menu: Ekosistem & Solusi */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900">
                    <Handshake size={14} className="mr-1.5 text-blue-500" /> Ekosistem & Solusi
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-2 p-4 w-[420px] grid-cols-1">
                      <NavigationMenuLink asChild>
                        <Link
                          href="/mitra"
                          className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100 group-hover:scale-105 transition-transform">
                            <Handshake size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                Mitra Strategis & Klien B2B
                              </p>
                              <Badge variant="sky" className="text-[10px] px-2 py-0">Enterprise</Badge>
                            </div>
                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                              Jaringan institusi, pakar industri, dan solusi korporasi.
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>

                      <NavigationMenuLink asChild>
                        <Link
                          href="/affiliate"
                          className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-100 group-hover:scale-105 transition-transform">
                            <HandCoins size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">
                                Portal Affiliate
                              </p>
                              <Badge variant="emerald" className="text-[10px] px-2 py-0">Komisi</Badge>
                            </div>
                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                              Dapatkan komisi referral hingga puluhan persen.
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>

                      <NavigationMenuLink asChild>
                        <Link
                          href="/komunitas"
                          className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 ring-1 ring-emerald-100 group-hover:scale-105 transition-transform">
                            <Users size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                              Komunitas & Forum
                            </p>
                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                              Ruang berbagi ulasan, praktik baik, & pengalaman.
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Direct Links (User Authenticated tabs) */}
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className={`
                    relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5
                    ${
                      isActive('/dashboard')
                        ? 'text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }
                  `}
                >
                  {isActive('/dashboard') && (
                    <motion.div
                      layoutId="navbar-active"
                      className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200/60 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <FolderKanban size={15} /> Brankas
                </Link>

                <Link
                  href="/progress"
                  className={`
                    relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5
                    ${
                      isActive('/progress')
                        ? 'text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }
                  `}
                >
                  {isActive('/progress') && (
                    <motion.div
                      layoutId="navbar-active"
                      className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200/60 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <TrendingUp size={15} /> Progres
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Area Kanan (Pencarian Global, User & CTA) */}
        <div className="flex items-center gap-3">
          {/* Tombol Trigger Quick Search Cmd+K */}
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

                  {/* Dropdown Bergaya CurationDashboard */}
                  <DropdownMenuContent
                    className="w-64 rounded-[1.5rem] p-3 shadow-xl ring-1 ring-slate-200 border-none bg-white"
                    align="end"
                  >
                    <DropdownMenuLabel className="font-normal px-3 py-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Akun Saya
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate mt-1">
                        {user.email}
                      </p>
                      {(assessmentQuota > 0) && (
                        <div className="mt-3 flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-xl ring-1 ring-indigo-200">
                          <span className="text-xs font-bold text-indigo-700">Sisa Kuota:</span>
                          <span className="text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md shadow-sm">
                            {assessmentQuota} Modul
                          </span>
                        </div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-100 my-2" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        asChild
                        className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5"
                      >
                        <Link href="/profil" className="flex items-center gap-3">
                          <User size={16} className="text-slate-400" /> Profil
                          Lengkap
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        asChild
                        className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5"
                      >
                        <Link href="/riwayat" className="flex items-center gap-3">
                          <Receipt size={16} className="text-slate-400" /> Riwayat
                          & Tagihan
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
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
                <Link href="/token">
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
                <Link href="/login">
                  <LogIn size={14} className="mr-1.5" />
                  Masuk
                </Link>
              </Button>
              <Button
                asChild
                className="rounded-xl h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all text-xs"
              >
                <Link href="/katalog">Mulai Eksplorasi</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Modal Quick Search Dialog (Cmd + K) */}
      <PublicSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
