'use client';
// src/app/components/curation/CurationLanding.tsx
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, History, Clock, ChevronRight, Loader2, LogOut, LayoutDashboard, ClipboardCheck, KeyRound, Mail, Lock, User as UserIcon, LibraryBig, MapPinned, Share2, ShieldCheck, Sparkles } from 'lucide-react';
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
  role: 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | null;
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
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full min-h-screen bg-[#FAFAFA] py-8 lg:py-10 px-5 lg:px-10 relative overflow-hidden">
         
        {/* Animated Ornaments */}
        <m.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none"
        />
        <m.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"
        />

        <div className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-10 lg:gap-16 items-start relative z-10">
          
          {/* Kolom Kiri: Hero & Form/Login */}
          <m.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex-1 space-y-8 text-center lg:text-left w-full"
          >
            <m.div variants={fadeUpVariants} className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 mb-2 overflow-hidden">
              <Image src="/logo.png" alt="Omnifit Logo" width={80} height={80} className="w-full h-full object-contain p-2" priority />
            </m.div>
            
            <m.div variants={fadeUpVariants} className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] text-balance">
                Omnifit Platform <br className="hidden sm:block"/>
                <span className="text-indigo-600 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                  Adaptive Intelligence for Growth
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed text-balance">
                Platform asesmen AI yang membantu Anda membaca situasi secara jernih, menyusun prioritas tindakan, dan mengeksekusi rencana tumbuh dengan lebih cepat.
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto lg:mx-0">
                {[
                  { label: 'Framework', value: 'Context-Aware AI' },
                  { label: 'Kecepatan', value: 'Insight Instan' },
                  { label: 'Output', value: 'Action Plan Nyata' },
                  { label: 'Skala', value: 'Personal - Enterprise' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/75 backdrop-blur-sm border border-white px-4 py-3 shadow-sm text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                    <p className="text-sm font-black text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* AREA TOMBOL CTA */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2">
                <button
                  onClick={() => setIsCapabilitiesModalOpen(true)}
                  className="inline-flex items-center gap-2 font-bold text-slate-500 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <EcosystemIcon className="w-4 h-4" />
                  Apa itu Omnifit?
                </button>
                <Link href="/mitra" className="inline-flex items-center gap-2 font-bold text-slate-500 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all">
                  <GlobalTargetIcon className="w-4 h-4" />
                  Ekosistem Mitra
                </Link>

                <button
                  onClick={handleShareOmnifit}
                  className="inline-flex items-center gap-2 font-bold text-slate-500 hover:text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Bagikan Aplikasi
                </button>

                {/* TOMBOL ROADMAP BARU */}
                <Link href="/roadmap" className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 shadow-sm ring-1 ring-indigo-200 px-4 py-3 rounded-xl transition-all group">
                  <MapPinned className="w-4 h-4 group-hover:animate-bounce" />
                  Roadmap AI 2026
                </Link>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-4 sm:p-5 text-white shadow-lg shadow-indigo-500/20 max-w-3xl mx-auto lg:mx-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-indigo-100 mb-1">Rekomendasi Adaptif</p>
                    <h3 className="text-base sm:text-lg font-black">Mulai Onboarding 2 Menit untuk Pilih Modul Paling Relevan</h3>
                    <p className="text-xs sm:text-sm text-indigo-100 mt-1">AI akan menyusun 5 langkah prioritas dan merekomendasikan modul katalog yang sesuai profil Anda.</p>
                  </div>
                  <Link
                    href={user ? '/onboarding' : '/login?next=/onboarding'}
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-black text-sm whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    Mulai Onboarding
                  </Link>
                </div>
              </div>
            </m.div>

            {/* AREA AUTENTIKASI ATAU DASHBOARD CEPAT */}
            {!user ? (
              <m.div variants={fadeUpVariants} className="w-full max-w-md mx-auto lg:mx-0 space-y-4 pt-4 border-t border-slate-200">
                {authMode === 'options' ? (
                  <>
                    <Button size="lg" onClick={onLogin} className="w-full shadow-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 h-14 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Masuk dengan Akun Google
                    </Button>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">ATAU</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <Button size="lg" onClick={() => setAuthMode('register')} className="w-full shadow-md bg-indigo-600 text-white hover:bg-indigo-700 h-14 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-3">
                      Daftar dengan Email
                    </Button>

                    <p className="text-center text-sm text-slate-500 font-medium mt-2">
                      Sudah punya akun? <button onClick={() => setAuthMode('login')} className="text-indigo-600 font-bold hover:underline">Masuk di sini</button>
                    </p>
                  </>
                ) : authMode === 'reset' ? (
                  <form onSubmit={handleResetPassword} className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-sm space-y-4 text-left">
                    <h3 className="text-lg font-black text-slate-900 mb-2">Atur Ulang Kata Sandi</h3>
                    <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">
                      Masukkan alamat email yang terhubung dengan akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
                    </p>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        required
                        type="email"
                        placeholder="Alamat Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>
                    
                    <Button type="submit" disabled={authLoading} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all mt-2">
                      {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Tautan'}
                    </Button>
                    
                    <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 mt-2">
                      Kembali ke Login
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleEmailAuth} className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-sm space-y-4 text-left">
                    <h3 className="text-lg font-black text-slate-900 mb-2">
                      {authMode === 'register' ? 'Buat Akun Baru' : 'Masuk ke Akun'}
                    </h3>
                    
                    {authMode === 'register' && (
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                          required
                          placeholder="Nama Lengkap Anda"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                        />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        required
                        type="email"
                        placeholder="Alamat Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>
                    
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        required
                        type="password"
                        placeholder="Kata Sandi (Min. 6 karakter)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                        minLength={6}
                      />
                    </div>

                    {authMode === 'login' && (
                      <div className="flex justify-end mt-1">
                        <button type="button" onClick={() => setAuthMode('reset')} className="text-xs font-bold text-indigo-600 hover:underline">
                          Lupa / Belum Punya Kata Sandi?
                        </button>
                      </div>
                    )}

                    <Button type="submit" disabled={authLoading} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold transition-all mt-2">
                      {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'register' ? 'Daftar & Lanjutkan' : 'Masuk')}
                    </Button>
                    
                    <button type="button" onClick={() => setAuthMode('options')} className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 mt-2">
                      Batal
                    </button>
                  </form>
                )}
                
                <p className="text-xs text-slate-500 font-medium mt-4 text-center">Anda wajib masuk untuk menggunakan token dan menyimpan progres secara aman.</p>
              </m.div>
            ) : (
              // JIKA USER SUDAH LOGIN, TAMPILKAN PANEL AKSES CEPAT
              <m.div variants={fadeUpVariants} className="w-full max-w-md mx-auto lg:mx-0 space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 text-lg">
                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="truncate text-left">
                      <p className="text-sm font-black text-slate-900 truncate">{user.displayName}</p>
                      <p className="text-xs font-bold text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={onLogout} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Keluar">
                    <LogOut size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link href="/katalog" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-bold gap-2 shadow-sm">
                      <LibraryBig size={16} /> Buka Katalog
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-bold gap-2 shadow-sm">
                      <AdminShieldIcon size={16} /> Brankas Modul
                    </Button>
                  </Link>
                </div>

                {(role === 'admin_csrs' || role === 'admin_omnifit') && (
                  <Link href="/admin" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold gap-2">
                      <LayoutDashboard size={18} /> Dasbor Admin
                    </Button>
                  </Link>
                )}
                
                {(role === 'assessor') && (
                  <Link href="/assessor" className="block w-full">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold gap-2">
                      <ClipboardCheck size={18} /> Ruang Kerja Asesor
                    </Button>
                  </Link>
                )}
                
                <div className="pt-2">
                  <Link href="/token" className="block w-full">
                    <Button 
                      size="lg"
                      className="w-full shadow-lg shadow-indigo-600/20 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl h-14 px-6 text-base font-bold transition-all duration-300 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <KeyRound className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
                        Gunakan Token Akses
                      </div>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </m.div>
            )}

            <m.div variants={fadeUpVariants} className="w-full max-w-xl mx-auto lg:mx-0 pt-3">
              <div className="rounded-2xl bg-white/75 border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-semibold">Kami menjaga privasi dan keamanan data asesmen Anda.</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <Link href="/privasi" className="text-slate-500 hover:text-indigo-600">Kebijakan Privasi</Link>
                  <span className="text-slate-300">|</span>
                  <Link href="/kebijakan" className="text-slate-500 hover:text-indigo-600">Syarat & Kebijakan</Link>
                </div>
              </div>
            </m.div>
          </m.div>

          {/* Kolom Kanan: Draft & History Cards */}
          {(user || isFetchingData) && (
            <div className="w-full max-w-md flex flex-col gap-6 lg:gap-8 mx-auto lg:mx-0 shrink-0">
              
              {isFetchingData ? (
                <>
                  <div className="w-full bg-white/40 border border-white/20 p-6 sm:p-8 rounded-[2rem] shadow-sm animate-pulse">
                     <div className="h-6 bg-slate-200 rounded-md w-1/2 mb-6"></div>
                     <div className="space-y-3">
                        <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                        <div className="h-20 bg-slate-100 rounded-2xl w-full"></div>
                     </div>
                  </div>
                </>
              ) : (
                <>
                  {/* DRAFTS SECTION */}
                  {drafts.length > 0 && (
                    <m.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                      className="w-full bg-white/60 backdrop-blur-3xl border border-white/40 p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-amber-500/5 relative"
                    >
                      <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/60 pointer-events-none"></div>
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <DocExportIcon className="h-5 w-5 text-amber-500" /> Draf Belum Selesai
                        </h3>
                      </div>
                      <m.div variants={staggerContainer} initial="hidden" animate="visible" className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 relative z-10">
                        {drafts.map((draft, idx) => (
                          <m.div 
                            variants={historyItemVariants}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={draft.templateId || idx}
                            onClick={() => handleResumeDraft(draft)} 
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer group transition-shadow hover:shadow-md hover:shadow-amber-500/10 hover:ring-1 hover:ring-amber-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md ring-1 ring-amber-100/50">
                                Tersimpan Lokal
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-base group-hover:text-amber-600 truncate mb-1 transition-colors">
                              {draft.trackName}
                            </h4>
                            <p className="text-xs font-bold text-slate-400 group-hover:text-amber-500 flex items-center gap-1.5 transition-colors">
                              Lanjutkan Asesmen <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                            </p>
                          </m.div>
                        ))}
                      </m.div>
                    </m.div>
                  )}

                  {/* HISTORY SECTION */}
                  {history.length > 0 && (
                    <m.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                      className="w-full bg-white/60 backdrop-blur-3xl border border-white/40 p-6 sm:p-8 rounded-[2rem] shadow-2xl shadow-slate-200/40 relative"
                    >
                      <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/60 pointer-events-none"></div>
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <History className="h-5 w-5 text-indigo-600" /> Riwayat Kurasi Anda
                        </h3>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100" title="Terhubung secara real-time ke sistem AI">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Live Sync</span>
                        </div>
                      </div>
                      <m.div variants={staggerContainer} initial="hidden" animate="visible" className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 relative z-10">
                        {history.map((item, idx) => (
                          <m.div 
                            variants={historyItemVariants}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={item.id || idx}
                            onClick={() => onLoadHistory(item)} 
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer group transition-shadow hover:shadow-md hover:shadow-indigo-500/5"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md ring-1 ring-indigo-100/50">
                                {item.trackType}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                <Clock className="h-3 w-3"/> 
                                {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 truncate mb-3 transition-colors">
                              {item.namaUsaha}
                            </h4>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div className="flex items-center gap-1.5">
                                <div className="p-1 bg-emerald-50 rounded-full">
                                  <BrainIcon size={16} className="text-emerald-500"/>
                                </div>
                                <p className="text-xs font-bold text-slate-600">Skor AI: {item.score}</p>
                              </div>
                              <div className="bg-slate-50 p-1.5 rounded-full group-hover:bg-indigo-50 transition-colors">
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              </div>
                            </div>
                          </m.div>
                        ))}
                      </m.div>
                    </m.div>
                  )}
                </>
              )}
            </div>
          )}

          {isCapabilitiesModalOpen && (
            <SystemCapabilitiesModal 
              isOpen={isCapabilitiesModalOpen}
              onClose={() => setIsCapabilitiesModalOpen(false)}
              isLoggedIn={!!user}
            />
          )}

        </div>
      </div>
    </LazyMotion>
  );
}