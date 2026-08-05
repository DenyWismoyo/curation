'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function CryptoGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else if (!user.emailVerified) {
        router.replace(`/verify-email?next=${encodeURIComponent(pathname)}`);
      } else {
        setIsChecking(false);
      }
    }
  }, [loading, user, router, pathname]);

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-400">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
