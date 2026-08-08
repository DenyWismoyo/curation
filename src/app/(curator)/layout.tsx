'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CuratorLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      if (pathname !== '/curator') {
        router.replace('/curator');
      }
      return;
    }

    const allowed = role === 'curator' || role === 'assessor' || role === 'admin_csrs' || role === 'admin_omnifit';

    if (!allowed && pathname !== '/curator') {
      router.replace('/curator');
      return;
    }

    if (allowed && pathname === '/curator') {
      router.replace('/curator/dashboard');
    }
  }, [loading, pathname, role, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted text-muted-foreground">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
          <p className="font-bold text-xs uppercase tracking-widest">Menyiapkan akses curator...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
