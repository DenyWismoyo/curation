'use client'

// src/components/shared/PublicNavbar.tsx

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { Button } from '@/components/ui/button'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  requiresAuth?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/explore',
    label: 'Explore',
    icon: <Compass size={16} strokeWidth={2} />,
  },
  {
    href: '/katalog',
    label: 'Katalog',
    icon: <LibraryBig size={16} strokeWidth={2} />,
  },
  {
    href: '/roadmap',
    label: 'Roadmap',
    icon: <MapPinned size={16} strokeWidth={2} />,
  },
  {
    href: '/dashboard',
    label: 'Brankas',
    icon: <FolderKanban size={16} strokeWidth={2} />,
    requiresAuth: true,
  },
  {
    href: '/progress',
    label: 'Progres',
    icon: <TrendingUp size={16} strokeWidth={2} />,
    requiresAuth: true,
  },
  {
    href: '/komunitas',
    label: 'Komunitas',
    icon: <Users size={16} strokeWidth={2} />,
  },
]

export function PublicNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

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
    <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-md border-b z-40 items-center justify-between px-6 lg:px-12">
      {/* Brand & Kiri */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="Omnifit"
              width={22}
              height={22}
              className="object-contain brightness-0 invert"
              unoptimized
            />
          </div>
          <div>
            <span className="text-base font-black text-foreground tracking-tight">
              Omnifit
            </span>
          </div>
        </Link>

        {/* Navigasi Utama */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            if (item.requiresAuth && !user) return null
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${
                    active
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="flex items-center gap-2">
                  {item.icon} {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Area Kanan (User & CTA) */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-3 pl-4 border-l">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2.5 p-1.5 pr-3 h-auto">
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        width={32}
                        height={32}
                        className="rounded-[10px] w-8 h-8 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-[10px] bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                       <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[100px]">
                        {user.displayName?.split(' ')[0] || 'Pengguna'}
                      </span>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Akun Saya
                    </p>
                    <p className="text-sm font-bold text-foreground truncate mt-1">
                      {user.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profil" className="flex items-center gap-3 cursor-pointer">
                        <User size={16} /> Profil Lengkap
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                       <Link href="/riwayat" className="flex items-center gap-3 cursor-pointer">
                        <Receipt size={16} /> Riwayat & Tagihan
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut size={16} className="mr-3" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button asChild>
              <Link href="/token">
                <KeyRound size={16} className="mr-2" />
                Gunakan Token
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">
                <LogIn size={16} className="mr-2" />
                Masuk
              </Link>
            </Button>
            <Button asChild>
              <Link href="/katalog">
                Mulai Eksplorasi
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
