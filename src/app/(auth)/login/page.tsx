'use client';

// src/app/(public)/login/page.tsx

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { SafeLogo } from '@/components/layout/SafeLogo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, ArrowLeft, Mail, Lock, User as UserIcon,
  Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCardLayout } from '@/components/domain/public';

// ─── Types ───────────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'register' | 'reset';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getNextPath = (): string => {
  if (typeof window === 'undefined') return '/dashboard';
  const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
  if (!next.startsWith('/') || next.startsWith('/admin')) return '/dashboard';
  return next;
};

const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePassword = (v: string) => v.length >= 6;
const validateName = (v: string) => v.trim().length >= 2;

// ─── Google Icon ─────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── Validated Input ──────────────────────────────────────────────────────────
interface ValidatedInputProps {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  validate?: (v: string) => boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  hint?: string;
}

function ValidatedInput({
  type = 'text', value, onChange, placeholder, icon,
  validate, disabled, autoFocus, hint,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const isValid = validate ? validate(value) : true;
  const showError = touched && value.length > 0 && !isValid;
  const showSuccess = touched && value.length > 0 && isValid;

  return (
    <div className="space-y-1">
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          {icon}
        </div>
        <Input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`pl-10 pr-10 h-12 rounded-xl transition-all font-medium text-sm
            ${showError ? 'border-rose-300 focus-visible:ring-rose-400/30 bg-rose-50/30' : ''}
            ${showSuccess ? 'border-emerald-300 focus-visible:ring-emerald-400/30' : ''}
          `}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isPassword && value.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
          {!isPassword && showSuccess && <CheckCircle2 size={15} className="text-emerald-500" />}
          {!isPassword && showError && <AlertCircle size={15} className="text-rose-500" />}
        </div>
      </div>
      {showError && hint && (
        <p className="text-xs text-rose-500 font-medium pl-1">{hint}</p>
      )}
    </div>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['bg-rose-400', 'bg-amber-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  const labels = ['', 'Lemah', 'Cukup', 'Baik', 'Kuat'];

  return (
    <div className="space-y-1.5 px-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : 'bg-slate-100'}`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-[10px] font-bold ${score <= 1 ? 'text-rose-500' : score <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
          Kekuatan kata sandi: {labels[score]}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [working, setWorking] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Compliance states
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [cryptoRiskAccepted, setCryptoRiskAccepted] = useState(false);

  const nextPath = useMemo(() => getNextPath(), []);
  const isCryptoRoute = useMemo(() => nextPath.includes('/crypto'), [nextPath]);

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, user, router, nextPath]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setWorking(true);
    try {
      await loginWithGoogle();
      router.replace(nextPath);
    } catch {
      toast.error('Gagal masuk dengan Google. Coba lagi.');
    } finally {
      setWorking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateEmail(email)) { toast.error('Format email tidak valid.'); return; }
    if (mode !== 'reset' && !validatePassword(password)) { toast.error('Kata sandi minimal 6 karakter.'); return; }
    if (mode === 'register' && !validateName(name)) { toast.error('Nama minimal 2 karakter.'); return; }

    setWorking(true);
    try {
      if (mode === 'register') {
        if (!tosAccepted || !privacyAccepted) {
          toast.error('Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi.');
          setWorking(false);
          return;
        }
        if (isCryptoRoute && !cryptoRiskAccepted) {
          toast.error('Anda harus menyetujui Pernyataan Risiko Kripto untuk melanjutkan.');
          setWorking(false);
          return;
        }
        await registerWithEmail(email, password, name, { tosAccepted, privacyAccepted, cryptoRiskAccepted: isCryptoRoute ? cryptoRiskAccepted : undefined });
        toast.success('Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi.');
        router.replace(isCryptoRoute ? '/verify-email' : nextPath);
      } else if (mode === 'login') {
        await loginWithEmail(email, password);
        toast.success('Berhasil masuk.');
        router.replace(nextPath);
      } else {
        await resetPassword(email);
        toast.success('Tautan reset dikirim. Cek inbox email Anda.');
        setMode('login');
      }
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/email-already-in-use') toast.error('Email sudah terdaftar. Coba masuk.');
      else if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(code))
        toast.error('Email atau kata sandi tidak valid.');
      else if (code === 'auth/too-many-requests')
        toast.error('Terlalu banyak percobaan. Tunggu beberapa menit.');
      else if (code === 'auth/user-disabled')
        toast.error('Akun ini telah dinonaktifkan. Hubungi admin.');
      else toast.error('Autentikasi gagal. Silakan coba lagi.');
    } finally {
      setWorking(false);
    }
  };

  // ── Loading / redirect state ─────────────────────────────────────────────────
  if (loading || user) {
    return (
      <GlassCardLayout>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500">Menyiapkan sesi...</p>
        </div>
      </GlassCardLayout>
    );
  }

  // ── Mode config ──────────────────────────────────────────────────────────────
  const modeConfig = {
    login:    { title: 'Masuk ke Akun',   subtitle: 'Lanjutkan perjalanan asesmen Anda.' },
    register: { title: 'Buat Akun Baru',  subtitle: 'Daftar gratis dan mulai asesmen pertama.' },
    reset:    { title: 'Reset Kata Sandi', subtitle: 'Kami kirimkan tautan ke email Anda.' },
  };

  return (
    <GlassCardLayout>
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-lg ring-1 ring-slate-100 flex items-center justify-center overflow-hidden">
          <SafeLogo src="/logo.png" alt="Omnifit" width={56} height={56} className="w-full h-full object-contain p-1.5" priority />
        </div>
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors mb-5"
      >
        <ArrowLeft size={14} /> Kembali ke Beranda
      </Link>

      {/* Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mb-6"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Akses Omnifit</p>
          <h1 className="text-2xl font-black text-slate-900">{modeConfig[mode].title}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">{modeConfig[mode].subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {/* Google CTA — only for login & register */}
      {mode !== 'reset' && (
        <>
          <button
            onClick={handleGoogle}
            disabled={working}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 font-bold text-sm shadow-sm transition-all disabled:opacity-60"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            {mode === 'register' ? 'Daftar dengan Google' : 'Masuk dengan Google'}
          </button>

          <div className="relative flex items-center my-5">
            <div className="flex-grow border-t border-slate-100" />
            <span className="mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">atau dengan email</span>
            <div className="flex-grow border-t border-slate-100" />
          </div>
        </>
      )}

      {/* Form */}
      <AnimatePresence mode="wait">
        <motion.form
          key={mode}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          {mode === 'register' && (
            <ValidatedInput
              value={name}
              onChange={setName}
              placeholder="Nama Lengkap"
              icon={<UserIcon size={16} />}
              validate={validateName}
              disabled={working}
              autoFocus
              hint="Nama minimal 2 karakter"
            />
          )}

          <ValidatedInput
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="Alamat Email"
            icon={<Mail size={16} />}
            validate={validateEmail}
            disabled={working}
            autoFocus={mode !== 'register'}
            hint="Format email tidak valid"
          />

          {mode !== 'reset' && (
            <>
              <ValidatedInput
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Kata Sandi (min. 6 karakter)"
                icon={<Lock size={16} />}
                validate={validatePassword}
                disabled={working}
                hint="Minimal 6 karakter"
              />
              {mode === 'register' && <PasswordStrength password={password} />}
            </>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                Lupa kata sandi?
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-3 mt-4 mb-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                />
                <span className="text-[11px] text-slate-600 leading-snug">
                  Saya setuju dengan <Link href="/legal/tos" target="_blank" className="font-bold text-indigo-600 hover:underline">Syarat & Ketentuan</Link> yang berlaku.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                />
                <span className="text-[11px] text-slate-600 leading-snug">
                  Saya menyetujui <Link href="/legal/privacy" target="_blank" className="font-bold text-indigo-600 hover:underline">Kebijakan Privasi</Link> pengelolaan data saya.
                </span>
              </label>
              {isCryptoRoute && (
                <label className="flex items-start gap-3 cursor-pointer group pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={cryptoRiskAccepted}
                    onChange={(e) => setCryptoRiskAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500 transition-all cursor-pointer"
                  />
                  <span className="text-[11px] text-rose-700 leading-snug font-medium">
                    Saya menyadari risiko tinggi investasi aset kripto. <Link href="/legal/crypto-risk" target="_blank" className="font-bold hover:underline">Baca Pernyataan Risiko</Link>.
                  </span>
                </label>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={working}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-sm shadow-md transition-all mt-1"
          >
            {working ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'register' ? 'Buat Akun & Lanjutkan' : mode === 'reset' ? 'Kirim Tautan Reset' : 'Masuk'}
          </Button>
        </motion.form>
      </AnimatePresence>

      {/* Mode switcher */}
      <div className="mt-5 text-center text-sm text-slate-500 font-medium space-y-1.5">
        {mode === 'login' && (
          <p>Belum punya akun?{' '}
            <button onClick={() => setMode('register')} className="text-indigo-600 font-bold hover:underline">Daftar gratis</button>
          </p>
        )}
        {mode === 'register' && (
          <p>Sudah punya akun?{' '}
            <button onClick={() => setMode('login')} className="text-indigo-600 font-bold hover:underline">Masuk</button>
          </p>
        )}
        {mode === 'reset' && (
          <button onClick={() => setMode('login')} className="text-slate-400 hover:text-slate-700 font-bold transition-colors">
            ← Kembali ke Login
          </button>
        )}
      </div>

      {/* Privacy note */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400">
        <ShieldCheck size={13} className="text-emerald-500" />
        <p className="text-[10px] font-bold">Data Anda aman & tidak dibagikan ke pihak ketiga.</p>
      </div>
    </GlassCardLayout>
  );
}
