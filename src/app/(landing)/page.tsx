'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, m, Variants } from 'framer-motion';
import { 
  BrainCircuit, BookOpenText, LineChart, ArrowRight, HeartPulse, 
  Baby, Store, GraduationCap, Lightbulb, Check, 
  ShieldCheck, Loader2, CheckCircle2, X, AlertTriangle, Eye, Diamond,
  Activity, Bot, Lock
} from 'lucide-react';
import { SafeLogo } from '@/components/layout/SafeLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

export default function LandingHubPage() {
  const router = useRouter();
  const { user, isPremium, role } = useAuth();
  
  // State for Pricing
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    let packageId = 'CRYPTO_PREMIUM_MONTHLY';
    let packageName = 'Premium Pass - Akses Penuh Kecerdasan Kripto';
    let finalPrice = 249000;

    if (selectedPackage === 'QUARTERLY') {
      packageId = 'CRYPTO_PREMIUM_QUARTERLY';
      packageName = 'Premium Pass (3 Bulan)';
      finalPrice = 649000;
    } else if (selectedPackage === 'YEARLY') {
      packageId = 'CRYPTO_PREMIUM_YEARLY';
      packageName = 'Premium Pass (1 Tahun)';
      finalPrice = 1990000;
    }

    setLoading(true);
    try {
      const createInvoice = httpsCallable(functions, 'createPaymentInvoice');
      const response = await createInvoice({
        packageId,
        packageName,
        finalPrice,
        userEmail: user.email,
        userName: user.displayName || 'Pengguna',
      });
      
      const data = response.data as { transactionId: string };
      if (data.transactionId) {
        router.push(`/checkout/${data.transactionId}`);
      } else {
        toast.error('Gagal membuat tagihan, silakan coba lagi.');
        setLoading(false);
      }
    } catch (error: unknown) {
      console.error('Error creating payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses pembayaran.';
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const isAdmin = role?.startsWith('admin') || user?.email === 'deny.wismoyo@gmail.com';
  const hasAccess = isPremium || isAdmin;

  // Animation variants
  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };
  
  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#020617] font-sans selection:bg-indigo-500/30 text-slate-300">
        
        {/* Premium Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
          <div className="absolute top-[30%] -right-[10%] w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[100px] mix-blend-screen opacity-50" />
          <div className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[70vw] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen opacity-40" />
        </div>

        {/* Navbar */}
        <header className="relative z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleNavigation('/')}>
            <div className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-2xl group-hover:border-indigo-500/50 transition-colors">
              <SafeLogo src="/logo.png" alt="Omnifit Logo" width={24} height={24} />
            </div>
            <span className="text-xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              Omnifit<span className="text-white/50 font-medium">.cloud</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => router.push('/assessment')} variant="outline" className="hidden sm:flex border-white/10 bg-white/5 text-white hover:bg-white/10">
                Dashboard
              </Button>
            ) : (
              <Button onClick={() => router.push('/login')} variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                Login
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 py-12 md:py-20 w-full overflow-y-auto no-scrollbar">
          
          {/* HERO SECTION */}
          <m.div 
            initial="hidden" animate="visible" variants={fadeIn}
            className="text-center max-w-4xl mb-16 md:mb-24"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black tracking-widest uppercase mb-8 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Keren Omnifit.cloud Ecosystem
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[1.1]">
              Satu Ekosistem, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 drop-shadow-sm">
                Tiga Otak AI.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              Platform intelijen terpadu. Dari evaluasi psikologi personal, analisis mendalam pasar kripto secara real-time, hingga asisten riset berstandar akademis.
            </p>
            <div className="flex justify-center">
               <Button onClick={() => handleNavigation('/assessment')} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25 group">
                  Mulai Evaluasi Diri <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </m.div>

          {/* BENTO GRID */}
          <m.div 
            variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full mx-auto mb-32"
          >
            
            {/* Card 1: Self Service AI */}
            <m.div
              variants={fadeIn}
              className="md:col-span-2 group relative rounded-[2.5rem] bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 hover:border-indigo-500/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)] flex flex-col md:flex-row"
              onClick={() => handleNavigation('/assessment')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="p-8 md:p-10 flex flex-col flex-1 relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <BrainCircuit className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:-rotate-45 transition-all duration-500">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
                
                <div>
                  <div className="inline-block px-3 py-1 mb-4 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
                    Public & Premium Access
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4">Self Service AI</h2>
                  <p className="text-slate-400 leading-relaxed mb-8">
                    Platform evaluasi interaktif dengan modul siap pakai untuk berbagai kebutuhan. AI kami beradaptasi dengan profil Anda untuk memberikan wawasan yang mendalam.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                      <HeartPulse className="w-5 h-5 text-rose-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200">Kesehatan Mental & Diri</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                      <Baby className="w-5 h-5 text-sky-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200">Parenting & Keluarga</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                      <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200">Startup & Inovasi</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                      <Store className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200">UMKM & Bisnis</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 group-hover:border-indigo-500/30 transition-colors md:col-span-2">
                      <GraduationCap className="w-5 h-5 text-purple-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200">Zona Gen Z & Karir</span>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>

            {/* Card 2: Crypto Insight */}
            <m.div
              variants={fadeIn}
              className="md:col-span-1 group relative rounded-[2.5rem] bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 hover:border-amber-500/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(245,158,11,0.2)]"
              onClick={() => handleNavigation('/crypto')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                    <LineChart className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white group-hover:-rotate-45 transition-all duration-500">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                    <Lock size={12} /> Premium Data
                  </div>
                  <h2 className="text-2xl font-black text-white mb-3">Crypto Insight</h2>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Bukan sekadar dashboard. Ini adalah AI Hedge Fund pribadi Anda untuk keunggulan di pasar kripto.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5"><Eye className="w-4 h-4 text-amber-500" /> Smart Money Tracking</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5"><AlertTriangle className="w-4 h-4 text-rose-500" /> Danger Zone Alerts</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5"><Diamond className="w-4 h-4 text-cyan-500" /> Hidden Gems Scanner</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5"><Bot className="w-4 h-4 text-indigo-400" /> AI Copilot Chat 24/7</div>
                  </div>
                </div>
              </div>
            </m.div>

            {/* Card 3: Study Workspace */}
            <m.div
              variants={fadeIn}
              className="md:col-span-1 group relative rounded-[2.5rem] bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 hover:border-emerald-500/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(16,185,129,0.2)]"
              onClick={() => handleNavigation('/study')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <BookOpenText className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white group-hover:-rotate-45 transition-all duration-500">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                    <Lock size={12} /> Restricted Access
                  </div>
                  <h2 className="text-2xl font-black text-white mb-3">Study Workspace</h2>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Ruang kerja riset mendalam dengan Multi-Agent AI (Architect, Writer, Auditor) terintegrasi dengan Knowledge Base Anda. Menghasilkan laporan terstruktur hingga ratusan halaman.
                  </p>
                  
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/20 blur-[20px]" />
                    <p className="text-xs font-mono text-emerald-400 mb-2">{'>'} Pipeline Eksekusi...</p>
                    <ul className="text-xs text-slate-300 space-y-1.5">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ingestion PDF / Dokumen</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Penyusunan Outline Riset</li>
                      <li className="flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-500 animate-pulse" /> Drafting & Audit (Paralel)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </m.div>

          </m.div>

        </main>
        
        {/* Footer */}
        <footer className="relative z-10 py-8 text-center border-t border-white/5 bg-[#020617]">
          <p className="text-xs font-medium text-slate-600">
            &copy; {new Date().getFullYear()} Omnifit.cloud Ecosystem. All rights reserved.
          </p>
        </footer>
      </div>
    </LazyMotion>
  );
}
