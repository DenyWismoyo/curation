'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, KeyRound, ArrowRight, Globe } from 'lucide-react';
import { Instagram, Linkedin } from '@/components/ui/icons';
import { motion } from 'framer-motion';

export default function MitraLandingPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, loginWithGoogle } = useAuth();
  
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgData, setOrgData] = useState<any>(null);
  const [errorOrg, setErrorOrg] = useState('');

  const [tokenInput, setTokenInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchOrg() {
      try {
        const q = query(collection(db, 'b2b_organizations'), where('slug', '==', params.slug));
        const snap = await getDocs(q);
        if (snap.empty) {
          setErrorOrg('Halaman mitra tidak ditemukan.');
          setLoadingOrg(false);
          return;
        }
        const docData = snap.docs[0].data();
        setOrgData({ id: snap.docs[0].id, ...docData });
      } catch (err) {
        console.error('Error fetching org:', err);
        setErrorOrg('Terjadi kesalahan saat memuat halaman.');
      } finally {
        setLoadingOrg(false);
      }
    }
    fetchOrg();
  }, [params.slug]);

  const handleValidateAndStart = async () => {
    setErrorMsg('');
    const cleanToken = tokenInput.trim().toUpperCase();

    if (!cleanToken) {
      setErrorMsg('Harap masukkan kode token Anda.');
      return;
    }

    if (!cleanToken.includes('-')) {
      setErrorMsg('Format token tidak valid. Gunakan format PREFIX-KODE.');
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

      // VALIDASI: Pastikan batch token ini benar-benar milik Organisasi ini
      if (batchData.organizationId !== orgData.id) {
        setErrorMsg('Token ini tidak valid untuk program Mitra ini.');
        setIsValidating(false);
        return;
      }

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

      sessionStorage.setItem('active_token', cleanToken);
      localStorage.setItem('omnifit_last_token', cleanToken);
      sessionStorage.setItem('active_model', batchData.modelType);
      sessionStorage.setItem('active_corporate_name', batchData.corporateName || orgData.displayName || 'Mitra');
      sessionStorage.setItem('active_corporate_id', docSnap.id);
      
      const allowedTpls = tokenData.allowedTemplates || batchData.allowedTemplates;
      if (allowedTpls && Array.isArray(allowedTpls) && allowedTpls.length > 0) {
        sessionStorage.setItem('active_allowed_templates', JSON.stringify(allowedTpls));
      } else {
        sessionStorage.removeItem('active_allowed_templates');
      }

      router.push('/assessment');
    } catch (error) {
      console.error("Error validating token:", error);
      setErrorMsg('Terjadi kesalahan pada server saat memvalidasi token.');
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleValidateAndStart();
    }
  };

  if (loadingOrg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (errorOrg || !orgData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">404 - Not Found</h1>
        <p className="text-slate-500">{errorOrg || 'Halaman mitra tidak ditemukan.'}</p>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-6 rounded-xl h-12 px-8 font-bold">
          Kembali ke Beranda
        </Button>
      </div>
    );
  }

  const primaryColor = orgData.branding?.primaryColor || orgData.primaryColor || '#4f46e5';
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: primaryColor + '0A' }}>
      
      {/* Cover Banner */}
      {(orgData.branding?.coverUrl || orgData.coverUrl) && (
        <div 
          className="absolute top-0 inset-x-0 w-full h-[50vh] z-0"
          style={{ 
            backgroundImage: `url(${orgData.branding?.coverUrl || orgData.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
           <div 
             className="absolute inset-0" 
             style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${primaryColor}1A 70%, #f8fafc)` }} 
           />
        </div>
      )}

      {/* Dynamic Background Ornaments based on primary color */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none opacity-20 z-0" style={{ backgroundColor: primaryColor }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full blur-[120px] pointer-events-none opacity-20 z-0" style={{ backgroundColor: primaryColor }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl ring-1 ring-slate-200/50 relative z-10"
        style={{ boxShadow: `0 25px 50px -12px ${primaryColor}20` }}
      >
        <div className="flex justify-center mb-8 relative">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl ring-1 ring-slate-100 flex items-center justify-center overflow-hidden z-10">
             {orgData.branding?.logoUrl || orgData.logoUrl ? (
               <img src={orgData.branding?.logoUrl || orgData.logoUrl} alt={orgData.displayName || 'Mitra Logo'} className="w-full h-full object-contain p-2" />
             ) : (
               <div className="text-4xl font-black" style={{ color: primaryColor }}>
                 {(orgData.displayName || 'M')[0].toUpperCase()}
               </div>
             )}
          </div>
          {/* Decorative glow behind logo */}
          <div className="absolute inset-0 blur-xl opacity-30 z-0 scale-110" style={{ backgroundColor: primaryColor }} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            {orgData.displayName || 'Mitra Portal'}
          </h1>
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            {orgData.branding?.welcomeMessage || orgData.welcomeMessage || 'Masukkan kode token yang Anda miliki untuk memulai proses asesmen.'}
          </p>
          
          {orgData.branding?.description && (
            <div className="mt-4 bg-slate-50 p-4 rounded-xl text-xs text-slate-600 text-left border border-slate-100 leading-relaxed shadow-inner">
               {orgData.branding.description}
            </div>
          )}
        </div>

        {!user ? (
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-2xl ring-1 ring-amber-200/50 flex gap-3 text-left">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-700 leading-relaxed">
                Anda wajib masuk dengan Akun Google terlebih dahulu agar progres asesmen dapat tersimpan dengan aman ke akun Anda.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={loginWithGoogle} 
              className="w-full shadow-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 h-14 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-3"
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
                <KeyRound className="w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
              </div>
              <Input 
                type="text" 
                placeholder="Masukkan Token (Contoh: PREFIX-XXXX)" 
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="pl-12 h-16 w-full text-center text-lg font-black tracking-[0.1em] uppercase bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-slate-300 focus:ring-0 transition-all placeholder:text-sm placeholder:font-semibold placeholder:tracking-normal placeholder:lowercase placeholder:text-slate-400"
                disabled={isValidating}
              />
            </div>
            
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold text-center rounded-xl ring-1 ring-red-100 animate-in shake">
                {errorMsg}
              </div>
            )}

            <Button 
              size="lg" 
              onClick={handleValidateAndStart} 
              disabled={isValidating || !tokenInput.trim()}
              className="w-full h-16 rounded-2xl text-base font-black text-white hover:opacity-90 transition-all shadow-xl disabled:opacity-50"
              style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memvalidasi...
                </>
              ) : (
                <>
                  Mulai Asesmen
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
            
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate">
                Masuk sebagai <span className="text-slate-700">{user.email}</span>
              </p>
            </div>
          </div>
        )}

        {(orgData.branding?.websiteUrl || orgData.branding?.instagramUrl || orgData.branding?.linkedinUrl) && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-4">
            {orgData.branding.websiteUrl && (
              <a href={orgData.branding.websiteUrl} target="_blank" rel="noreferrer" title="Kunjungi Website" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm ring-1 ring-slate-200">
                 <Globe className="w-4 h-4" />
              </a>
            )}
            {orgData.branding.instagramUrl && (
              <a href={orgData.branding.instagramUrl} target="_blank" rel="noreferrer" title="Instagram" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors shadow-sm ring-1 ring-slate-200">
                 <Instagram className="w-4 h-4" />
              </a>
            )}
            {orgData.branding.linkedinUrl && (
              <a href={orgData.branding.linkedinUrl} target="_blank" rel="noreferrer" title="LinkedIn" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm ring-1 ring-slate-200">
                 <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" size="sm" className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl px-6 shadow-sm">
            <a href="/admin/partners">Lihat Daftar Mitra Terdaftar</a>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
