// src/app/curator/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function CuratorLoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Cek jika sudah login, langsung lempar ke dashboard
  useEffect(() => {
    const session = localStorage.getItem('curatorSession');
    if (session) {
      router.push('/curator/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Masukkan kode akses kurator Anda.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'curator_tokens', cleanCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Simpan sesi login ke LocalStorage
        const sessionData = {
          token: docSnap.id,
          programName: data.programName,
          role: data.role,
          loginAt: new Date().toISOString()
        };
        localStorage.setItem('curatorSession', JSON.stringify(sessionData));
        
        // Redirect ke Dashboard Kurator
        router.push('/curator/dashboard');
      } else {
        setError('Kode akses tidak valid atau tidak ditemukan.');
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Header/Banner */}
        <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 pointer-events-none" />
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white/30 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Portal Kurator</h1>
          <p className="text-emerald-100 text-sm font-medium">Validasi & Asesmen Lapangan Terpusat</p>
        </div>

        {/* Form Login */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Kode Akses
              </label>
              <Input 
                type="text"
                placeholder="Masukkan Kode (Misal: CUR-SOLO-2026)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="h-12 rounded-xl bg-slate-50 uppercase font-mono text-center tracking-widest text-lg font-bold border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-sm font-bold p-3 rounded-xl text-center ring-1 ring-rose-200 animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memverifikasi...</>
              ) : (
                <>Masuk ke Dashboard <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Curation System © 2026</p>
        </div>
      </div>
    </div>
  );
}