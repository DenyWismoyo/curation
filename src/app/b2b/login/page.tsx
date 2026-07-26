'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BriefcaseBusiness, Loader2, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function B2BLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, loginWithEmail, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = searchParams.get('next') || '/b2b/leader';

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, next, router, user]);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      router.replace(next);
    } catch (err) {
      console.error('Login B2B gagal:', err);
      setError('Login gagal. Periksa email/password atau hubungi admin B2B.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.replace(next);
    } catch (err) {
      console.error('Login Google B2B gagal:', err);
      setError('Login Google gagal. Coba ulangi beberapa saat lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="p-7 bg-slate-900 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em]">
            <BriefcaseBusiness className="w-4 h-4" /> B2B Access Portal
          </div>
          <h1 className="text-2xl font-black mt-4">Login Dashboard B2B</h1>
          <p className="text-sm text-slate-200 mt-2">Akses khusus tenant untuk executive, HR, dan leader berdasarkan scope organisasi.</p>
        </div>

        <div className="p-7 space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="nama@perusahaan.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="Masukkan password"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 text-rose-700 text-sm p-3 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Login via Email
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-white text-slate-700 border border-slate-200 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Login via Google
          </button>

          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-black text-slate-800 uppercase tracking-[0.14em] mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Kebijakan B2B</p>
            <p>Dengan login, Anda menyetujui ketentuan penggunaan dashboard B2B dan pembatasan akses berbasis scope organisasi.</p>
            <Link href="/docs/b2b-ketentuan-benefit.md" className="text-indigo-600 font-bold mt-2 inline-block">Baca ketentuan & benefit B2B</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function B2BLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white flex items-center gap-2 text-sm font-bold">
          <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan login B2B...
        </div>
      </div>
    }
    >
      <B2BLoginPageContent />
    </Suspense>
  );
}
