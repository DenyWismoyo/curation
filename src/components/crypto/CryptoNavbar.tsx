'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Eye,
  Radar,
  Flame,
  Target,
  Menu,
  X,
  LineChart,
  LogOut,
  ChevronLeft,
  Globe,
  Zap,
  Lock
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { href: '/crypto-report', label: 'Dashboard', icon: Activity },
  { href: '/crypto-report/smart-money', label: 'Smart Money', icon: Eye },
  { href: '/crypto-report/liquidity', label: 'Liquidity', icon: Radar },
  { href: '/crypto-report/danger-zone', label: 'Danger Zone', icon: Flame },
  { href: '/crypto-report/scalping-radar', label: 'Scalping', icon: Target },
  { href: '/crypto-report/hidden-gems', label: 'Hidden Gems', icon: LineChart },
  { href: '/crypto-report/news', label: 'News & Alpha', icon: Globe },
]

export function CryptoNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, logout, isPremium: authIsPremium } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeScalps, setActiveScalps] = useState(0)
  const [hasDanger, setHasDanger] = useState(false)

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith('admin');
  const isPremium = authIsPremium || false;
  const hasAccess = isAdmin || isPremium;

  const dynamicNavLinks = [...NAV_LINKS];
  if (isAdmin) {
    dynamicNavLinks.push({ href: '/crypto-report/realtime-radar', label: 'Realtime Radar', icon: Zap });
  }

  React.useEffect(() => {
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

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    setMobileMenuOpen(false);
  }

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
      <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all">
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-6 lg:gap-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
               <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-lg font-black text-white tracking-tight group-hover:text-purple-400 transition-colors">
                Crypto<span className="text-purple-500">Hub</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {dynamicNavLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`relative px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center gap-2 ${
                    active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="crypto-navbar-active"
                      className="absolute inset-0 bg-white/10 rounded-xl -z-10 border border-white/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={16} className={active ? 'text-purple-400' : ''} />
                  {link.label}
                  {link.label === 'Scalping' && activeScalps > 0 && (
                     <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-1">
                        {activeScalps}
                     </span>
                  )}
                  {link.label === 'Danger Zone' && hasDanger && (
                     <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                  {link.href !== '/crypto-report' && link.href !== '/crypto-report/news' && !hasAccess && (
                     <Lock className="w-3.5 h-3.5 ml-1 text-slate-500 opacity-60" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Actions & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:flex text-slate-400 hover:text-white hover:bg-white/10 font-bold"
            >
            <Link href="/crypto"><ChevronLeft size={16} className="mr-1" /> Main App</Link>
          </Button>

          {user ? (
            <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hidden sm:flex text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                title="Keluar"
            >
                <LogOut size={18} />
            </Button>
          ) : (
             <Button
                size="sm"
                asChild
                className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
                <Link href="/login">Masuk</Link>
            </Button>
          )}

          {/* Mobile Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-300 hover:text-white hover:bg-white/10"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 sm:top-20 bg-slate-950/95 backdrop-blur-3xl border-b border-white/10 z-40 md:hidden overflow-y-auto shadow-2xl max-h-[calc(100vh-4rem)]"
          >
            <div className="flex flex-col p-4 space-y-1">
              {dynamicNavLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      active 
                        ? 'bg-white/10 text-white shadow-inner border border-white/5' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : ''}`} />
                    <span className="flex-1">{link.label}</span>
                    
                    {/* Lencana indikator khusus */}
                    {link.label === 'Scalping' && activeScalps > 0 && (
                      <span className="ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] border border-indigo-500/30">
                        {activeScalps}
                      </span>
                    )}
                    {link.label === 'Danger Zone' && hasDanger && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}

                    {/* Ikon Gembok untuk Free Tier */}
                    {link.href !== '/crypto-report' && link.href !== '/crypto-report/news' && !hasAccess && (
                      <Lock className="w-3.5 h-3.5 ml-1 text-slate-500 opacity-60" />
                    )}
                  </Link>
                )
              })}
              
              <div className="h-px bg-white/10 my-4" />
              
              <Link
                href="/crypto"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all"
              >
                <ChevronLeft size={18} />
                Kembali ke Main App
              </Link>
              
              {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all text-left"
                  >
                    <LogOut size={18} />
                    Keluar Sistem
                  </button>
              ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold bg-purple-600 text-white mt-2"
                  >
                    Masuk
                  </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
