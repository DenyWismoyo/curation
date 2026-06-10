// src/app/assessment/[trackId]/page.tsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicWizard } from '@/app/components/curation/DynamicWizard';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { useCuration } from '@/hooks/useCuration';
import { ShieldCheck, Sparkles, Loader2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ========================================================
// KOMPONEN: SKELETON DASHBOARD LOADING INTERAKTIF
// ========================================================
function InteractiveDashboardLoading({ formData, trackName }: { formData: Record<string, any>, trackName: string }) {
  const [loadingText, setLoadingText] = useState('Mengumpulkan parameter operasional...');

  // Simulasi fase berpikir AI agar terlihat hidup
  useEffect(() => {
    const phases = [
      'Menyintesis Executive Summary...',
      'Menganalisis Lanskap Pasar & Kompetitor...',
      'Mengkalkulasi Kesehatan Finansial & Traksi...',
      'Membangun Matriks Dimensi Kinerja (Radar)...',
      'Merumuskan Mitigasi Risiko & SWOT...',
      'Memfinalisasi Skor & Rute Inkubasi Akhir...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phases.length;
      setLoadingText(phases[index]);
    }, 4000); // Ganti teks setiap 4 detik

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-12 relative">
      
      {/* FLOATING AI STATUS BAR (Menandakan AI sedang bekerja) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl ring-1 ring-white/20 flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">AI SEDANG BEKERJA</p>
            <AnimatePresence mode="wait">
              <motion.p 
                key={loadingText}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-medium text-white truncate"
              >
                {loadingText}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pointer-events-none">
        
        {/* TOP ACTION BAR (Skeleton) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-xl" />
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-xl" />
            <div className="h-10 w-40 bg-slate-200 animate-pulse rounded-xl" />
          </div>
        </div>

        {/* CONTAINER UTAMA */}
        <div className="bg-white p-2 sm:p-6 lg:p-8 rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden relative">
          
          {/* DISCLAIMER BANNER SKELETON */}
          <div className="bg-slate-100 p-5 sm:p-6 rounded-[2rem] mb-8 flex flex-col gap-4 animate-pulse mx-2 sm:mx-0 mt-2 sm:mt-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 bg-slate-200 rounded-md" />
                <div className="h-4 w-full bg-slate-200 rounded-md" />
                <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
              </div>
            </div>
          </div>

          {/* 1. HEADER & EXECUTIVE SUMMARY */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-12 px-2 sm:px-0">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3">
                  CSRS Assessment Report
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  {/* Nama Startup (Data Real) */}
                  <span className="text-indigo-600 font-bold text-base sm:text-lg bg-indigo-50 px-3 py-1.5 rounded-lg ring-1 ring-indigo-100">
                    {formData?.namaUsaha || 'Menganalisis Entitas...'}
                  </span>
                  {/* Track Name (Data Real) */}
                  <span className="bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg uppercase tracking-widest ring-1 ring-slate-200">
                    {trackName}
                  </span>
                </div>
              </div>
              
              {/* Executive Summary Skeleton */}
              <div className="bg-slate-50 ring-1 ring-slate-100 p-6 rounded-2xl h-40 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-indigo-200 rounded animate-pulse" />
                  <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="w-full h-3 bg-slate-200 rounded animate-pulse delay-75" />
                <div className="w-full h-3 bg-slate-200 rounded animate-pulse delay-100" />
                <div className="w-5/6 h-3 bg-slate-200 rounded animate-pulse delay-150" />
                <div className="w-4/6 h-3 bg-slate-200 rounded animate-pulse delay-200" />
              </div>
            </div>

            {/* Skor Panel Skeleton */}
            <div className="w-full lg:w-[340px] shrink-0 p-8 rounded-3xl bg-slate-900 relative overflow-hidden flex flex-col justify-center items-center shadow-lg">
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4"/> AI Readiness Score
              </p>
              <div className="w-24 h-24 mb-6 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
              <div className="h-8 w-40 bg-slate-800 rounded-full animate-pulse" />
            </div>
          </div>

          {/* 2. DYNAMIC ANALYSIS BLOCKS SKELETON */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 px-2 sm:px-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl h-48 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-slate-200 rounded-full animate-pulse" />
                  <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="space-y-2 mt-2">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* 3. DIMENSI KINERJA (RADAR CHART AREA) SKELETON */}
          <div className="bg-slate-50 p-6 sm:p-8 lg:p-10 rounded-[2rem] ring-1 ring-slate-200 shadow-sm mb-12 mx-2 sm:mx-0">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-center">
              {/* Fake Radar Circle */}
              <div className="w-full lg:w-2/5 flex flex-col items-center shrink-0">
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-[10px] border-slate-200/50 flex items-center justify-center animate-pulse">
                  <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full border-[10px] border-slate-200/50 flex items-center justify-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[10px] border-slate-200/50 bg-slate-200/20" />
                  </div>
                </div>
              </div>
              
              {/* Fake Metrics Cards */}
              <div className="w-full lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl ring-1 ring-slate-100 h-24 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                      <div className="h-6 w-8 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


// ========================================================
// MAIN PAGE COMPONENT
// ========================================================
export default function AssessmentPage({ params }: { params: Promise<{ trackId: string }> }) {
  const router = useRouter();
  
  // Unwrap Promise parameter
  const { trackId } = use(params);
  
  // Panggil state global
  const { state, actions } = useCuration();

  // TENTUKAN TEMPLATE BERDASARKAN SLUG
  const template = state.templates.find((t) => {
    const slug = t.trackName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
      
    return slug === trackId;
  });

  // Efek proteksi: Kembalikan ke halaman PILIH KATEGORI jika template tidak ditemukan
  useEffect(() => {
    if (!state.isLoadingTemplates && state.templates.length > 0 && !template) {
      router.push('/assessment');
    }
  }, [state.isLoadingTemplates, state.templates, template, router]);

  if (state.isLoadingTemplates) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-[4px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">Mengkalibrasi Modul Asesmen...</p>
      </div>
    );
  }

  if (!template) return null;

  // ========================================================
  // LAYAR 1: DASHBOARD SKELETON (Proses AI)
  // ========================================================
  if (state.viewState === 'processing') {
    return (
      <InteractiveDashboardLoading 
        formData={state.formData} 
        trackName={template.trackName} 
      />
    );
  }

  // ========================================================
  // LAYAR 2: DASHBOARD HASIL AI (Selesai)
  // ========================================================
  if (state.viewState === 'dashboard' && state.aiResult) {
    return (
      <CurationDashboard 
        trackType={template.trackName}
        formData={state.formData}
        aiResult={state.aiResult}
        onRestart={() => {
          actions.restart();
          router.push('/');
        }}
      />
    );
  }

  // ========================================================
  // LAYAR 3: WIZARD FORMULIR DINAMIS
  // ========================================================
  return (
    <main className="min-h-screen bg-slate-50">
      <DynamicWizard 
        template={template} 
        onBack={() => {
          router.push('/assessment');
        }}
        onComplete={async (data) => {
          actions.setSelectedTemplate(template);
          await actions.submitAssessment(data);
        }}
      />
    </main>
  );
}