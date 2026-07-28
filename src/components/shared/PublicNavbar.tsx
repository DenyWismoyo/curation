'use client';

// src/components/shared/PublicNavbar.tsx

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
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
];

export function PublicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch {
      // silent
    }
  };

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 items-center justify-between px-6 lg:px-12">
      {/* Brand & Kiri */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ring-1 ring-slate-200 group-hover:ring-indigo-200 transition-all">
            <Image
              src="/logo.png"
              alt="Omnifit"
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              Omnifit
            </span>
          </div>
        </Link>

        {/* Navigasi Utama (Gaya Pill Minimalis) */}
        <nav className="flex items-center gap-1.5 bg-slate-50/50 p-1 rounded-2xl ring-1 ring-slate-100">
          {NAV_ITEMS.map((item) => {
            if (item.requiresAuth && !user) return null;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${
                    active
                      ? 'text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-white shadow-sm ring-1 ring-slate-200/60 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="flex items-center gap-2 relative z-10">
                  {item.icon} {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Area Kanan (User & CTA) */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200/60">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2.5 p-1.5 pr-3 h-auto rounded-[1rem] hover:bg-slate-50 hover:ring-1 hover:ring-slate-200 transition-all">
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
                <DropdownMenuContent className="w-64 rounded-[1.5rem] p-3 shadow-xl ring-1 ring-slate-200 border-none bg-white" align="end">
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Akun Saya
                    </p>
                    <p className="text-sm font-bold text-slate-900 truncate mt-1">
                      {user.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100 my-2" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5">
                      <Link href="/profil" className="flex items-center gap-3">
                        <User size={16} className="text-slate-400" /> Profil Lengkap
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-50 font-bold text-slate-700 py-2.5">
                       <Link href="/riwayat" className="flex items-center gap-3">
                        <Receipt size={16} className="text-slate-400" /> Riwayat & Tagihan
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-slate-100 my-2" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-rose-600 font-bold focus:bg-rose-50 focus:text-rose-700 py-2.5 cursor-pointer">
                    <LogOut size={16} className="mr-3" />
                    Keluar Sistem
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button asChild className="rounded-xl h-10 px-5 bg-slate-900 hover:bg-indigo-600 text-white font-bold shadow-sm transition-all text-xs">
              <Link href="/token">
                <KeyRound size={14} className="mr-2" />
                Gunakan Token
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="rounded-xl h-10 px-5 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-xs">
              <Link href="/login">
                <LogIn size={14} className="mr-2" />
                Masuk
              </Link>
            </Button>
            <Button asChild className="rounded-xl h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all text-xs">
              <Link href="/katalog">
                Mulai Eksplorasi
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}