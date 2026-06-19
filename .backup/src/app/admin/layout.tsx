// src/app/admin/layout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Settings, KeyRound, LogOut, Menu, X, ShieldCheck } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // State untuk kontrol menu di HP
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin_csrs')) {
      router.push('/'); 
    }
  }, [user, role, loading, router]);

  // Tutup menu HP jika rute berubah (user klik link)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading || role !== 'admin_csrs') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold">Memverifikasi Otoritas Admin...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dasbor Utama', path: '/admin', icon: LayoutDashboard },
    { name: 'Manajemen Token', path: '/admin/tokens', icon: KeyRound },
    { name: 'Template Form', path: '/admin/templates', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans relative">
      
      {/* MOBILE OVERLAY BACKDROP */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 animate-in fade-in" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 p-6 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-black text-indigo-600 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7" /> CSRS
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">Admin Portal</p>
          </div>
          {/* Tombol Tutup di Mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-4">Menu Panel</p>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path}
                href={item.path} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400'} /> {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-100 mt-auto">
          <div className="px-4 py-3 mb-3 rounded-xl bg-slate-50 ring-1 ring-slate-100">
            <p className="text-xs font-black text-slate-900 truncate">{user?.displayName}</p>
            <p className="text-[10px] font-bold text-slate-500 truncate">{user?.email}</p>
          </div>
          <button 
            onClick={() => { logout(); router.push('/'); }} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-rose-100 rounded-xl font-bold transition-colors"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 max-w-full overflow-hidden flex flex-col h-screen overflow-y-auto custom-scrollbar">
        
        {/* HEADER MOBILE */}
        <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-black text-indigo-600 flex items-center gap-1">
              <ShieldCheck className="w-5 h-5"/> CSRS
            </h2>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
            <LogOut size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

    </div>
  );
}