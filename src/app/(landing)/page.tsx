'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, m, Variants } from 'framer-motion';
import { 
  BrainCircuit, BookOpenText, LineChart, ArrowRight, HeartPulse, 
  Baby, Store, GraduationCap, Lightbulb, 
  CheckCircle2, AlertTriangle, Eye, Diamond,
  Activity, Bot, Lock, ExternalLink, Handshake, 
  FlaskConical, Menu, X, UserPlus, FileText, Brain, Zap, ShoppingCart, Building2, Crown, Users
} from 'lucide-react';
import { SafeLogo } from '@/components/layout/SafeLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';

// New Enterprise Components
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { TechStackBar } from '@/components/landing/TechStackBar';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import { GradientBadge } from '@/components/landing/GradientBadge';
import { FloatingCard } from '@/components/landing/FloatingCard';
import { ThemeToggleCompact } from '@/components/ui/ThemeToggleCompact';

// Data Constants
const PROBLEMS = [
  {
    id: 1,
    icon: BrainCircuit,
    color: 'indigo' as const,
    title: 'Asesmen Pasif Tanpa Aksi',
    desc: 'Laporan asesmen seringkali berhenti sebagai dokumen pasif. Tidak ada insight yang langsung bisa ditindaklanjuti.',
    target: 'Individu, HR, Institusi',
  },
  {
    id: 2,
    icon: LineChart,
    color: 'amber' as const,
    title: 'Analisis Kripto Eksklusif',
    desc: 'Data analisis pasar kripto berkualitas tinggi terlalu mahal untuk trader ritel atau seringkali terlalu generik.',
    target: 'Trader Indonesia',
  },
  {
    id: 3,
    icon: BookOpenText,
    color: 'emerald' as const,
    title: 'Riset Mendalam yang Manual',
    desc: 'Menyusun riset ratusan halaman masih mengandalkan proses manual yang lambat, rentan bias, dan tidak konsisten.',
    target: 'Konsultan, Peneliti',
  }
];

