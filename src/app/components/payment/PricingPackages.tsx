// src/app/components/payment/PricingPackages.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, CheckCircle2, ArrowRight, Loader2, LayoutGrid, ShieldCheck, MessageCircle, Clock, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { User } from 'firebase/auth';
import { toast } from 'sonner';

// KOMPONEN TIMER COUNTDOWN
const CountdownTimer = ({ targetDateIso }: { targetDateIso: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const target = new Date(targetDateIso).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDateIso]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.d === 0 && timeLeft.h < 3;

  return (
    <div className={`flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border ${
      isUrgent ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-rose-50 text-rose-600 border-rose-100'
    }`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {isUrgent ? 'Promo Segera Hangus: ' : 'Promo Berakhir: '}
        {timeLeft.d}h {timeLeft.h}j {timeLeft.m}m {timeLeft.s}d
      </span>
    </div>
  );
}

interface PricingPackagesProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLoginRequest: () => void;
}

export function PricingPackages({ isOpen, onClose, user, onLoginRequest }: PricingPackagesProps) {
  const [packages, setPackages] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    } catch (error) {
      console.error("Gagal memuat katalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (pkg: FormTemplate, finalPrice: number, isDiscountActive: boolean) => {
    if (!user) {
      toast.info("Silakan masuk dengan akun Google Anda terlebih dahulu untuk melanjutkan.");
      onLoginRequest();
      return;
    }

    setProcessingId(pkg.id);
    
    try {
      if (!pkg.isPaid || pkg.price === 0) {
        toast.success(`Memulai asesmen ${pkg.trackName}...`);
        const autoToken = `FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        sessionStorage.setItem('active_token', autoToken);
        sessionStorage.setItem('active_allowed_templates', JSON.stringify([pkg.id]));
        window.location.href = '/assessment'; 
        return;
      }

      const adminWhatsApp = "6285777117587";
      const hargaText = isDiscountActive 
        ? `~Rp ${pkg.price?.toLocaleString('id-ID')}~ -> *Rp ${finalPrice.toLocaleString('id-ID')}* (Diskon ${pkg.discountPercentage}%)`
        : `*Rp ${pkg.price?.toLocaleString('id-ID')}*`;
        
      const bookingCode = `BKG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // PERUBAHAN BRANDING: Sapaan Admin Omnifit
      const message = `Halo Admin Omnifit,%0A%0ASaya ingin *MENGAMANKAN AKSES* untuk modul asesmen:%0A*Modul:* ${pkg.trackName}%0A*Kode Booking:* ${bookingCode}%0A*Harga:* ${hargaText}%0A%0A*Data Akun Saya:*%0A- Nama: ${user.displayName}%0A- Email: ${user.email}%0A%0AMohon instruksi pembayaran. Terima kasih.`;
        
      const waUrl = `https://wa.me/${adminWhatsApp}?text=${message}`;
      window.open(waUrl, '_blank');

    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan.");
    } finally {
      setProcessingId(null);
    }
  };

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
        {/* HEADER MODAL */}
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
            title="Tutup Katalog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* KONTEN (PRICING CARDS) */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  {packages.map((pkg) => {
                    let isDiscountActive = Boolean(pkg.isPaid && (pkg.discountPercentage || 0) > 0);
                    if (isDiscountActive && pkg.discountExpiry) {
                      if (new Date(pkg.discountExpiry).getTime() < new Date().getTime()) {
                        isDiscountActive = false; 
                      }
                    }

                    const finalPrice = isDiscountActive 
                      ? (pkg.price || 0) - ((pkg.price || 0) * (pkg.discountPercentage! / 100))
                      : (pkg.price || 0);

                    return (
                      <div 
                        key={pkg.id} 
                        className={`bg-white rounded-3xl p-6 lg:p-8 ring-1 flex flex-col transition-all relative group overflow-hidden ${
                          pkg.isBestSeller ? 'ring-amber-400 shadow-[0_8px_30px_rgb(245,158,11,0.12)]' : 'ring-slate-200 hover:ring-indigo-300 shadow-sm hover:shadow-xl'
                        }`}
                      >
                        {pkg.isBestSeller && (
                          <div className="absolute top-6 right-[-40px] bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-12 py-1.5 shadow-md z-10 rotate-45 flex items-center justify-center">
                            Terpopuler
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-7 h-7" />
                          </div>
                          
                          <h3 className="text-xl lg:text-2xl font-black text-slate-900 leading-snug mb-4 pr-8">
                            {pkg.trackName}
                          </h3>

                          {pkg.userCount && pkg.userCount > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                              <Users className="w-3.5 h-3.5 text-indigo-500" /> Dipercaya oleh {pkg.userCount.toLocaleString('id-ID')}+ Entitas
                            </div>
                          )}
                          
                          {pkg.customUSPs && pkg.customUSPs.length > 0 && (
                            <div className="space-y-3.5 mb-8">
                              {pkg.customUSPs.map((usp, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-800 font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{usp}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-6 border-t border-slate-100 mt-auto">
                          <div className="mb-5">
                            {!pkg.isPaid || pkg.price === 0 ? (
                              <span className="text-3xl font-black text-emerald-600">Gratis</span>
                            ) : (
                              <div>
                                {isDiscountActive && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-400 line-through">
                                      Rp {pkg.price?.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-[10px] font-black text-white bg-rose-500 px-2 py-0.5 rounded uppercase tracking-wider">
                                      Hemat {pkg.discountPercentage}%
                                    </span>
                                  </div>
                                )}
                                
                                <div className="flex items-baseline gap-1">
                                  <span className={`text-xl font-bold ${isDiscountActive ? 'text-rose-400' : 'text-slate-400'}`}>Rp</span>
                                  <span className={`text-4xl font-black tracking-tight ${isDiscountActive ? 'text-rose-600' : 'text-slate-900'}`}>
                                    {finalPrice.toLocaleString('id-ID')}
                                  </span>
                                </div>
                                
                                {isDiscountActive && pkg.discountExpiry && (
                                  <CountdownTimer targetDateIso={pkg.discountExpiry} />
                                )}
                              </div>
                            )}
                          </div>

                          <Button 
                            onClick={() => handleCheckout(pkg, finalPrice, isDiscountActive)}
                            disabled={processingId !== null}
                            className={`w-full h-14 rounded-2xl font-bold text-base shadow-md transition-all group-hover:shadow-xl mt-2 ${
                              !pkg.isPaid || pkg.price === 0 
                                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                : pkg.isBestSeller
                                ? 'bg-amber-500 text-amber-950 hover:bg-amber-600 shadow-amber-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                            }`}
                          >
                            {processingId === pkg.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : !pkg.isPaid || pkg.price === 0 ? (
                              <>Mulai Sekarang <ArrowRight className="w-5 h-5 ml-2" /></>
                            ) : (
                              <>
                                {isDiscountActive ? (
                                  <>Klaim Diskon {pkg.discountPercentage}% <MessageCircle className="w-5 h-5 ml-2" /></>
                                ) : (
                                  <>Amankan Akses Sekarang <MessageCircle className="w-5 h-5 ml-2" /></>
                                )}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* --- BANNER REQUEST CUSTOM FORM --- */}
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
                    {/* PERUBAHAN BRANDING: Sapaan Admin Omnifit */}
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
    </AnimatePresence>
  );
}