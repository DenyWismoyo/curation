'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn, ArrowLeft, Mail, Lock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register' | 'reset';

const getNextPath = (): string => {
  if (typeof window === 'undefined') return '/dashboard';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/dashboard';
  if (!next.startsWith('/')) return '/dashboard';
  if (next.startsWith('/admin')) return '/dashboard';
  return next;
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [working, setWorking] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const nextPath = useMemo(() => getNextPath(), []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, user, router, nextPath]);

  const handleGoogle = async () => {
    setWorking(true);
    try {
      await loginWithGoogle();
      router.replace(nextPath);
    } catch {
      toast.error('Gagal masuk dengan Google.');
    } finally {
      setWorking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(email, password, name);
        toast.success('Pendaftaran berhasil.');
        router.replace(nextPath);
      } else if (mode === 'login') {
        await loginWithEmail(email, password);
        toast.success('Berhasil masuk.');
        router.replace(nextPath);
      } else {
        await resetPassword(email);
        toast.success('Tautan reset password telah dikirim ke email Anda.');
        setMode('login');
      }
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') toast.error('Email sudah terdaftar.');
      else if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') toast.error('Email atau kata sandi tidak valid.');
      else toast.error('Autentikasi gagal. Silakan coba lagi.');
    } finally {
      setWorking(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          Menyiapkan autentikasi...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-6 py-10 lg:px-12">
      <div className="max-w-md mx-auto space-y-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={16} />
          Kembali ke Beranda
        </Link>

        <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Akses Omnifit</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              {mode === 'register' ? 'Buat Akun Baru' : mode === 'reset' ? 'Reset Password' : 'Masuk ke Akun'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Lanjutkan ke {nextPath} setelah autentikasi berhasil.</p>
          </div>

          <Button onClick={handleGoogle} disabled={working} className="w-full h-11 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold">
            {working ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Masuk dengan Google
          </Button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 text-xs text-slate-400 font-semibold">ATAU</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama Lengkap" className="pl-9 h-11" />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Alamat Email" className="pl-9 h-11" />
            </div>

            {mode !== 'reset' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Kata Sandi" className="pl-9 h-11" />
              </div>
            )}

            <Button type="submit" disabled={working} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black">
              {working ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn size={16} className="mr-2" />}
              {mode === 'register' ? 'Daftar & Masuk' : mode === 'reset' ? 'Kirim Tautan Reset' : 'Masuk'}
            </Button>
          </form>

          <div className="text-sm text-center text-slate-500 font-medium space-y-1">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')} className="text-indigo-600 font-bold hover:underline">Lupa kata sandi?</button>
                <p>Belum punya akun? <button onClick={() => setMode('register')} className="text-indigo-600 font-bold hover:underline">Daftar</button></p>
              </>
            )}
            {mode === 'register' && <p>Sudah punya akun? <button onClick={() => setMode('login')} className="text-indigo-600 font-bold hover:underline">Masuk</button></p>}
            {mode === 'reset' && <p>Kembali ke <button onClick={() => setMode('login')} className="text-indigo-600 font-bold hover:underline">Login</button></p>}
          </div>
        </div>
      </div>
    </div>
  );
}
