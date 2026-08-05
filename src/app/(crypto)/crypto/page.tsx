'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Check, ShieldCheck, Lock, Loader2, Bot, Diamond, Activity, CheckCircle2, 
  AlertTriangle, ArrowRight, Brain, Clock, Zap, Target, BookOpen, Layers, BarChart3, 
  HelpCircle, ChevronDown, ChevronUp, Cpu, X, Eye, Rocket, GraduationCap, LineChart, Globe
} from 'lucide-react';
import { LazyMotion, domAnimation, m, Variants } from 'framer-motion';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

const FAQS = [
  {
    q: "Apakah ada garansi atau refund?",
    a: "Karena ini adalah layanan digital yang memberikan akses instan ke analisis dan data berharga, kami tidak menyediakan refund setelah akses diberikan. Anda bisa mencoba tier Gratis terlebih dahulu sebelum memutuskan."
  },
  {
    q: "Apakah analisis AI dijamin 100% akurat?",
    a: "Tidak ada analisis keuangan yang 100% akurat. AI kami memberikan probabilitas, skenario, dan data sentimen, bukan prediksi pasti atau sinyal ajaib. Selalu lakukan riset mandiri (DYOR) dan gunakan manajemen risiko yang baik."
  },
  {
    q: "Apakah fitur Scalping Radar bisa diakses di Premium?",
    a: "Saat ini, Scalping Radar (sinyal live trading eksekusi langsung) hanya tersedia untuk akun Admin / Internal untuk alasan kepatuhan risiko. Namun, Anda tetap mendapatkan notifikasi tren dan 'Danger Zone'."
  },
  {
    q: "Bagaimana cara perpanjang berlangganan?",
    a: "Perpanjangan tidak otomatis. Akses akan berakhir setelah 30 hari, dan Anda dapat membelinya kembali secara manual kapan saja. Tidak ada potongan paksa dari kartu Anda."
  },
  {
    q: "Apakah data saya aman?",
    a: "Sangat aman. Kami menggunakan sistem keamanan berlapis (Firebase Auth & Firestore Rules). Pembayaran diproses oleh Mayar (Payment Gateway terdaftar), kami tidak menyimpan data kartu Anda."
  }
];

