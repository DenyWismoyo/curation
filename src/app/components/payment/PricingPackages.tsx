// src/app/components/payment/PricingPackages.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react'; 
import { 
  X, Sparkles, CheckCircle2, ArrowRight, Loader2, LayoutGrid, ShieldCheck, 
  MessageCircle, Users, Target, BrainCircuit, Route, Activity, Compass,
  Share2, Star // <-- Import ikon Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { User } from 'firebase/auth';
import { toast } from 'sonner';

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

export function PricingPackages({ isOpen, onClose, user, onLoginRequest, autoOpenPackageId }: PricingPackagesProps) {
  const [packages, setPackages] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [checkoutPackage, setCheckoutPackage] = useState<FormTemplate | null>(null);

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

  // FUNGSI SHARE DENGAN WEB SHARE API (UNTUK HP) & CLIPBOARD (UNTUK DESKTOP)
  const handleSharePackage = async (e: React.MouseEvent, pkg: FormTemplate) => {
    e.stopPropagation(); 
    if (typeof window === 'undefined') return;

    const shareUrl = `${window.location.origin}/?buy=${pkg.id}`;
    const shareData = {
      title: `Omnifit: ${pkg.trackName}`,
      text: `Mari deteksi dini potensi dan akar masalah Anda dengan modul asesmen "${pkg.trackName}" di platform Omnifit. Coba sekarang!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link berhasil disalin ke clipboard!", {
          description: "Silakan paste (Ctrl+V) link tersebut ke WhatsApp atau media sosial Anda."
        });
      } catch (error) {
        toast.error("Gagal menyalin link.");
      }
    }
  };

  const categories = ['Semua', ...Array.from(new Set(packages.map(p => p.category?.trim()).filter(Boolean)))];
  const filteredPackages = packages.filter(pkg => activeCategory === 'Semua' || pkg.category === activeCategory);

  const drawerTheme = checkoutPackage ? getCategoryTheme(checkoutPackage.trackName, checkoutPackage.category || '') : getCategoryTheme('', '');
  const DrawerIcon = checkoutPackage?.trackIcon && (LucideIcons as any)[checkoutPackage.trackIcon] ? (LucideIcons as any)[checkoutPackage.trackIcon] : LayoutGrid;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: '100%' }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-slate-50 flex flex-col w-full h-[100dvh] overflow-hidden"
      >
        <div className="bg-white h-16 sm:h-20 px-4 sm:px-8 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Katalog Modul Asesmen</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full pb-20">
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                <p className="font-bold text-sm uppercase tracking-widest">Memuat Katalog...</p>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-300">
                <LayoutGrid className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-700">Katalog Belum Tersedia</h3>
                <p className="text-slate-500 mt-2 font-medium">Modul asesmen sedang dalam tahap pembaruan.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-8 custom-scrollbar justify-center">
                  {categories.map((cat, idx) => (
                    <button
                      key={cat || `cat-fallback-${idx}`}
                      onClick={() => setActiveCategory(cat as string)}
                      className="relative px-6 py-2.5 rounded-full text-sm font-bold transition-colors outline-none"
                    >
                      {activeCategory === cat && (
                        <motion.div 
                          layoutId="activeCategoryTab" 
                          className="absolute inset-0 bg-slate-900 rounded-full shadow-md"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${activeCategory === cat ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                        {cat}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  <AnimatePresence mode="popLayout">
                    {filteredPackages.map((pkg, idx) => {
                      const theme = getCategoryTheme(pkg.trackName, pkg.category || '');
                      const IconComponent = pkg.trackIcon && (LucideIcons as any)[pkg.trackIcon] ? (LucideIcons as any)[pkg.trackIcon] : LayoutGrid;

                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          key={pkg.id || `pkg-fallback-${idx}`} 
                          className={`bg-gradient-to-br ${theme.gradient} rounded-3xl p-6 lg:p-8 ring-1 flex flex-col transition-all relative group overflow-visible ${
                            pkg.isBestSeller ? 'ring-amber-400 shadow-[0_8px_30px_rgb(245,158,11,0.12)]' : `ring-slate-200 hover:${theme.ring} shadow-sm hover:shadow-xl`
                          }`}
                        >
                          <div className="flex-1">
                            {/* Header Kartu: Icon Modul, Badge & Tombol Share */}
                            <div className="flex items-start justify-between mb-6">
                              <div className={`w-14 h-14 ${theme.bg} ${theme.text} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ring-1 ${theme.ring}`}>
                                <IconComponent className="w-7 h-7" />
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* BADGE STAR UNTUK TERPOPULER */}
                                {pkg.isBestSeller && (
                                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-full shadow-sm ring-1 ring-orange-300/50">
                                    <Star className="w-3.5 h-3.5 fill-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Terpopuler</span>
                                  </div>
                                )}
                                <button
                                  onClick={(e) => handleSharePackage(e, pkg)}
                                  className={`p-2.5 rounded-full transition-all duration-300 bg-slate-50 text-slate-400 hover:${theme.bg} hover:${theme.text} hover:ring-1 hover:${theme.ring} active:scale-95`}
                                  title="Bagikan ke WhatsApp/Sosmed"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <h3 className="text-xl lg:text-2xl font-black text-slate-900 leading-snug mb-4 pr-8">
                              {pkg.trackName}
                            </h3>
                            
                            {pkg.userCount && pkg.userCount > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                <Users className={`w-3.5 h-3.5 ${theme.text}`} /> Dipercaya oleh {pkg.userCount.toLocaleString('id-ID')}+ Entitas
                              </div>
                            )}
                            
                            {pkg.customUSPs && pkg.customUSPs.length > 0 && (
                              <div className="group/tooltip relative mt-4 inline-block">
                                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full cursor-help transition-colors ${theme.pill}`}>
                                  <Sparkles className="w-3.5 h-3.5" /> Lihat Benefit Eksklusif
                                </div>
                                
                                <div className="absolute bottom-full left-0 mb-3 w-64 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 translate-y-2 pointer-events-none transition-all duration-300 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.3)] z-20 border border-slate-700">
                                  {pkg.customUSPs.map((usp, uIdx) => (
                                    <div key={`usp-${uIdx}`} className="flex items-start gap-2.5 mb-2.5 last:mb-0 text-xs font-medium">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                      <span className="leading-relaxed">{usp}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="pt-6 border-t border-slate-200/50 mt-auto">
                            <Button 
                              onClick={() => setCheckoutPackage(pkg)}
                              className={`w-full h-14 rounded-2xl font-bold text-base shadow-md transition-all group-hover:shadow-xl mt-2 ${
                                !pkg.isPaid || pkg.price === 0 
                                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                  : theme.btn
                              }`}
                            >
                              Mulai Diagnosa Sekarang <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="mt-10 bg-slate-900 rounded-[2rem] p-8 lg:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-all group-hover:scale-150 group-hover:bg-indigo-500/30"></div>
                  
                  <div className="relative z-10 max-w-2xl text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-indigo-500/30 mb-4">
                      <Sparkles className="w-3.5 h-3.5" /> Enterprise & Corporate
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 leading-tight">Butuh Modul Spesifik?</h3>
                    <p className="text-slate-300 font-medium text-sm lg:text-base leading-relaxed">
                      Jika Anda mewakili Korporasi, Institusi, atau Tim Curator yang memiliki kebutuhan matriks evaluasi khusus, tim kami siap merancang formulir secara eksklusif dan privat khusus untuk kebutuhan Anda.
                    </p>
                  </div>
                  <div className="relative z-10 shrink-0 w-full md:w-auto">
                    <a
                      href="https://wa.me/6285777117587?text=Halo%20Admin%20Omnifit,%20saya%20tertarik%20untuk%20berdiskusi%20mengenai%20pembuatan%20modul%20asesmen%20custom."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#25D366]/20"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Request Custom Form
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {checkoutPackage && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCheckoutPackage(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[200]"
            />
            
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-white z-[210] shadow-2xl flex flex-col border-l border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md">
                <div>
                  <h3 className="font-black text-xl text-slate-900">Ringkasan Modul</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{checkoutPackage.category}</p>
                </div>
                <button onClick={() => setCheckoutPackage(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                  {/* VALUE PROPOSITION BOX MENGGUNAKAN WARNA TEMA */}
                  <div className={`${drawerTheme.bg} p-5 rounded-3xl ring-1 ${drawerTheme.ring} bg-opacity-40`}>
                    <h5 className={`text-[11px] font-black ${drawerTheme.text} uppercase tracking-widest mb-4 flex items-center gap-2`}>
                      <Sparkles className="w-4 h-4" /> Nilai Tambah Untuk Anda
                    </h5>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-0.5">Sistem Deteksi Dini</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Mendiagnosa akar masalah, potensi tersembunyi, dan area <span className="italic">blind-spot</span> secara objektif sebelum berkembang menjadi kendala nyata.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <Route className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-0.5">Menutup Kesenjangan (Gap)</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Menghilangkan kebingungan dengan memetakan jarak antara realita Anda saat ini dengan tujuan ideal yang ingin dicapai.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-0.5">Evaluasi Adaptif & Personal</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Instrumen cerdas yang menyesuaikan pertanyaan dengan konteks unik Anda, layaknya berkonsultasi langsung dengan ahlinya.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-0.5">Cetak Biru (Blueprint) Solusi</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Bukan sekadar skor angka, Anda akan menerima panduan taktis dan rekomendasi langkah konkret yang siap dieksekusi.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* TRUST BADGE */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-emerald-700/80 leading-relaxed">
                      <strong className="text-emerald-800">Garansi Keamanan.</strong> Sesi Anda diamankan secara lokal. Input Anda tidak akan dikirim ke server kami sebelum Anda menekan tombol konfirmasi pada tahap akhir.
                    </p>
                  </div>
                </div>
              </div>

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
          </>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}