// src/app/curator/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Loader2, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CuratorLoginPage() {
  const { user, loading, loginWithEmail, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/curator/dashboard');
    }
  }, [loading, router, user]);

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
      router.replace('/curator/dashboard');
    } catch (err) {
      console.error('Login curator gagal:', err);
      setError('Login gagal. Periksa email/password atau hubungi admin untuk aktivasi role curator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.replace('/curator/dashboard');
    } catch (err) {
      console.error('Login Google curator gagal:', err);
      setError('Login Google gagal. Coba ulangi beberapa saat lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] card-solid shadow-2xl ring-1 ring-border overflow-hidden">
        <div className="p-7 bg-slate-900 text-white">
          <div className="inline-flex items-center gap-2 rounded-full card-solid/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em]">
            <BriefcaseBusiness className="w-4 h-4" /> Curator Access
          </div>
          <h1 className="text-2xl font-black mt-4">Login Portal Kurator</h1>
          <p className="text-sm text-slate-200 mt-2">Akses penilaian kurator berbasis role dan scope organisasi B2B.</p>
        </div>

        <div className="p-7 space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-sm"
                placeholder="nama@perusahaan.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-sm"
                placeholder="Masukkan password"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm p-3 ring-1 ring-rose-200 dark:ring-rose-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Login via Email
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full h-11 rounded-xl card-solid text-slate-700 border border-border font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Login via Google
          </button>

          <div className="rounded-xl bg-muted text-muted-foreground p-4 ring-1 ring-border text-xs text-muted-foreground leading-relaxed">
            <p className="font-black text-foreground uppercase tracking-[0.14em] mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Kebijakan Akses</p>
            <p>Akun harus memiliki role curator/assessor/admin serta organization scope aktif untuk melihat member B2B.</p>
            <Link href="/admin/b2b-access" className="text-indigo-600 dark:text-indigo-400 font-bold mt-2 inline-block">Minta aktivasi akses ke Admin B2B</Link>
          </div>
        </div>
      </div>
    </div>
  );
}