'use client';

// src/app/token/page.tsx

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SafeLogo } from '@/components/shared/SafeLogo';

export default function TokenPage() {
  const router = useRouter();
  const { user, loginWithGoogle } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      
      // Cari menggunakan key tanpa prefix ATAU menggunakan token utuh
      const tokenData = batchData.tokens[tokenCode] || batchData.tokens[cleanToken];

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

      // Simpan session yang valid
      sessionStorage.setItem('active_token', cleanToken);
      localStorage.setItem('omnifit_last_token', cleanToken);
      sessionStorage.setItem('active_model', batchData.modelType);
      sessionStorage.setItem('active_corporate_name', batchData.corporateName || 'Omnifit');
      sessionStorage.setItem('active_corporate_id', docSnap.id);
      
      const allowedTpls = tokenData.allowedTemplates || batchData.allowedTemplates;
      if (allowedTpls && Array.isArray(allowedTpls) && allowedTpls.length > 0) {
        sessionStorage.setItem('active_allowed_templates', JSON.stringify(allowedTpls));
      } else {
        sessionStorage.removeItem('active_allowed_templates');
      }

      // Redirect ke halaman asesmen
      router.push('/assessment/select');

    } catch (error) {
      console.error("Error validating token:", error);
      setErrorMsg('Terjadi kesalahan pada server saat memvalidasi token.');
      setIsValidating(false);
    }
  };

  // Tekan Enter untuk submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleValidateAndStart();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments (Diambil dari tema landing page Anda) */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-indigo-500/10 ring-1 ring-slate-200 relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 flex items-center justify-center overflow-hidden">
             <SafeLogo src="/logo.png" alt="Omnifit Logo" width={60} height={60} className="w-full h-full object-contain p-2" priority />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">Akses Modul</h1>
          <p className="text-sm font-medium text-slate-500">
            Masukkan kode token yang Anda miliki untuk memulai proses asesmen.
          </p>
        </div>

        {!user ? (
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-xl ring-1 ring-amber-200/50 flex gap-3 text-left">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-700 leading-relaxed">
                Anda wajib masuk dengan Akun Google terlebih dahulu agar progres asesmen dapat tersimpan dengan aman ke akun Anda.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={loginWithGoogle} 
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <Input 
                autoFocus
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Contoh: KUKM1-XXXXX" 
                className="pl-11 h-14 rounded-2xl bg-slate-50/50 border-slate-200/60 shadow-sm text-lg font-mono font-bold focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-transparent transition-all"
                disabled={isValidating}
              />
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 text-sm font-medium text-left bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  * {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>

            <Button 
              size="lg" 
              onClick={handleValidateAndStart}
              disabled={isValidating || !tokenInput}
              className="w-full shadow-lg shadow-indigo-600/20 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl h-14 px-8 text-base font-bold transition-all duration-300"
            >
              {isValidating ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memvalidasi...</>
              ) : (
                <>Verifikasi Token <ArrowRight className="h-5 w-5 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}