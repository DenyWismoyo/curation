// src/components/curation/ReviewAndConfirm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, ArrowLeft, Sparkles, KeyRound, FileCheck2, AlertTriangle } from 'lucide-react';

export interface ReviewAndConfirmProps {
  answers: Record<string, any>;
  onBack: () => void;
  onSubmit: (assessmentData: { selfScore: number; isConfirmedEarnest: boolean; token: string }) => void;
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

  // Ambil token dari session storage saat komponen dimuat
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('active_token');
    setActiveSessionToken(sessionToken);
  }, []);

  const isFormValid = selfScore !== '' && selfScore >= 1 && selfScore <= 10 && isConfirmed && token.trim().length >= 3;

  // Fungsi saat tombol "Analisis" ditekan pertama kali
  const handlePreSubmit = () => {
    setTokenError('');
    const inputTokenClean = token.trim().toUpperCase();

    // Validasi Kedua: Cocokkan token input dengan token di session
    if (!activeSessionToken) {
      setTokenError('Sesi tidak valid atau telah berakhir. Harap kembali ke halaman utama.');
      return;
    }

    if (inputTokenClean !== activeSessionToken) {
      setTokenError('Kode token tidak cocok dengan sesi aktif Anda. Silakan periksa kembali.');
      return;
    }

    if (isFormValid) {
      // Jika validasi sukses, jangan langsung submit, tapi TAMPILKAN MODAL
      setShowModal(true);
    }
  };

  // Fungsi yang dipanggil saat user menekan "Ya, Mulai Analisis" di dalam Modal
  const handleFinalSubmit = () => {
    setShowModal(false);
    const inputTokenClean = token.trim().toUpperCase();
    onSubmit({
      selfScore: Number(selfScore),
      isConfirmedEarnest: isConfirmed,
      token: inputTokenClean
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest ring-1 ring-emerald-200/50 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tahap Akhir
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tinjauan Akhir & Konfirmasi</h2>
          <p className="text-slate-500 text-sm font-medium">
            Periksa kembali rangkuman data Anda, lalu konfirmasi dengan Token Akses untuk memulai proses analisis AI.
          </p>
        </div>
        <div className="hidden sm:flex w-16 h-16 bg-slate-50 rounded-2xl ring-1 ring-slate-100 items-center justify-center shrink-0">
          <FileCheck2 className="w-8 h-8 text-indigo-600" />
        </div>
      </div>

      {/* Konten Utama */}
      <div className="bg-white rounded-[2rem] ring-1 ring-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          {/* Ringkasan Jawaban */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Ringkasan Data Input
            </h3>
            <div className="bg-slate-50/50 p-5 rounded-2xl ring-1 ring-slate-100 max-h-[35vh] overflow-y-auto custom-scrollbar space-y-4 divide-y divide-slate-100">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} className="pt-3 first:pt-0">
                  <span className="block text-xs font-bold text-slate-400 mb-1">{key}</span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {value !== undefined && value !== null && value !== '' ? String(value) : <span className="italic text-slate-400">Kosong</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 pt-4 border-t border-slate-100">
            {/* Input Token Konfirmasi */}
            <div className="space-y-3 bg-white p-5 rounded-2xl ring-1 ring-slate-200/60 hover:ring-indigo-200 transition-all md:col-span-2">
              <Label htmlFor="token-input" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" /> Konfirmasi Token Akses <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-slate-500 font-medium">
                Masukkan kembali kode token yang Anda gunakan di awal untuk memverifikasi keamanan pengiriman.
              </p>
              <Input
                id="token-input"
                type="text"
                placeholder="Contoh: KUKM1-XXXXX"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.toUpperCase());
                  if (tokenError) setTokenError('');
                }}
                className={`h-12 rounded-xl font-mono font-bold text-base bg-slate-50 focus-visible:ring-indigo-600 ${tokenError ? 'border-red-300 ring-1 ring-red-100 focus-visible:ring-red-500' : 'border-slate-200'}`}
                disabled={isSubmitting}
              />
              {tokenError && (
                <p className="text-red-500 text-xs font-bold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {tokenError}
                </p>
              )}
            </div>

            {/* Skor Keyakinan */}
            <div className="space-y-3 bg-white p-5 rounded-2xl ring-1 ring-slate-200/60 hover:ring-indigo-200 transition-all">
              <Label htmlFor="self-score" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Tingkat Keyakinan (1-10) <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-slate-500 font-medium">
                Seberapa akurat dan lengkap data yang Anda berikan?
              </p>
              <Input
                id="self-score"
                type="number"
                min={1}
                max={10}
                placeholder="Skor 1 - 10"
                value={selfScore}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= 10) setSelfScore(val);
                  else if (e.target.value === '') setSelfScore('');
                }}
                className="h-12 rounded-xl bg-slate-50 font-bold text-base border-slate-200 focus-visible:ring-indigo-600"
                disabled={isSubmitting}
              />
            </div>

            {/* Checkbox Konfirmasi */}
            <div className="bg-indigo-50/50 p-5 rounded-2xl ring-1 ring-indigo-100 flex flex-col justify-center">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="pt-0.5 shrink-0">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isConfirmed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                    {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-bold text-indigo-900">
                    Pernyataan Tanggung Jawab <span className="text-red-500">*</span>
                  </span>
                  <span className="block text-xs font-medium text-indigo-700/80 leading-relaxed">
                    Saya menyatakan bahwa data ini diisi dengan sebenar-benarnya tanpa manipulasi.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {!isFormValid && (
            <div className="flex items-start sm:items-center gap-3 text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 p-4 rounded-xl ring-1 ring-amber-200/50">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
              <span>Harap lengkapi Token, Skor Keyakinan, dan centang Pernyataan untuk melanjutkan.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50/80 p-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={onBack} 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          
          <Button 
            onClick={handlePreSubmit} // Panggil fungsi validasi dan tampilkan modal
            disabled={!isFormValid || isSubmitting}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all duration-300"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses Data...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Analisis dengan AI <Sparkles className="w-4 h-4 ml-1" />
              </span>
            )}
          </Button>
        </div>

      </div>

      {/* MODAL KONFIRMASI (Tampil jika showModal === true) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="p-6 sm:p-8 space-y-5">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center ring-1 ring-amber-100/50">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl font-black text-slate-900">Konfirmasi Pengiriman Data</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Apakah Anda yakin semua data yang diisi sudah tepat? Proses ini akan mengonsumsi <strong className="text-indigo-600 font-bold">1 Kuota Token</strong> Anda.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium">
                  * Data yang telah dikirim ke AI tidak dapat diubah kembali.
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50/80 p-5 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto rounded-xl h-11 border-slate-200 text-slate-600 font-bold hover:bg-white hover:text-slate-900"
              >
                Batal, Periksa Lagi
              </Button>
              <Button 
                onClick={handleFinalSubmit}
                className="w-full sm:w-auto rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all"
              >
                Ya, Analisis Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
