'use client';

// src/app/components/curation/CurationLanding.tsx

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, History, Clock, ChevronRight, Loader2, LogOut, 
  LayoutDashboard, ClipboardCheck, KeyRound, Mail, Lock, 
  User as UserIcon, LibraryBig, MapPinned, Share2, 
  ShieldCheck, Sparkles, BriefcaseBusiness 
} from 'lucide-react';
import { EcosystemIcon, AdminShieldIcon, DocExportIcon, BrainIcon, GlobalTargetIcon } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurationHistory } from '@/types/curation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { useMobileBack } from '@/hooks/useMobileBack';
import { useAuth } from '@/contexts/AuthContext';
import { LazyMotion, domAnimation, m, AnimatePresence, Variants } from 'framer-motion';
import dynamic from 'next/dynamic';
import { shareOrCopy } from '@/lib/share';

const SystemCapabilitiesModal = dynamic(
  () => import('./SystemCapabilitiesModal').then((mod) => mod.SystemCapabilitiesModal),
  { ssr: false }
);

interface Props {
  onStart: () => void;
  history: CurationHistory[];
  onLoadHistory: (item: CurationHistory) => void;
  user: User | null;
  role: 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | 'curator' | null;
  onLogin: () => void;
  onLogout: () => void;
}

interface DraftItem {
  templateId: string;
  trackName: string;
  isPaid: boolean;
  price: number;
}

