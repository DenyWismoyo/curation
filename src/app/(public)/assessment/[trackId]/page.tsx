// src/app/assessment/[trackId]/page.tsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore'; // TAMBAHKAN IMPORT INI
import { db } from '@/lib/firebase'; // TAMBAHKAN IMPORT INI
import { DynamicWizard } from '@/app/components/curation/DynamicWizard';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { useCuration } from '@/hooks/useCuration';
import { motion, AnimatePresence } from 'framer-motion';

// IMPORT CUSTOM ICONS
import { AiSparkIcon, BrainIcon } from '@/types';
// IMPORT CUSTOM HOOK MOBILE BACK
import { useMobileBack } from '@/hooks/useMobileBack';

// ========================================================
// KOMPONEN: SKELETON DASHBOARD LOADING DINAMIS (REAL-TIME MULTI-AGENT STEPPER)
// ========================================================
function InteractiveDashboardLoading({ formData, trackName, assessmentId }: { formData: Record<string, any>, trackName: string, assessmentId?: string | null }) {
  const [loadingText, setLoadingText] = useState('Menginisialisasi Sistem Multi-Agent...');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCacheHit, setIsCacheHit] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const agentSteps = [
    { key: 'ANALYZING_MASTER', name: 'Master Gateway Agent', desc: 'Menganalisis profil & sintesis Executive Summary' },
    { key: 'ANALYZING_METRICS', name: 'Triangulator Agent', desc: 'Memvalidasi integritas data & pemetaan metrik' },
    { key: 'PLANNING_ACTION', name: 'Domain Experts Agent', desc: 'Evaluasi pilar spesifik & forensik dokumen' },
    { key: 'GENERATING_ASSETS', name: 'Tactical Planner Agent', desc: 'Merumuskan Rencana Aksi (Action Plan) taktis' },
    { key: 'COMPLETED', name: 'Post-Processing Agent', desc: 'Finalisasi laporan PDF & pengindeksan data' }
  ];

  // Timer elapsed
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Mendengarkan status agen langsung dari Database secara Real-Time
  useEffect(() => {
    if (!assessmentId) return;

    const unsub = onSnapshot(doc(db, 'assessments', assessmentId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const status = data.status;
        const cacheHit = !!data.isCacheHit;
        
        setIsCacheHit(cacheHit);

        if (cacheHit) {
          setLoadingText('⚡ Instant Cache Hit! Membuka hasil asesmen terakselerasi...');
          setCurrentStepIndex(4);
          return;
        }

        switch (status) {
          case 'ANALYZING_MASTER':
            setCurrentStepIndex(0);
            setLoadingText('Gateway Agent: Menganalisis profil dan menyintesis Executive Summary...');
            break;
          case 'ANALYZING_METRICS':
            setCurrentStepIndex(1);
            setLoadingText('Triangulator Agent: Memvalidasi integritas data & memecah metrik kinerja...');
            break;
          case 'PLANNING_ACTION':
            setCurrentStepIndex(2);
            setLoadingText('Domain Expert Agent: Merumuskan Rencana Aksi (Action Plan) Taktis...');
            break;
          case 'GENERATING_ASSETS':
            setCurrentStepIndex(3);
            setLoadingText('Post-Processing Agent: Membangun visualisasi Radar & Finalisasi Aset...');
            break;
          case 'COMPLETED':
            setCurrentStepIndex(4);
            setLoadingText('Semua komputasi agen selesai. Membuka dasbor...');
            break;
          case 'FAILED':
            setLoadingText('Terjadi kesalahan pada sirkuit AI. Membatalkan proses...');
            break;
          default:
            setLoadingText('Mengamankan jalur data operasional...');
        }
      }
    });

    return () => unsub();
  }, [assessmentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:py-12 sm:px-6 lg:px-12 relative overflow-hidden flex flex-col justify-between">
      
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="max-w-4xl mx-auto w-full z-10 space-y-4 text-center mt-4 sm:mt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <BrainIcon size={14} className="animate-pulse" />
          <span>Omnifit Multi-Agent Engine v2</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Memproses Evaluasi untuk <span className="text-indigo-400">{formData?.namaUsaha || 'Entitas Usaha'}</span>
        </h1>
        
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Sistem sedang membagi tugas analisis ke dalam sirkuit multi-agent AI independen secara berkala.
        </p>

        {isCacheHit && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/50"
          >
            <span>⚡ Instant Cache Hit - Respon Terakselerasi & Performa Maksimal</span>
          </motion.div>
        )}
      </div>

      {/* STEPPER MULTI-AGENT UI */}
      <div className="max-w-3xl mx-auto w-full my-8 z-10 bg-slate-900/80 backdrop-blur-2xl ring-1 ring-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            KEMAJUAN KOMPUTASI AGEN AI
          </span>
          <span className="text-xs font-mono font-medium text-indigo-400 bg-indigo-950/80 ring-1 ring-indigo-800 px-3 py-1 rounded-full">
            Waktu Berjalan: {elapsedSeconds}s
          </span>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-8">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, ((currentStepIndex + 1) / agentSteps.length) * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* AGENT STEPS PIPELINE LIST */}
        <div className="space-y-4">
          {agentSteps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div 
                key={step.key}
                className={`p-4 rounded-2xl transition-all duration-300 flex items-center gap-4 ring-1 ${
                  isCurrent 
                    ? 'bg-indigo-950/40 ring-indigo-500/50 shadow-lg shadow-indigo-950/50 scale-[1.01]' 
                    : isDone 
                      ? 'bg-slate-900/40 ring-slate-800/80 opacity-80' 
                      : 'bg-slate-950/30 ring-slate-800/40 opacity-40'
                }`}
              >
                {/* STEP STATUS ICON */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                  isDone 
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40' 
                    : isCurrent 
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md shadow-indigo-500/50 animate-pulse' 
                      : 'bg-slate-800 text-slate-500'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>

                {/* STEP DETAILS */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-white font-bold' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                      {step.name}
                    </h4>
                    {isCurrent && (
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING STATUS BAR */}
      <div className="z-10 w-full max-w-md mx-auto mb-4">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl ring-1 ring-white/10 flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
            <BrainIcon size={18} className="text-indigo-400 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">STATUS MULTI-AGENT</p>
            <AnimatePresence mode="wait">
              <motion.p 
                key={loadingText}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="text-xs font-medium text-slate-200 truncate"
              >
                {loadingText}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

    </div>
  );
}


// ========================================================
// MAIN PAGE COMPONENT
// ========================================================
export default function AssessmentPage({ params }: { params: Promise<{ trackId: string }> }) {
  const router = useRouter();
  const { trackId } = use(params);
  
  // Panggil state global
  const { state, actions } = useCuration();

  // ==========================================
  // MOBILE BACK HANDLER UNTUK DASHBOARD AI
  // ==========================================
  const isDashboardActive = state.viewState === 'dashboard' && !!state.aiResult;
  useMobileBack(isDashboardActive, () => {
    actions.restart();
    router.push('/assessment');
  });

  // TENTUKAN TEMPLATE BERDASARKAN SLUG
  const template = state.templates.find((t) => {
    const slug = t.trackName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
      
    return slug === trackId;
  });

  useEffect(() => {
    const activeToken = sessionStorage.getItem('active_token');
    if (!activeToken) {
      router.replace('/');
      return;
    }

    if (!state.isLoadingTemplates && state.templates.length > 0) {
      if (!template) {
        router.push('/assessment');
        return;
      }
      const savedAllowed = sessionStorage.getItem('active_allowed_templates');
      if (savedAllowed) {
        try {
          const allowedIds = JSON.parse(savedAllowed) as string[];
          if (!allowedIds.includes(template.id)) {
            alert("Akses Ditolak: Token Anda tidak memiliki izin untuk mengakses modul ini.");
            router.push('/assessment');
            return;
          }
        } catch (e) {
          console.error("Gagal membaca proteksi URL dari session", e);
        }
      }
    }
  }, [state.isLoadingTemplates, state.templates, template, router]);

  if (state.isLoadingTemplates) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-14 h-14 mb-4 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[4px] border-indigo-100 border-t-indigo-600 animate-spin" />
          <BrainIcon size={24} className="text-indigo-600 animate-pulse" />
        </div>
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
        assessmentId={state.currentAssessmentId} // PASSING ID KE SKELETON
      />
    );
  }

// ========================================================
  // LAYAR 2: DASHBOARD HASIL AI (Selesai)
  // ========================================================
  if (isDashboardActive) {
    return (
      <CurationDashboard 
        assessmentId={state.currentAssessmentId || undefined} // <--- TAMBAHKAN "|| undefined" DI SINI
        trackType={template.trackName}
        formData={state.formData}
        aiResult={state.aiResult}
        onRestart={() => {
          actions.restart();
          router.push('/login?next=/assessment');
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