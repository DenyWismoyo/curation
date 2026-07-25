'use client';

// src/components/shared/PublicNavbar.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LibraryBig, FolderKanban, TrendingUp, Users, User,
  KeyRound, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/katalog',   label: 'Katalog',  icon: <LibraryBig size={16} strokeWidth={2} /> },
  { href: '/dashboard', label: 'Brankas',  icon: <FolderKanban size={16} strokeWidth={2} />, requiresAuth: true },
  { href: '/progress',  label: 'Progres',  icon: <TrendingUp size={16} strokeWidth={2} />, requiresAuth: true },
  { href: '/komunitas', label: 'Komunitas',icon: <Users size={16} strokeWidth={2} /> },
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
    <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 shadow-sm items-center justify-between px-6 lg:px-12 transition-all">
      
      {/* Brand & Kiri */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="Omnifit"
              width={22}
              height={22}
              className="object-contain brightness-0 invert"
              onError={() => {}}
            />
          </div>
          <div>
            <span className="text-base font-black text-slate-900 tracking-tight">Omnifit</span>
          </div>
        </Link>

        {/* Navigasi Utama */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            if (item.requiresAuth && !user) return null;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${active
                    ? 'text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-indigo-50 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="flex items-center gap-2">
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
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <Link href="/profil" className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-slate-50 transition-colors group">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full w-8 h-8 object-cover ring-2 ring-transparent group-hover:ring-indigo-100 transition-all"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 leading-tight">
                    {user.displayName || 'Pengguna'}
                  </span>
                </div>
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </div>
            <Link
              href="/token"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-slate-900/10 hover:shadow-indigo-600/20 transition-all duration-300"
            >
              <KeyRound size={16} />
              Gunakan Token
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:text-indigo-600 text-sm font-bold transition-colors"
            >
              <User size={16} />
              Masuk ke Akun
            </Link>
            <Link
              href="/katalog"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all duration-300"
            >
              Mulai Eksplorasi
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}