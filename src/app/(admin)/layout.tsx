'use client'

// src/app/admin/layout.tsx
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  UserCheck,
  MessageSquareShare,
  Handshake,
  Newspaper,
  MapPinned,
  Radar,
  Percent,
  Activity,
  BriefcaseBusiness,
  UserCog,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type AdminMenuItem = {
  name: string
  path: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string
  badgeVariant?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose'
}

type AdminMenuGroup = {
  key: string
  label: string
  items: AdminMenuItem[]
}

const adminMenuGroups: AdminMenuGroup[] = [
  {
    key: 'core',
    label: 'Core Admin',
    items: [
      { name: 'Dasbor Utama', path: '/admin', icon: LayoutDashboard },
      { name: 'Manajemen Token', path: '/admin/tokens', icon: KeyRound, badge: 'Aktif', badgeVariant: 'emerald' },
      { name: 'Manajemen Asesor', path: '/admin/assessors', icon: UserCheck },
      { name: 'Template Form', path: '/admin/templates', icon: Settings },
      { name: 'Artikel & Wawasan', path: '/admin/articles', icon: Newspaper },
      { name: 'Roadmap & Rencana', path: '/admin/roadmap', icon: MapPinned },
      { name: 'Crypto Academy', path: '/admin/crypto-academy', icon: Newspaper, badge: 'Modul', badgeVariant: 'indigo' },
    ],
  },
  {
    key: 'growth',
    label: 'Growth & Partnership',
    items: [
      { name: 'Harga & Monetisasi', path: '/admin/pricing', icon: Tags },
      { name: 'Ulasan & Feedback', path: '/admin/feedback', icon: MessageSquareShare },
      { name: 'Mitra & Kerjasama', path: '/admin/partners', icon: Handshake },
      { name: 'Audit Referral', path: '/admin/referrals', icon: Radar },
      { name: 'Program Affiliate', path: '/admin/affiliate-program', icon: Percent, badge: 'Komisi', badgeVariant: 'amber' },
      { name: 'Onboarding Metrics', path: '/admin/onboarding-metrics', icon: Activity },
    ],
  },
  {
    key: 'b2b',
    label: 'B2B Pilot & Analytics',
    items: [
      { name: 'B2B Pilot Dashboard', path: '/admin/b2b-pilot', icon: BriefcaseBusiness, badge: 'B2B', badgeVariant: 'sky' },
      { name: 'Akses Role B2B', path: '/admin/b2b-access', icon: UserCog },
      { name: 'B2B Tokens', path: '/admin/b2b-tokens', icon: KeyRound },
      { name: 'B2B BI Analytics', path: '/admin/b2b-analytics', icon: BarChart3, badge: 'BI', badgeVariant: 'emerald' },
    ],
  },
]


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const canAccessAdmin = role === 'admin_csrs' || role === 'admin_omnifit'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [openDesktopGroups, setOpenDesktopGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminMenuGroups.map((group) => [group.key, true]))
  )
  const [openMobileGroups, setOpenMobileGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminMenuGroups.map((group) => [group.key, true]))
  )

  useEffect(() => {
    if (!loading && (!user || !canAccessAdmin)) {
      router.push('/')
    }
  }, [user, canAccessAdmin, loading, router])

  if (loading || !canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted text-muted-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-indigo-200 dark:border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-black text-xs uppercase tracking-widest">Verifikasi Otoritas Admin...</p>
        </div>
      </div>
    )
  }

  const allMenuItems = adminMenuGroups.flatMap((group) => group.items)

  const isItemActive = (path: string) => pathname.startsWith(path) && (path !== '/admin' || pathname === '/admin')

  const toggleDesktopGroup = (key: string) => {
    setOpenDesktopGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleMobileGroup = (key: string) => {
    setOpenMobileGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-muted text-muted-foreground font-sans text-foreground selection:bg-indigo-100 selection:text-indigo-900">
        
        {/* MOBILE SIDEBAR SHEET */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-80 p-0 border-r border-border card-solid">
            <SheetHeader className="h-20 flex items-center justify-between px-6 border-b border-border flex-row space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <SheetTitle className="text-lg font-black tracking-tight text-foreground">
                  CSRS <span className="text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest ml-1">Admin</span>
                </SheetTitle>
              </div>
            </SheetHeader>

            <nav className="flex-1 py-6 px-4 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
              {adminMenuGroups.map((group) => {
                const isOpen = openMobileGroups[group.key] ?? true
                const hasActiveItem = group.items.some((item) => isItemActive(item.path))

                return (
                  <div key={group.key} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMobileGroup(group.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                        hasActiveItem ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10/70' : 'text-muted-foreground hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span>{group.label}</span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {isOpen && (
                      <div className="space-y-1 pl-1">
                        {group.items.map((item) => {
                          const isActive = isItemActive(item.path)
                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                                isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-muted-foreground hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon size={18} className={isActive ? 'text-white' : 'text-muted-foreground'} />
                                <span>{item.name}</span>
                              </div>
                              {item.badge && (
                                <Badge variant={item.badgeVariant || 'indigo'} className="text-[10px] px-2 py-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <div className="p-4 border-t border-border absolute bottom-0 left-0 right-0 card-solid">
              <button
                onClick={() => {
                  logout()
                  router.push('/')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:bg-rose-500/10 transition-colors text-sm"
              >
                <LogOut size={18} /> Keluar dari Admin
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden md:flex flex-col bg-background text-foreground shrink-0 transition-all duration-300 relative z-20 shadow-xl shadow-sm ${
            isSidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          {/* Logo Header */}
          <div className="h-20 flex items-center px-6 border-b border-border justify-between shrink-0">
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full px-0' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="whitespace-nowrap">
                  <h1 className="text-lg font-black tracking-tight leading-none text-white flex items-center gap-1.5">
                    CSRS
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h1>
                  <p className="text-[9px] uppercase tracking-widest text-indigo-400 font-black mt-0.5">Admin Console</p>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-white shrink-0 transition-colors"
                  >
                    <PanelLeftClose size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Kecilkan Sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-6 px-3.5 space-y-4 overflow-y-auto custom-scrollbar">
            {isSidebarCollapsed ? (
              allMenuItems.map((item) => {
                const isActive = isItemActive(item.path)

                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.path}
                        className={`flex items-center justify-center p-3 rounded-xl font-bold transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <item.icon size={20} className={isActive ? 'text-white' : 'text-muted-foreground shrink-0'} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                )
              })
            ) : (
              adminMenuGroups.map((group) => {
                const isOpen = openDesktopGroups[group.key] ?? true
                const hasActiveItem = group.items.some((item) => isItemActive(item.path))

                return (
                  <div key={group.key} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleDesktopGroup(group.key)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                        hasActiveItem ? 'text-indigo-400 bg-indigo-950/40' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span>{group.label}</span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {isOpen && (
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isActive = isItemActive(item.path)

                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/40 ring-1 ring-indigo-400/30'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <item.icon size={18} className={isActive ? 'text-white' : 'text-muted-foreground shrink-0'} />
                                <span className="truncate">{item.name}</span>
                              </div>
                              {item.badge && (
                                <Badge variant={item.badgeVariant || 'indigo'} className="text-[9px] px-2 py-0 border-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </nav>

          {/* Footer User & Logout */}
          <div className="p-4 border-t border-border shrink-0 bg-background/90">
            {isSidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="w-full flex items-center justify-center p-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors mb-2"
                  >
                    <PanelLeftOpen size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Perluas Sidebar</TooltipContent>
              </Tooltip>
            )}
            <button
              onClick={() => {
                logout()
                router.push('/')
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 text-xs font-bold transition-colors border border-transparent hover:border-rose-900/40 ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut size={18} className="shrink-0" />
              {!isSidebarCollapsed && <span>Keluar Sistem</span>}
            </button>
          </div>
        </aside>

        {/* KONTEN UTAMA */}
        <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-muted text-muted-foreground">
          {/* Header Khusus Mobile */}
          <div className="md:hidden card-solid/90 backdrop-blur-md border-b border-border p-4 flex justify-between items-center shrink-0 z-10">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-muted-foreground hover:bg-secondary text-secondary-foreground rounded-xl transition-colors"
            >
              <Menu size={22} />
            </button>
            <h2 className="font-black text-foreground flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> CSRS Admin
            </h2>
            <button onClick={() => { logout(); router.push('/'); }} className="text-rose-500 p-2">
              <LogOut size={20} />
            </button>
          </div>

          {/* Top Bar Khusus Desktop */}
          <header className="hidden md:flex h-16 card-solid border-b border-border/80 px-8 items-center justify-between shrink-0 z-10 shadow-xs">
            {/* Breadcrumb / Page Title */}
            <div className="flex items-center gap-3">
              {(() => {
                const currentItem = allMenuItems.find((i) => isItemActive(i.path))
                const IconComponent = currentItem?.icon || LayoutDashboard
                return (
                  <>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <IconComponent size={18} />
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <span className="text-muted-foreground">Admin</span>
                      <span className="text-foreground">/</span>
                      <span className="text-foreground font-bold">{currentItem?.name || 'Dasbor Utama'}</span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Quick User & System Status Pill */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20/60 rounded-full text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>System Operational</span>
              </div>

              <div className="h-4 w-px bg-slate-200 hidden lg:block"></div>

              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-secondary text-secondary-foreground/80 rounded-full border border-border">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {(user?.email?.[0] || 'A').toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-700 max-w-[150px] truncate">
                  {user?.email || 'admin@csrs.id'}
                </span>
                <Badge variant="indigo" className="text-[9px] px-1.5 py-0 uppercase tracking-widest font-black">
                  {role === 'admin_csrs' ? 'CSRS' : 'Omnifit'}
                </Badge>
              </div>
            </div>
          </header>

          {/* Area Scroll Khusus Konten */}
          <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1600px] w-full mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}