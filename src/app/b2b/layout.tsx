'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BriefcaseBusiness, 
  LogOut, 
  Home, 
  Shield, 
  UserCog, 
  Menu, 
  X, 
  PieChart, 
  Users, 
  Target 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { href: '/b2b/executive', label: 'Executive View', icon: <PieChart className="w-5 h-5" /> },
  { href: '/b2b/hr', label: 'HR Dashboard', icon: <Users className="w-5 h-5" /> },
  { href: '/b2b/leader', label: 'Leader Portal', icon: <Target className="w-5 h-5" /> },
];

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, allowedOrganizations, b2bOrganizationIds } = useAuth();
  const isLoginRoute = pathname === '/b2b/login';
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const accessibleTenantsCount = Array.from(new Set([...(allowedOrganizations || []), ...(b2bOrganizationIds || [])])).length;

  useEffect(() => {
    if (!loading && !user && !isLoginRoute) {
      router.push('/b2b/login');
    }
  }, [isLoginRoute, loading, router, user]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-[#f4f6fb]">
        <div className="animate-pulse flex flex-col items-center">
          <BriefcaseBusiness className="w-8 h-8 text-indigo-300 mb-4" />
          <p className="text-sm font-medium">Verifikasi akses B2B...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col md:flex-row">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#0f0f1a] text-white p-4 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BriefcaseBusiness className="w-4 h-4" />
          </div>
          <p className="text-sm font-black tracking-wider">OMNIFIT B2B</p>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white/10 rounded-lg text-slate-200 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-[280px] bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] text-slate-300 
        flex flex-col border-r border-white/5 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Branding */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BriefcaseBusiness className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-black">Omnifit</p>
              <p className="text-base font-black text-white leading-tight">B2B Portal</p>
            </div>
          </div>
          {accessibleTenantsCount > 0 && (
            <div className="mt-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 inline-flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">
                {accessibleTenantsCount} Tenant{accessibleTenantsCount > 1 ? 's' : ''} Active
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 py-6 px-4 overflow-y-auto space-y-8">
          
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 px-2">Personas</p>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      active 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-medium' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 px-2">Quick Links</p>
            <div className="space-y-1">
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Public Home</span>
              </Link>
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Curator Admin</span>
              </Link>
              <Link href="/assessor" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <UserCog className="w-4 h-4" />
                <span className="text-sm font-medium">Assessor Portal</span>
              </Link>
            </div>
          </div>

        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <span className="text-sm font-black uppercase">{user.email?.[0] || 'U'}</span>
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{user.displayName || 'B2B User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        
        {/* Desktop Top Bar (Optional, for search/actions) */}
        <header className="hidden md:flex h-16 bg-white/50 backdrop-blur-md border-b border-slate-200/60 items-center justify-end px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
             {/* You can add global search or notifications here in the future */}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
      
    </div>
  );
}
