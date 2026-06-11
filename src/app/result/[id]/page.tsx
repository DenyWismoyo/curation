'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { Loader2, Share2, Home } from 'lucide-react';

export default function SharedResultPage() {
  const params = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      {/* Komponen Dasbor yang sudah dikirim prop programName (corporateEntity) */}
      <CurationDashboard
        assessmentId={params.id as string} // <--- TAMBAHKAN BARIS INI
        trackType={data.trackType || 'Model Bisnis'}
        formData={data.formData}
        aiResult={data.aiResult}
        programName={data.corporateEntity} 
        // PASSING STATE MONETISASI
        documentGenerationQuota={data.documentGenerationQuota}
        hasPaidForDocument={data.hasPaidForDocument}
        onRestart={() => router.push('/')} 
      />
    </div>
  );
}