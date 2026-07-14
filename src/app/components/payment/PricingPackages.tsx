// src/app/components/payment/PricingPackages.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, CheckCircle2, ArrowRight, Loader2, LayoutGrid, ShieldCheck, MessageCircle 
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
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as FormTemplate);
      });

      // Urutkan berdasarkan harga (Gratis di awal, Premium di akhir)
      data.sort((a, b) => (a.price || 0) - (b.price || 0));
      setPackages(data);
    } catch (error) {
      console.error("Gagal memuat katalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (pkg: FormTemplate) => {
    if (!user) {
      toast.info("Silakan masuk dengan akun Google Anda terlebih dahulu untuk melanjutkan.");
      onLoginRequest();
      return;
    }

    setProcessingId(pkg.id);
    try {
      if (!pkg.isPaid || pkg.price === 0) {
        // LOGIKA MODUL GRATIS (LANGSUNG BYPASS)
        toast.success(`Memulai asesmen ${pkg.trackName}...`);
        
        const autoToken = `FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        sessionStorage.setItem('active_token', autoToken);
        sessionStorage.setItem('active_allowed_templates', JSON.stringify([pkg.id]));
        
        window.location.href = '/assessment'; 
        return;
      }

      // LOGIKA MANUAL VIA WHATSAPP
      // UBAH NOMOR WA INI DENGAN NOMOR ADMIN ANDA (Gunakan 62 di awal, tanpa 0 atau +)
      const adminWhatsApp = "6285777117587"; 
      
      const message = `Halo Admin CSRS,%0A%0ASaya ingin membeli akses untuk modul asesmen berikut:%0A*Modul:* ${pkg.trackName}%0A*Harga:* Rp ${pkg.price?.toLocaleString('id-ID')}%0A%0A*Data Akun Saya:*%0A- Nama: ${user.displayName}%0A- Email: ${user.email}%0A%0AMohon instruksi untuk pembayaran selanjutnya. Terima kasih.`;
      
      const waUrl = `https://wa.me/${adminWhatsApp}?text=${message}`;
      
      toast.success("Mengarahkan ke WhatsApp Admin...");
      
      // Buka WA di tab baru
      window.open(waUrl, '_blank');

    } catch (error: any) {
      console.error("Proses gagal:", error);
      toast.error(error.message || "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-50 w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-slate-200 overflow-hidden"
        >
          {/* HEADER MODAL */}
          <div className="bg-white p-6 sm:p-8 border-b border-slate-100 flex items-start justify-between shrink-0">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Katalog Cerdas
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pilih Modul Asesmen</h2>
              <p className="text-slate-500 font-medium mt-1">Akses mesin analitik kami secara instan untuk kebutuhan evaluasi entitas Anda.</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* KONTEN (PRICING CARDS) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
                <p className="font-bold text-sm uppercase tracking-widest">Memuat Katalog...</p>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-20">
                <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-700">Katalog Belum Tersedia</h3>
                <p className="text-slate-500 text-sm mt-1">Belum ada modul asesmen yang dipublikasikan untuk umum.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div 
                    key={pkg.id} 
                    className="bg-white rounded-3xl p-6 ring-1 ring-slate-200 shadow-sm flex flex-col transition-all hover:shadow-xl hover:ring-indigo-300 relative group"
                  >
                    {/* Badge Premium */}
                    {pkg.price && pkg.price > 500000 && (
                      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md z-10">
                        Premium
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 leading-snug mb-2">{pkg.trackName}</h3>
                      <p className="text-sm text-slate-500 font-medium line-clamp-3 mb-6">
                        {pkg.trackDescription || "Modul evaluasi terstandarisasi untuk memetakan kapasitas dan kapabilitas."}
                      </p>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Analisis AI & Scoring Kustom</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Laporan Eksekutif Lengkap (PDF)</span>
                        </div>
                        {pkg.trialQuota && pkg.trialQuota > 0 ? (
                          <div className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>Mendukung Trial Kuota ({pkg.trialQuota}x)</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 mt-auto">
                      <div className="mb-4">
                        {!pkg.isPaid || pkg.price === 0 ? (
                          <span className="text-2xl font-black text-emerald-600">Gratis</span>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-slate-400">Rp</span>
                            <span className="text-3xl font-black text-slate-900">{pkg.price?.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {!pkg.isPaid || pkg.price === 0 ? 'Akses Langsung' : 'Satu Kali Bayar'}
                        </p>
                      </div>

                      <Button 
                        onClick={() => handleCheckout(pkg)}
                        disabled={processingId !== null}
                        className={`w-full h-12 rounded-xl font-bold text-base shadow-md transition-all group-hover:shadow-lg ${
                          !pkg.isPaid || pkg.price === 0 
                            ? 'bg-slate-900 text-white hover:bg-slate-800' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                        }`}
                      >
                        {processingId === pkg.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : !pkg.isPaid || pkg.price === 0 ? (
                          <>Mulai Sekarang <ArrowRight className="w-4 h-4 ml-2" /></>
                        ) : (
                          <>Pesan via WhatsApp <MessageCircle className="w-4 h-4 ml-2" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}