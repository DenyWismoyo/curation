// src/app/result/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { CurationDashboard } from '@/features/assessment/components/CurationDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { BrainIcon, DocExportIcon, EcosystemIcon } from '@/components/icon';

function ResultProcessingView({ formData, status, isCacheHit }: { formData?: Record<string, any>, status?: string, isCacheHit?: boolean }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusLabelMap: Record<string, string> = {
    ANALYZING_METRICS: 'Domain Experts Agent sedang membedah jawaban awal...',
    ANALYZING_MASTER: 'Triangulator Agent sedang menyusun sintesis inti...',
    PLANNING_ACTION: 'Tactical Planner Agent sedang menyiapkan rencana aksi...',
    ASSEMBLING_REPORT: 'Synthesis Agent sedang merangkai struktur laporan...',
    GENERATING_ASSETS: 'Post-Processing Agent sedang finalisasi output...',
    COMPLETED: 'Hasil asesmen selesai. Menyiapkan tampilan dashboard...',
  };

  const currentLabel = isCacheHit
    ? 'Cache terdeteksi. Membuka hasil jauh lebih cepat...'
    : statusLabelMap[status || ''] || 'Sistem sedang memproses asesmen Anda...';

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:py-12 sm:px-6 lg:px-12 relative overflow-hidden flex flex-col justify-center">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="max-w-3xl mx-auto w-full bg-card/80 dark:bg-slate-900/80 backdrop-blur-2xl ring-1 ring-border dark:ring-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <BrainIcon size={14} className="animate-pulse" />
          Omnifit Multi-Agent Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Memproses Asesmen untuk <span className="text-indigo-600 dark:text-indigo-400">{formData?.namaUsaha || 'Entitas Usaha'}</span>
        </h1>
        <p className="text-muted-foreground font-medium">{currentLabel}</p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground font-mono">
          <span>Status: {status || 'INITIATING'}</span>
          <span>•</span>
          <span>{elapsedSeconds}s</span>
        </div>
      </div>
    </div>
  );
}

export default function SharedResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role } = useAuth(); 

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;

    setError('');
    setLoading(true);

    const docRef = doc(db, 'assessments', params.id as string);
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (!docSnap.exists()) {
        setError('Dokumen hasil kurasi tidak ditemukan atau tautan tidak valid.');
        setLoading(false);
        return;
      }

      try {
        let combinedData: any = docSnap.data();

        if (!combinedData.aiPromptConfig || Object.keys(combinedData.aiPromptConfig).length === 0) {
          try {
            if (combinedData.templateId) {
              const templateDoc = await getDoc(doc(db, 'form_templates', combinedData.templateId));
              if (templateDoc.exists()) {
                combinedData.aiPromptConfig = templateDoc.data()?.aiPromptConfig || {};
              }
            }

            if (!combinedData.aiPromptConfig || Object.keys(combinedData.aiPromptConfig).length === 0) {
              const templateQuery = query(
                collection(db, 'form_templates'),
                where('trackName', '==', combinedData.trackType || '')
              );
              const templateSnap = await getDocs(templateQuery);
              if (!templateSnap.empty) {
                combinedData.aiPromptConfig = templateSnap.docs[0].data()?.aiPromptConfig || {};
              }
            }
          } catch (templateErr) {
            console.warn('Gagal mengambil config template untuk riwayat hasil:', templateErr);
          }
        }

        const isInternalStaff = user && (role === 'admin_csrs' || role === 'assessor');
        const isSuperAdmin = user?.email === 'deny.wismoyo@gmail.com';

        if ((isInternalStaff || isSuperAdmin) && combinedData.status === 'COMPLETED') {
          try {
            const internalDocRef = doc(db, 'assessments', params.id as string, 'internal', 'details');
            const internalSnap = await getDoc(internalDocRef);
            if (internalSnap.exists()) {
              combinedData.aiResult = { ...combinedData.aiResult, ...internalSnap.data() };
            }
          } catch (internalErr) {
            console.warn('Gagal menarik data internal (Abaikan jika Anda bukan admin penuh).', internalErr);
          }
        }

        if (combinedData.status === 'FAILED') {
          setError(combinedData.errorMessage || 'Pipeline asesmen gagal diproses.');
        } else {
          setError('');
        }

        setData(combinedData);
      } catch (err) {
        console.error('Gagal menarik data:', err);
        setError('Terjadi kesalahan saat memuat data. Periksa koneksi atau hak akses Anda.');
      } finally {
        setLoading(false);
      }
    }, (snapshotErr) => {
      console.error('Gagal mendengarkan status asesmen:', snapshotErr);
      setError('Gagal memantau progres asesmen secara real-time.');
      setLoading(false);
    });

    return () => unsub();
  }, [params.id, user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="w-14 h-14 mb-4 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[4px] border-secondary border-t-primary animate-spin" />
          <BrainIcon size={24} className="text-primary animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Memuat Data Analitik...</h2>
        <p className="text-sm font-medium text-muted-foreground mt-2">Menarik data dari server aman.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-[2rem] shadow-sm ring-1 ring-rose-100 flex items-center justify-center mb-6">
          <DocExportIcon size={36} />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">Laporan Tidak Tersedia</h2>
        <p className="text-muted-foreground font-medium mb-8 max-w-md">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-6 py-3 btn-primary-rich transition-all"
        >
          <EcosystemIcon className="w-5 h-5 text-white" /> Kembali ke Beranda
        </button>
      </div>
    );
  }

  const isProcessing = data?.status && !['COMPLETED', 'FAILED'].includes(data.status);

  if (isProcessing) {
    return (
      <ResultProcessingView
        formData={data?.formData}
        status={data?.status}
        isCacheHit={Boolean(data?.isCacheHit)}
      />
    );
  }

  return (
    <div className="relative">
      <CurationDashboard
        assessmentId={params.id as string}
        trackType={data.trackType || 'Model Bisnis'}
        formData={data.formData || {}}
        aiResult={data.aiResult || {}}
        aiPromptConfig={data.aiPromptConfig || {}}
        programName={data.corporateEntity || ''}
        documentGenerationQuota={data.documentGenerationQuota || 0}
        hasPaidForDocument={data.hasPaidForDocument || false}
        allowedDocumentTemplates={data.allowedDocumentTemplates || []}
        onRestart={() => router.push('/')}
      />
    </div>
  );
}