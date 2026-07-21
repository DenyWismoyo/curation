// src/app/components/payment/PricingPackages.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react'; 

import { 
  X, Sparkles, CheckCircle2, ArrowRight, Loader2,
  MessageCircle, Users, Share2, Star, Copy, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { User } from 'firebase/auth';
import { toast } from 'sonner';

// IMPORT CUSTOM ICONS
import { 
  AppModuleTealIcon, 
  TechCardIcon, 
  AILensIcon, 
  InfinityWorkflowIcon, 
  BrainIcon, 
  GlobalTargetIcon, 
  AdminShieldIcon,
  AiSparkIcon
} from '@/types';

interface PricingPackagesProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLoginRequest: () => void;
  autoOpenPackageId?: string | null;
}

// FUNGSI TEMA DINAMIS
const getCategoryTheme = (title: string, category: string) => {
  const text = `${title} ${category}`.toLowerCase();
  
  if (text.includes('koperasi') || text.includes('kelurahan') || text.includes('komunitas') || text.includes('hijau') || text.includes('sampah') || text.includes('properti')) {
    return { 
      bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', 
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-white', 
      pill: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
      gradient: 'from-emerald-50/50 to-white'
    };
  }
  if (text.includes('pemerintah') || text.includes('skp') || text.includes('kecamatan') || text.includes('layanan') || text.includes('disposisi') || text.includes('anak') || text.includes('parenting')) {
    return { 
      bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', 
      btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white', 
      pill: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      gradient: 'from-amber-50/50 to-white'
    };
  }
  if (text.includes('riset') || text.includes('akademik') || text.includes('perguruan') || text.includes('techno park') || text.includes('inkubasi') || text.includes('gen z') || text.includes('gen-z') || text.includes('talent')) {
    return { 
      bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200', 
      btn: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20 text-white', 
      pill: 'bg-sky-50 text-sky-600 hover:bg-sky-100',
      gradient: 'from-sky-50/50 to-white'
    };
  }
  if (text.includes('kesehatan') || text.includes('medis') || text.includes('psikologi') || text.includes('mental')) {
    return { 
      bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200', 
      btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white', 
      pill: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
      gradient: 'from-rose-50/50 to-white'
    };
  }

  return { 
    bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200', 
    btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 text-white', 
    pill: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    gradient: 'from-indigo-50/50 to-white'
  };
};

// FUNGSI PARSER UNTUK MEMISAHKAN "JUDUL: DESKRIPSI"
const parseExpectedOutput = (blockStr: string) => {
  if (!blockStr) return { title: '', subs: '' };
  const colonIndex = blockStr.indexOf(':');
  if (colonIndex === -1) return { title: blockStr, subs: '' };
  return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
};

