'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SafeLogo } from '@/components/shared/SafeLogo';
import { GlassCardLayout } from '@/components/domain/public';
import { MailCheck, Loader2, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';
  const { user, loading, logout } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // If not loading and no user, go to login
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    } else if (user && user.emailVerified) {
      // If already verified, go to next path
      router.replace(nextPath);
    }
  }, [user, loading, router, nextPath]);

  const handleResend = async () => {
    if (!user) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      toast.success('Email verifikasi telah dikirim ulang. Silakan cek inbox/spam Anda.');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast.error('Terlalu banyak permintaan. Tunggu beberapa saat sebelum mengirim ulang.');
      } else {
        toast.error('Gagal mengirim email verifikasi.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!user) return;
    setChecking(true);
    try {
      await user.reload(); // Refresh the user token and info from Firebase
      if (auth.currentUser?.emailVerified) {
        toast.success('Email berhasil diverifikasi!');
        router.replace(nextPath);
      } else {
        toast.error('Email belum diverifikasi. Pastikan Anda telah mengklik tautan di email Anda.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading || !user) {
    return (
      <GlassCardLayout>
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </GlassCardLayout>
    );
  }

  return (
    <GlassCardLayout>
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <MailCheck size={32} />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-2">Verifikasi Email Anda</h1>
        <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
          Kami telah mengirimkan email verifikasi ke <strong className="text-slate-700">{user.email}</strong>. 
          Silakan klik tautan di email tersebut untuk mengaktifkan akun Anda secara penuh dan mengakses fitur eksklusif.
        </p>

        <div className="w-full space-y-3">
          <Button 
            onClick={handleCheckVerified} 
            disabled={checking}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Saya Sudah Verifikasi
          </Button>

          <Button 
            onClick={handleResend} 
            disabled={sending}
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Kirim Ulang Email
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex justify-center">
          <button 
            onClick={handleLogout}
            className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Gunakan akun lain
          </button>
        </div>
      </div>
    </GlassCardLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <GlassCardLayout>
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </GlassCardLayout>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
