'use client';

// src/app/components/curation/CurationLanding.tsx

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SafeLogo } from '@/components/shared/SafeLogo';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, History, ChevronRight, Loader2, LogOut,
  LayoutDashboard, ClipboardCheck, KeyRound, Mail, Lock,
  User as UserIcon, LibraryBig, MapPinned, Share2,
  ShieldCheck, Sparkles, BriefcaseBusiness, TrendingUp,
  Users, Star, Zap,
} from 'lucide-react';
import {
  EcosystemIcon, AdminShieldIcon, DocExportIcon,
  BrainIcon, GlobalTargetIcon, AiSparkIcon,
} from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurationHistory } from '@/types/curation';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/lib/firebase';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { useMobileBack } from '@/hooks/useMobileBack';
import { useAuth } from '@/contexts/AuthContext';
import { LazyMotion, domAnimation, m, AnimatePresence, Variants } from 'framer-motion';
import dynamic from 'next/dynamic';
import { shareOrCopy } from '@/lib/share';
import { BundleUpsellBanner } from '../payment/BundleUpsellBanner';
import { DraftValidationModal } from './DraftValidationModal';
import { MicroSimulator } from './MicroSimulator';

const SystemCapabilitiesModal = dynamic(
  () => import('./SystemCapabilitiesModal').then((mod) => mod.SystemCapabilitiesModal),
  { ssr: false }
);

// ─── Google SVG Icon ────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── Platform stats (social proof) ──────────────────────────────────────────
const PLATFORM_STATS = [
  { icon: <Users size={16} className="text-indigo-500" />, value: '10.000+', label: 'Asesmen Selesai' },
  { icon: <TrendingUp size={16} className="text-emerald-500" />, value: '76', label: 'Rata-rata Skor' },
  { icon: <Star size={16} className="text-amber-500" />, value: '92%', label: 'Kepuasan Pengguna' },
];

// ─── Value props untuk guest (kolom kanan) ───────────────────────────────────
const GUEST_VALUE_PROPS = [
  {
    icon: <BrainIcon size={22} className="text-indigo-600" />,
    bg: 'bg-indigo-50',
    title: 'Diagnosis AI Real-Time',
    desc: 'Identifikasi kekuatan & blind spot bisnis Anda dalam hitungan menit.',
  },
  {
    icon: <AiSparkIcon size={22} className="text-emerald-600" />,
    bg: 'bg-emerald-50',
    title: 'Peta Jalan Taktis',
    desc: 'Rekomendasi langkah konkret yang siap dieksekusi, bukan sekadar skor.',
  },
  {
    icon: <GlobalTargetIcon size={22} className="text-amber-600" />,
    bg: 'bg-amber-50',
    title: 'Laporan Visual Elegan',
    desc: 'Dokumen hasil bergrafik otomatis, siap dipresentasikan ke stakeholder.',
  },
  {
    icon: <Zap size={22} className="text-purple-600" />,
    bg: 'bg-purple-50',
    title: 'Formulir Adaptif',
    desc: 'Pertanyaan menyesuaikan jawaban Anda — seperti diwawancarai langsung oleh ahli.',
  },
  {
    icon: <Sparkles size={22} className="text-blue-600" />,
    bg: 'bg-blue-50',
    title: 'Konsultasi AI Premium',
    desc: 'Bedah hasil asesmen dan dapatkan insight mendalam bersama asisten pakar virtual.',
  },
  {
    icon: <BriefcaseBusiness size={22} className="text-rose-600" />,
    bg: 'bg-rose-50',
    title: 'Akses B2B & Bundling',
    desc: 'Tingkatkan standar operasional tim Anda melalui bundling modul dengan harga terbaik.',
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  onStart: () => void;
  history: CurationHistory[];
  onLoadHistory: (item: CurationHistory) => void;
  user: User | null;
  role: 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | 'curator' | 'study_author' | 'study_reviewer' | null;
  onLogin: () => void;
  onLogout: () => void;
  templates?: any[];
}

interface DraftItem {
  templateId: string;
  trackName: string;
  isPaid: boolean;
  price: number;
}

const asSafeText = (value: unknown, fallback = '-'): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value) return fallback;

  if (typeof value === 'object') {
    const maybeName = (value as any).name || (value as any).label || (value as any).title || (value as any).value;
    if (typeof maybeName === 'string' && maybeName.trim().length > 0) return maybeName;
    return fallback;
  }

  return fallback;
};

const asSafeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function CurationLanding({ onStart, history, onLoadHistory, user, role, onLogin, onLogout, templates }: Props) {
  const router = useRouter();
  const { registerWithEmail, loginWithEmail, resetPassword } = useAuth();

  const [isCapabilitiesModalOpen, setIsCapabilitiesModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<'options' | 'login' | 'register' | 'reset'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Draft Validation State
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [selectedDraftTemplate, setSelectedDraftTemplate] = useState<string>('');
  const [currentValidationQuota, setCurrentValidationQuota] = useState(0);

  // ── Side effects ────────────────────────────────────────────────────────────
  useMobileBack(isCapabilitiesModalOpen, () => setIsCapabilitiesModalOpen(false));

  // Redirect ?buy= param ke katalog
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const buyId = new URLSearchParams(window.location.search).get('buy');
    if (buyId) router.push(`/katalog?buy=${buyId}`);
  }, [router]);

  // Fetch local drafts using templates prop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!templates || templates.length === 0) return;

    const fetchDrafts = () => {
      setIsFetchingData(true);
      try {
        const found: DraftItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('curation_draft_dynamic_')) {
            const tplId = key.replace('curation_draft_dynamic_', '');
            const tpl = templates.find(t => t.id === tplId);
            if (tpl) found.push({ templateId: tplId, trackName: tpl.trackName, isPaid: tpl.isPaid || false, price: tpl.price || 0 });
          }
        }
        setDrafts(found);
      } catch {
        // silent
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchDrafts();
  }, [templates]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleShareOmnifit = async () => {
    try {
      const result = await shareOrCopy({ title: 'Omnifit - Smart Assessment System', text: 'Coba Omnifit untuk asesmen AI personal, komunitas, dan bisnis.', url: 'https://omnifit.cloud' });
      if (result === 'copied') toast.success('Link aplikasi berhasil disalin.');
    } catch { toast.error('Gagal membagikan link aplikasi.'); }
  };

  const handleResumeDraft = async (draft: DraftItem) => {
    if (!user) { toast.error('Silakan masuk terlebih dahulu.'); onLogin(); return; }
    
    let token = sessionStorage.getItem('active_token') || localStorage.getItem('omnifit_last_token');
    
    if (token && token.includes('-') && !token.startsWith('FREE-') && !token.startsWith('TRIAL-')) {
      setSelectedDraftTemplate(draft.templateId);
      setIsCheckingToken(true);
      try {
        const functions = getFunctions(app, 'asia-southeast2');
        const checkFn = httpsCallable(functions, 'checkTokenValidity');
        const result = await checkFn({ tokenCode: token });
        const data = result.data as { isValid?: boolean };
        
        if (!data.isValid) {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          const quota = docSnap.exists() ? (docSnap.data().assessmentQuota || 0) : 0;
          
          setCurrentValidationQuota(quota);
          setIsValidationModalOpen(true);
          return;
        }
      } catch (e) {
        console.error("Token validation error:", e);
      } finally {
        setIsCheckingToken(false);
      }
    }

    if (!token) token = (!draft.isPaid || draft.price === 0) ? `FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : `TRIAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    sessionStorage.setItem('active_token', token);
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([draft.templateId]));
    onStart();
  };

  const handleQuotaRedeemed = (newToken: string) => {
    setIsValidationModalOpen(false);
    sessionStorage.setItem('active_token', newToken);
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([selectedDraftTemplate]));
    toast.success("Membuka draf...");
    onStart();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'register') { await registerWithEmail(email, password, name); toast.success('Pendaftaran berhasil!'); }
      else { await loginWithEmail(email, password); toast.success('Berhasil masuk!'); }
      setAuthMode('options'); setEmail(''); setPassword(''); setName('');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') toast.error('Email sudah terdaftar.');
      else if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) toast.error('Email atau kata sandi salah.');
      else toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally { setAuthLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Harap masukkan alamat email Anda.');
    setAuthLoading(true);
    try { await resetPassword(email); toast.success('Tautan reset dikirim ke email Anda!'); setAuthMode('login'); }
    catch (error: any) { toast.error(error.code === 'auth/user-not-found' ? 'Email belum terdaftar.' : 'Gagal mengirim tautan.'); }
    finally { setAuthLoading(false); }
  };

  // ── Derived state ────────────────────────────────────────────────────────────
  const hasRightContent = user && (isFetchingData || drafts.length > 0 || history.length > 0);
  const showGuestValueProps = !user;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full min-h-screen bg-background selection:bg-indigo-100 selection:text-indigo-900">

        {/* ══════════════════════════════════════════════════════════════════════
            HERO SECTION — full-width, above the fold
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-b border-slate-100/80">
          {/* Subtle background orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[120px]" />
            <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 pt-10 pb-12 lg:pt-14 lg:pb-16">
            <m.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center text-center gap-6"
            >
              {/* Logo */}
              <m.div variants={fadeUp} className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-md ring-1 ring-slate-200/60 overflow-hidden flex items-center justify-center">
                <SafeLogo src="/logo.png" alt="Omnifit" width={80} height={80} className="w-full h-full object-contain p-2" priority />
              </m.div>

              {/* Eyebrow */}
              <m.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black uppercase tracking-widest ring-1 ring-indigo-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Platform Asesmen AI Terdepan di Indonesia
              </m.div>

              {/* Headline */}
              <m.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] text-balance max-w-4xl"
              >
                Baca Situasi Lebih Jernih.{' '}
                <span className="text-indigo-600">Tumbuh Lebih Cepat.</span>
              </m.h1>

              {/* Subheadline */}
              <m.p
                variants={fadeUp}
                className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl text-balance"
              >
                Platform asesmen AI yang membantu Anda mengidentifikasi kekuatan, menyusun prioritas tindakan, dan mengeksekusi rencana tumbuh — dalam hitungan menit, bukan berhari-hari.
              </m.p>

              {/* Platform stats — social proof */}
              <m.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                {PLATFORM_STATS.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center shadow-sm">
                      {s.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900 leading-none">{s.value}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    </div>
                  </div>
                ))}
              </m.div>

              {/* Primary CTA row */}
              <m.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href={user ? '/onboarding' : '/login?next=/onboarding'}
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Mulai Onboarding Gratis
                </Link>
                <Link
                  href="/katalog"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 font-bold text-sm ring-1 ring-slate-200 shadow-sm transition-all"
                >
                  <LibraryBig className="w-4 h-4" />
                  Lihat Katalog Modul
                </Link>
              </m.div>

              {/* Secondary links */}
              <m.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: 'Apa itu Omnifit?', icon: <EcosystemIcon className="w-3.5 h-3.5" />, onClick: () => setIsCapabilitiesModalOpen(true) },
                  { label: 'Ekosistem Mitra', icon: <GlobalTargetIcon className="w-3.5 h-3.5" />, href: '/mitra' },
                  { label: 'Roadmap 2026', icon: <MapPinned className="w-3.5 h-3.5" />, href: '/roadmap' },
                  { label: 'Login B2B', icon: <BriefcaseBusiness className="w-3.5 h-3.5" />, href: '/b2b/login' },
                  { label: 'Bagikan', icon: <Share2 className="w-3.5 h-3.5" />, onClick: handleShareOmnifit },
                ].map((item, i) =>
                  item.href ? (
                    <Link
                      key={i}
                      href={item.href}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 ring-1 ring-slate-200 hover:ring-indigo-200 transition-all"
                    >
                      {item.icon} {item.label}
                    </Link>
                  ) : (
                    <button
                      key={i}
                      onClick={item.onClick}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 ring-1 ring-slate-200 hover:ring-indigo-200 transition-all"
                    >
                      {item.icon} {item.label}
                    </button>
                  )
                )}
              </m.div>
            </m.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            MICRO-SIMULATOR (LEAD MAGNET)
        ══════════════════════════════════════════════════════════════════════ */}
        {!user && (
          <section className="max-w-7xl mx-auto px-5 lg:px-10 mb-8">
            <m.div variants={fadeUp} initial="hidden" animate="visible">
              <MicroSimulator />
            </m.div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            CONTENT AREA — 2-column on xl
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
          <div className="flex flex-col xl:flex-row gap-8 lg:gap-12 items-start">

            {/* ── LEFT COLUMN: Auth / User panel ─────────────────────────────── */}
            <m.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="w-full xl:w-[420px] shrink-0 space-y-4"
            >
              {/* ── GUEST: Auth card ─────────────────────────────────────────── */}
              {!user && (
                <m.div variants={fadeUp}>
                  <AnimatePresence mode="wait">
                    {authMode === 'options' && (
                      <m.div
                        key="options"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="bg-white rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm p-6 sm:p-8 space-y-4"
                      >
                        <div className="mb-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Akses Platform</p>
                          <h2 className="text-xl font-black text-slate-900">Masuk atau Daftar</h2>
                          <p className="text-sm text-slate-500 font-medium mt-1">Simpan progres & akses semua fitur secara aman.</p>
                        </div>

                        {/* Google CTA — primary */}
                        <button
                          onClick={onLogin}
                          className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-sm shadow-sm transition-all"
                        >
                          <GoogleIcon />
                          Masuk dengan Akun Google
                        </button>

                        <div className="relative flex items-center">
                          <div className="flex-grow border-t border-slate-100" />
                          <span className="mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">atau</span>
                          <div className="flex-grow border-t border-slate-100" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setAuthMode('login')}
                            className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm ring-1 ring-slate-200 transition-all"
                          >
                            Masuk Email
                          </button>
                          <button
                            onClick={() => setAuthMode('register')}
                            className="h-11 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-sm shadow-sm transition-all"
                          >
                            Daftar Baru
                          </button>
                        </div>
                      </m.div>
                    )}

                    {authMode === 'reset' && (
                      <m.form
                        key="reset"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        onSubmit={handleResetPassword}
                        className="bg-white rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm p-6 sm:p-8 space-y-4"
                      >
                        <div>
                          <h2 className="text-lg font-black text-slate-900">Atur Ulang Kata Sandi</h2>
                          <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">Masukkan email Anda. Kami akan mengirimkan tautan reset.</p>
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input required type="email" placeholder="Alamat Email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-11 rounded-xl" />
                        </div>
                        <Button type="submit" disabled={authLoading} className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                          {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Tautan Reset'}
                        </Button>
                        <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors">
                          ← Kembali ke Login
                        </button>
                      </m.form>
                    )}

                    {(authMode === 'login' || authMode === 'register') && (
                      <m.form
                        key={authMode}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        onSubmit={handleEmailAuth}
                        className="bg-white rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm p-6 sm:p-8 space-y-4"
                      >
                        <div>
                          <h2 className="text-lg font-black text-slate-900">
                            {authMode === 'register' ? 'Buat Akun Baru' : 'Masuk ke Akun'}
                          </h2>
                        </div>

                        {authMode === 'register' && (
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input required placeholder="Nama Lengkap" value={name} onChange={e => setName(e.target.value)} className="pl-9 h-11 rounded-xl" />
                          </div>
                        )}
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input required type="email" placeholder="Alamat Email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-11 rounded-xl" />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input required type="password" placeholder="Kata Sandi (min. 6 karakter)" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 h-11 rounded-xl" minLength={6} />
                        </div>

                        {authMode === 'login' && (
                          <div className="flex justify-end -mt-1">
                            <button type="button" onClick={() => setAuthMode('reset')} className="text-xs font-bold text-indigo-600 hover:underline">
                              Lupa kata sandi?
                            </button>
                          </div>
                        )}

                        <Button type="submit" disabled={authLoading} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold">
                          {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : authMode === 'register' ? 'Daftar & Lanjutkan' : 'Masuk'}
                        </Button>
                        <button type="button" onClick={() => setAuthMode('options')} className="w-full text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors">
                          ← Kembali
                        </button>
                      </m.form>
                    )}
                  </AnimatePresence>

                  {/* Privacy note */}
                  <p className="text-xs text-slate-400 font-medium text-center mt-3 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Data Anda aman & tidak dibagikan ke pihak ketiga.
                  </p>
                </m.div>
              )}

              {/* ── LOGGED IN: User panel ─────────────────────────────────────── */}
              {user && (
                <m.div variants={fadeUp} className="space-y-3">
                  {/* User identity card */}
                  <div className="flex items-center justify-between bg-white px-5 py-4 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {user.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg ring-1 ring-indigo-100 shrink-0">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-sm font-black text-slate-900 truncate leading-tight">{user.displayName || 'Pengguna'}</p>
                        <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0" title="Keluar">
                      <LogOut size={16} />
                    </button>
                  </div>

                  {/* Quick nav grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link href="/katalog">
                      <Button variant="brandOutline" className="w-full h-11 rounded-xl text-xs gap-2">
                        <LibraryBig size={15} /> Katalog
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="brandOutline" className="w-full h-11 rounded-xl text-xs gap-2">
                        <AdminShieldIcon size={15} /> Brankas
                      </Button>
                    </Link>
                    {role?.startsWith('admin') && (
                      <Link href="/admin" className="col-span-2">
                        <Button variant="outline" className="w-full h-11 rounded-xl text-xs gap-2 bg-slate-50">
                          <LayoutDashboard size={15} /> Dasbor Admin
                        </Button>
                      </Link>
                    )}
                    {role === 'assessor' && (
                      <Link href="/assessor" className="col-span-2">
                        <Button variant="outline" className="w-full h-11 rounded-xl text-xs gap-2 bg-slate-50">
                          <ClipboardCheck size={15} /> Ruang Kerja Asesor
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Primary CTA: Token */}
                  <Link href="/token" className="block">
                    <Button variant="brand" className="w-full h-14 rounded-2xl text-sm px-6 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <KeyRound className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        Gunakan Token Akses
                      </div>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </m.div>
              )}

              {/* ── Onboarding nudge banner ───────────────────────────────────── */}
              <m.div variants={fadeUp} className="rounded-[1.5rem] bg-indigo-50/60 p-5 ring-1 ring-indigo-100 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Rekomendasi Adaptif</p>
                    <h3 className="text-sm font-black text-indigo-950 leading-snug mb-1">Onboarding 2 Menit</h3>
                    <p className="text-xs text-indigo-700/70 font-medium leading-relaxed mb-3">AI menyusun 5 langkah prioritas & merekomendasikan modul yang tepat untuk Anda.</p>
                    <Link
                      href={user ? '/onboarding' : '/login?next=/onboarding'}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Mulai Sekarang <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </m.div>

              {/* ── Privacy & legal strip ─────────────────────────────────────── */}
              <m.div variants={fadeUp} className="rounded-xl bg-white ring-1 ring-slate-100 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Privasi Terjamin</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <Link href="/privasi" className="text-slate-400 hover:text-indigo-600 transition-colors">Privasi</Link>
                  <span className="text-slate-200">|</span>
                  <Link href="/kebijakan" className="text-slate-400 hover:text-indigo-600 transition-colors">Ketentuan</Link>
                </div>
              </m.div>
            </m.div>

            {/* ── RIGHT COLUMN: History/Draft (logged in) OR Value props (guest) ── */}
            <div className="flex-1 min-w-0">

              {/* ── GUEST: Value proposition cards ───────────────────────────── */}
              {showGuestValueProps && (
                <m.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {GUEST_VALUE_PROPS.map((vp, i) => (
                    <m.div
                      key={i}
                      variants={cardVariant}
                      className="bg-white p-6 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm hover:shadow-md hover:ring-indigo-200 transition-all flex flex-col gap-4"
                    >
                      <div className={`w-12 h-12 ${vp.bg} rounded-2xl flex items-center justify-center ring-1 ring-white shadow-inner`}>
                        {vp.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 mb-1">{vp.title}</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{vp.desc}</p>
                      </div>
                    </m.div>
                  ))}

                </m.div>
              )}

              {/* ── LOGGED IN: Skeleton ───────────────────────────────────────── */}
              {user && isFetchingData && (
                <div className="animate-pulse space-y-4 mb-8">
                  <div className="h-5 bg-slate-100 rounded-lg w-1/3" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-32 bg-slate-100 rounded-[1.5rem]" />
                    ))}
                  </div>
                </div>
              )}

              {/* ── LOGGED IN: BUNDLE PROMO ───────────────────────────────────── */}
              {user && !isFetchingData && (
                <div className="mb-8">
                  <BundleUpsellBanner 
                    onSelectBundle={(bundleId) => router.push(`/katalog?buy=${bundleId}`)} 
                  />
                </div>
              )}

              {/* ── LOGGED IN: Drafts ─────────────────────────────────────────── */}
              {user && !isFetchingData && drafts.length > 0 && (
                <m.div variants={stagger} initial="hidden" animate="visible" className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <DocExportIcon className="h-4 w-4 text-amber-500" />
                      Draf Belum Selesai
                    </h3>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md ring-1 ring-amber-200">
                      {drafts.length} tersimpan
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {drafts.map((draft, idx) => (
                      <m.div
                        key={draft.templateId || idx}
                        variants={cardVariant}
                        whileHover={{ y: -2 }}
                        onClick={() => handleResumeDraft(draft)}
                        className="bg-white p-5 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm cursor-pointer group hover:ring-amber-300 hover:shadow-md transition-all flex flex-col min-h-[120px]"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md ring-1 ring-amber-100 w-fit mb-3">
                          Tersimpan Lokal
                        </span>
                        <h4 className="font-black text-slate-900 text-sm group-hover:text-amber-600 line-clamp-2 transition-colors flex-1 mb-3">
                          {asSafeText(draft.trackName, 'Draft Tanpa Nama')}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 group-hover:text-amber-500 flex items-center gap-1.5 transition-colors mt-auto">
                          {isCheckingToken && selectedDraftTemplate === draft.templateId ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memvalidasi...</>
                          ) : (
                            <>Lanjutkan <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" /></>
                          )}
                        </p>
                      </m.div>
                    ))}
                  </div>
                </m.div>
              )}

              {/* ── LOGGED IN: History ────────────────────────────────────────── */}
              {user && !isFetchingData && history.length > 0 && (
                <m.div variants={stagger} initial="hidden" animate="visible">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-400" />
                      Riwayat Kurasi Anda
                    </h3>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg ring-1 ring-slate-200 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Sync</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {history.map((item, idx) => (
                      <m.div
                        key={item.id || idx}
                        variants={cardVariant}
                        whileHover={{ y: -2 }}
                        onClick={() => onLoadHistory(item)}
                        className="bg-white p-5 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm cursor-pointer group hover:ring-indigo-300 hover:shadow-md transition-all flex flex-col min-h-[140px]"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md ring-1 ring-indigo-100 w-fit mb-3">
                          {asSafeText(item.trackType, 'Evaluasi')}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm group-hover:text-indigo-600 line-clamp-2 transition-colors flex-1 mb-4">
                          {asSafeText(item.namaUsaha, 'Tanpa Nama')}
                        </h4>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-50 rounded-lg ring-1 ring-slate-200 group-hover:ring-indigo-200 group-hover:bg-indigo-50 transition-colors">
                              <BrainIcon size={13} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <p className="text-xs font-bold text-slate-600">Skor: {asSafeNumber(item.score, 0)}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </m.div>
                    ))}
                  </div>
                </m.div>
              )}

              {/* ── LOGGED IN: Empty state (no drafts, no history) ────────────── */}
              {user && !isFetchingData && drafts.length === 0 && history.length === 0 && (
                <m.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm p-12 text-center flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center ring-1 ring-indigo-100">
                    <AiSparkIcon size={28} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">Belum Ada Riwayat</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                      Mulai asesmen pertama Anda untuk melihat hasil dan rekam jejak analitik di sini.
                    </p>
                  </div>
                  <Link href="/katalog">
                    <Button variant="brand" className="h-11 px-6 rounded-xl text-sm mt-2">
                      Pilih Modul Asesmen <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </m.div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── System Capabilities Modal ─────────────────────────────────────────── */}
      <SystemCapabilitiesModal
        isOpen={isCapabilitiesModalOpen}
        onClose={() => setIsCapabilitiesModalOpen(false)}
        isLoggedIn={!!user}
      />

      {/* ── Draft Validation Modal ────────────────────────────────────────────── */}
      <DraftValidationModal 
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        userQuota={currentValidationQuota}
        templateId={selectedDraftTemplate}
        onQuotaRedeemed={handleQuotaRedeemed}
      />
    </LazyMotion>
  );
}