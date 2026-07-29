'use client';

import { DashboardAssessmentRecord } from '@/lib/b2b-dashboard';
import { B2BInteractionModule } from './B2BInteractionModule';
import { ChevronLeft, ExternalLink, Activity, Sparkles, Flag, ArrowRight } from 'lucide-react';
import { ActionPlanBuilder } from '../curation/ActionPlanBuilder';

interface B2BParticipantProfileProps {
  participant: DashboardAssessmentRecord;
  corporateEntity: string;
  persona: string;
  onBack: () => void;
}

export function B2BParticipantProfile({
  participant,
  corporateEntity,
  persona,
  onBack
}: B2BParticipantProfileProps) {
  const score = participant.curatorAssessment?.verifiedScore ?? participant.score ?? 0;
  const aiResultPayload = participant.aiResult || participant.analyticsSummary || {};
  
  const readiness = aiResultPayload.readinessLevel || participant.readinessLevel || "Belum Dievaluasi";
  const customActionPlan = aiResultPayload.customActionPlan || [];

  return (
    <div className="bg-white rounded-3xl ring-1 ring-slate-200 overflow-hidden flex flex-col h-full shadow-xl">
      {/* Simple Header */}
      <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali ke Pipeline
        </button>
        <div className="flex gap-2">
          <a href={`/result/${participant.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
            Full Result <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left Column: Simplified Highlight View */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Quick Summary Header */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center gap-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4 pointer-events-none">
                <Sparkles size={120} />
              </div>
              <div className="flex flex-col items-center justify-center shrink-0 w-32 h-32 bg-white/10 rounded-full ring-4 ring-white/20 relative z-10">
                <span className="text-4xl font-black">{Math.min(score, 100)}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">Skor AI</span>
              </div>
              <div className="flex-1 text-center md:text-left relative z-10">
                <h2 className="text-2xl font-black mb-2">{participant.namaUsaha || 'Peserta Tanpa Nama'}</h2>
                <div className="inline-block bg-indigo-500/30 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-indigo-400/50 mb-3">
                  {readiness.split('|')[0]?.trim()}
                </div>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  {aiResultPayload.executiveSummary || "Ringkasan eksekutif belum tersedia untuk peserta ini."}
                </p>
              </div>
            </div>

            {/* Action Steps Highlight Using ActionPlanBuilder */}
            <ActionPlanBuilder 
              assessmentId={participant.id} 
              initialData={customActionPlan.length > 0 ? customActionPlan : undefined} 
              aiResult={aiResultPayload} 
            />

          </div>

          {/* Right Column: Interactions & Actions */}
          <div className="xl:col-span-1 space-y-6">
            <B2BInteractionModule
              assessmentId={participant.id}
              corporateEntity={corporateEntity}
              participantName={participant.namaUsaha || 'Unknown'}
              participantUid={participant.id}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
