// src/app/result/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { BrainIcon, DocExportIcon, EcosystemIcon } from '@/components/icon';

export default function SharedResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role } = useAuth(); 

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      if (!params.id) return;
      
      // KUNCI PERBAIKAN 1: Bersihkan state error setiap kali fungsi dijalankan
      setError(''); 

      try {
        // 1. Tarik Data Publik 
        const docRef = doc(db, 'assessments', params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          let combinedData = docSnap.data();
          
          // 2. CEK KEWENANGAN
          const isInternalStaff = user && (role === 'admin_csrs' || role === 'assessor');
          const isSuperAdmin = user?.email === 'deny.wismoyo@gmail.com';
          
          if (isInternalStaff || isSuperAdmin) {
             // KUNCI PERBAIKAN 2: Gunakan try-catch mandiri agar jika gagal, page tidak hancur
             try { 
               const internalDocRef = doc(db, 'assessments', params.id as string, 'internal', 'details');
               const internalSnap = await getDoc(internalDocRef);
               
               if (internalSnap.exists()) {
                  combinedData.aiResult = { ...combinedData.aiResult, ...internalSnap.data() };
               }
             } catch (internalErr) {
               console.warn("Gagal menarik data internal (Abaikan jika Anda bukan admin penuh).", internalErr);
             }
          }
          
          setData(combinedData);
        } else {
          setError('Dokumen hasil kurasi tidak ditemukan atau tautan tidak valid.');
        }
      } catch (err) {
        console.error("Gagal menarik data:", err);
        setError('Terjadi kesalahan saat memuat data. Periksa koneksi atau hak akses Anda.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResult();
  }, [params.id, user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-14 h-14 mb-4 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[4px] border-indigo-100 border-t-indigo-600 animate-spin" />
          <BrainIcon size={24} className="text-indigo-600 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Memuat Data Analitik...</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Menarik data dari server aman.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] shadow-sm ring-1 ring-rose-100 flex items-center justify-center mb-6">
          <DocExportIcon size={36} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Laporan Tidak Tersedia</h2>
        <p className="text-slate-500 font-medium mb-8 max-w-md">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-slate-900/20 hover:shadow-indigo-600/30 transition-all"
        >
          <EcosystemIcon className="w-5 h-5 text-white" /> Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <CurationDashboard
        assessmentId={params.id as string}
        trackType={data.trackType || 'Model Bisnis'}
        formData={data.formData || {}}
        aiResult={data.aiResult || {}}
        programName={data.corporateEntity || ''}
        documentGenerationQuota={data.documentGenerationQuota || 0}
        hasPaidForDocument={data.hasPaidForDocument || false}
        allowedDocumentTemplates={data.allowedDocumentTemplates || []}
        onRestart={() => router.push('/')}
      />
    </div>
  );
}