'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Settings, KeyRound, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Jika sudah selesai loading dan (belum login ATAU bukan admin), lempar ke halaman utama
    if (!loading && (!user || role !== 'admin_csrs')) {
      router.push('/'); 
    }
  }, [user, role, loading, router]);

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

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* SIDEBAR INTUITIF */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-sm z-10 hidden md:flex">
        <div className="mb-8 px-4 mt-4">
          <h2 className="text-2xl font-black text-indigo-600 tracking-tight">Admin CSRS</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Sistem Kurasi Data</p>
        </div>
        
        <nav className="flex-1 space-y-1.5">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-bold transition-colors">
            <LayoutDashboard size={20} /> Dasbor Utama
          </Link>
          <Link href="/admin/tokens" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-bold transition-colors">
            <KeyRound size={20} /> Kelola Token
          </Link>
          <Link href="/admin/templates" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-bold transition-colors">
            <Settings size={20} /> Template Form
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-100 mt-auto">
          <div className="px-4 py-3 mb-2 rounded-xl bg-slate-50">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.displayName}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 max-w-full overflow-hidden flex flex-col">
        {/* Header Mobile - Muncul hanya di layar kecil */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <h2 className="text-lg font-black text-indigo-600">Admin CSRS</h2>
          <button onClick={() => { logout(); router.push('/'); }} className="p-2 text-red-600 bg-red-50 rounded-lg">
            <LogOut size={18} />
          </button>
        </div>
        
        {/* Render Konten Halaman */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}