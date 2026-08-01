// src/app/components/shared/AdaptiveAssessmentView.tsx
'use client';

import React from 'react';
import { CurationFormData, AIResult } from '@/types/curation';
import {
  AiSparkIcon,
  AdminShieldIcon,
  InfinityWorkflowIcon,
  TechCardIcon,
  BrainIcon,
} from '@/components/icon';
import { TextToBullets } from './UniversalAssessmentView';

export interface AdaptiveAssessmentProps {
  formData: CurationFormData | any;
  aiResult: AIResult | any;
  assessmentId?: string;
  headerActions?: React.ReactNode;
}

export function AdaptiveAssessmentView({
  formData,
  aiResult,
  assessmentId,
  headerActions,
}: AdaptiveAssessmentProps) {
  const isCounseling = aiResult?.formPurpose === 'counseling';
  const isMonitoring = aiResult?.formPurpose === 'monitoring';
  const displayName = formData?.namaPengisi || formData?.namaUsaha || 'Profil Anda';

  const personalRisks = (aiResult?.riskAssessment?.criticalRisks || []).slice(0, 3);
  const personalMitigations = (aiResult?.riskAssessment?.mitigationStrategies || []).slice(0, 3);
  const quickWins = (aiResult?.nextActionSteps || []).slice(0, 10);

  const reportToneLabel = isCounseling
    ? 'Pendekatan empatik dan reflektif'
    : isMonitoring
      ? 'Pendekatan progres dan perbaikan'
      : 'Pendekatan personal dan praktis';

  const reportTitle = isCounseling
    ? 'Laporan Perkembangan Personal'
    : isMonitoring
      ? 'Laporan Progres Personal'
      : 'Laporan Analisis Personal';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_38%)] pointer-events-none" />

      {headerActions && (
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
          <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row ml-auto">
            {headerActions}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-6 w-full">
        <div className="bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col gap-6">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full ring-1 ring-indigo-100">
              <AiSparkIcon size={14} className="text-indigo-500" /> {reportToneLabel}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight text-balance">
              {reportTitle}
            </h1>
            <p className="text-slate-600 font-medium text-base sm:text-lg leading-relaxed max-w-2xl">
              {displayName} · hasil ini dirancang agar terasa personal, cepat dibaca, dan langsung membantu Anda mengambil langkah berikutnya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-5 ring-1 ring-slate-200/70">
              <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
                <BrainIcon size={16} className="text-indigo-500" /> Ringkasan Eksekutif
              </h3>
              <div className="text-slate-600 text-sm font-medium leading-relaxed">
                <TextToBullets text={aiResult?.executiveSummary || 'Ringkasan analisis belum tersedia.'} colorClass="text-indigo-500" />
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_40%)]" />
              <div className="relative z-10">
                <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-3 text-white/80">
                  <InfinityWorkflowIcon size={16} className="text-emerald-300" /> Fokus Utama
                </h3>
                <p className="text-xl font-black leading-tight tracking-tight text-balance">
                  {isCounseling ? 'Menjaga momentum dan keseimbangan diri' : isMonitoring ? 'Membangun konsistensi progres' : 'Memperjelas langkah paling penting saat ini'}
                </p>
                <p className="text-xs text-white/70 mt-3 leading-relaxed">
                  Ringkasan ini dibuat untuk membantu Anda mengambil keputusan yang lebih mantap dan lebih realistis.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white ring-1 ring-slate-200 p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-4">
              <TechCardIcon size={16} className="text-indigo-500" /> Snapshot Cepat
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">

              </div>
            </div>
          </div>

        </div>
      </div>

      {personalRisks.length > 0 && (
        <div className="p-6 sm:p-8 rounded-[2rem] ring-1 ring-amber-200 bg-amber-50/35 w-full shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <AdminShieldIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Area yang Perlu Dijaga</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Disajikan lembut agar mudah diterima dan tidak terasa menghakimi.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalRisks.map((risk: string, idx: number) => (
              <div key={idx} className="flex flex-col ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-amber-50/60 p-4 border-b border-amber-100/60">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Yang Perlu Diwaspadai</h4>
                  <div className="text-sm font-semibold text-slate-800">
                    <TextToBullets text={risk} colorClass="text-amber-500" />
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1.5">
                    <AiSparkIcon size={12} /> Langkah Penyangga
                  </h4>
                  <div className="text-sm font-medium text-slate-600">
                    <TextToBullets text={personalMitigations[idx]} colorClass="text-emerald-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quickWins.length > 0 && (
        <div className="bg-white ring-1 ring-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm w-full">
          <h3 className="text-slate-900 font-black uppercase tracking-widest text-sm flex items-center gap-2 mb-4">
            <BrainIcon size={20} className="text-indigo-500" /> 10 Langkah Strategis
          </h3>
          <div className="space-y-4">
            {quickWins.map((step: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-black text-slate-900">{step.timeframe}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">Aksi</span>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{step.task}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
