'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import {
  X, CheckCircle2, ArrowRight, Loader2, MessageCircle,
  Share2, Star, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import {
  DEFAULT_ATTRIBUTION_MODEL,
  ensureReferralVisitorId,
  getStoredReferralAttribution,
} from '@/lib/referralAttribution';
import { shareOrCopy } from '@/lib/share';
import { useAuth } from '@/contexts/AuthContext';

// IMPORT CUSTOM ICONS
import {
  AppModuleTealIcon, TechCardIcon, AILensIcon, InfinityWorkflowIcon,
  BrainIcon, GlobalTargetIcon, AdminShieldIcon, AiSparkIcon
} from '@/components/icon';

interface PricingPackagesProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLoginRequest: () => void;
  autoOpenPackageId?: string | null;
  asPage?: boolean;
}

const getCategoryTheme = (title: string, category: string) => {
  const text = `${title} ${category}`.toLowerCase();

  if (text.includes('koperasi') || text.includes('kelurahan') || text.includes('komunitas') || text.includes('hijau') || text.includes('sampah') || text.includes('properti')) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-white', pill: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', gradient: 'from-emerald-50/50 to-white' };
  }
  if (text.includes('pemerintah') || text.includes('skp') || text.includes('kecamatan') || text.includes('layanan') || text.includes('disposisi') || text.includes('anak') || text.includes('parenting')) {
    return { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white', pill: 'bg-amber-50 text-amber-600 hover:bg-amber-100', gradient: 'from-amber-50/50 to-white' };
  }
  if (text.includes('riset') || text.includes('akademik') || text.includes('perguruan') || text.includes('techno park') || text.includes('inkubasi') || text.includes('gen z') || text.includes('gen-z') || text.includes('talent')) {
    return { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200', btn: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20 text-white', pill: 'bg-sky-50 text-sky-600 hover:bg-sky-100', gradient: 'from-sky-50/50 to-white' };
  }
  if (text.includes('kesehatan') || text.includes('medis') || text.includes('psikologi') || text.includes('mental')) {
    return { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200', btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white', pill: 'bg-rose-50 text-rose-600 hover:bg-rose-100', gradient: 'from-rose-50/50 to-white' };
  }
  return { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 text-white', pill: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', gradient: 'from-indigo-50/50 to-white' };
};

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

const calculatePrice = (pkg: FormTemplate) => {
  if (!pkg.isPaid || !pkg.price) return { isFree: true, original: 0, final: 0, hasDiscount: false, percentage: 0 };

  let isDiscountActive = Boolean(pkg.discountPercentage && pkg.discountPercentage > 0);
  if (isDiscountActive && pkg.discountExpiry) {
    if (new Date(pkg.discountExpiry).getTime() < new Date().getTime()) {
      isDiscountActive = false;
    }
  }

  const final = isDiscountActive
    ? pkg.price - (pkg.price * (pkg.discountPercentage! / 100))
    : pkg.price;

  return {
    isFree: false,
    original: pkg.price,
    final,
    hasDiscount: isDiscountActive,
    percentage: pkg.discountPercentage || 0
  };
};

const parseExpectedOutput = (blockStr: string) => {
  if (!blockStr) return { title: '', subs: '' };
  const colonIndex = blockStr.indexOf(':');
  if (colonIndex === -1) return { title: blockStr, subs: '' };
  return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
};

