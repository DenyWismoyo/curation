'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import { motion } from 'framer-motion'
import {
  Activity,
  LogOut,
  ChevronLeft,
  Lock,
  ChevronDown,
  User,
  Receipt,
  BrainCircuit,
  Zap,
  BookOpen
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu, NavigationMenuItem,
  NavigationMenuLink, NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { 
  CRYPTO_NAV_LINKS, 
  CRYPTO_ADMIN_LINKS
} from '../../config/navigation'
import { ROUTES } from '@/config'

export function CryptoNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, logout, isPremium: authIsPremium } = useAuth()
  
  const [activeScalps, setActiveScalps] = useState(0)
  const [hasDanger, setHasDanger] = useState(false)

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith('admin')
  const isPremium = authIsPremium || false
  const hasAccess = isAdmin || isPremium

  const dynamicNavLinks = [...CRYPTO_NAV_LINKS]
  if (isAdmin) {
    dynamicNavLinks.push(...CRYPTO_ADMIN_LINKS)
  }

  useEffect(() => {
    if (!user || !hasAccess) return;
    
    // Fetch active scalps
    const qScalps = query(collection(db, "cryptoActiveTrades"), where("status", "==", "PENDING"));
    const unsubScalps = onSnapshot(qScalps, (snap) => {
        setActiveScalps(snap.size);
    });

    // Fetch danger zone
    const qDanger = query(collection(db, "cryptoDangerZone"), orderBy("createdAt", "desc"), limit(1));
    const unsubDanger = onSnapshot(qDanger, (snap) => {
        if (!snap.empty && snap.docs[0].data().coins?.length > 0) {
           setHasDanger(true);
        } else {
           setHasDanger(false);
        }
    });

    return () => {
       unsubScalps();
       unsubDanger();
    }
  }, [user, hasAccess]);

  const isActive = (href: string) => {
    if (href === '/crypto-report') {
        return pathname === '/crypto-report'
    }
    return pathname?.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch {
      // silent
    }
  }

  // Groups
  const dashboardLink = dynamicNavLinks.find(l => l.href === '/crypto-report');
  const intelLinks = dynamicNavLinks.filter(l => ['/crypto-report/smart-money', '/crypto-report/liquidity', '/crypto-report/danger-zone', '/crypto-report/hidden-gems'].includes(l.href));
  const radarLinks = dynamicNavLinks.filter(l => ['/crypto-report/scalping-radar', '/crypto-report/realtime-radar'].includes(l.href));
  const insightLinks = dynamicNavLinks.filter(l => ['/crypto-report/news', '/crypto-academy'].includes(l.href) || (!intelLinks.includes(l) && !radarLinks.includes(l) && l !== dashboardLink));

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 z-40 items-center justify-between px-6 lg:px-12 w-full max-w-full">
      {/* Brand & Desktop Links */}
      <div className="flex items-center gap-6 lg:gap-10">
        <Link href="/crypto-report" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ring-1 ring-indigo-500/50 dark:ring-white/10">
             <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Crypto<span className="text-purple-600 dark:text-purple-500">Hub</span>
            </span>
          </div>
        </Link>

        {/* ── Menu Pill (Adaptive Theme & Grouped) ───────────────────────── */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
          <NavigationMenu>
            <NavigationMenuList className="flex gap-1">
              
              {/* Dashboard */}
              {dashboardLink && (
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href={dashboardLink.href}
                      className={`group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all ${
                        isActive(dashboardLink.href)
                          ? 'text-slate-900 dark:text-white bg-white dark:bg-white/15 shadow-sm ring-1 ring-slate-200 dark:ring-white/10' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                      }`}
                    >
                      <dashboardLink.icon size={14} className="mr-1.5 text-indigo-500" />
                      {dashboardLink.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}

              {/* Intelligence Group */}
              {intelLinks.length > 0 && (
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 outline-none data-[state=open]:bg-white dark:data-[state=open]:bg-white/10 data-[state=open]:text-slate-900 dark:data-[state=open]:text-white">
                        <BrainCircuit size={14} className="mr-1.5 text-purple-500" />
                        Intelligence
                        {hasDanger && <span className="ml-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                        <ChevronDown size={14} className="ml-1.5 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                      <div className="px-2 py-1.5 mb-1">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Analitik Lanjutan</p>
                      </div>
                      {intelLinks.map(link => (
                        <DropdownMenuItem key={link.href} asChild className="rounded-xl focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                          <Link href={link.href} className="flex items-center gap-2 py-2">
                            <link.icon size={14} className="text-slate-500" />
                            <span className="font-bold flex-1">{link.label}</span>
                            {link.label === 'Danger Zone' && hasDanger && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                            {link.requiresPremium && !hasAccess && <Lock size={12} className="text-slate-400" />}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              )}

              {/* Radar Group */}
              {radarLinks.length > 0 && (
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 outline-none data-[state=open]:bg-white dark:data-[state=open]:bg-white/10 data-[state=open]:text-slate-900 dark:data-[state=open]:text-white">
                        <Zap size={14} className="mr-1.5 text-emerald-500" />
                        Radar
                        {activeScalps > 0 && (
                          <span className="ml-1.5 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
                            {activeScalps}
                          </span>
                        )}
                        <ChevronDown size={14} className="ml-1.5 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                      <div className="px-2 py-1.5 mb-1">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Trading & Scanner</p>
                      </div>
                      {radarLinks.map(link => (
                        <DropdownMenuItem key={link.href} asChild className="rounded-xl focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                          <Link href={link.href} className="flex items-center gap-2 py-2">
                            <link.icon size={14} className="text-slate-500" />
                            <span className="font-bold flex-1">{link.label}</span>
                            {link.label === 'Scalping' && activeScalps > 0 && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
                                {activeScalps}
                              </span>
                            )}
                            {link.requiresPremium && !hasAccess && <Lock size={12} className="text-slate-400" />}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              )}

              {/* Insights Group */}
              {insightLinks.length > 0 && (
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="group relative flex h-10 items-center justify-center rounded-xl bg-transparent px-4 py-1.5 text-xs font-bold transition-all text-slate-500 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 outline-none data-[state=open]:bg-white dark:data-[state=open]:bg-white/10 data-[state=open]:text-slate-900 dark:data-[state=open]:text-white">
                        <BookOpen size={14} className="mr-1.5 text-orange-500" />
                        Insights
                        <ChevronDown size={14} className="ml-1.5 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                      <div className="px-2 py-1.5 mb-1">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Berita & Edukasi</p>
                      </div>
                      {insightLinks.map(link => (
                        <DropdownMenuItem key={link.href} asChild className="rounded-xl focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                          <Link href={link.href} className="flex items-center gap-2 py-2">
                            <link.icon size={14} className="text-slate-500" />
                            <span className="font-bold flex-1">{link.label}</span>
                            {link.requiresPremium && !hasAccess && <Lock size={12} className="text-slate-400" />}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              )}

            </NavigationMenuList>
          </NavigationMenu>
        </nav>
      </div>

      {/* ── Area Kanan (User Dropdown) ────────────────────── */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-white/10">
            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2.5 p-1.5 pr-3 h-auto rounded-[1rem] hover:bg-slate-100 dark:hover:bg-white/5 hover:ring-1 hover:ring-slate-200 dark:hover:ring-white/10 transition-all"
                >
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      width={32}
                      height={32}
                      className="rounded-xl w-8 h-8 object-cover shadow-sm ring-1 ring-slate-200 dark:ring-white/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm ring-1 ring-purple-200 dark:ring-purple-500/30 shadow-sm">
                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight truncate max-w-[100px]">
                      {user.displayName?.split(' ')[0] || 'Pengguna'}
                    </span>
                    <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-64 rounded-[1.5rem] p-3 shadow-lg dark:shadow-2xl dark:shadow-black/50 ring-1 ring-slate-200 dark:ring-white/10 border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900"
                align="end"
              >
                {/* Header akun */}
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Akun Saya</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">{user.email}</p>
                  
                  {/* Status Crypto */}
                  <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl ring-1 ring-slate-100 dark:ring-white/10">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
                    {hasAccess ? (
                      <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-400 text-white px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                        Premium
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                        Free Tier
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-2" />

                {/* Menu akun standar */}
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-slate-600 dark:text-slate-300 focus:text-slate-900 dark:focus:text-white focus:bg-slate-100 dark:focus:bg-white/10 py-2.5">
                    <Link href={ROUTES.PROFIL} className="flex items-center gap-3">
                      <User size={16} className="text-slate-400 dark:text-slate-500" /> Profil Lengkap
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-slate-600 dark:text-slate-300 focus:text-slate-900 dark:focus:text-white focus:bg-slate-100 dark:focus:bg-white/10 py-2.5">
                    <Link href={ROUTES.RIWAYAT} className="flex items-center gap-3">
                      <Receipt size={16} className="text-slate-400 dark:text-slate-500" /> Riwayat & Tagihan
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-2" />
                
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-slate-600 dark:text-slate-300 focus:text-slate-900 dark:focus:text-white focus:bg-slate-100 dark:focus:bg-white/10 py-2.5">
                    <Link href="/crypto" className="flex items-center gap-3">
                      <ChevronLeft size={16} className="text-slate-400 dark:text-slate-500" /> Kembali ke Main App
                    </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-2" />
                
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-xl text-rose-600 dark:text-rose-400 font-bold focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-400 py-2.5 cursor-pointer"
                >
                  <LogOut size={16} className="mr-3" />
                  Keluar Sistem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              asChild
              className="rounded-xl h-10 px-4 font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs"
            >
              <Link href="/login">Masuk</Link>
            </Button>
            <Button
              asChild
              className="rounded-xl h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-900/50 transition-all text-xs"
            >
              <Link href="/crypto">Berlangganan</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
