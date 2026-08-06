'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Briefcase, LogOut, Menu, X, ShieldCheck, 
  PanelLeftClose, PanelLeftOpen, ClipboardCheck
} from 'lucide-react';

// IMPORT CUSTOM HOOK MOBILE BACK
import { useMobileBack } from '@/hooks/useMobileBack';

// IMPORT DESIGN SYSTEM
import { PageAuthGate } from '@/components/ui/design-system';

export default function AssessorLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ==========================================
  // MOBILE BACK HANDLER (SWIPE)
  // ==========================================
  useMobileBack(isMobileMenuOpen, () => setIsMobileMenuOpen(false));

  useEffect(() => {
    // Kini TypeScript sudah mengenali 'assessor' tanpa error
    if (!loading && (!user || (role !== 'assessor' && role !== 'admin_csrs'))) {
      router.push('/'); 
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const menuItems = [
    { name: 'Panel Administrasi Asesor', path: '/assessor', icon: Briefcase },
  ];

  const isAuthorized = Boolean(user && (role === 'assessor' || role === 'admin_csrs'));

  return (
    <PageAuthGate loading={loading} authorized={isAuthorized} loadingMessage="Otentikasi Mitra...">
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">

      
      {/* MOBILE SIDEBAR */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 h-full bg-white flex flex-col shadow-2xl">
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center"><ClipboardCheck className="w-5 h-5"/></div>
                <h1 className="text-lg font-black tracking-tight">Mitra Asesor</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
            </div>
            <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-3">Menu Mitra</p>
              {menuItems.map((item) => (
                <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-3 rounded-xl font-bold ${pathname === item.path ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
                  <item.icon size={20} className={pathname === item.path ? 'text-emerald-600' : 'text-slate-400'} /> {item.name}
                </Link>
              ))}
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
             <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shrink-0">
               <ClipboardCheck className="w-5 h-5" />
             </div>
             {!isSidebarCollapsed && (
               <div className="whitespace-nowrap">
                 <h1 className="text-lg font-black tracking-tight leading-none">Mitra Portal</h1>
                 <p className="text-[9px] uppercase tracking-widest text-emerald-500 font-black">Asesor / Evaluator</p>
               </div>
             )}
           </div>
           
           {!isSidebarCollapsed && (
             <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0">
               <PanelLeftClose size={18} />
             </button>
           )}
         </div>

         <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
           {!isSidebarCollapsed && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-3">Menu Mitra</p>}
           {menuItems.map((item) => {
             const isActive = pathname === item.path;
             return (
               <Link 
                 key={item.path} href={item.path} title={isSidebarCollapsed ? item.name : ''}
                 className={`flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all ${
                   isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
                 } ${isSidebarCollapsed ? 'justify-center' : ''}`}
               >
                 <item.icon size={20} className={isActive ? 'text-emerald-600' : 'text-slate-400 shrink-0'} /> 
                 {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
               </Link>
             );
           })}
         </nav>

         <div className="p-4 border-t border-slate-100 shrink-0">
           {isSidebarCollapsed && (
             <button onClick={() => setIsSidebarCollapsed(false)} className="w-full flex items-center justify-center p-3 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors mb-2">
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
         
        {/* Header Mobile */}
        <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center shrink-0 z-10">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl">
            <Menu size={24} />
          </button>
          <h2 className="font-black text-emerald-600 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5"/> Mitra Portal
          </h2>
          <button onClick={() => { logout(); router.push('/'); }} className="text-rose-500 p-2">
            <LogOut size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
    </PageAuthGate>
  );
}