export function PricingPackages({ isOpen, onClose, user, onLoginRequest, autoOpenPackageId, asPage = false }: PricingPackagesProps) {
  const router = useRouter();
  const { assessmentQuota } = useAuth();
  const [packages, setPackages] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [checkoutPackage, setCheckoutPackage] = useState<FormTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [storedAffiliateCode, setStoredAffiliateCode] = useState<string>('');
  const [attributionVisitorId, setAttributionVisitorId] = useState<string>('');
  const [attributionModel, setAttributionModel] = useState(DEFAULT_ATTRIBUTION_MODEL);

  useEffect(() => {
    const stored = getStoredReferralAttribution();
    const visitorId = ensureReferralVisitorId();
    setStoredAffiliateCode(stored?.affiliateCode || '');
    setAttributionVisitorId(visitorId || '');
    setAttributionModel(stored?.attributionModel || DEFAULT_ATTRIBUTION_MODEL);
  }, []);

  useEffect(() => {
    if (isOpen) fetchPackages();
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
        if (autoOpenPackageId === 'BUNDLE_3' || autoOpenPackageId === 'BUNDLE_5') {
          const bundlePkg: any = {
            id: autoOpenPackageId,
            trackName: autoOpenPackageId === 'BUNDLE_3' ? 'Bundle 3 Modul' : 'Bundle 5 Modul',
            price: autoOpenPackageId === 'BUNDLE_3' ? 149000 : 199000,
            trackDescription: autoOpenPackageId === 'BUNDLE_3'
              ? 'Amankan 3 kuota asesmen sekaligus dengan harga yang jauh lebih hemat. Bebas digunakan kapan saja.'
              : 'Paket korporat/eksekutif. Dapatkan 5 kuota asesmen dengan harga terbaik untuk mengukur berbagai metrik bisnis Anda.',
            expectedOutputs: [
              `Akses Penuh Katalog: Bebas menukar kuota untuk membuka ${autoOpenPackageId === 'BUNDLE_3' ? '3' : '5'} modul asesmen berbayar apa pun di katalog.`,
              'Kuota Tanpa Kadaluarsa: Kuota asesmen yang Anda beli tidak akan hangus dan dapat digunakan kapan saja.',
              'Penukaran 1-Click (1-Click Redeem): Lewati kerumitan checkout berulang. Tukarkan kuota langsung dari halaman katalog dengan sekali klik.',
              'Investasi Paling Hemat: Harga per modul menjadi jauh lebih murah dibandingkan membeli secara terpisah.'
            ],
            customUSPs: [
              'Bebas akses AI Konsultasi Premium pada setiap modul',
              'Laporan Taktis & Cetak Biru Lengkap',
              'Prioritas Dukungan Teknis'
            ],
            isPaid: true,
            isActive: true,
            isDisplayedOnLanding: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCheckoutPackage(bundlePkg as FormTemplate);
        } else {
          const targetPkg = data.find(p => p.id === autoOpenPackageId);
          if (targetPkg) {
            setCheckoutPackage(targetPkg);
            setActiveCategory(targetPkg.category || null);
          } else {
            toast.error("Modul yang Anda cari tidak tersedia atau belum tayang.");
          }
        }
      }
    } catch (error) {
      console.error("Gagal memuat katalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDecoy = async (pkg: FormTemplate) => {
    if (!user) {
      toast.info("Silakan masuk dengan akun Google Anda terlebih dahulu untuk melanjutkan.");
      onLoginRequest();
      return;
    }

    if (pkg.id !== 'BUNDLE_3' && pkg.id !== 'BUNDLE_5' && assessmentQuota > 0 && pkg.isPaid) {
      setIsProcessingPayment(true);
      toast.loading("Menukarkan kuota asesmen Anda...", { id: 'redeem_process' });
      try {
        const redeemFn = httpsCallable(functions, 'redeemAssessmentQuota');
        const response = await redeemFn({ packageId: pkg.id });
        const data = response.data as { tokenCode: string };
        toast.dismiss('redeem_process');
        toast.success("Kuota berhasil ditukar!");

        sessionStorage.setItem('active_token', data.tokenCode);
        sessionStorage.setItem('active_allowed_templates', JSON.stringify([pkg.id]));
        window.location.href = '/assessment';
        return;
      } catch (error: any) {
        toast.dismiss('redeem_process');
        toast.error(error.message || "Gagal menukar kuota.");
        setIsProcessingPayment(false);
        return;
      }
    }

    const priceInfo = calculatePrice(pkg);

    if (priceInfo.isFree) {
      const autoToken = `FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      sessionStorage.setItem('active_token', autoToken);
      sessionStorage.setItem('active_allowed_templates', JSON.stringify([pkg.id]));
      window.location.href = '/assessment';
    } else {
      setIsProcessingPayment(true);
      toast.loading("Mempersiapkan transaksi Anda...", { id: 'qris_process' });

      try {
        const latestAttribution = getStoredReferralAttribution();
        const latestVisitorId = ensureReferralVisitorId();

        const createInvoice = httpsCallable(functions, 'createPaymentInvoice');
        const response = await createInvoice({
          packageId: pkg.id,
          packageName: pkg.trackName,
          finalPrice: priceInfo.final,
          userEmail: user.email,
          userName: user.displayName || 'Pengguna',
          affiliateCode: latestAttribution?.affiliateCode || storedAffiliateCode || undefined,
          attributionVisitorId: latestVisitorId || attributionVisitorId || undefined,
          attributionModel: latestAttribution?.attributionModel || attributionModel || DEFAULT_ATTRIBUTION_MODEL,
        });

        const data = response.data as { transactionId: string };
        toast.dismiss('qris_process');
        router.push(`/checkout/${data.transactionId}`);
      } catch (error: any) {
        toast.dismiss('qris_process');
        toast.error(error.message || "Terjadi kesalahan saat memproses pembayaran.");
        setIsProcessingPayment(false);
      }
    }
  };

  const handleCopyLink = async (e: React.MouseEvent, id: string, trackName: string) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;

    const refQuery = storedAffiliateCode ? `&ref=${storedAffiliateCode}` : '';
    const shareUrl = `${window.location.origin}/katalog?buy=${id}${refQuery}`;

    try {
      const result = await shareOrCopy({
        title: `Omnifit - ${trackName}`,
        text: `Saya merekomendasikan modul ${trackName} di Omnifit. Cek detailnya di sini.`,
        url: shareUrl,
      });

      if (result === 'copied') {
        setCopiedId(id);
        toast.success('Tautan modul berhasil disalin.');
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (error) {
      toast.error('Gagal membagikan tautan modul.');
    }
  };

  const categories = Array.from(new Set(packages.map(p => p.category?.trim()).filter(Boolean)));
  const filteredPackages = packages.filter(pkg => activeCategory === pkg.category);

  const drawerTheme = checkoutPackage ? getCategoryTheme(checkoutPackage.trackName, checkoutPackage.category || '') : getCategoryTheme('', '');

  const DrawerIcon = checkoutPackage?.trackIcon && (LucideIcons as any)[checkoutPackage.trackIcon]
    ? (LucideIcons as any)[checkoutPackage.trackIcon]
    : AppModuleTealIcon;

  const OutputIcons = [AILensIcon, InfinityWorkflowIcon, BrainIcon, GlobalTargetIcon];

  const checkoutPriceInfo = checkoutPackage ? calculatePrice(checkoutPackage) : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="main-pricing-modal"
            initial={{ opacity: 0, y: asPage ? 0 : '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: asPage ? 0 : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`${asPage
              ? 'bg-[#FAFAFA] w-full min-h-screen flex flex-col'
              : 'fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden w-full h-[100dvh]'
              }`}
          >
            {/* Tampilkan tombol close KHUSUS JIKA bentuknya modal/laci (!asPage) */}
            {!asPage && (
              <div className="pt-4 px-5 flex justify-end shrink-0 z-30 relative">
                <button onClick={onClose} className="p-2 bg-white ring-1 ring-slate-200 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className={`${asPage ? 'relative z-10 w-full' : 'flex-1 overflow-y-auto custom-scrollbar relative z-10'}`}>

              {/* STICKY CATEGORY BREADCRUMB 
                  Ditampilkan HANYA saat ada activeCategory
              */}
              <AnimatePresence>
                {activeCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`sticky ${asPage ? 'top-0 md:top-[80px]' : 'top-0'} z-30 bg-[#FAFAFA]/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all w-full`}
                  >
                    <div className={`px-5 sm:px-8 py-3.5 sm:py-4 flex items-center gap-3 ${asPage ? 'max-w-6xl mx-auto' : 'max-w-4xl mx-auto'}`}>
                      <button
                        onClick={() => setActiveCategory(null)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 ring-1 ring-slate-200 transition-all shrink-0"
                        title="Kembali ke Kategori"
                      >
                        <LucideIcons.ChevronLeft size={18} />
                      </button>
                      <span className="text-sm sm:text-base font-black text-slate-800 line-clamp-1">{activeCategory}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* KONTEN UTAMA */}
              <div className="px-5 sm:px-8 py-6 sm:py-10">
                <div className={`${asPage ? 'max-w-6xl' : 'max-w-4xl'} mx-auto w-full pb-20`}>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                      <p className="font-bold text-[11px] uppercase tracking-widest">Memuat Katalog...</p>
                    </div>
                  ) : packages.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300 shadow-sm">
                      <TechCardIcon className="w-16 h-16 text-slate-200 mx-auto mb-4 grayscale opacity-50" />
                      <h3 className="text-lg font-black text-slate-700">Katalog Belum Tersedia</h3>
                      <p className="text-slate-500 text-sm mt-1 font-medium">Modul asesmen sedang diperbarui.</p>
                    </div>
                  ) : activeCategory === null ? (
                    /* GRID KATEGORI */
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pilih Kategori Modul</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Eksplorasi berbagai modul asesmen sesuai kebutuhan Anda.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <AnimatePresence mode="popLayout">
                          {categories.map((cat, idx) => {
                            const catName = String(cat);
                            const theme = getCategoryTheme(catName, catName);
                            // Hitung jumlah modul dalam kategori ini
                            const moduleCount = packages.filter(p => p.category === catName).length;
                            return (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                key={`cat-grid-${catName}`}
                                onClick={() => setActiveCategory(catName)}
                                className={`group relative bg-white rounded-3xl p-6 flex flex-col items-start cursor-pointer overflow-hidden border border-slate-200 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-200 ring-1 ${theme.ring} ring-inset`}
                              >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 mb-4 shadow-sm ring-1 ring-inset ${theme.bg} ${theme.text} ${theme.ring} group-hover:scale-110 transition-transform`}>
                                  <LucideIcons.Layers size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{catName}</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1.5">{moduleCount} Modul Tersedia</p>

                                <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                    <ArrowRight size={14} />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    /* DAFTAR MODUL DALAM KATEGORI */
                    <>
                      <div className={`grid gap-5 sm:gap-6 ${asPage ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                        <AnimatePresence mode="popLayout">
                          {filteredPackages.map((pkg) => {
                            const theme = getCategoryTheme(pkg.trackName, pkg.category || '');
                            const IconComponent = pkg.trackIcon && (LucideIcons as any)[pkg.trackIcon]
                              ? (LucideIcons as any)[pkg.trackIcon]
                              : AppModuleTealIcon;

                            const isCopied = copiedId === pkg.id;
                            const priceInfo = calculatePrice(pkg);

                            return (
                              <motion.div
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={`pkg-${pkg.id}`}
                                onClick={() => setCheckoutPackage(pkg)}
                                className="group relative bg-white rounded-3xl p-5 sm:p-6 flex flex-col cursor-pointer overflow-hidden border border-slate-200 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-200"
                              >
                                <div className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 pointer-events-none ${theme.text}`}>
                                  <IconComponent className="w-full h-full" />
                                </div>

                                {/* ATAS: Ikon & Info */}
                                <div className="flex items-start gap-4 w-full min-w-0">
                                  <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-inset ${theme.bg} ${theme.text} ${theme.ring} group-hover:scale-105 transition-transform`}>
                                    <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
                                  </div>

                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                      {pkg.isBestSeller && (
                                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">
                                          <Star className="w-3 h-3 fill-white" /> Hot
                                        </span>
                                      )}
                                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                        {pkg.category || 'Asesmen Mandiri'}
                                      </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors mb-2">
                                      {pkg.trackName}
                                    </h3>

                                    {pkg.trackDescription && (
                                      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 pr-2">
                                        {pkg.trackDescription}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* BAWAH: Harga & Aksi (Responsif & Tahan Banting) */}
                                <div className="w-full flex flex-row items-center justify-between mt-5 pt-4 border-t border-slate-100 z-10">

                                  {/* Area Harga */}
                                  <div className="flex flex-col items-start justify-center">
                                    {priceInfo.isFree ? (
                                      <span className="text-emerald-600 font-black text-sm uppercase tracking-wider">Gratis</span>
                                    ) : (
                                      <>
                                        {priceInfo.hasDiscount && (
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-slate-400 line-through text-[10px] sm:text-[11px] font-bold leading-none">
                                              {formatRupiah(priceInfo.original)}
                                            </span>
                                            <span className="bg-rose-100 text-rose-600 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                              -{priceInfo.percentage}%
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-slate-900 font-black text-base sm:text-lg leading-none">
                                          {formatRupiah(priceInfo.final)}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* Area Tombol */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => handleCopyLink(e, pkg.id, pkg.trackName)}
                                      className={`p-2.5 rounded-xl transition-colors flex shadow-sm border ${isCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : `bg-white border-slate-200 text-slate-400 hover:${theme.text} hover:bg-slate-50`
                                        }`}
                                      title={isCopied ? "Tersalin!" : "Salin Tautan"}
                                    >
                                      {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                    </button>

                                    <Button
                                      size="sm"
                                      className={`h-10 px-5 sm:px-6 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all group-hover:shadow-md ${priceInfo.isFree
                                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                                          : theme.btn
                                        }`}
                                    >
                                      Buka Modul
                                    </Button>
                                  </div>

                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Banner Custom Enterprise */}
                      <div className="mt-10 bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all group-hover:scale-150"></div>

                        <div className="relative z-10 flex-1 text-center md:text-left">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                            <AiSparkIcon size={14} /> Custom Enterprise
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Butuh Modul Khusus?</h3>
                          <p className="text-slate-300 font-medium text-sm leading-relaxed max-w-lg mx-auto md:mx-0">
                            Rancang formulir matriks asesmen eksklusif dan terintegrasi untuk kebutuhan spesifik Korporasi, Riset, atau Institusi Anda.
                          </p>
                        </div>
                        <div className="relative z-10 shrink-0 w-full md:w-auto">
                          <a
                            href="https://wa.me/6285777117587?text=Halo%20Admin%20Omnifit,%20saya%20tertarik%20untuk%20berdiskusi%20mengenai%20pembuatan%20modul%20asesmen%20custom."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-2xl text-sm font-bold transition-all shadow-lg"
                          >
                            <MessageCircle className="w-5 h-5" />
                            Hubungi Tim Kami
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LACI / MODAL CHECKOUT TETAP SAMA */}
      <AnimatePresence>
        {checkoutPackage && checkoutPriceInfo && (
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
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md">
                <div>
                  <h3 className="font-black text-lg text-slate-900">Detail Modul</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{checkoutPackage.category}</p>
                </div>
                <button onClick={() => setCheckoutPackage(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ${drawerTheme.bg} ${drawerTheme.text} ${drawerTheme.ring}`}>
                    <DrawerIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 mb-1 leading-tight">{checkoutPackage.trackName}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{checkoutPackage.trackDescription}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`${drawerTheme.bg} p-5 rounded-3xl ring-1 ${drawerTheme.ring} bg-opacity-40`}>
                    <h5 className={`text-[11px] font-black ${drawerTheme.text} uppercase tracking-widest mb-4 flex items-center gap-2`}>
                      <AiSparkIcon size={16} /> Nilai Tambah Untuk Anda
                    </h5>
                    <ul className="space-y-4">
                      {checkoutPackage.expectedOutputs && checkoutPackage.expectedOutputs.length > 0 ? (
                        checkoutPackage.expectedOutputs.map((item, idx) => {
                          const { title, subs } = parseExpectedOutput(item);
                          const DynamicIcon = OutputIcons[idx % OutputIcons.length];

                          return (
                            <li key={idx} className="flex items-start gap-3.5">
                              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                                <DynamicIcon size={18} className={drawerTheme.text} />
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
                        <>
                          <li className="flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                              <AILensIcon size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 mb-0.5">Sistem Deteksi Dini</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">Mendiagnosa akar masalah, potensi tersembunyi, dan area <span className="italic">blind-spot</span> secara objektif.</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                              <GlobalTargetIcon size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 mb-0.5">Cetak Biru (Blueprint) Solusi</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">Anda akan menerima panduan taktis dan rekomendasi langkah konkret yang siap dieksekusi.</p>
                            </div>
                          </li>
                        </>
                      )}
                    </ul>

                    {checkoutPackage.customUSPs && checkoutPackage.customUSPs.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-indigo-100/50">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Star size={12} className="text-amber-500" /> Fasilitas Eksklusif Tambahan
                        </h5>
                        <ul className="space-y-2">
                          {checkoutPackage.customUSPs.map((usp, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-xs font-bold text-slate-700 leading-relaxed">{usp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-3xl ring-1 ring-slate-200">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Share2 size={12} className="text-slate-400" /> Tautkan & Bagikan Modul
                    </h5>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex-1 truncate px-2 text-xs font-mono font-medium text-slate-400 select-all">
                        {`${window.location.origin}/katalog?buy=${checkoutPackage.id}${storedAffiliateCode ? `&ref=${storedAffiliateCode}` : ''}`}
                      </div>
                      <Button
                        onClick={(e) => handleCopyLink(e, checkoutPackage.id, checkoutPackage.trackName)}
                        className={`h-8 px-4 rounded-lg text-xs font-bold transition-all shrink-0 ${copiedId === checkoutPackage.id
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-900 text-white hover:bg-indigo-600'
                          }`}
                      >
                        {copiedId === checkoutPackage.id ? (
                          <><Check className="w-3 h-3 mr-1" /> Disalin</>
                        ) : (
                          <><Copy className="w-3 h-3 mr-1" /> Salin</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <AdminShieldIcon size={20} />
                    </div>
                    <p className="text-[10px] font-medium text-emerald-700/80 leading-relaxed">
                      <strong className="text-emerald-800">Garansi Privasi.</strong> Sesi Anda diamankan secara lokal. Input tidak akan dikirim ke server sebelum Anda menekan tombol konfirmasi.
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER LACI */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col justify-center max-w-[45%]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Investasi Anda</p>

                  {checkoutPriceInfo.isFree ? (
                    <p className="text-lg sm:text-xl font-black text-emerald-500">Akses Gratis</p>
                  ) : (
                    <div className="flex flex-col">
                      {checkoutPriceInfo.hasDiscount && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 line-through leading-none">
                            {formatRupiah(checkoutPriceInfo.original)}
                          </span>
                          <span className="bg-rose-100 text-rose-600 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                            -{checkoutPriceInfo.percentage}%
                          </span>
                        </div>
                      )}
                      <span className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                        {formatRupiah(checkoutPriceInfo.final)}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleStartDecoy(checkoutPackage)}
                  disabled={isProcessingPayment}
                  className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-indigo-600 shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 group px-4"
                >
                  {isProcessingPayment ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                  ) : (
                    <>
                      {checkoutPackage.id !== 'BUNDLE_3' && checkoutPackage.id !== 'BUNDLE_5' && assessmentQuota > 0 && checkoutPriceInfo.original > 0
                        ? "Gunakan 1 Kuota"
                        : "Lanjut Bayar"
                      }
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </>
  );
}