const STEPS = [
  { id: 1, title: 'Daftar & Pilih Produk', desc: 'Pilih dari tiga produk AI sesuai dengan kebutuhan personal atau bisnis Anda.', icon: UserPlus, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 2, title: 'Input Data / Ikuti Asesmen', desc: 'Jawab pertanyaan adaptif, hubungkan wallet, atau unggah dokumen riset mentah.', icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { id: 3, title: 'AI Menganalisis', desc: 'Multi-Agent AI Pipeline kami memproses data dalam hitungan menit secara akurat.', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 4, title: 'Eksekusi Keputusan', desc: 'Dapatkan action plan, sinyal trading, atau laporan riset yang siap Anda gunakan hari ini.', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

export default function LandingHubPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pricingTier, setPricingTier] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  // Handle scroll for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  // Animation variants
  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };
  
  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-background font-sans selection:bg-indigo-500/30 text-muted-foreground scroll-smooth">
        
        {/* Premium Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
          <div className="absolute top-[30%] -right-[10%] w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[100px] mix-blend-screen opacity-50" />
          <div className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[70vw] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen opacity-40" />
        </div>

        {/* Cursor tracking subtle overlay (Optional touch) */}
        <div className="noise-overlay" />

        {/* SEC-01: NAVBAR KHUSUS LANDING (Scroll Aware) */}
        <header 
          id="navbar" 
          className={cn(
            "fixed top-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto w-full transition-all duration-500",
            scrolled ? "bg-background/90 backdrop-blur-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 border-b border-border py-3 sm:py-4" : "bg-transparent py-4 sm:py-6 border-b border-transparent"
          )}
        >
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleNavigation('/')}>
            <div className="w-10 h-10 card-solid backdrop-blur-md rounded-xl flex items-center justify-center border border-border shadow-2xl group-hover:border-indigo-500/50 transition-colors p-1">
              <SafeLogo src="/logo.png" alt="Omnifit Logo" width={24} height={24} className="object-contain w-full h-full" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground group-hover:text-indigo-400 transition-colors">
              Omnifit<span className="text-foreground/50 font-medium">.cloud</span>
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground">
            <a href="#cara-kerja" className="hover:text-foreground hover:border-b-2 hover:border-indigo-500 pb-1 transition-all">Cara Kerja</a>
            <a href="#produk" className="hover:text-foreground hover:border-b-2 hover:border-indigo-500 pb-1 transition-all">Produk</a>
            <a href="#harga" className="hover:text-foreground hover:border-b-2 hover:border-indigo-500 pb-1 transition-all">Harga</a>
            <a href="#tim" className="hover:text-foreground hover:border-b-2 hover:border-indigo-500 pb-1 transition-all">Tim</a>
            <a href="#kontak" className="hover:text-foreground hover:border-b-2 hover:border-indigo-500 pb-1 transition-all">Kontak</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <ThemeToggleCompact />
            {user ? (
              <Button onClick={() => handleNavigation('/assessment')} variant="outline" className="border-border card-solid text-foreground hover:bg-muted font-bold">
                Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => handleNavigation('/login')} variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted font-bold">
                  Login
                </Button>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-500 group-hover:duration-200"></div>
                  <Button onClick={() => handleNavigation('/assessment')} className="relative bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl animate-shimmer overflow-hidden">
                    <span className="relative z-10 flex items-center">Mulai Gratis</span>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button aria-label="Toggle menu" className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed top-[72px] left-0 right-0 bg-background/95 backdrop-blur-3xl border-b border-border z-40 p-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-foreground">Tema Visual</span>
              <ThemeToggleCompact variant="pill" />
            </div>
             <a href="#cara-kerja" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-foreground">Cara Kerja</a>
             <a href="#produk" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-foreground">Produk</a>
             <a href="#harga" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-foreground">Harga</a>
             <a href="#tim" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-foreground">Tim</a>
             <a href="#kontak" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-foreground">Kontak</a>
             <div className="h-px bg-slate-800 my-2" />
             {user ? (
              <Button onClick={() => { handleNavigation('/assessment'); setMobileMenuOpen(false); }} className="w-full h-12 text-lg">Dashboard</Button>
             ) : (
              <div className="flex flex-col gap-3">
                <Button onClick={() => { handleNavigation('/login'); setMobileMenuOpen(false); }} variant="outline" className="w-full h-12 text-lg">Login</Button>
                <Button onClick={() => { handleNavigation('/assessment'); setMobileMenuOpen(false); }} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold">Mulai Gratis</Button>
              </div>
             )}
          </div>
        )}

        <main className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto hide-scrollbar pt-24 pb-20">
          
          {/* SEC-02: HERO SECTION (Upgraded) */}
          <section id="hero" className="flex flex-col items-center justify-center px-4 sm:px-6 py-20 md:py-32 max-w-5xl mx-auto text-center relative">
            <m.div initial="hidden" animate="visible" variants={fadeIn}>
              <GradientBadge variant="live" className="mb-8">
                Platform AI Ekosistem · Indonesia
              </GradientBadge>
              
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-foreground tracking-tighter mb-8 leading-[1.1]">
                Satu Ekosistem AI untuk <br className="hidden md:block" />
                <span className="text-gradient-primary">
                  Keputusan yang Lebih Baik.
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto mb-10">
                Dari evaluasi diri dan pemetaan talenta SDM, analisis mendalam pasar kripto secara real-time, hingga riset berstandar akademis — semuanya dalam satu platform AI yang terintegrasi.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                 <div className="relative group w-full sm:w-auto">
                   <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-500 group-hover:duration-200 animate-border-spin"></div>
                   <Button aria-label="Mulai Gratis" onClick={() => handleNavigation('/assessment')} className="relative w-full sm:w-auto h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-2xl shadow-indigo-500/25 animate-shimmer overflow-hidden">
                      <span className="relative z-10 flex items-center">Mulai Gratis <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></span>
                   </Button>
                 </div>
                 <Button aria-label="Lihat Produk" onClick={() => { document.getElementById('produk')?.scrollIntoView({ behavior: 'smooth' }); }} variant="outline" className="h-14 px-8 rounded-xl card-solid border-border text-foreground font-bold text-lg hover:bg-slate-800 hover:text-white transition-colors group w-full sm:w-auto">
                    Lihat Produk <ArrowRight className="w-5 h-5 ml-2 rotate-90 group-hover:translate-y-1 transition-transform" />
                 </Button>
              </div>

              {/* Floating Stat Pills */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-8 opacity-80">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground dark:text-slate-400 bg-card/50 dark:bg-card dark:bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border dark:border-slate-800 animate-float" style={{ animationDelay: '0s' }}>
                  <BrainCircuit className="w-4 h-4 text-indigo-400" /> <AnimatedCounter value={33} suffix="+" /> Template AI
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground dark:text-slate-400 bg-card/50 dark:bg-card dark:bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border dark:border-slate-800 animate-float" style={{ animationDelay: '1s' }}>
                  <Activity className="w-4 h-4 text-emerald-400" /> 99.9% Uptime
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground dark:text-slate-400 bg-card/50 dark:bg-card dark:bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border dark:border-slate-800 animate-float" style={{ animationDelay: '2s' }}>
                  <Users className="w-4 h-4 text-amber-400" /> Multi-Agent Engine
                </div>
              </div>
            </m.div>
          </section>

          {/* TECH STACK BAR (New) */}
          <TechStackBar />

          {/* SEC-03: PROBLEM STATEMENT (Upgraded with SpotlightCard) */}
          <section id="masalah" className="py-24 md:py-32 px-4 max-w-6xl mx-auto w-full">
            <m.div className="text-center mb-16" variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Masalah yang Kami Selesaikan</div>
              <h2 className="text-3xl md:text-5xl font-black text-foreground">Tiga Masalah Nyata. Satu Ekosistem.</h2>
            </m.div>
            
            <m.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              {PROBLEMS.map((p, idx) => (
                <m.div key={p.id} variants={fadeIn} className="h-full">
                  <SpotlightCard color={p.color} className="h-full flex flex-col relative z-10">
                    <div className="absolute -bottom-6 -right-4 text-[10rem] font-black opacity-[0.03] leading-none select-none pointer-events-none z-0">
                      0{idx + 1}
                    </div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${p.color}-500/10 border border-${p.color}-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                        <p.icon className={`w-7 h-7 text-${p.color}-400`} />
                      </div>
                      <GradientBadge variant="default" className="bg-card dark:bg-slate-900 border-border dark:border-slate-700">#0{idx + 1}</GradientBadge>
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-4 relative z-10">{p.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed mb-8 relative z-10 flex-1">{p.desc}</p>
                    <div className="mt-auto relative z-10 pt-4 border-t border-border dark:border-slate-800/50">
                      <span className="text-xs font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider">
                        Target: <span className="text-foreground dark:text-slate-300">{p.target}</span>
                      </span>
                    </div>
                  </SpotlightCard>
                </m.div>
              ))}
            </m.div>
          </section>

          {/* SEC-06: HOW IT WORKS (Upgraded timeline) */}
          <section id="cara-kerja" className="py-24 px-4 bg-background/50 dark:bg-background dark:bg-slate-950/50 border-y border-border dark:border-slate-800/50 w-full relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            
            <m.div className="max-w-6xl mx-auto relative z-10" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              <m.div className="text-center mb-20" variants={fadeIn}>
                <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Cara Kerja Omnifit</div>
                <h2 className="text-3xl md:text-5xl font-black text-foreground">Dari Masalah ke Keputusan dalam 4 Langkah</h2>
              </m.div>

              <div className="relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden md:block absolute top-[48px] left-[12%] right-[12%] h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-emerald-500/0 z-0 border-t border-dashed border-slate-600" />
                
                {/* Vertical Connector Line (Mobile) */}
                <div className="md:hidden absolute top-[48px] bottom-[48px] left-[48px] w-px bg-gradient-to-b from-indigo-500/20 via-indigo-500/50 to-emerald-500/20 z-0 border-l border-dashed border-slate-600" />
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative z-10">
                  {STEPS.map((step, idx) => (
                    <m.div key={step.id} variants={fadeIn} className="flex flex-row md:flex-col items-center md:text-center gap-6 md:gap-0">
                      <div className="relative group shrink-0">
                        <div className={`absolute inset-0 bg-current opacity-20 rounded-[2rem] blur-xl group-hover:opacity-40 transition-opacity ${step.color}`}></div>
                        <div className={`w-24 h-24 rounded-[2rem] ${step.bg} border border-border dark:border-slate-700/80 flex items-center justify-center md:mb-8 relative z-10 backdrop-blur-md group-hover:scale-105 transition-transform`}>
                          <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-8 h-8 md:w-10 md:h-10 rounded-xl bg-card dark:bg-slate-900 border border-border dark:border-slate-700 flex items-center justify-center text-sm font-black text-white shadow-xl">
                            {step.id}
                          </div>
                          <step.icon className={`w-10 h-10 ${step.color}`} />
                        </div>
                      </div>
                      
                      <div className="flex-1 md:w-full">
                        <h4 className="text-xl font-black text-foreground mb-3">{step.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed md:px-4">{step.desc}</p>
                      </div>
                    </m.div>
                  ))}
                </div>
              </div>
            </m.div>
          </section>

          {/* SEC-04: PRODUK BENTO GRID (Polished) */}
          <section id="produk" className="py-24 md:py-32 px-4 max-w-5xl mx-auto w-full">
            <m.div className="text-center mb-16" variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
               <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Eksplorasi Katalog</div>
               <h2 className="text-3xl md:text-5xl font-black text-foreground">Produk-Produk Omnifit</h2>
            </m.div>
            
            <m.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              
              {/* Card 1: Self Service AI */}
              <FloatingCard
                variants={fadeIn}
                className="md:col-span-2 group relative rounded-[2.5rem] bg-card/60 dark:bg-card dark:bg-slate-900/60 backdrop-blur-2xl border border-border dark:border-slate-700/50 hover:border-indigo-500/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)] flex flex-col md:flex-row hover:-translate-y-2"
                onClick={() => handleNavigation('/assessment')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="p-8 md:p-12 flex flex-col flex-1 relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <BrainCircuit className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:-rotate-45 transition-all duration-500 shadow-md">
                      <ArrowRight className="w-6 h-6 text-muted-foreground dark:text-slate-400 group-hover:text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <GradientBadge>B2C · B2B · B2G</GradientBadge>
                      <GradientBadge className="bg-slate-800/50 border-border dark:border-slate-700/50">Rp 97.500 – 500.000 / template</GradientBadge>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black text-foreground mb-3">Self Service AI</h3>
                    <p className="font-bold text-indigo-400 mb-6 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                      <AnimatedCounter value={33} suffix="+" /> Template AI Tersedia
                    </p>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
                      Platform evaluasi interaktif dengan modul siap pakai untuk berbagai kebutuhan. Dapatkan Readiness Score dan Action Plan spesifik yang bisa langsung dieksekusi.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-background/50 dark:bg-background dark:bg-slate-950/50 border border-border dark:border-slate-800/80 group-hover:border-indigo-500/30 transition-colors shadow-sm">
                        <HeartPulse className="w-6 h-6 text-rose-400 shrink-0" />
                        <span className="text-sm font-bold text-foreground">Kesehatan Mental & Diri</span>
                      </div>
                      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-background/50 dark:bg-background dark:bg-slate-950/50 border border-border dark:border-slate-800/80 group-hover:border-indigo-500/30 transition-colors shadow-sm">
                        <Baby className="w-6 h-6 text-sky-400 shrink-0" />
                        <span className="text-sm font-bold text-foreground">Parenting & Keluarga</span>
                      </div>
                      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-background/50 dark:bg-background dark:bg-slate-950/50 border border-border dark:border-slate-800/80 group-hover:border-indigo-500/30 transition-colors shadow-sm">
                        <Lightbulb className="w-6 h-6 text-amber-400 shrink-0" />
                        <span className="text-sm font-bold text-foreground">Startup & Inovasi</span>
                      </div>
                      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-background/50 dark:bg-background dark:bg-slate-950/50 border border-border dark:border-slate-800/80 group-hover:border-indigo-500/30 transition-colors shadow-sm">
                        <Store className="w-6 h-6 text-emerald-400 shrink-0" />
                        <span className="text-sm font-bold text-foreground">UMKM & Bisnis</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FloatingCard>

              {/* Card 2: Crypto Insight */}
              <FloatingCard
                variants={fadeIn}
                className="md:col-span-1 group relative rounded-[2.5rem] bg-card/60 dark:bg-card dark:bg-slate-900/60 backdrop-blur-2xl border border-border dark:border-slate-700/50 hover:border-amber-500/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(245,158,11,0.2)] hover:-translate-y-2"
                onClick={() => handleNavigation('/crypto')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Animated scan line */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-scan blur-sm" />
                </div>

                <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-inner group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                      <LineChart className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:-rotate-45 transition-all duration-500 shadow-md">
                      <ArrowRight className="w-6 h-6 text-muted-foreground dark:text-slate-400 group-hover:text-slate-950" />
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex flex-wrap gap-2 mb-6">
                      <GradientBadge variant="premium" icon={Lock}>Premium Subscription</GradientBadge>
                      <GradientBadge className="bg-slate-800/50 border-border dark:border-slate-700/50">Mulai Rp 249rb/bln</GradientBadge>
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-4">Crypto Intelligence Hub</h3>
                    <p className="text-base text-muted-foreground leading-relaxed mb-8">
                      AI Hedge Fund pribadi Anda. Dapatkan notifikasi sinyal, pantau smart money, dan hindari bahaya di pasar kripto real-time.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-sm font-bold text-foreground bg-background/50 dark:bg-background dark:bg-slate-950/50 p-3.5 rounded-xl border border-border dark:border-slate-800/80 group-hover:border-amber-500/30 transition-colors"><Eye className="w-5 h-5 text-amber-500" /> Smart Money Tracking</div>
                      <div className="flex items-center gap-3 text-sm font-bold text-foreground bg-background/50 dark:bg-background dark:bg-slate-950/50 p-3.5 rounded-xl border border-border dark:border-slate-800/80 group-hover:border-amber-500/30 transition-colors"><Diamond className="w-5 h-5 text-cyan-500" /> Hidden Gems Scanner</div>
                      <div className="flex items-center gap-3 text-sm font-bold text-foreground bg-background/50 dark:bg-background dark:bg-slate-950/50 p-3.5 rounded-xl border border-border dark:border-slate-800/80 group-hover:border-amber-500/30 transition-colors"><Activity className="w-5 h-5 text-rose-500" /> Self-Correction AI</div>
                      <div className="flex items-center gap-3 text-sm font-bold text-foreground bg-background/50 dark:bg-background dark:bg-slate-950/50 p-3.5 rounded-xl border border-border dark:border-slate-800/80 group-hover:border-amber-500/30 transition-colors"><Bot className="w-5 h-5 text-indigo-400" /> AI Copilot Chat 24/7</div>
                    </div>
                  </div>
                </div>
              </FloatingCard>

              {/* Card 3: Study Workspace */}
              <FloatingCard
                variants={fadeIn}
                className="md:col-span-1 group relative rounded-[2.5rem] bg-card/60 dark:bg-card dark:bg-slate-900/60 backdrop-blur-2xl border border-border dark:border-slate-700/50 hover:border-emerald-500/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(16,185,129,0.2)] hover:-translate-y-2"
                onClick={() => handleNavigation('/study')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      <BookOpenText className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:-rotate-45 transition-all duration-500 shadow-md">
                      <ArrowRight className="w-6 h-6 text-muted-foreground dark:text-slate-400 group-hover:text-slate-950" />
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="mb-6">
                      <GradientBadge icon={Lock} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/20">Restricted — Tim Riset</GradientBadge>
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-4">Study Workspace</h3>
                    <p className="text-base text-muted-foreground leading-relaxed mb-8">
                      Ruang kerja riset mendalam. Menghasilkan laporan terstruktur 50–200 halaman berstandar akademis dalam hitungan menit, bukan minggu.
                    </p>
                    
                    <div className="p-5 bg-background/80 dark:bg-background dark:bg-slate-950/80 rounded-2xl border border-border dark:border-slate-800 group-hover:border-emerald-500/30 relative overflow-hidden transition-colors shadow-inner">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 blur-[30px]" />
                      <p className="text-xs font-mono text-emerald-400 mb-4">{'>'} Pipeline Eksekusi Multi-Agent</p>
                      <ul className="text-sm font-bold text-foreground space-y-3 relative z-10">
                        <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1. Architect (Struktur Utama)</li>
                        <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2. Planner (Drafting per-bab)</li>
                        <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3. Writer (Penulisan Konten)</li>
                        <li className="flex items-center gap-3"><Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> 4. Auditor (Quality Control)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </FloatingCard>

            </m.div>
          </section>

          {/* SEC-07: PRICING SNAPSHOT (Polished) */}
          <section id="harga" className="py-24 md:py-32 px-4 max-w-6xl mx-auto w-full">
            <m.div className="text-center mb-16" variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Fleksibel & Transparan</div>
              <h2 className="text-3xl md:text-5xl font-black text-foreground mb-8">Pilih Paket yang Tepat untuk Anda</h2>
              
              {/* Animated Toggle */}
              <div className="inline-flex items-center p-1 bg-card dark:bg-slate-900 rounded-full border border-border dark:border-slate-800 shadow-inner">
                {['monthly', 'quarterly', 'annual'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setPricingTier(tier as 'monthly' | 'quarterly' | 'annual')}
                    className={cn(
                      "px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
                      pricingTier === tier ? "bg-amber-500 text-slate-950 shadow-md" : "text-muted-foreground dark:text-slate-400 hover:text-white"
                    )}
                  >
                    {tier === 'monthly' ? 'Bulanan' : tier === 'quarterly' ? '3 Bulan' : 'Tahunan'}
                  </button>
                ))}
              </div>
            </m.div>

            <m.div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              
              {/* Pricing 1: B2C Assessment */}
              <m.div variants={fadeIn} className="rounded-[2.5rem] bg-card/40 dark:bg-card dark:bg-slate-900/40 backdrop-blur-md border border-border dark:border-slate-700/50 p-8 flex flex-col h-full hover:border-indigo-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10">
                <GradientBadge className="mb-6 self-start bg-slate-800">B2C · Individual</GradientBadge>
                <h3 className="text-2xl font-black text-foreground mb-2">Self Service AI</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-black text-indigo-400">Rp 97k</span>
                  <span className="text-muted-foreground text-sm font-medium pb-1.5">– 500k</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">Harga per template, sekali bayar.</p>
                
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> 33+ template AI tersedia</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Readiness score & action plan personal</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Laporan PDF bisa diunduh</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" /> Cocok untuk evaluasi psikologi & karir</li>
                </ul>
                <Button onClick={() => handleNavigation('/assessment')} variant="outline" className="w-full h-12 card-solid border-border font-bold text-base hover:bg-slate-800 hover:text-white">Lihat Katalog</Button>
              </m.div>

              {/* Pricing 2: Crypto Premium */}
              <m.div variants={fadeIn} className="rounded-[2.5rem] bg-card/80 dark:bg-card dark:bg-slate-900/80 backdrop-blur-xl border-2 border-amber-500/50 p-8 md:p-10 flex flex-col h-full transform md:-translate-y-4 shadow-2xl glow-amber relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-[40px] pointer-events-none" />
                
                <GradientBadge variant="premium" icon={Crown} className="mb-6 self-start">
                  Most Popular
                </GradientBadge>
                
                <h3 className="text-2xl font-black text-foreground mb-2">Crypto Intelligence</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-black text-amber-400">
                    Rp {pricingTier === 'monthly' ? '249k' : pricingTier === 'quarterly' ? '649k' : '1.99M'}
                  </span>
                  <span className="text-muted-foreground text-sm font-medium pb-1.5">
                    / {pricingTier === 'monthly' ? 'bulan' : pricingTier === 'quarterly' ? '3 bln' : 'tahun'}
                  </span>
                </div>
                <p className="text-sm text-amber-200/70 mb-8 font-medium">Akses penuh ke seluruh fitur intelijen AI.</p>
                
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-start gap-3 text-sm text-foreground font-bold"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Laporan AI Market setiap 4 jam</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-bold"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Tracking Smart Money & Danger Zone</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-bold"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> AI Copilot Chat khusus kripto (24/7)</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-bold"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Kalender makro ekonomi AI-enhanced</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-bold"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Push notification real-time</li>
                </ul>
                <Button onClick={() => handleNavigation('/crypto')} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-slate-950 text-base font-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-shadow">Mulai Premium</Button>
              </m.div>

              {/* Pricing 3: Enterprise */}
              <m.div variants={fadeIn} className="rounded-[2.5rem] bg-card/40 dark:bg-card dark:bg-slate-900/40 backdrop-blur-md border border-border dark:border-slate-700/50 p-8 flex flex-col h-full hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
                <GradientBadge className="mb-6 self-start bg-slate-800">B2B · Organisasi</GradientBadge>
                <h3 className="text-2xl font-black text-foreground mb-2">Enterprise Plan</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-black text-emerald-400">Custom</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">Harga disesuaikan skala perusahaan.</p>
                
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> HR Dashboard & Action Tracker</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Pemetaan talenta lintas divisi</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Multi-role access (Leader, HR)</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Audit log enterprise-grade</li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Tersedia Pilot Program Gratis</li>
                </ul>
                <Button onClick={() => { document.getElementById('kontak')?.scrollIntoView({ behavior: 'smooth' }); }} variant="outline" className="w-full h-12 card-solid border-border font-bold text-base hover:bg-slate-800 hover:text-white">Hubungi Tim Sales</Button>
              </m.div>

            </m.div>
          </section>

          {/* SEC-08: TIM / ABOUT (Upgraded Avatar) */}
          <section id="tim" className="py-24 md:py-32 px-4 max-w-6xl mx-auto w-full border-t border-border dark:border-slate-800/50">
            <m.div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}>
              <m.div variants={fadeIn}>
                <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">TIM DI BALIK OMNIFIT</div>
                <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">Dibangun oleh orang yang memahami masalahnya.</h2>
                <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                  <p>
                    Omnifit lahir dari pengalaman langsung melihat bagaimana keputusan krusial dalam pengembangan SDM, analisis pasar finansial, dan penyusunan riset seringkali terhambat oleh proses manual yang tidak efisien.
                  </p>
                  <p>
                    Kami percaya bahwa teknologi AI mutakhir dapat menyelesaikan masalah tersebut—bukan dengan menggantikan peran manusia, melainkan dengan memberdayakan mereka melalui data dan wawasan yang terstruktur untuk mengambil keputusan yang lebih baik dan cepat.
                  </p>
                </div>
              </m.div>
              
              <m.div variants={fadeIn} className="rounded-[3rem] bg-card/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-border dark:border-white/5 p-10 shadow-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
                 <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors" />
                 
                 {/* Premium Avatar Ring */}
                 <div className="relative w-24 h-24 mb-8">
                   <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 animate-border-spin blur-md opacity-70"></div>
                   <div className="absolute inset-1 bg-card dark:bg-slate-900 rounded-full z-10 flex items-center justify-center border border-border dark:border-slate-700">
                     <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400">DW</span>
                   </div>
                 </div>
                 
                 <h3 className="text-3xl font-black text-foreground mb-1">Deny W.</h3>
                 <p className="text-base text-indigo-500 dark:text-indigo-400 font-bold mb-8 uppercase tracking-widest">Founder & CEO</p>
                 
                 <p className="text-base text-muted-foreground dark:text-slate-300 leading-relaxed mb-8 font-medium">
                   Memiliki pengalaman luas dalam mengintegrasikan teknologi ke dalam solusi bisnis praktis. Berkomitmen untuk membawa standar analitik tingkat enterprise kepada individu dan organisasi melalui arsitektur Multi-Agent AI yang kuat.
                 </p>
                 
                 <div className="flex flex-wrap gap-3 mb-8">
                   <GradientBadge>AI / ML</GradientBadge>
                   <GradientBadge>Human Capital</GradientBadge>
                   <GradientBadge>Product Strategy</GradientBadge>
                 </div>
                 
                 <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white transition-colors bg-background/50 dark:bg-slate-950/50 px-4 py-2 rounded-xl border border-border dark:border-slate-800 hover:border-muted-foreground dark:hover:border-slate-600">
                   <ExternalLink size={16} /> Connect on LinkedIn
                 </a>
              </m.div>
            </m.div>
          </section>

          {/* SEC-09: MISSION & VISION (Upgraded Typography) */}
          <section id="tentang" className="py-32 px-4 bg-background dark:bg-slate-950 border-t border-border dark:border-slate-800/50 w-full relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1200px] pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-[100%] blur-[80px]" />
            </div>

            <m.div className="max-w-6xl mx-auto relative z-10" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
              <m.div className="text-center max-w-4xl mx-auto mb-20" variants={fadeIn}>
                <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-8">TENTANG OMNIFIT.CLOUD</div>
                <h2 className="text-3xl md:text-5xl font-black text-foreground leading-[1.3] text-glow-indigo">
                  "Memberdayakan individu, organisasi, dan institusi di Indonesia untuk mengambil <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">keputusan berbasis data</span> — bukan intuisi."
                </h2>
              </m.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <m.div variants={fadeIn} className="flex flex-col gap-5 glass-card p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                    <ShoppingCart className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h4 className="text-xl font-black text-foreground">B2C Template</h4>
                  <p className="text-base text-muted-foreground leading-relaxed">Individu membeli template asesmen untuk mendapatkan action plan personal yang siap dieksekusi hari itu juga tanpa perlu ke konsultan.</p>
                </m.div>

                <m.div variants={fadeIn} className="flex flex-col gap-5 glass-card p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <Building2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h4 className="text-xl font-black text-foreground">B2B Enterprise</h4>
                  <p className="text-base text-muted-foreground leading-relaxed">Organisasi mengakses dashboard SDM berbasis data untuk membuat keputusan akuisisi dan pengembangan talenta yang jauh lebih cepat dan akurat.</p>
                </m.div>

                <m.div variants={fadeIn} className="flex flex-col gap-5 glass-card p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                    <LineChart className="w-7 h-7 text-amber-400" />
                  </div>
                  <h4 className="text-xl font-black text-foreground">Premium Subscription</h4>
                  <p className="text-base text-muted-foreground leading-relaxed">Trader kripto berlangganan intelijen pasar AI untuk mendapatkan kualitas analisis institusional dengan harga yang sangat terjangkau.</p>
                </m.div>
              </div>
            </m.div>
          </section>

          {/* SEC-10: INVESTOR CTA (Command Center Style) */}
          <section id="kontak" className="py-32 px-4 max-w-6xl mx-auto w-full relative">
            <m.div 
              className="rounded-[3rem] bg-card dark:bg-slate-900 border border-white/10 p-10 md:p-20 text-center relative overflow-hidden shadow-2xl"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
            >
              {/* Mesh Gradient Background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)]" />
              <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-80 shadow-[0_0_20px_rgba(129,140,248,0.5)]" />
              
              <div className="relative z-10">
                <GradientBadge className="mb-8">3 Produk AI Aktif · Gross Margin 96%</GradientBadge>
                
                <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
                  Mari Bangun Ekosistem AI <br/> Indonesia Bersama.
                </h2>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-16 font-medium">
                  Kami selalu terbuka untuk diskusi mengenai investasi, strategic partnership, maupun integrasi B2B untuk organisasi Anda.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                  <div className="bg-background dark:bg-slate-950/60 backdrop-blur-xl rounded-3xl p-8 border border-white/5 hover:border-indigo-500/30 transition-all text-left hover:-translate-y-1">
                    <Handshake className="w-10 h-10 text-indigo-400 mb-6" />
                    <h4 className="text-xl font-black text-foreground mb-3">Strategic Partnership</h4>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">Integrasikan kapabilitas AI Omnifit ke dalam sistem internal perusahaan Anda secara seamless.</p>
                  </div>
                  <div className="bg-background dark:bg-slate-950/60 backdrop-blur-xl rounded-3xl p-8 border border-white/5 hover:border-amber-500/30 transition-all text-left hover:-translate-y-1">
                    <LineChart className="w-10 h-10 text-amber-400 mb-6" />
                    <h4 className="text-xl font-black text-foreground mb-3">Investment Inquiry</h4>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">Jadilah bagian dari revolusi platform AI yang mandiri, profitable, dan memiliki fondasi yang kuat.</p>
                  </div>
                  <div className="bg-background dark:bg-slate-950/60 backdrop-blur-xl rounded-3xl p-8 border border-white/5 hover:border-emerald-500/30 transition-all text-left hover:-translate-y-1">
                    <FlaskConical className="w-10 h-10 text-emerald-400 mb-6" />
                    <h4 className="text-xl font-black text-foreground mb-3">Pilot Program</h4>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">Institusi atau korporasi yang ingin melakukan uji coba terbatas tanpa komitmen besar di awal.</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                   <a href="mailto:hello@omnifit.cloud" aria-label="Kirim Email" className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] flex items-center gap-3 w-full sm:w-auto transition-all justify-center hover:-translate-y-1">
                      📧 Hubungi hello@omnifit.cloud
                   </a>
                   <a href="https://wa.me/" aria-label="WhatsApp Kami" target="_blank" rel="noopener noreferrer" className="h-16 px-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg border border-border dark:border-slate-700 hover:border-slate-500 flex items-center gap-3 w-full sm:w-auto transition-all justify-center hover:-translate-y-1">
                      💬 Chat via WhatsApp
                   </a>
                </div>
              </div>
            </m.div>
          </section>

        </main>
        
        {/* SEC-11: FOOTER LENGKAP (Polished) */}
        <footer className="relative z-10 pt-20 pb-10 border-t border-border dark:border-slate-800/80 bg-[#020617]">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Kolom 1: Brand */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 card-solid rounded-xl flex items-center justify-center p-1 border-border dark:border-slate-700 bg-card dark:bg-slate-900">
                  <SafeLogo src="/logo.png" alt="Omnifit Logo" width={24} height={24} />
                </div>
                <span className="text-xl font-black tracking-tight text-foreground">
                  Omnifit.cloud
                </span>
              </div>
              <p className="text-base text-muted-foreground dark:text-slate-400 leading-relaxed mb-8 pr-4">
                Satu ekosistem AI terpadu untuk evaluasi diri, intelijen kripto, dan riset akademik/bisnis.
              </p>
              <GradientBadge>🇮🇩 Made in Indonesia</GradientBadge>
            </div>

            {/* Kolom 2: Produk */}
            <div>
              <h4 className="text-sm font-black text-white mb-6 uppercase tracking-wider">Produk</h4>
              <ul className="space-y-4 text-base text-muted-foreground dark:text-slate-400 font-medium">
                <li><a href="#produk" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Self Service AI</a></li>
                <li><a href="#produk" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Crypto Intelligence Hub</a></li>
                <li><a href="#produk" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Study Workspace</a></li>
                <li><a href="#kontak" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">B2B Enterprise</a></li>
              </ul>
            </div>

            {/* Kolom 3: Perusahaan */}
            <div>
              <h4 className="text-sm font-black text-white mb-6 uppercase tracking-wider">Perusahaan</h4>
              <ul className="space-y-4 text-base text-muted-foreground dark:text-slate-400 font-medium">
                <li><a href="#tim" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Tentang Tim</a></li>
                <li><a href="#masalah" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Misi Kami</a></li>
                <li><a href="#kontak" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Partnership & Inquiries</a></li>
              </ul>
            </div>

            {/* Kolom 4: Legal & Kontak */}
            <div>
              <h4 className="text-sm font-black text-white mb-6 uppercase tracking-wider">Legal & Bantuan</h4>
              <ul className="space-y-4 text-base text-muted-foreground dark:text-slate-400 font-medium">
                <li><a href="#" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-indigo-400 hover:translate-x-1 inline-block transition-transform">Disclaimer Risiko</a></li>
                <li className="pt-4 border-t border-border dark:border-slate-800/50 mt-4">
                  <a href="mailto:hello@omnifit.cloud" className="text-indigo-400 font-bold hover:text-indigo-300">hello@omnifit.cloud</a>
                </li>
              </ul>
            </div>

          </div>
          
          <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-border dark:border-slate-800/80 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm font-medium text-slate-500">
              &copy; {new Date().getFullYear()} Omnifit.cloud Ecosystem. All rights reserved.
            </p>
            <p className="text-sm font-medium text-slate-600">
              Platform Evaluasi dan Analitik AI.
            </p>
          </div>
        </footer>

      </div>
    </LazyMotion>
  );
}