export default function PremiumSubscriptionPage() {
  const { user, isPremium, role } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

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
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memproses pembayaran.');
      setLoading(false);
    }
  };

  const isAdmin = role?.startsWith('admin') || user?.email === 'deny.wismoyo@gmail.com';
  const hasAccess = isPremium || isAdmin;

  // Animation variants
  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
        
        {/* Background Ambient */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
        <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none -z-10" />
        <div className="fixed top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none -z-10" />



        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 relative z-10">
          
          {/* 1. HERO SECTION */}
          <m.div 
            initial="hidden" animate="visible" variants={fadeIn}
            className="text-center max-w-4xl mx-auto mb-24"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase tracking-widest border border-indigo-500/20 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Sparkles size={14} /> Berhenti menebak, mulai menganalisa
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-[1.1] tracking-tight text-white">
              Bukan Sekadar Dashboard. Ini adalah <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-sm">AI Hedge Fund Pribadi Anda.</span>
            </h1>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Dapatkan keunggulan <i>unfair advantage</i> di pasar kripto. Akses analisis sentimen real-time, pergerakan paus (smart money), dan AI Copilot yang bekerja 24/7 untuk Anda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/crypto-report')} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25">
                Buka Dashboard Crypto <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }} variant="outline" className="h-12 px-8 rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-white font-bold">
                Lihat Keanggotaan Premium
              </Button>
            </div>
          </m.div>

          {/* 2. KEUNGGULAN (Why Choose Us) */}
          <m.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
            className="mb-32"
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-white mb-4">Mengapa Kami Berbeda?</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Platform lain hanya memberi Anda data mentah. Kami memberikan Anda <b>interpretasi dan tindakan</b>.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Brain className="text-indigo-400" />, title: "Multi-Agent AI", 
                  desc: "Dua model AI bekerja bersama: Analis Kuantitatif meracik data, dan Risk Officer mengevaluasi kelayakannya sebelum sampai ke Anda."
                },
                {
                  icon: <Eye className="text-emerald-400" />, title: "Smart Money Tracker", 
                  desc: "Sistem pelacak paus (whale) yang memantau anomali volume, disajikan secara berkala (tiap 4 jam) agar Anda tahu koin apa yang sedang diakumulasi bandar."
                },
                {
                  icon: <AlertTriangle className="text-rose-400" />, title: "Danger Zone Alerts", 
                  desc: "Peringatan dini terhadap aset berisiko tinggi atau potensi distribusi/dump, membantu melindungi portofolio Anda dari kerugian besar."
                }
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/50 transition-colors">
                  <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 mb-4">{item.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </m.div>

          {/* 3. UNDER THE HOOD (Mesin Intelijen) */}
          <m.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
            className="mb-32"
          >
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/20 rounded-[2rem] p-8 md:p-12">
              <div className="text-center mb-12">
                <Badge variant="outline" className="border-indigo-400/30 text-indigo-300 bg-indigo-500/10 mb-4">Arsitektur Cron Jobs 24/7</Badge>
                <h2 className="text-3xl font-black text-white mb-4">Bagaimana Mesin Intelijen Bekerja?</h2>
                <p className="text-slate-400 max-w-2xl mx-auto">4 Agen AI Otonom kami menscan ratusan indikator di balik layar saat Anda tidur.</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                  <div className="mt-1 w-10 h-10 shrink-0 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400"><Clock size={20} /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">Agent 1: Market Analyst <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full uppercase">Setiap 4 Jam</span></h4>
                    <p className="text-sm text-slate-400 mt-1">Mengumpulkan data dari Binance, CoinGecko, & Makro Global. Membangun Laporan Utama dan proyeksi pergerakan harga 4 jam ke depan.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                  <div className="mt-1 w-10 h-10 shrink-0 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400"><Diamond size={20} /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">Agent 2: Hidden Gem Hunter <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase">Harian 07:00 WIB</span></h4>
                    <p className="text-sm text-slate-400 mt-1">Menscan 50 koin teratas mencari pola oversold (RSI ekstrem) dengan naratif fundamental yang kuat untuk peluang pemantulan tajam.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                  <div className="mt-1 w-10 h-10 shrink-0 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400"><Activity size={20} /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">Agent 3: Smart Money & Risk <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase">Harian 07:15 WIB</span></h4>
                    <p className="text-sm text-slate-400 mt-1">Mendeteksi anomali volume raksasa (paus yang membeli sembunyi-sembunyi) dan mencatat aset dalam Danger Zone (risiko distribusi).</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                  <div className="mt-1 w-10 h-10 shrink-0 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400"><Bot size={20} /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">Agent 4: AI Copilot <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase">On-Demand (Chat)</span></h4>
                    <p className="text-sm text-slate-400 mt-1">Menjawab pertanyaan Anda berdasarkan konteks laporan terbaru. Tidak hanya sekadar ChatGPT, ia tahu persis apa yang sedang terjadi di pasar kripto hari ini.</p>
                  </div>
                </div>
              </div>
            </div>
          </m.div>

          {/* 4. EDUKASI (What we look for) */}
          <m.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
            className="mb-32 grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-3xl font-black text-white mb-6">Edukasikan Diri Anda. <br/>Kuasai Indikator Penting.</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Di pasar kripto, harga tidak bergerak hanya karena fundamental, melainkan karena psikologi massa dan likuiditas. Inilah yang sistem kami ukur secara konstan:
              </p>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <BarChart3 className="text-indigo-400 shrink-0" />
                  <div>
                    <strong className="text-white block">Fear & Greed Index</strong>
                    <span className="text-sm text-slate-400">Warren Buffett berkata: "Takutlah saat orang serakah". Kami memetakan psikologi harian.</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Layers className="text-purple-400 shrink-0" />
                  <div>
                    <strong className="text-white block">Volume Anomaly</strong>
                    <span className="text-sm text-slate-400">Lonjakan volume saat harga diam adalah tanda institusi besar sedang mengakumulasi aset.</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Cpu className="text-rose-400 shrink-0" />
                  <div>
                    <strong className="text-white block">Makro Ekonomi Global</strong>
                    <span className="text-sm text-slate-400">Suku bunga The Fed & data inflasi sangat mempengaruhi likuiditas uang yang masuk ke kripto.</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px]" />
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="text-slate-400" />
                <h3 className="font-bold text-white">Panduan Manajemen Risiko</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-lg text-sm text-slate-300">
                  <strong className="text-red-400">Aturan #1:</strong> Selalu gunakan Stop Loss. Kripto sangat volatil.
                </div>
                <div className="p-3 bg-emerald-950/30 border border-emerald-900/30 rounded-lg text-sm text-slate-300">
                  <strong className="text-emerald-400">Aturan #2:</strong> Gunakan DCA (Beli bertahap) daripada beli semuanya sekaligus.
                </div>
                <div className="p-3 bg-blue-950/30 border border-blue-900/30 rounded-lg text-sm text-slate-300">
                  <strong className="text-blue-400">Aturan #3:</strong> Jangan FOMO mengejar harga koin yang sudah naik +50% dalam sehari.
                </div>
              </div>
            </div>
          </m.div>

          {/* 5. ROADMAP PENGEMBANGAN */}
          <m.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
            className="mb-32"
          >
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-indigo-400/30 text-indigo-300 bg-indigo-500/10 mb-4">Visi Jangka Panjang</Badge>
              <h2 className="text-3xl font-black text-white mb-4">Roadmap Pengembangan Eksklusif</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Kami tidak berhenti di sini. Dengan berlangganan, Anda ikut mendanai pengembangan fitur-fitur revolusioner berikut ini yang akan Anda nikmati tanpa biaya tambahan.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group hover:bg-slate-800/80 transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] group-hover:bg-indigo-500/20 transition-all" />
                <GraduationCap className="w-10 h-10 text-indigo-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Crypto Academy</h3>
                <p className="text-sm text-slate-400">Platform edukasi terstruktur (Pemula ke Pro) dengan sertifikasi. Bukan sekadar sinyal, jadilah trader mandiri.</p>
                <div className="mt-4 text-xs font-bold text-indigo-500 uppercase tracking-wider">Fase 1</div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:bg-slate-800/80 transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] group-hover:bg-purple-500/20 transition-all" />
                <LineChart className="w-10 h-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Personal AI Portfolio</h3>
                <p className="text-sm text-slate-400">AI yang melacak portofolio Anda secara real-time dan memberikan peringatan rebalancing & taking profit.</p>
                <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fase 2</div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:bg-slate-800/80 transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] group-hover:bg-emerald-500/20 transition-all" />
                <Rocket className="w-10 h-10 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">On-Chain Analytics</h3>
                <p className="text-sm text-slate-400">Pelacakan netflow exchange dan wallet paus (whale) langsung dari blockchain untuk mendeteksi pergerakan besar.</p>
                <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fase 3</div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:bg-slate-800/80 transition-all hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[40px] group-hover:bg-rose-500/20 transition-all" />
                <Globe className="w-10 h-10 text-rose-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Mobile App & Alerts</h3>
                <p className="text-sm text-slate-400">Aplikasi native untuk iOS/Android dengan push notifications kustom via Telegram untuk trading tanpa batas.</p>
                <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fase 4</div>
              </div>
            </div>
          </m.div>

          {/* 6. PRICING & COMPARISON */}
          <div id="pricing" className="mb-32 pt-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Pilih Keunggulan Anda</h2>
              <p className="text-slate-400">Akses instan setelah pembayaran. Batalkan kapan saja.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
              
              {/* FREE TIER */}
              <m.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
                className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col"
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Market Explorer</h3>
                  <div className="text-4xl font-black text-white mb-2">Rp 0 <span className="text-lg text-slate-500 font-medium">/ selamanya</span></div>
                  <p className="text-slate-400 text-sm">Coba fitur dasar tanpa risiko.</p>
                </div>
                <div className="space-y-4 flex-1 mb-8">
                  <div className="flex gap-3 text-sm text-slate-300"><Check size={18} className="text-slate-500 shrink-0" /> AI Market Report (Hanya 3 terlama)</div>
                  <div className="flex gap-3 text-sm text-slate-300"><Check size={18} className="text-slate-500 shrink-0" /> Crypto News (Terbatas 5 berita)</div>
                  <div className="flex gap-3 text-sm text-slate-300"><Check size={18} className="text-slate-500 shrink-0" /> Global Economic Calendar</div>
                  <div className="flex gap-3 text-sm text-slate-500"><X size={18} className="shrink-0" /> AI Copilot Chat (Terkunci)</div>
                  <div className="flex gap-3 text-sm text-slate-500"><X size={18} className="shrink-0" /> Hidden Gems Scanner (Terkunci)</div>
                  <div className="flex gap-3 text-sm text-slate-500"><X size={18} className="shrink-0" /> Smart Money & Danger Zone (Terkunci)</div>
                </div>
                <Button onClick={() => router.push('/crypto-report')} variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-white h-12 rounded-xl">
                  Buka Dashboard
                </Button>
              </m.div>

              {/* PREMIUM TIER */}
              <m.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.2 }} variants={fadeIn}
                className="relative bg-slate-900 border border-indigo-500/50 rounded-3xl p-8 flex flex-col shadow-2xl shadow-indigo-900/20"
              >
                <div className="absolute top-0 right-8 -translate-y-1/2">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                    Populer
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent rounded-3xl pointer-events-none" />
                
                <div className="mb-8 relative z-10">
                  <h3 className="text-2xl font-bold text-indigo-400 mb-2">Premium Pass</h3>
                  
                  {/* Package Selector */}
                  <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-indigo-900/30 mb-6 gap-1 relative z-10">
                    <button 
                      onClick={() => setSelectedPackage('MONTHLY')}
                      className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${selectedPackage === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                      1 Bulan
                    </button>
                    <button 
                      onClick={() => setSelectedPackage('QUARTERLY')}
                      className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${selectedPackage === 'QUARTERLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                      3 Bulan
                    </button>
                    <button 
                      onClick={() => setSelectedPackage('YEARLY')}
                      className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all relative ${selectedPackage === 'YEARLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                      1 Tahun
                      <span className="absolute -top-3 -right-2 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black shadow-lg animate-pulse border border-emerald-400">BEST VALUE</span>
                    </button>
                  </div>

                  <div className="flex flex-col min-h-[100px] justify-end">
                    {selectedPackage === 'MONTHLY' && (
                      <>
                        <span className="text-slate-500 line-through text-sm font-medium mb-1">Rp 499.000</span>
                        <div className="text-4xl font-black text-white mb-2">Rp 249.000 <span className="text-lg text-slate-500 font-medium">/ bln</span></div>
                      </>
                    )}
                    {selectedPackage === 'QUARTERLY' && (
                      <>
                        <span className="text-slate-500 line-through text-sm font-medium mb-1">Rp 747.000</span>
                        <div className="text-4xl font-black text-white mb-1">Rp 649.000 <span className="text-lg text-slate-500 font-medium">/ 3 bln</span></div>
                        <div className="text-emerald-400 text-sm font-bold mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Hemat Rp 98.000 <span className="text-slate-400 text-xs font-normal">(Rp 216.333/bln)</span>
                        </div>
                      </>
                    )}
                    {selectedPackage === 'YEARLY' && (
                      <>
                        <span className="text-slate-500 line-through text-sm font-medium mb-1">Rp 2.988.000</span>
                        <div className="text-4xl font-black text-white mb-1">Rp 1.990.000 <span className="text-lg text-slate-500 font-medium">/ thn</span></div>
                        <div className="text-emerald-400 text-sm font-bold mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Hemat Rp 998.000 <span className="text-slate-400 text-xs font-normal">(Rp 165.833/bln)</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-2">Akses penuh ke semua analisis on-chain & AI.</p>
                </div>
                <div className="space-y-4 flex-1 mb-8 relative z-10">
                  <div className="flex gap-3 text-sm text-white font-medium"><Check size={18} className="text-emerald-400 shrink-0" /> Histori Penuh Laporan AI (30 Laporan)</div>
                  <div className="flex gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-400 shrink-0" /> Real-time News (20 Berita)</div>
                  <div className="flex gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-400 shrink-0" /> Global Economic Calendar</div>
                  <div className="flex gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-400 shrink-0" /> Unlimited AI Copilot Chat</div>
                  <div className="flex gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-400 shrink-0" /> Hidden Gems (Daily Scan)</div>
                  <div className="flex gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-400 shrink-0" /> Smart Money & Liquidity Zone</div>
                  <div className="flex gap-3 text-sm text-white font-medium"><Check size={18} className="text-rose-400 shrink-0" /> Danger Zone Alerts</div>
                  <div className="flex gap-3 text-sm text-white font-medium"><Check size={18} className="text-emerald-400 shrink-0" /> Push Notifications Sinyal</div>
                </div>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={loading || (hasAccess && !isAdmin)}
                  className="relative z-10 w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses...</> : hasAccess && !isAdmin ? 'Berlangganan Aktif' : 'Ambil Harga Promo'}
                </Button>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={14} /> Pembayaran aman terenkripsi via Mayar.id
                </div>
              </m.div>
            </div>
          </div>

          {/* 7. FAQ */}
          <m.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="max-w-3xl mx-auto mb-20"
          >
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <HelpCircle className="text-indigo-400" /> Pertanyaan Umum (FAQ)
              </h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-colors hover:border-slate-700">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between font-medium text-slate-200"
                  >
                    {faq.q}
                    {openFaq === idx ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-4 pt-1 text-sm text-slate-400 leading-relaxed border-t border-slate-800/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </m.div>

          {/* 8. DISCLAIMER */}
          <m.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="max-w-4xl mx-auto border-t border-slate-800/50 pt-8 text-center"
          >
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-slate-900/50 border border-slate-800 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <span className="text-amber-500 font-bold text-sm">DISCLAIMER & PERINGATAN RISIKO</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl mx-auto">
              Omnifit Premium (Crypto Intelligence Hub) adalah platform penyedia data analitik dan alat bantu edukasi, <strong>bukan penasihat keuangan (financial advisor)</strong>. Semua laporan, analisis sentimen, proyeksi harga, dan notifikasi yang dihasilkan oleh AI kami bertujuan untuk informasi semata dan tidak dapat dianggap sebagai saran investasi, ajakan membeli, atau menjual aset kripto tertentu. Perdagangan aset kripto memiliki tingkat risiko yang sangat tinggi dan tidak cocok untuk semua investor. Pastikan Anda melakukan riset mandiri (Do Your Own Research) dan mempertimbangkan toleransi risiko Anda sebelum berinvestasi.
            </p>
          </m.div>

        </div>
      </div>
    </LazyMotion>
  );
}
