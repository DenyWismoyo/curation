'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BriefcaseBusiness, LogOut, Home, Shield, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { href: '/b2b/executive', label: 'Executive' },
  { href: '/b2b/hr', label: 'HR' },
  { href: '/b2b/leader', label: 'Leader' },
];

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const isLoginRoute = pathname === '/b2b/login';

  useEffect(() => {
    if (!loading && !user && !isLoginRoute) {
      router.push('/b2b/login');
    }
  }, [isLoginRoute, loading, router, user]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Verifikasi akses B2B...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <BriefcaseBusiness className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Omnifit</p>
                <p className="text-sm font-black text-slate-900">B2B Self-Service</p>
              </div>
            </div>

            {/* Navigasi Global Lintas Modul */}
            <div className="hidden lg:flex items-center gap-1 pl-6 border-l border-slate-200">
              <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <Home className="w-4 h-4" /> Beranda Public
              </Link>
              <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Shield className="w-4 h-4" /> Curator Admin
              </Link>
              <Link href="/assessor" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                <UserCog className="w-4 h-4" /> Assessor Portal
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-xs font-black uppercase tracking-[0.14em] rounded-lg ring-1 ${active ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => { logout(); router.push('/'); }}
              className="px-3 py-2 text-xs font-black uppercase tracking-[0.14em] rounded-lg ring-1 bg-rose-50 text-rose-700 ring-rose-200 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