export function CurationLanding({ onStart, history, onLoadHistory, user, role, onLogin, onLogout }: Props) {
  const router = useRouter();
  const [isCapabilitiesModalOpen, setIsCapabilitiesModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const { registerWithEmail, loginWithEmail, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState<'options' | 'login' | 'register' | 'reset'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleShareOmnifit = async () => {
    try {
      const result = await shareOrCopy({
        title: 'Omnifit - Smart Assessment System',
        text: 'Coba Omnifit untuk asesmen AI personal, komunitas, dan bisnis.',
        url: 'https://omnifit.cloud',
      });
      if (result === 'copied') {
        toast.success('Link aplikasi berhasil disalin.');
      }
    } catch {
      toast.error('Gagal membagikan link aplikasi.');
    }
  };

  useMobileBack(isCapabilitiesModalOpen, () => setIsCapabilitiesModalOpen(false));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fetchDrafts = async () => {
      setIsFetchingData(true);
      try {
        const q = query(collection(db, 'form_templates'), where('isActive', '==', true));
        const snap = await getDocs(q);
        
        const templates = snap.docs.map(document => ({
          id: document.id,
          trackName: document.data().trackName,
          isPaid: document.data().isPaid,
          price: document.data().price
        }));

        const foundDrafts: DraftItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('curation_draft_dynamic_')) {
            const tplId = key.replace('curation_draft_dynamic_', '');
            const tpl = templates.find(t => t.id === tplId);
            if (tpl) {
              foundDrafts.push({
                templateId: tplId,
                trackName: tpl.trackName,
                isPaid: tpl.isPaid || false,
                price: tpl.price || 0
              });
            }
          }
        }
        setDrafts(foundDrafts);
      } catch (error) {
        console.error("Gagal memuat draf:", error);
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchDrafts();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const buyId = urlParams.get('buy');
      if (buyId) {
        router.push(`/katalog?buy=${buyId}`);
      }
    }
  }, [router]);

  const handleResumeDraft = (draft: DraftItem) => {
    if (!user) {
       toast.error("Otorisasi Diperlukan", { description: "Silakan masuk (login) menggunakan Akun Google Anda terlebih dahulu untuk melanjutkan draf." });
       onLogin();
       return;
    }

    let currentToken = sessionStorage.getItem('active_token');
    
    if (!currentToken) {
       const savedToken = localStorage.getItem('omnifit_last_token');
       if (savedToken) {
         currentToken = savedToken;
       } else {
         currentToken = (!draft.isPaid || draft.price === 0) 
             ? `FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
             : `TRIAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
       }
       sessionStorage.setItem('active_token', currentToken);
    }
    
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([draft.templateId]));
    onStart();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        await registerWithEmail(email, password, name);
        toast.success("Pendaftaran berhasil!");
      } else {
        await loginWithEmail(email, password);
        toast.success("Berhasil masuk!");
      }
      
      setAuthMode('options');
      setEmail(''); setPassword(''); setName('');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') toast.error("Email sudah terdaftar.");
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') toast.error("Email atau kata sandi salah.");
      else toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Harap masukkan alamat email Anda.");
    
    setAuthLoading(true);
    try {
      await resetPassword(email);
      toast.success("Tautan pengaturan kata sandi telah dikirim ke email Anda!");
      setAuthMode('login'); 
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast.error("Email belum terdaftar di sistem.");
      } else {
        toast.error("Gagal mengirim tautan. Silakan coba lagi.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const historyItemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full min-h-screen bg-[#FAFAFA] py-8 lg:py-12 px-5 lg:px-10 relative overflow-hidden selection:bg-indigo-100">
        
        <div className="max-w-7xl w-full mx-auto flex flex-col xl:flex-row gap-10 lg:gap-16 items-start relative z-10">
          
          {/* Kolom Kiri: Hero & Form/Login */}
          <m.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex-1 space-y-8 text-center xl:text-left w-full"
          >
            <m.div variants={fadeUpVariants} className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 mb-2 overflow-hidden">
              <Image src="/logo.png" alt="Omnifit Logo" width={80} height={80} className="w-full h-full object-contain p-2" priority unoptimized />
            </m.div>
            
            <m.div variants={fadeUpVariants} className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] text-balance">
                Omnifit Platform <br className="hidden sm:block"/>
                <span className="text-indigo-600">
                  Adaptive Intelligence for Growth
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto xl:mx-0 font-medium leading-relaxed text-balance">
                Platform asesmen AI yang membantu Anda membaca situasi secara jernih, menyusun prioritas tindakan, dan mengeksekusi rencana tumbuh dengan lebih cepat.
              </p>

              {/* AREA TOMBOL CTA */}
              <div className="flex flex-wrap items-center justify-center xl:justify-start gap-3 pt-2">
                <button
                  onClick={() => setIsCapabilitiesModalOpen(true)}
                  className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200/60 px-5 py-3 rounded-xl hover:bg-slate-50 hover:ring-indigo-200 transition-all"
                >
                  <EcosystemIcon className="w-4 h-4" />
                  Apa itu Omnifit?
                </button>
                <Link href="/mitra" className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200/60 px-5 py-3 rounded-xl hover:bg-slate-50 hover:ring-indigo-200 transition-all">
                  <GlobalTargetIcon className="w-4 h-4" />
                  Ekosistem Mitra
                </Link>
                <button
                  onClick={handleShareOmnifit}
                  className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200/60 px-5 py-3 rounded-xl hover:bg-slate-50 hover:ring-indigo-200 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Bagikan Aplikasi
                </button>
                <Link href="/b2b/login" className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200/60 px-5 py-3 rounded-xl hover:bg-slate-50 hover:ring-indigo-200 transition-all">
                  <BriefcaseBusiness className="w-4 h-4" />
                  Login B2B
                </Link>
                <Link href="/roadmap" className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 shadow-sm ring-1 ring-indigo-200 px-5 py-3 rounded-xl transition-all group">
                  <MapPinned className="w-4 h-4 group-hover:animate-bounce" />
                  Roadmap AI 2026
                </Link>
              </div>

              {/* REKOMENDASI ADAPTIF BANNER */}
              <div className="rounded-[2rem] bg-indigo-50/50 p-6 sm:p-8 ring-1 ring-indigo-100 shadow-sm max-w-3xl mx-auto xl:mx-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-widest font-black text-indigo-500 mb-1.5">Rekomendasi Adaptif</p>
                    <h3 className="text-lg font-black tracking-tight text-indigo-950">Mulai Onboarding 2 Menit untuk Pilih Modul</h3>
                    <p className="text-sm text-indigo-700/80 mt-1.5 leading-relaxed font-medium">AI akan menyusun 5 langkah prioritas dan merekomendasikan modul katalog yang sesuai dengan profil Anda.</p>
                  </div>
                  <Link
                    href={user ? '/onboarding' : '/login?next=/onboarding'}
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm whitespace-nowrap shadow-md shadow-indigo-200 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Mulai Onboarding
                  </Link>
                </div>
              </div>
            </m.div>

            {/* AREA AUTENTIKASI ATAU DASHBOARD CEPAT */}
            {!user ? (
              <m.div variants={fadeUpVariants} className="w-full max-w-md mx-auto xl:mx-0 pt-4">
                {authMode === 'options' ? (
                  <div className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm space-y-4">
                    <Button size="lg" onClick={onLogin} className="w-full shadow-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 h-12 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Masuk dengan Akun Google
                    </Button>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-100"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">ATAU</span>
                      <div className="flex-grow border-t border-slate-100"></div>
                    </div>
                    <Button size="lg" onClick={() => setAuthMode('register')} className="w-full shadow-sm bg-slate-900 text-white hover:bg-indigo-600 h-12 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3">
                      Daftar dengan Email
                    </Button>
                    <p className="text-center text-sm text-slate-500 font-medium mt-3">
                      Sudah punya akun? <button onClick={() => setAuthMode('login')} className="text-indigo-600 font-bold hover:underline">Masuk di sini</button>
                    </p>
                  </div>
                ) : authMode === 'reset' ? (
                  <form onSubmit={handleResetPassword} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 text-left">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">Atur Ulang Kata Sandi</h3>
                    <p className="text-sm font-medium text-slate-500 mb-4 leading-relaxed">
                      Masukkan alamat email yang terhubung dengan akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
                    </p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        required
                        type="email"
                        placeholder="Alamat Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500"
                      />
                    </div>
                    <Button type="submit" disabled={authLoading} className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all mt-2 text-sm shadow-sm">
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Tautan'}
                    </Button>
                    <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm font-bold text-slate-500 hover:text-slate-900 mt-2">
                      Kembali ke Login
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleEmailAuth} className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm space-y-4 text-left">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
                      {authMode === 'register' ? 'Buat Akun Baru' : 'Masuk ke Akun'}
                    </h3>
                    
                    {authMode === 'register' && (
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          required
                          placeholder="Nama Lengkap Anda"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500"
                        />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        required
                        type="email"
                        placeholder="Alamat Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500"
                      />
                    </div>
                    
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        required
                        type="password"
                        placeholder="Kata Sandi (Min. 6 karakter)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500"
                        minLength={6}
                      />
                    </div>
                    {authMode === 'login' && (
                      <div className="flex justify-end mt-1">
                        <button type="button" onClick={() => setAuthMode('reset')} className="text-xs font-medium text-indigo-600 hover:underline">
                          Lupa / Belum Punya Kata Sandi?
                        </button>
                      </div>
                    )}
                    <Button type="submit" disabled={authLoading} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold transition-all mt-2 text-sm shadow-sm">
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === 'register' ? 'Daftar & Lanjutkan' : 'Masuk')}
                    </Button>
                    
                    <button type="button" onClick={() => setAuthMode('options')} className="w-full text-sm font-bold text-slate-500 hover:text-slate-900 mt-2">
                      Batal
                    </button>
                  </form>
                )}
                
                <p className="text-xs text-slate-500 font-medium mt-4 text-center">Anda wajib masuk untuk menggunakan token dan menyimpan progres secara aman.</p>
              </m.div>
            ) : (
              <m.div variants={fadeUpVariants} className="w-full max-w-md mx-auto xl:mx-0 space-y-4 pt-4">
                <div className="flex items-center justify-between bg-white px-6 py-5 rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-[1rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 text-xl ring-1 ring-indigo-100">
                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="truncate text-left">
                      <p className="text-sm font-bold text-slate-900 tracking-tight truncate">{user.displayName}</p>
                      <p className="text-xs font-medium text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Keluar">
                    <LogOut size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link href="/katalog" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-sm font-bold gap-2 shadow-sm">
                      <LibraryBig size={16} /> Buka Katalog
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-sm font-bold gap-2 shadow-sm">
                      <AdminShieldIcon size={16} /> Brankas Modul
                    </Button>
                  </Link>
                </div>

                {(role === 'admin_csrs' || role === 'admin_omnifit') && (
                  <Link href="/admin" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 text-sm font-bold gap-2 shadow-sm">
                      <LayoutDashboard size={16} /> Dasbor Admin
                    </Button>
                  </Link>
                )}
                
                {(role === 'assessor') && (
                  <Link href="/assessor" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 text-sm font-bold gap-2 shadow-sm">
                      <ClipboardCheck size={16} /> Ruang Kerja Asesor
                    </Button>
                  </Link>
                )}
                
                <div className="pt-2">
                  <Link href="/token" className="block w-full">
                    <Button 
                      size="lg"
                      className="w-full shadow-md bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl h-14 px-6 text-sm font-bold transition-all duration-300 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <KeyRound className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        Gunakan Token Akses
                      </div>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </m.div>
            )}

            <m.div variants={fadeUpVariants} className="w-full max-w-xl mx-auto xl:mx-0 pt-3">
              <div className="rounded-[1.5rem] bg-white ring-1 ring-slate-200/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-[11px] font-bold uppercase tracking-wider">Privasi Data Terjamin</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <Link href="/privasi" className="text-slate-500 hover:text-indigo-600 transition-colors">Kebijakan Privasi</Link>
                  <span className="text-slate-300">|</span>
                  <Link href="/kebijakan" className="text-slate-500 hover:text-indigo-600 transition-colors">Syarat & Ketentuan</Link>
                </div>
              </div>
            </m.div>

          </m.div>

          {/* Kolom Kanan: KONTAINER PEMBATAS UTAMA UNTUK DRAFT & HISTORY */}
          {(user || isFetchingData) && (
            <div className="w-full xl:w-6/12 flex flex-col mx-auto xl:mx-0 shrink-0 mt-8 xl:mt-0">
              
              {/* === KONTAINER PEMBATAS AREA KANAN === */}
              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] ring-1 ring-slate-200/60 shadow-sm flex flex-col gap-8 w-full">
                
                {isFetchingData ? (
                  <div className="w-full animate-pulse">
                     <div className="h-5 bg-slate-100 rounded w-1/3 mb-6"></div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="h-28 bg-slate-50 rounded-[1.5rem] w-full border border-slate-100"></div>
                        <div className="h-28 bg-slate-50 rounded-[1.5rem] w-full border border-slate-100"></div>
                     </div>
                  </div>
                ) : (
                  <>
                    {/* DRAFTS SECTION */}
                    {drafts.length > 0 && (
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-4 relative z-10 px-2">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <DocExportIcon className="h-4 w-4 text-amber-500" /> Draf Belum Selesai
                          </h3>
                        </div>
                        <m.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                          {drafts.map((draft, idx) => (
                            <m.div 
                              variants={historyItemVariants}
                              whileHover={{ y: -2 }}
                              key={draft.templateId || idx}
                              onClick={() => handleResumeDraft(draft)} 
                              className="bg-white p-5 rounded-[1.5rem] shadow-sm ring-1 ring-slate-200/60 cursor-pointer group transition-all hover:ring-amber-300 hover:shadow-md flex flex-col justify-between h-full min-h-[120px]"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md ring-1 ring-amber-100">
                                  Tersimpan Lokal
                                </span>
                              </div>
                              <h4 className="font-black text-slate-900 text-sm group-hover:text-amber-600 line-clamp-2 mb-3 transition-colors tracking-tight flex-1">
                                {draft.trackName}
                              </h4>
                              <p className="text-[11px] font-bold text-slate-500 group-hover:text-amber-500 flex items-center gap-1.5 transition-colors mt-auto">
                                Lanjutkan Asesmen <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                              </p>
                            </m.div>
                          ))}
                        </m.div>
                      </div>
                    )}

                    {/* HISTORY SECTION (Kantong Grid) */}
                    {history.length > 0 && (
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-4 relative z-10 px-2">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <History className="h-4 w-4 text-slate-500" /> Riwayat Kurasi Anda
                          </h3>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg shadow-sm ring-1 ring-slate-200" title="Terhubung secara real-time ke sistem AI">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Sync</span>
                          </div>
                        </div>
                        
                        <m.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                          {history.map((item, idx) => (
                            <m.div 
                              variants={historyItemVariants}
                              whileHover={{ y: -2 }}
                              key={item.id || idx}
                              onClick={() => onLoadHistory(item)} 
                              className="bg-white p-5 rounded-[1.5rem] shadow-sm ring-1 ring-slate-200/60 cursor-pointer group transition-all hover:ring-indigo-300 hover:shadow-md flex flex-col justify-between h-full min-h-[140px]"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md ring-1 ring-indigo-100">
                                  {item.trackType}
                                </span>
                              </div>
                              
                              <h4 className="font-black text-slate-900 text-sm group-hover:text-indigo-600 line-clamp-2 mb-4 transition-colors tracking-tight flex-1">
                                {item.namaUsaha}
                              </h4>
                              
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 ring-1 ring-slate-200 group-hover:ring-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                    <BrainIcon size={14} className="currentColor"/>
                                  </div>
                                  <p className="text-xs font-bold text-slate-700">Skor: {item.score}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                              </div>
                            </m.div>
                          ))}
                        </m.div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* === END KONTAINER PEMBATAS === */}
              
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}