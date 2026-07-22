// src/app/components/curation/ReviewAndConfirm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, ArrowLeft, AlertTriangle, KeyRound, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// IMPORT CUSTOM ICONS
import { DocExportIcon, AdminShieldIcon, AiSparkIcon } from '@/types';

export interface ReviewAndConfirmProps {
  answers: Record<string, any>;
  onBack: () => void;
  // Mempertahankan BUG FIX: Parameter disesuaikan menjadi tokenUsed
  onSubmit: (assessmentData: { selfScore: number; isConfirmedEarnest: boolean; tokenUsed: string }) => void;
  isSubmitting?: boolean;
}

export function ReviewAndConfirm({ answers, onBack, onSubmit, isSubmitting = false }: ReviewAndConfirmProps) {
  const [selfScore, setSelfScore] = useState<number | ''>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [token, setToken] = useState<string>(''); 
  const [tokenError, setTokenError] = useState<string>('');
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(null);
  
  // State untuk menampilkan Modal Konfirmasi
  const [showModal, setShowModal] = useState<boolean>(false);

  // Ambil token dari session storage dan LAKUKAN AUTO-FILL
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('active_token');
    setActiveSessionToken(sessionToken);
    if (sessionToken) {
      setToken(sessionToken); 
    }
  }, []);

  const isFormValid = selfScore !== '' && selfScore >= 1 && selfScore <= 10 && isConfirmed && token.trim().length >= 3;

  // Fungsi saat tombol "Analisis" ditekan pertama kali
  const handlePreSubmit = () => {
    setTokenError('');
    const inputTokenClean = token.trim().toUpperCase();

    if (!activeSessionToken) {
      setTokenError('Sesi tidak valid atau telah berakhir. Harap kembali ke halaman utama.');
      return;
    }

    if (inputTokenClean !== activeSessionToken) {
      setTokenError('Kode token tidak cocok dengan sesi aktif Anda.');
      return;
    }

    if (isFormValid) {
      setShowModal(true);
    }
  };

  // Fungsi Final Submit di dalam Modal
  const handleFinalSubmit = () => {
    setShowModal(false);
    const inputTokenClean = token.trim().toUpperCase();
    
    // MENCEGAH ERROR BACKEND: Jangan kirim token decoy/trial ke Firebase Functions
    const isDecoy = inputTokenClean.startsWith('FREE-') || inputTokenClean.startsWith('TRIAL-') || inputTokenClean.startsWith('RESUME-');
    const finalToken = isDecoy ? '' : inputTokenClean;

    onSubmit({
      selfScore: Number(selfScore),
      isConfirmedEarnest: isConfirmed,
      tokenUsed: finalToken 
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-10">
      
      {/* ================= HEADER ================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="text-center space-y-4 mb-4 sm:mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm mb-2">
          <DocExportIcon size={32} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Tinjauan Akhir</h2>
        <p className="text-slate-500 font-medium max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
          Sistem telah merekam seluruh formulir Anda. Lakukan validasi terakhir sebelum data ini diinkubasi oleh Kecerdasan Buatan.
        </p>
      </motion.div>

      {/* ================= BLOK 1: RINGKASAN DATA ================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm"
      >
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ringkasan Pengisian Form
        </h3>
        
        <div className="bg-slate-50/50 p-2 rounded-2xl ring-1 ring-slate-100/80 max-h-[40vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {Object.entries(answers).map(([key, value], idx) => (
              <div key={key} className={`p-3 sm:p-4 rounded-xl transition-colors hover:bg-white ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/80'}`}>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{key}</span>
                <span className="block text-sm font-semibold text-slate-800 leading-relaxed">
                  {value !== undefined && value !== null && value !== '' ? String(value) : <span className="italic text-slate-400 font-medium">Kosong</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ================= BLOK 2: VERIFIKASI KEAMANAN & TOKEN ================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm space-y-6"
      >
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <AdminShieldIcon className="w-4 h-4 text-indigo-500" /> Autentikasi Pemrosesan
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Input Token */}
          <div className="space-y-2">
            <Label htmlFor="token-input" className="text-xs font-bold text-slate-700">
              Kode Token Akses <span className="text-rose-500">*</span>
            </Label>
            <div className="relative group">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                id="token-input"
                type="text"
                placeholder="Cth: KUKM-XXXXX"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.toUpperCase());
                  if (tokenError) setTokenError('');
                }}
                className={`h-12 pl-10 rounded-xl font-mono font-bold text-sm bg-slate-50 transition-all ${tokenError ? 'border-rose-300 ring-1 ring-rose-100 focus-visible:ring-rose-500' : 'border-slate-200 focus-visible:ring-indigo-500'}`}
                disabled={isSubmitting}
              />
            </div>
            {tokenError && (
              <p className="text-rose-500 text-[10px] font-bold flex items-center gap-1 mt-1.5 uppercase tracking-wider">
                <AlertCircle className="w-3 h-3" /> {tokenError}
              </p>
            )}
          </div>

          {/* Input Skor Keyakinan */}
          <div className="space-y-2">
            <Label htmlFor="self-score" className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Tingkat Keyakinan Data <span className="text-rose-500">*</span></span>
              <span className="text-indigo-600 font-black">{selfScore || '0'} / 10</span>
            </Label>
            <Input
              id="self-score"
              type="number"
              min={1} max={10}
              placeholder="Skor 1 - 10"
              value={selfScore}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= 10) setSelfScore(val);
                else if (e.target.value === '') setSelfScore('');
              }}
              className="h-12 rounded-xl bg-slate-50 font-bold text-sm border-slate-200 focus-visible:ring-indigo-500 transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* Checkbox Konfirmasi (Full Width) */}
          <div className="md:col-span-2">
            <label className={`flex items-start sm:items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${isConfirmed ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              <div className={`mt-0.5 sm:mt-0 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isConfirmed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                {isConfirmed && <Check className="w-4 h-4" strokeWidth={3} />}
              </div>
              <input
                type="checkbox" className="hidden"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-900 mb-0.5">
                  Pernyataan Integritas Data <span className="text-rose-500">*</span>
                </span>
                <span className="block text-[11px] sm:text-xs font-medium text-slate-500 leading-relaxed">
                  Saya memvalidasi bahwa seluruh informasi di atas diisi secara jujur, objektif, dan dapat dipertanggungjawabkan kebenarannya.
                </span>
              </div>
            </label>
          </div>

        </div>

        {/* Warning jika belum lengkap */}
        <AnimatePresence>
          {!isFormValid && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/60 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                Harap lengkapi Token, Skor, dan Integritas untuk melanjutkan.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ================= BLOK 3: ACTIONS ================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2"
      >
        <Button 
          variant="ghost" 
          onClick={onBack} 
          disabled={isSubmitting}
          className="w-full sm:w-auto h-14 px-6 rounded-2xl text-slate-500 font-bold hover:bg-slate-200 hover:text-slate-900 transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Form
        </Button>
        
        <Button 
          onClick={handlePreSubmit}
          disabled={!isFormValid || isSubmitting}
          className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-bold shadow-xl shadow-slate-900/10 hover:shadow-indigo-600/30 transition-all duration-300 text-sm group"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menghubungi Server...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Analisis Data dengan AI <AiSparkIcon size={18} className="ml-1 group-hover:scale-110 transition-transform" />
            </span>
          )}
        </Button>
      </motion.div>

      {/* ================= MODAL KONFIRMASI (POP-UP) ================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full ring-1 ring-slate-200 overflow-hidden relative"
            >
              <div className="p-6 sm:p-8 space-y-5 text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[1.5rem] flex items-center justify-center ring-1 ring-amber-100/50 mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Kirim Data & Analisis?</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Setelah dikirim, data akan dikunci untuk dianalisis oleh AI. Proses ini akan menggunakan <strong className="text-indigo-600 font-bold">1 Kuota Token</strong> dari sesi Anda.
                  </p>
                </div>
              </div>
              
              <div className="p-5 flex flex-col sm:flex-row items-center gap-3 bg-slate-50 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-xl h-12 border-slate-200 text-slate-600 font-bold hover:bg-white hover:text-slate-900"
                >
                  Batal, Cek Lagi
                </Button>
                <Button 
                  onClick={handleFinalSubmit}
                  className="w-full rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all"
                >
                  Ya, Mulai Proses
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}