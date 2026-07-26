'use client';

// src/app/admin/layout.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Settings, KeyRound, LogOut, Menu, X, ShieldCheck, 
  PanelLeftClose, PanelLeftOpen, 
  Tags, UserCheck, MessageSquareShare, 
  Handshake, Newspaper,
  MapPinned,
  Radar,
  Percent,
  Activity,
  BriefcaseBusiness,
  UserCog,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

type AdminMenuItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type AdminMenuGroup = {
  key: string;
  label: string;
  items: AdminMenuItem[];
};

const adminMenuGroups: AdminMenuGroup[] = [
  {
    key: 'core',
    label: 'Core Admin',
    items: [
      { name: 'Dasbor Utama', path: '/admin', icon: LayoutDashboard },
      { name: 'Manajemen Token', path: '/admin/tokens', icon: KeyRound },
      { name: 'Manajemen Asesor', path: '/admin/assessors', icon: UserCheck },
      { name: 'Template Form', path: '/admin/templates', icon: Settings },
      { name: 'Artikel & Wawasan', path: '/admin/articles', icon: Newspaper },
      { name: 'Roadmap & Rencana', path: '/admin/roadmap', icon: MapPinned },
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
      { name: 'Program Affiliate', path: '/admin/affiliate-program', icon: Percent },
      { name: 'Onboarding Metrics', path: '/admin/onboarding-metrics', icon: Activity },
    ],
  },
  {
    key: 'b2b',
    label: 'B2B Pilot',
    items: [
      { name: 'B2B Pilot Dashboard', path: '/admin/b2b-pilot', icon: BriefcaseBusiness },
      { name: 'Akses Role B2B', path: '/admin/b2b-access', icon: UserCog },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openDesktopGroups, setOpenDesktopGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminMenuGroups.map((group) => [group.key, true]))
  );
  const [openMobileGroups, setOpenMobileGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminMenuGroups.map((group) => [group.key, true]))
  );

  useEffect(() => {
    if (!loading && (!user || role !== 'admin_csrs')) {
      router.push('/'); 
    }
  }, [user, role, loading, router]);

  if (loading || role !== 'admin_csrs') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Verifikasi Admin...</p>
        </div>
      </div>
    );
  }

  const allMenuItems = adminMenuGroups.flatMap((group) => group.items);

  const isItemActive = (path: string) => pathname.startsWith(path) && (path !== '/admin' || pathname === '/admin');

  const toggleDesktopGroup = (key: string) => {
    setOpenDesktopGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMobileGroup = (key: string) => {
    setOpenMobileGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {/* MOBILE SIDEBAR */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 h-full bg-white flex flex-col shadow-2xl">
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div>
                <h1 className="text-lg font-black tracking-tight">CSRS</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
            </div>
            
            <nav className="flex-1 py-6 px-4 space-y-4 overflow-y-auto">
              {adminMenuGroups.map((group) => {
                const isOpen = openMobileGroups[group.key] ?? true;
                const hasActiveItem = group.items.some((item) => isItemActive(item.path));

                return (
                  <div key={group.key} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleMobileGroup(group.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors ${
                        hasActiveItem ? 'text-indigo-600 bg-indigo-50/70' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span>{group.label}</span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {isOpen && (
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isActive = isItemActive(item.path);
                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-colors ${
                                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button onClick={() => { logout(); router.push('/'); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-600 font-bold hover:bg-rose-50"><LogOut size={20}/> Keluar</button>
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 shrink-0 transition-all duration-300 relative
        ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}
      >
        <div className="h-20 flex items-center px-6 border-b border-slate-100 justify-between shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full px-0' : ''}`}>
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="whitespace-nowrap">
                <h1 className="text-lg font-black tracking-tight leading-none">CSRS</h1>
                <p className="text-[9px] uppercase tracking-widest text-indigo-500 font-black">Admin</p>
              </div>
            )}
          </div>
          
          {!isSidebarCollapsed && (
            <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0" title="Tutup Sidebar">
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-3 overflow-y-auto custom-scrollbar">
          {isSidebarCollapsed ? (
            allMenuItems.map((item) => {
              const isActive = isItemActive(item.path);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={item.name}
                  className={`flex items-center justify-center px-3 py-3 rounded-xl font-bold transition-all ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400 shrink-0'} />
                </Link>
              );
            })
          ) : (
            adminMenuGroups.map((group) => {
              const isOpen = openDesktopGroups[group.key] ?? true;
              const hasActiveItem = group.items.some((item) => isItemActive(item.path));

              return (
                <div key={group.key} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleDesktopGroup(group.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                      hasActiveItem ? 'text-indigo-600 bg-indigo-50/70' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span>{group.label}</span>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isOpen && (
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = isItemActive(item.path);

                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all ${
                              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                            }`}
                          >
                            <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400 shrink-0'} />
                            <span className="whitespace-nowrap">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-100 shrink-0">
          {isSidebarCollapsed && (
            <button onClick={() => setIsSidebarCollapsed(false)} className="w-full flex items-center justify-center p-3 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors mb-2" title="Buka Sidebar">
              <PanelLeftOpen size={20} />
            </button>
          )}
          <button 
            onClick={() => { logout(); router.push('/'); }} 
            title={isSidebarCollapsed ? "Keluar" : ""}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        
        {/* Header Khusus Mobile */}
        <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center shrink-0 z-10">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl">
            <Menu size={24} />
          </button>
          <h2 className="font-black text-indigo-600 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5"/> CSRS
          </h2>
          <button onClick={() => { logout(); router.push('/'); }} className="text-rose-500 p-2">
            <LogOut size={20} />
          </button>
        </div>

        {/* Area Scroll Khusus Konten */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </div>
        
      </main>
    </div>
  );
}