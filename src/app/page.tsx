'use client';

import React from 'react';
import { useCuration } from '@/hooks/useCuration';
import { CurationLanding } from '@/components/curation/CurationLanding';
import { DynamicTrackSelector } from '@/components/curation/DynamicTrackSelector';
import { DynamicWizard } from '@/components/curation/DynamicWizard';
import { CurationDashboard } from '@/components/curation/CurationDashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { state, actions } = useCuration();

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      
      {state.viewState === 'landing' && (
        <CurationLanding 
          onStart={() => actions.setViewState('track-select')} 
          history={state.history}
          onLoadHistory={actions.loadHistoryItem} 
        />
      )}

      {state.viewState === 'track-select' && (
        state.isLoadingTemplates ? (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
             <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
             <p className="font-bold">Memuat Model Bisnis...</p>
          </div>
        ) : (
          <DynamicTrackSelector 
            templates={state.templates}
            onSelect={(template) => { 
              actions.setSelectedTemplate(template); 
              actions.setViewState('wizard'); 
            }} 
            onBack={() => actions.setViewState('landing')} 
          />
        )
      )}

      {state.viewState === 'wizard' && state.selectedTemplate && (
        <DynamicWizard 
          template={state.selectedTemplate} 
          onComplete={actions.submitAssessment} 
          onBack={() => actions.setViewState('track-select')} 
        />
      )}

      {state.viewState === 'dashboard' && state.aiResult && (
        <CurationDashboard 
          trackType={state.selectedTemplate?.trackName || 'Umum'} 
          formData={state.formData} 
          aiResult={state.aiResult} 
          onRestart={actions.restart} 
        />
      )}
      
      {/* ========================================================
          LOADING SCREEN ENTERPRISE (PERUBAHAN HANYA DI BLOK INI)
      ======================================================== */}
      {state.viewState === 'processing' && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-slate-50 p-6 text-center relative overflow-hidden animate-in fade-in duration-1000">
          
          {/* Ambient Glow Latar Belakang */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[300px] max-h-[300px] bg-emerald-900/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center max-w-xl w-full">
            
            {/* Animasi Radar Concentric yang Mewah */}
            <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
              {/* Ring Putus-putus Luar */}
              <div className="absolute inset-0 border-[2px] border-dashed border-slate-800 rounded-full animate-spin" style={{ animationDuration: '15s' }} />
              {/* Ring Pendar Biru */}
              <div className="absolute inset-2 border-[3px] border-transparent border-t-indigo-600 border-r-indigo-600 rounded-full animate-spin shadow-[0_0_30px_rgba(79,70,229,0.2)]" style={{ animationDuration: '2.5s' }} />
              {/* Ring Pendar Hijau (Berputar Berlawanan) */}
              <div className="absolute inset-6 border-[2px] border-transparent border-b-emerald-500 border-l-emerald-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
              
              {/* Inti Server */}
              <div className="w-12 h-12 bg-slate-900/80 rounded-full flex items-center justify-center backdrop-blur-md ring-1 ring-white/10 shadow-inner">
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(79,70,229,1)]" />
              </div>
            </div>

            {/* Tipografi Eksklusif */}
            <div className="space-y-4 mb-10">
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-slate-400">
                Sintesis Matriks Eksekutif
              </h2>
              <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-md mx-auto">
                Mesin analitik sedang melakukan komputasi mendalam terhadap parameter operasional dan merumuskan cetak biru strategis entitas Anda.
              </p>
            </div>

            {/* Simulasi Proses Enterprise */}
            <div className="w-full max-w-sm space-y-4 bg-slate-900/50 p-6 rounded-3xl ring-1 ring-white/5 backdrop-blur-sm text-left shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Validasi Data Inti
                </span>
                <span className="text-[11px] md:text-xs font-black text-emerald-500">SELESAI</span>
              </div>
              
              <div className="w-full h-[1px] bg-white/5" />

              <div className="flex items-center justify-between">
                <span className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kalibrasi Sektoral
                </span>
                <span className="text-[11px] md:text-xs font-black text-emerald-500">SELESAI</span>
              </div>

              <div className="w-full h-[1px] bg-white/5" />

              <div className="flex items-center justify-between">
                <span className="text-[11px] md:text-xs font-bold text-white uppercase tracking-widest flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" /> Kalkulasi Strategis
                </span>
                <span className="text-[11px] md:text-xs font-black text-indigo-400 animate-pulse">MEMPROSES...</span>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mt-12">
              Strictly Confidential &bull; System Active
            </p>
          </div>
        </div>
      )}
    </div>
  );
}