export function PricingPackages({ isOpen, onClose, user, onLoginRequest, autoOpenPackageId }: PricingPackagesProps) {
  const [packages, setPackages] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [checkoutPackage, setCheckoutPackage] = useState<FormTemplate | null>(null);
  
  // State untuk UI animasi saat Link di-copy
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'form_templates'), 
        where('isActive', '==', true), 
        where('isDisplayedOnLanding', '==', true)
      );
      const snap = await getDocs(q);
      const data: FormTemplate[] = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as FormTemplate));
      
      data.sort((a, b) => {
        if (a.isBestSeller === b.isBestSeller) return (a.price || 0) - (b.price || 0);
        return a.isBestSeller ? -1 : 1;
      });
      
      setPackages(data);

      if (autoOpenPackageId) {
        const targetPkg = data.find(p => p.id === autoOpenPackageId);
        if (targetPkg) {
          setCheckoutPackage(targetPkg);
          setActiveCategory(targetPkg.category || 'Semua');
        } else {
           toast.error("Modul yang Anda cari tidak tersedia atau belum tayang.");
        }
      }

    } catch (error) {
      console.error("Gagal memuat katalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDecoy = (pkg: FormTemplate) => {
    if (!user) {
      toast.info("Silakan masuk dengan akun Google Anda terlebih dahulu untuk melanjutkan.");
      onLoginRequest();
      return;
    }

    if (!pkg.isPaid || pkg.price === 0) {
      const autoToken = `FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      sessionStorage.setItem('active_token', autoToken);
    } else {
      const trialToken = `TRIAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      sessionStorage.setItem('active_token', trialToken);
    }
    
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([pkg.id]));
    window.location.href = '/assessment';
  };

  // FUNGSI COPY LINK (Bisa untuk List dan Laci)
  const handleCopyLink = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    
    // Rute yang benar: /katalog?buy=ID
    const shareUrl = `${window.location.origin}/katalog?buy=${id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      toast.success("Tautan Modul Disalin!", {
        description: "Tautan siap dibagikan ke partisipan atau jaringan kolega Anda."
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Gagal menyalin tautan.");
    }
  };

  const categories = ['Semua', ...Array.from(new Set(packages.map(p => p.category?.trim()).filter(Boolean)))];
  const filteredPackages = packages.filter(pkg => activeCategory === 'Semua' || pkg.category === activeCategory);

  const drawerTheme = checkoutPackage ? getCategoryTheme(checkoutPackage.trackName, checkoutPackage.category || '') : getCategoryTheme('', '');
  
  const DrawerIcon = checkoutPackage?.trackIcon && (LucideIcons as any)[checkoutPackage.trackIcon] 
    ? (LucideIcons as any)[checkoutPackage.trackIcon] 
    : AppModuleTealIcon;

  // Rotasi icon untuk membuat daftar output lebih dinamis visualnya
  const OutputIcons = [AILensIcon, InfinityWorkflowIcon, BrainIcon, GlobalTargetIcon];

  return (
    <>
      {/* MODAL KATALOG UTAMA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="main-pricing-modal"
            initial={{ opacity: 0, y: '100%' }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-slate-50 flex flex-col w-full h-[100dvh] overflow-hidden"
          >
            {/* HEADER KATALOG (MINIMALIS & SEAMLESS) */}
            <div className="pt-4 sm:pt-6 px-4 sm:px-8 flex items-center justify-between shrink-0 z-30 relative">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-inner">
                  <TechCardIcon className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Katalog Asesmen</h2>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-900 rounded-full transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB FILTER KATEGORI (STICKY - SLIM & SEAMLESS) */}
            <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md px-4 sm:px-8 py-3 mt-2 border-b border-slate-200/50 shadow-sm">
              <div className="max-w-4xl mx-auto flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={`cat-${cat}`}
                    onClick={() => setActiveCategory(cat as string)}
                    className={`relative px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
                      activeCategory === cat 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* AREA KONTEN SCROLL */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 custom-scrollbar relative z-10">
              <div className="max-w-4xl mx-auto w-full pb-20">
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                    <p className="font-bold text-[11px] uppercase tracking-widest">Memuat Katalog...</p>
                  </div>
                ) : packages.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <TechCardIcon className="w-16 h-16 text-slate-200 mx-auto mb-4 grayscale opacity-50" />
                    <h3 className="text-lg font-black text-slate-700">Katalog Belum Tersedia</h3>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Modul asesmen sedang diperbarui.</p>
                  </div>
                ) : (
                  <>
                    {/* KARTU MODUL (MINIMALIST LIST VIEW) */}
                    <div className="flex flex-col gap-3">
                      <AnimatePresence mode="popLayout">
                        {filteredPackages.map((pkg) => {
                          const theme = getCategoryTheme(pkg.trackName, pkg.category || '');
                          const IconComponent = pkg.trackIcon && (LucideIcons as any)[pkg.trackIcon] 
                            ? (LucideIcons as any)[pkg.trackIcon] 
                            : AppModuleTealIcon;
                          
                          const isCopied = copiedId === pkg.id;

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              key={`pkg-${pkg.id}`}
                              onClick={() => setCheckoutPackage(pkg)}
                              className={`group relative bg-white rounded-2xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer overflow-hidden border border-slate-200 hover:border-${theme.ring.replace('ring-', '')} transition-all shadow-sm hover:shadow-md`}
                            >
                              {/* Background Icon Watermark */}
                              <div className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 pointer-events-none ${theme.text}`}>
                                <IconComponent className="w-full h-full" />
                              </div>

                              {/* Kiri: Icon Kecil */}
                              <div className={`w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center shadow-inner ring-1 ring-inset ${theme.bg} ${theme.text} ${theme.ring} group-hover:scale-105 transition-transform`}>
                                <IconComponent className="w-6 h-6" />
                              </div>

                              {/* Tengah: Informasi Modul (Text Full) */}
                              <div className="flex-1 min-w-0 z-10 py-0.5">
                                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors mb-1.5">
                                  {/* Badge Inline */}
                                  {pkg.isBestSeller && (
                                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm mr-2 align-middle -mt-0.5">
                                      <Star className="w-2.5 h-2.5 fill-white" /> Hot
                                    </span>
                                  )}
                                  {pkg.trackName}
                                </h3>
                                
                                <div className="flex items-center gap-3">
                                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden sm:block">
                                    {pkg.category || 'Asesmen Mandiri'}
                                  </p>
                                  {pkg.userCount && pkg.userCount > 0 && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                      <Users className={`w-3 h-3 ${theme.text}`} /> {pkg.userCount.toLocaleString('id-ID')}+ Pengguna
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Kanan: CTA Minimalis & Share */}
                              <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-10">
                                <button
                                  onClick={(e) => handleCopyLink(e, pkg.id)}
                                  className={`p-2 rounded-full transition-colors flex ${
                                    isCopied ? 'bg-emerald-100 text-emerald-600' : `text-slate-400 hover:${theme.text} hover:${theme.bg}`
                                  }`}
                                  title={isCopied ? "Tersalin!" : "Salin Tautan"}
                                >
                                  {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                </button>
                                
                                <Button
                                  size="sm"
                                  className={`h-9 px-4 sm:px-5 rounded-xl text-xs font-bold shadow-sm transition-all group-hover:shadow-md ${
                                    !pkg.isPaid || pkg.price === 0
                                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                                      : theme.btn
                                  }`}
                                >
                                  Buka
                                </Button>
                              </div>

                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* BANNER ENTERPRISE */}
                    <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:scale-150"></div>
                      
                      <div className="relative z-10 flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[9px] font-black uppercase tracking-widest mb-2">
                          <AiSparkIcon size={12} /> Custom Enterprise
                        </div>
                        <h3 className="text-lg font-black text-white mb-1">Butuh Modul Khusus?</h3>
                        <p className="text-slate-300 font-medium text-xs sm:text-sm leading-relaxed max-w-md">
                          Rancang formulir matriks asesmen eksklusif dan terintegrasi untuk kebutuhan Korporasi atau Institusi Anda.
                        </p>
                      </div>
                      <div className="relative z-10 shrink-0 w-full md:w-auto">
                        <a 
                          href="https://wa.me/6285777117587?text=Halo%20Admin%20Omnifit,%20saya%20tertarik%20untuk%20berdiskusi%20mengenai%20pembuatan%20modul%20asesmen%20custom." 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl text-sm font-bold transition-all shadow-md"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Hubungi Tim Kami
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LACI (DRAWER) KONFIRMASI CHECKOUT MODUL */}
      <AnimatePresence>
        {checkoutPackage && (
          <React.Fragment key="checkout-drawer-fragment">
            <motion.div 
              key="checkout-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCheckoutPackage(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[200]"
            />
            
            <motion.div 
              key="checkout-drawer-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-white z-[210] shadow-2xl flex flex-col border-l border-slate-100"
            >
              {/* Header Laci */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md">
                <div>
                  <h3 className="font-black text-xl text-slate-900">Ringkasan Modul</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{checkoutPackage.category}</p>
                </div>
                <button onClick={() => setCheckoutPackage(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Laci */}
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ${drawerTheme.bg} ${drawerTheme.text} ${drawerTheme.ring}`}>
                    <DrawerIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 mb-1 leading-tight">{checkoutPackage.trackName}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{checkoutPackage.trackDescription}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* === AREA FITUR BARU: SHARE BOX === */}
                  <div className="bg-slate-50 p-4 rounded-3xl ring-1 ring-slate-200">
                    <h5 className="text-[11px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Share2 size={14} className="text-slate-400" /> Tautkan & Bagikan Modul
                    </h5>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex-1 truncate px-2 text-xs font-mono font-medium text-slate-500 select-all">
                        {`${window.location.origin}/katalog?buy=${checkoutPackage.id}`}
                      </div>
                      <Button
                        onClick={(e) => handleCopyLink(e, checkoutPackage.id)}
                        className={`h-8 px-4 rounded-lg text-xs font-bold transition-all shrink-0 ${
                          copiedId === checkoutPackage.id 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-slate-900 text-white hover:bg-indigo-600'
                        }`}
                      >
                        {copiedId === checkoutPackage.id ? (
                          <><Check className="w-3.5 h-3.5 mr-1" /> Disalin</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5 mr-1" /> Salin</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* ================================== */}

                  {/* === AREA BENEFIT DINAMIS (EXPECTED OUTPUTS) === */}
                  <div className={`${drawerTheme.bg} p-5 rounded-3xl ring-1 ${drawerTheme.ring} bg-opacity-40`}>
                    <h5 className={`text-[11px] font-black ${drawerTheme.text} uppercase tracking-widest mb-4 flex items-center gap-2`}>
                      <AiSparkIcon size={16} /> Nilai Tambah Untuk Anda
                    </h5>
                    <ul className="space-y-4">
                      {checkoutPackage.expectedOutputs && checkoutPackage.expectedOutputs.length > 0 ? (
                        // Render Dinamis Berdasarkan Data dari TabGeneral
                        checkoutPackage.expectedOutputs.map((item, idx) => {
                          const { title, subs } = parseExpectedOutput(item);
                          const DynamicIcon = OutputIcons[idx % OutputIcons.length]; // Merotasi ikon agar bervariasi
                          
                          return (
                            <li key={idx} className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                                <DynamicIcon size={20} className={drawerTheme.text} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 mb-0.5">{title || item}</p>
                                {subs && (
                                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {subs}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        // Fallback Jika Modul Belum Punya Expected Outputs Custom
                        <>
                          <li className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                              <AILensIcon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 mb-0.5">Sistem Deteksi Dini</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Mendiagnosa akar masalah, potensi tersembunyi, dan area <span className="italic">blind-spot</span> secara objektif.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                              <InfinityWorkflowIcon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 mb-0.5">Menutup Kesenjangan (Gap)</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Menghilangkan kebingungan dengan memetakan jarak antara realita Anda saat ini dengan tujuan ideal.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                              <GlobalTargetIcon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 mb-0.5">Cetak Biru (Blueprint) Solusi</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Anda akan menerima panduan taktis dan rekomendasi langkah konkret yang siap dieksekusi.
                              </p>
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                  {/* ============================================== */}

                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <AdminShieldIcon size={22} />
                    </div>
                    <p className="text-[11px] font-medium text-emerald-700/80 leading-relaxed">
                      <strong className="text-emerald-800">Garansi Keamanan.</strong> Sesi Anda diamankan secara lokal. Input Anda tidak akan dikirim ke server kami sebelum Anda menekan tombol konfirmasi.
                    </p>
                  </div>

                </div>
              </div>

              {/* Footer Laci */}
              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <Button 
                  onClick={() => {
                    handleStartDecoy(checkoutPackage);
                    setCheckoutPackage(null);
                  }} 
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-base hover:bg-indigo-600 shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 group"
                >
                  Mulai Sesi Sekarang <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </>
  );
}