'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Check, ShieldCheck, Lock, Loader2, Bot, Diamond, Activity, CheckCircle2, 
  AlertTriangle, ArrowRight, Brain, Clock, Zap, Target, BookOpen, Layers, BarChart3, 
  ChevronDown, ChevronUp, Cpu, X, Eye, Rocket, GraduationCap, LineChart, Globe, HelpCircle
} from 'lucide-react';
import { LazyMotion, domAnimation, m, Variants } from 'framer-motion';
import { functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { AppPageContainer } from '@/components/ui/app-layout';
import { ContentCard, SectionLabel } from '@/components/ui/design-system';

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
  const { user, isPremium, role, cryptoTrialUsed } = useAuth();
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

  const handleTrial = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setLoading(true);
    try {
      const activateCryptoTrial = httpsCallable(functions, 'activateCryptoTrial');
      await activateCryptoTrial();
      
      toast.success('Akses Trial 3 Hari Berhasil Diaktifkan!');
    } catch (error: any) {
      console.error('Error activating trial:', error);
      toast.error(error.message || 'Gagal mengaktifkan trial.');
      setLoading(false);
    }
  };

  const isAdmin = role?.startsWith('admin') || user?.email === 'deny.wismoyo@gmail.com';
  const hasAccess = isPremium || isAdmin;

  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <AppPageContainer maxWidth="full" padding="md">
        <m.div initial="hidden" animate="visible" variants={fadeIn} className="text-center max-w-4xl mx-auto mb-20 pt-10">
          <Badge variant="outline" className="mb-6 py-1.5 px-4 rounded-full border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 uppercase tracking-widest text-xs font-bold gap-2">
            <Sparkles size={14} /> Berhenti menebak, mulai menganalisa
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight text-foreground">
            Bukan Sekadar Dashboard. Ini adalah <span className="text-indigo-600 dark:text-indigo-400">AI Hedge Fund Pribadi Anda.</span>
          </h1>
          <p className="text-lg text-muted-foreground dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Dapatkan keunggulan <i>unfair advantage</i> di pasar kripto. Akses analisis sentimen real-time, pergerakan paus (smart money), dan AI Copilot yang bekerja 24/7 untuk Anda.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => router.push('/crypto-report')} size="lg" className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 dark:shadow-indigo-900/50">
              Buka Dashboard Crypto <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button onClick={() => {
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
            }} variant="outline" size="lg" className="h-12 px-8 rounded-xl font-bold">
              Lihat Keanggotaan Premium
            </Button>
          </div>
        </m.div>

        {/* 2. KEUNGGULAN (Why Choose Us) */}
        <m.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-foreground mb-4">Mengapa Kami Berbeda?</h2>
            <p className="text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto">Platform lain hanya memberi Anda data mentah. Kami memberikan Anda <b>interpretasi dan tindakan</b>.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="text-indigo-600 dark:text-indigo-400" />, title: "Multi-Agent AI", 
                desc: "Dua model AI bekerja bersama: Analis Kuantitatif meracik data, dan Risk Officer mengevaluasi kelayakannya sebelum sampai ke Anda."
              },
              {
                icon: <Eye className="text-emerald-600 dark:text-emerald-400" />, title: "Smart Money Tracker", 
                desc: "Sistem pelacak paus (whale) yang memantau anomali volume, disajikan secara berkala agar Anda tahu koin apa yang sedang diakumulasi bandar."
              },
              {
                icon: <AlertTriangle className="text-rose-600 dark:text-rose-400" />, title: "Danger Zone Alerts", 
                desc: "Peringatan dini terhadap aset berisiko tinggi atau potensi distribusi/dump, membantu melindungi portofolio Anda dari kerugian besar."
              }
            ].map((item, i) => (
              <ContentCard key={i} className="text-center flex flex-col items-center p-8 border-slate-200 dark:border-slate-800">
                <div className="w-14 h-14 bg-secondary text-secondary-foreground dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 mb-6">{item.icon}</div>
                <h3 className="text-lg font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </ContentCard>
            ))}
          </div>
        </m.div>

        {/* 3. UNDER THE HOOD (Mesin Intelijen) */}
        <m.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="mb-24">
          <ContentCard className="p-8 md:p-12 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-500/10/50 dark:bg-indigo-950/20">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Arsitektur Cron Jobs 24/7</Badge>
              <h2 className="text-3xl font-black text-foreground mb-4">Bagaimana Mesin Intelijen Bekerja?</h2>
              <p className="text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto">4 Agen AI Otonom kami menscan ratusan indikator di balik layar saat Anda tidur.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: <Clock size={20} />, title: "Agent 1: Market Analyst", tag: "Setiap 4 Jam", desc: "Mengumpulkan data dari Binance, CoinGecko, & Makro Global. Membangun Laporan Utama." },
                { icon: <Diamond size={20} />, title: "Agent 2: Hidden Gem Hunter", tag: "Harian 07:00 WIB", desc: "Menscan 50 koin teratas mencari pola oversold (RSI ekstrem) dengan naratif fundamental yang kuat." },
                { icon: <Activity size={20} />, title: "Agent 3: Smart Money & Risk", tag: "Harian 07:15 WIB", desc: "Mendeteksi anomali volume raksasa dan mencatat aset dalam Danger Zone (risiko distribusi)." },
                { icon: <Bot size={20} />, title: "Agent 4: AI Copilot", tag: "On-Demand (Chat)", desc: "Menjawab pertanyaan Anda berdasarkan konteks laporan terbaru. Tidak hanya sekadar ChatGPT." },
              ].map((agent, idx) => (
                <div key={idx} className="flex gap-4 items-start p-5 card-solid rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="mt-1 w-10 h-10 shrink-0 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {agent.icon}
                  </div>
                  <div>
                    <h4 className="text-foreground font-bold text-base flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      {agent.title} 
                      <Badge variant="secondary" className="w-fit text-[10px]">{agent.tag}</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">{agent.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        </m.div>

        {/* 6. PRICING & COMPARISON */}
        <div id="pricing" className="mb-24 pt-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-foreground mb-4">Pilih Keunggulan Anda</h2>
            <p className="text-muted-foreground dark:text-slate-400">Akses instan setelah pembayaran. Batalkan kapan saja.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
            {/* FREE TIER */}
            <m.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <ContentCard className="p-8 flex flex-col h-full border-slate-200 dark:border-slate-800 bg-background text-foreground">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-foreground mb-2">Market Explorer</h3>
                  <div className="text-4xl font-black text-foreground mb-2">Rp 0 <span className="text-lg text-muted-foreground font-medium">/ selamanya</span></div>
                  <p className="text-muted-foreground dark:text-slate-400 text-sm">Coba fitur dasar tanpa risiko.</p>
                </div>
                <div className="space-y-4 flex-1 mb-8">
                  <div className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> AI Market Report (Hanya 3 terlama)</div>
                  <div className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Crypto News (Terbatas 5 berita)</div>
                  <div className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Global Economic Calendar</div>
                  <div className="flex gap-3 text-sm text-slate-400"><X size={18} className="shrink-0" /> AI Copilot Chat (Terkunci)</div>
                  <div className="flex gap-3 text-sm text-slate-400"><X size={18} className="shrink-0" /> Hidden Gems Scanner (Terkunci)</div>
                  <div className="flex gap-3 text-sm text-slate-400"><X size={18} className="shrink-0" /> Smart Money & Danger Zone (Terkunci)</div>
                </div>
                <Button onClick={() => router.push('/crypto-report')} variant="outline" className="w-full h-12 rounded-xl border-slate-300 dark:border-slate-700">
                  Buka Dashboard
                </Button>
              </ContentCard>
            </m.div>

            {/* TRIAL TIER */}
            <m.div initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.1 }} variants={fadeIn}>
              <ContentCard variant="highlighted" className="p-8 flex flex-col h-full border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-500/10/50 dark:bg-emerald-950/20 relative">
                <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0 hover:bg-emerald-200">1X SEUMUR HIDUP</Badge>
                <div className="mb-8 mt-4">
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Trial 3 Hari</h3>
                  <div className="text-4xl font-black text-foreground mb-2">Rp 0 <span className="text-lg text-muted-foreground font-medium">/ 3 hari</span></div>
                  <p className="text-muted-foreground dark:text-slate-400 text-sm">Rasakan kekuatan AI Hedge Fund secara penuh tanpa kartu kredit.</p>
                </div>
                <div className="space-y-4 flex-1 mb-8">
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> Full Akses Laporan AI (3 Hari)</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> Real-time News</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> Global Economic Calendar</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> AI Copilot Chat (Tanya Apapun)</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> Hidden Gems Scan</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> Peringatan Danger Zone</div>
                </div>
                
                {cryptoTrialUsed ? (
                  <Button disabled variant="outline" className="w-full h-12 rounded-xl">
                    Trial Telah Digunakan
                  </Button>
                ) : (
                  <Button 
                    onClick={handleTrial} 
                    disabled={loading || hasAccess}
                    className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/50"
                  >
                    {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses...</> : hasAccess ? 'Anda Sudah Premium' : 'Coba Gratis 3 Hari'}
                  </Button>
                )}
              </ContentCard>
            </m.div>

            {/* PREMIUM TIER */}
            <m.div initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.2 }} variants={fadeIn}>
              <ContentCard className="p-8 flex flex-col h-full border-indigo-200 dark:border-indigo-800 card-solid relative shadow-xl shadow-indigo-100 dark:shadow-none">
                <Badge className="absolute top-4 right-4 bg-indigo-600 text-white hover:bg-indigo-700">POPULER</Badge>
                
                <div className="mb-6 mt-4">
                  <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">Premium Pass</h3>
                  
                  {/* Package Selector */}
                  <div className="flex bg-secondary text-secondary-foreground dark:bg-background text-foreground p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 gap-1">
                    <button 
                      onClick={() => setSelectedPackage('MONTHLY')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedPackage === 'MONTHLY' ? 'card-solid dark:bg-slate-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      1 Bulan
                    </button>
                    <button 
                      onClick={() => setSelectedPackage('QUARTERLY')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedPackage === 'QUARTERLY' ? 'card-solid dark:bg-slate-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      3 Bulan
                    </button>
                    <button 
                      onClick={() => setSelectedPackage('YEARLY')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${selectedPackage === 'YEARLY' ? 'card-solid dark:bg-slate-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      1 Tahun
                    </button>
                  </div>

                  <div className="flex flex-col min-h-[90px] justify-end">
                    {selectedPackage === 'MONTHLY' && (
                      <>
                        <span className="text-slate-400 line-through text-sm font-medium mb-1">Rp 499.000</span>
                        <div className="text-4xl font-black text-foreground mb-2">Rp 249.000 <span className="text-lg text-muted-foreground font-medium">/ bln</span></div>
                      </>
                    )}
                    {selectedPackage === 'QUARTERLY' && (
                      <>
                        <span className="text-slate-400 line-through text-sm font-medium mb-1">Rp 747.000</span>
                        <div className="text-4xl font-black text-foreground mb-1">Rp 649.000 <span className="text-lg text-muted-foreground font-medium">/ 3 bln</span></div>
                        <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hemat Rp 98.000
                        </div>
                      </>
                    )}
                    {selectedPackage === 'YEARLY' && (
                      <>
                        <span className="text-slate-400 line-through text-sm font-medium mb-1">Rp 2.988.000</span>
                        <div className="text-4xl font-black text-foreground mb-1">Rp 1.990.000 <span className="text-lg text-muted-foreground font-medium">/ thn</span></div>
                        <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hemat Rp 998.000
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground dark:text-slate-400 text-sm mt-2">Akses penuh ke semua analisis on-chain & AI.</p>
                </div>

                <div className="space-y-4 flex-1 mb-8">
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Histori Penuh Laporan AI</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Unlimited AI Copilot Chat</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Hidden Gems (Daily Scan)</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Smart Money & Liquidity Zone</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Danger Zone Alerts</div>
                  <div className="flex gap-3 text-sm font-medium text-foreground"><Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Push Notifications Sinyal</div>
                </div>
                
                <Button 
                  onClick={handleSubscribe} 
                  disabled={loading || (hasAccess && !isAdmin)}
                  className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses...</> : hasAccess && !isAdmin ? 'Berlangganan Aktif' : 'Ambil Harga Promo'}
                </Button>
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
                  <ShieldCheck size={14} /> Pembayaran aman terenkripsi via Mayar.id
                </div>
              </ContentCard>
            </m.div>
          </div>
        </div>

        {/* 7. FAQ */}
        <m.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="max-w-3xl mx-auto mb-20">
          <SectionLabel icon={<HelpCircle className="w-5 h-5" />} className="justify-center mb-8">Pertanyaan Umum (FAQ)</SectionLabel>
          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <ContentCard key={idx} className="p-0 overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between font-medium text-foreground dark:text-slate-100 hover:bg-muted text-muted-foreground dark:hover:card-solid/50 dark:bg-slate-900/50 transition-colors"
                >
                  {faq.q}
                  {openFaq === idx ? <ChevronUp size={18} className="text-muted-foreground shrink-0 ml-4" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0 ml-4" />}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-muted-foreground dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                    {faq.a}
                  </div>
                )}
              </ContentCard>
            ))}
          </div>
        </m.div>

        {/* 8. DISCLAIMER */}
        <m.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="max-w-4xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <Badge variant="outline" className="mb-4 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 gap-2">
            <AlertTriangle className="w-4 h-4" /> DISCLAIMER & PERINGATAN RISIKO
          </Badge>
          <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Omnifit Premium (Crypto Intelligence Hub) adalah platform penyedia data analitik dan alat bantu edukasi, <strong>bukan penasihat keuangan (financial advisor)</strong>. Semua laporan, analisis sentimen, proyeksi harga, dan notifikasi yang dihasilkan oleh AI kami bertujuan untuk informasi semata dan tidak dapat dianggap sebagai saran investasi, ajakan membeli, atau menjual aset kripto tertentu.
          </p>
        </m.div>
      </AppPageContainer>
    </LazyMotion>
  );
}
