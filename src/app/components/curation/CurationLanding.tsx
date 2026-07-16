'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

import { 
  ArrowRight, History, Clock, 
  ChevronRight, Loader2, LogOut, LayoutDashboard, Sparkles, ClipboardCheck,
  MessageSquarePlus, Box
} from 'lucide-react';

// IMPORT CUSTOM ICON ANDA DI SINI
import { 
  EcosystemIcon, 
  TechCardIcon, 
  AdminShieldIcon, 
  DocExportIcon, 
  BrainIcon 
} from '@/components/icon';

import { PricingPackages } from '@/app/components/payment/PricingPackages';
import { SystemCapabilitiesModal } from './SystemCapabilitiesModal';
import { FeedbackModal } from './FeedbackModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurationHistory } from '@/types/curation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { toast } from 'sonner';

// IMPORT CUSTOM HOOK
import { useMobileBack } from '@/hooks/useMobileBack';

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
  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // State untuk kontrol Modal & Draft
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isCapabilitiesModalOpen, setIsCapabilitiesModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [autoOpenPackageId, setAutoOpenPackageId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  // ==========================================
  // IMPLEMENTASI MOBILE BACK HANDLER (SWIPE)
  // ==========================================
  
  const closePricingModal = () => {
    setIsPricingModalOpen(false);
    setAutoOpenPackageId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('buy');
      window.history.replaceState({}, '', url.toString());
    }
  };

  useMobileBack(isPricingModalOpen, closePricingModal);
  useMobileBack(isCapabilitiesModalOpen, () => setIsCapabilitiesModalOpen(false));
  useMobileBack(isFeedbackModalOpen, () => setIsFeedbackModalOpen(false));


  // DETEKSI DRAF DARI LOCAL STORAGE
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fetchDrafts = async () => {
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
        console.error("Gagal memuat draf lokal:", error);
      }
    };

    fetchDrafts();
  }, []);

  // DETEKSI SHARE LINK DARI URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const buyId = urlParams.get('buy');
      
      if (buyId) {
        setAutoOpenPackageId(buyId);
        setIsPricingModalOpen(true);
      }
    }
  }, []);

  // FUNGSI MELANJUTKAN DRAF
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

  // FUNGSI MEMULAI ASESMEN VIA TOKEN
  const handleValidateAndStart = async () => {
    setErrorMsg('');
    const cleanToken = tokenInput.trim().toUpperCase();

    if (!cleanToken) {
      setErrorMsg('Harap masukkan kode token Anda.');
      return;
    }

    if (!cleanToken.includes('-')) {
      setErrorMsg('Format token tidak valid. Gunakan format PREFIX-KODE (contoh: KUKM1-XXXXXX)');
      return;
    }

    const [corpId, tokenCode] = cleanToken.split('-');
    setIsValidating(true);

    try {
      const docRef = doc(db, 'corporate_tokens', corpId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErrorMsg('Token tidak ditemukan atau prefix salah.');
        setIsValidating(false);
        return;
      }

      const batchData = docSnap.data();
      const tokenData = batchData.tokens[tokenCode];

      if (!tokenData) {
        setErrorMsg('Kode token tidak valid atau tidak terdaftar.');
        setIsValidating(false);
        return;
      }

      if (tokenData.isUsed) {
        setErrorMsg('Token ini sudah terpakai pada: ' + (tokenData.usedAt ? new Date(tokenData.usedAt).toLocaleDateString('id-ID') : 'Waktu tidak diketahui'));
        setIsValidating(false);
        return;
      }

      sessionStorage.setItem('active_token', cleanToken);
      localStorage.setItem('omnifit_last_token', cleanToken);
      sessionStorage.setItem('active_model', batchData.modelType);
      
      const allowedTpls = tokenData.allowedTemplates || batchData.allowedTemplates;
      
      if (allowedTpls && Array.isArray(allowedTpls) && allowedTpls.length > 0) {
        sessionStorage.setItem('active_allowed_templates', JSON.stringify(allowedTpls));
      } else {
        sessionStorage.removeItem('active_allowed_templates');
      }

      onStart();
    } catch (error) {
      console.error("Error validating token:", error);
      setErrorMsg('Terjadi kesalahan pada server saat memvalidasi token.');
    } finally {
      setIsValidating(false);
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
    <div className="w-full min-h-screen flex items-center justify-center bg-[#FAFAFA] py-12 px-6 lg:px-12 relative overflow-hidden">
      
      {/* FLOATING FEEDBACK BUTTON */}
      {!isPricingModalOpen && !isCapabilitiesModalOpen && (
        <button 
          onClick={() => setIsFeedbackModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-white/90 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-4 py-3.5 rounded-full font-bold text-sm flex items-center gap-2.5 transition-all group"
        >
          <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:block">Beri Ulasan</span>
        </button>
      )}

      {/* Animated Ornaments */}
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-12 lg:gap-20 items-start lg:items-center relative z-10">
        
        {/* Kolom Kiri: Hero & Form/Login */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex-1 space-y-8 text-center lg:text-left w-full"
        >
          {/* IMPLEMENTASI LOGO */}
          <motion.div variants={fadeUpVariants} className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 mb-2 overflow-hidden">
            <Image 
              src="/logo.png" 
              alt="Omnifit Logo" 
              width={80} 
              height={80} 
              className="w-full h-full object-contain p-2"
              priority
            />
          </motion.div>
          
          <motion.div variants={fadeUpVariants} className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] text-balance">
              Omnifit Platform <br className="hidden sm:block"/> 
              <span className="text-indigo-600 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                Smart Assessment System
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed text-balance">
              Platform analitik berbasis kecerdasan buatan untuk mendiagnosa akar masalah, memetakan potensi tersembunyi, dan merumuskan cetak biru solusi yang presisi dirancang adaptif untuk pengembangan personal, konseling, hingga akselerasi ekosistem bisnis.
            </p>

            {/* SEKSI ACTION BANNER */}
            <div className="pt-4 flex flex-col gap-4 max-w-sm sm:max-w-md mx-auto lg:mx-0">
              
              {/* BANNER 1: Apa itu Omnifit? */}
              <div 
                onClick={() => setIsCapabilitiesModalOpen(true)}
                className="group relative cursor-pointer overflow-hidden rounded-[1.25rem] bg-slate-900 p-[2px] transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1 w-full"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-40 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                
                <div className="relative flex items-center justify-between gap-4 rounded-xl bg-slate-900 px-5 py-4 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                      <EcosystemIcon className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-base font-black text-white leading-tight mb-0.5">Apa itu Omnifit?</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">Pelajari Solusi & Cara Kerjanya</p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-white group-hover:text-slate-900 transition-colors duration-300">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* BANNER 2: JELAJAHI KATALOG MODUL */}
              <div 
                onClick={() => setIsPricingModalOpen(true)}
                className="group relative cursor-pointer overflow-hidden rounded-[1.25rem] bg-indigo-600 p-[2px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:-translate-y-1 w-full shadow-lg shadow-indigo-600/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-pink-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                <div className="absolute -inset-x-20 inset-y-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

                <div className="relative flex items-center justify-between gap-5 rounded-xl bg-white px-5 py-4 transition-all group-hover:bg-white/95">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    
                    {/* KOMPOSISI IKON KAYA */}
                    <div className="relative h-14 w-16 shrink-0 mr-2">
                      <div className="absolute top-0 right-0 h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center rotate-6 group-hover:rotate-12 group-hover:scale-105 transition-all duration-500">
                        <Box className="w-5 h-5 text-blue-300" />
                      </div>
                      
                      <div className="absolute bottom-0 left-0 h-11 w-11 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 flex items-center justify-center -rotate-6 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 z-10">
                        <TechCardIcon className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm group-hover:-translate-y-1.5 transition-transform duration-500 delay-75 z-20">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                    </div>
                    
                    {/* TIPOGRAFI & BADGE */}
                    <div className="text-left flex-1">
                      <h4 className="text-base sm:text-[17px] font-black text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight mb-1.5">
                        Jelajahi Katalog Modul
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded flex-shrink-0 bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                          AI Powered
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest line-clamp-1">
                          Pilih & Mulai
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* TOMBOL ANAK PANAH */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm ring-1 ring-indigo-100 group-hover:ring-indigo-500">
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {!user ? (
             <motion.div variants={fadeUpVariants} className="w-full max-w-md mx-auto lg:mx-0 space-y-4 pt-4">
               <Button 
                 size="lg" 
                 onClick={onLogin}
                 className="w-full shadow-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 h-14 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-3"
               >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                 </svg>
                 Masuk dengan Akun Google
               </Button>
               <p className="text-xs text-slate-500 font-medium">Anda wajib masuk untuk menggunakan token dan menyimpan progres secara aman.</p>
             </motion.div>
          ) : (
            <motion.div variants={fadeUpVariants} className="w-full max-w-md mx-auto lg:mx-0 space-y-4 pt-4">
              
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="truncate text-left">
                    <p className="text-xs font-black text-slate-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button onClick={onLogout} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Keluar">
                  <LogOut size={16} />
                </button>
              </div>

              {(role === 'admin_csrs' || role === 'admin_omnifit') && (
                <Link href="/admin" className="block w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold gap-2">
                    <LayoutDashboard size={18} /> Ke Dasbor Admin Omnifit
                  </Button>
                </Link>
              )}
              
              {(role === 'assessor') && (
                <Link href="/assessor" className="block w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold gap-2">
                    <ClipboardCheck size={18} /> Ke Ruang Kerja Asesor
                  </Button>
                </Link>
              )}

              <Link href="/dashboard" className="block w-full">
                <Button variant="outline" className="w-full h-12 rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold gap-2 shadow-sm transition-all">
                  <AdminShieldIcon size={18} /> Buka Brankas Modul Saya
                </Button>
              </Link>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2">
                  Mulai Asesmen (Input Token)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 relative">
                  <div className="relative flex-1 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                    <Input 
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                      placeholder="" 
                      className="relative h-14 rounded-2xl bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm text-center sm:text-left font-mono font-bold text-lg focus-visible:ring-0 focus-visible:border-indigo-400 transition-all"
                      disabled={isValidating}
                    />
                  </div>
                  
                  <Button 
                    size="lg" 
                    onClick={handleValidateAndStart}
                    disabled={isValidating}
                    className="relative w-full sm:w-auto shrink-0 shadow-lg shadow-indigo-600/20 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl h-14 px-8 text-base transition-all duration-300 overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isValidating ? (
                        <motion.div key="loading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" /> Memvalidasi
                        </motion.div>
                      ) : (
                        <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                          Mulai <ArrowRight className="h-5 w-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-sm font-medium text-left ml-1 bg-red-50 p-3 rounded-xl border border-red-100 overflow-hidden"
                  >
                    * {errorMsg}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>

        {/* Kolom Kanan: Draft & History Cards */}
        {user && (history.length > 0 || drafts.length > 0) && (
          <div className="w-full max-w-md flex flex-col gap-6 lg:gap-8 mx-auto lg:mx-0 shrink-0">
            
            {/* DRAFTS SECTION */}
            {drafts.length > 0 && (
              <motion.div 
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
                
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 relative z-10"
                >
                  {drafts.map((draft, idx) => (
                    <motion.div 
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
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* HISTORY SECTION */}
            {history.length > 0 && (
              <motion.div 
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
                
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 relative z-10"
                >
                  {history.map((item, idx) => (
                    <motion.div 
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
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

          </div>
        )}

        <PricingPackages 
          isOpen={isPricingModalOpen}
          onClose={closePricingModal}
          user={user}
          onLoginRequest={onLogin}
          autoOpenPackageId={autoOpenPackageId} 
        />

        <SystemCapabilitiesModal 
          isOpen={isCapabilitiesModalOpen}
          onClose={() => setIsCapabilitiesModalOpen(false)}
        />
        
        {/* Render Modal Feedback */}
        <FeedbackModal 
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          user={user}
        />

      </div>
    </div>
  );
}