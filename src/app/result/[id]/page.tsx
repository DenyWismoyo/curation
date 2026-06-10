'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { Loader2, Share2, Copy, CheckCircle2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SharedResultPage() {
  const params = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      if (!params.id) return;
      
      try {
        const docRef = doc(db, 'assessments', params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          setError('Dokumen hasil kurasi tidak ditemukan atau tautan tidak valid.');
        }
      } catch (err) {
        console.error("Gagal menarik data:", err);
        setError('Terjadi kesalahan saat memuat data. Periksa koneksi Anda.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [params.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Memuat Data Analitik...</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Menarik data dari server aman.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Share2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Laporan Tidak Tersedia</h2>
        <p className="text-slate-500 font-medium mb-8 max-w-md">{error}</p>
        <button 
          onClick={() => router.push('/')} 
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
        >
          <Home className="w-4 h-4" /> Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      
      {/* Floating Action Bar untuk Share URL */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-900/10 ring-1 ring-slate-200 p-2 rounded-2xl flex items-center gap-2 pointer-events-auto">
          
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-sm font-bold transition-all"
          >
            <Home className="w-4 h-4" /> Beranda
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button 
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              copied 
                ? 'bg-emerald-500 text-white ring-1 ring-emerald-600 shadow-md shadow-emerald-500/20' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div key="copied" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Tersalin!
                </motion.div>
              ) : (
                <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Bagikan Laporan
                </motion.div>
              )}
            </AnimatePresence>
          </button>

        </div>
      </div>

      {/* Komponen Dasbor yang sudah dikirim prop programName (corporateEntity) */}
      <CurationDashboard
        trackType={data.trackType || 'Model Bisnis'}
        formData={data.formData}
        aiResult={data.aiResult}
        programName={data.corporateEntity} // INI YANG MENAMPILKAN NAMA PROGRAM DI DASHBOARD
        onRestart={() => router.push('/')} 
      />
    </div>
  );
}