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
      
      {state.viewState === 'processing' && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50 p-6 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="h-16 w-16 border-[6px] border-indigo-900 border-t-indigo-500 rounded-full animate-spin mb-8 relative z-10" />
          <h2 className="text-3xl lg:text-4xl font-black mb-4 tracking-tight relative z-10">AI Memproses Data...</h2>
          <p className="text-indigo-200 text-lg max-w-md relative z-10 font-medium">Model Gemini sedang mengkalkulasi kelayakan bisnis dan meracik rekomendasi strategis.</p>
        </div>
      )}
    </div>
  );
}
