'use client';

import React, { useState } from 'react';
import { X, Briefcase, CheckCircle2, Edit3, ShieldCheck } from 'lucide-react';
import { AdminExportPDF } from './AdminExportPDF';

// IMPORT KOMPONEN UNIVERSAL (Sesuaikan path jika perlu)
import { UniversalAssessmentView } from '@/app/components/shared/UniversalAssessmentView';

interface AdminAssessmentDetailProps {
  data: any;
  onClose: () => void;
}

export function AdminAssessmentDetail({ data, onClose }: AdminAssessmentDetailProps) {
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input'>('evaluasi');
  
  const { formData, aiResult, score, readinessLevel, trackType, namaUsaha, createdAt, corporateEntity, status, curatorAssessment, curatorNotes } = data;
  
  const finalCuratorScore = curatorAssessment?.verifiedScore || 0;
  const isCuratorValidated = status === 'Curator_Validated' || curatorAssessment !== undefined;

  const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-7xl h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER MODAL */}
        <div className="bg-white px-6 py-5 sm:px-8 border-b border-slate-200 flex justify-between items-start lg:items-center flex-col lg:flex-row gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{namaUsaha}</h2>
              {status === 'Curator_Validated' ? (
                <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 size={12}/> Kurasi Selesai
                </span>
              ) : status === 'Curator_Draft' ? (
                <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                  <Edit3 size={12}/> Draf Kurasi
                </span>
              ) : null}
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="inline-flex px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{trackType}</span>
              <span className="inline-flex px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 ring-1 ring-slate-200">{corporateEntity || 'Program Umum'}</span>
              <span className="text-xs text-slate-400 font-medium">Masuk: {new Date(createdAt).toLocaleDateString('id-ID')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminExportPDF data={data} />
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors active:scale-95" title="Tutup Panel">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 px-6 sm:px-8 pt-4 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('evaluasi')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'evaluasi' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Lembar Hasil Evaluasi (Unified)</span>
          </button>
          <button onClick={() => setActiveTab('input')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Input Peserta</span>
          </button>
        </div>

        {/* KONTEN */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          {activeTab === 'evaluasi' && (
            <UniversalAssessmentView
              mode="admin"
              trackType={trackType}
              corporateEntity={corporateEntity}
              formData={formData}
              aiResult={aiResult}
              curatorData={{
                isEditing: false, 
                curatorScore: finalCuratorScore,
                curatorLevel: curatorAssessment?.verifiedLevel || readinessLevel || '',
                curatorRoute: curatorAssessment?.finalRoute || '',
                curatorNotes: curatorNotes || '',
                customBlockNotes: curatorAssessment?.customBlockNotes || {},
                documentNotes: curatorAssessment?.documentNotes || '',
                metricsNotes: curatorAssessment?.metricsNotes || '',
                swotNotes: curatorAssessment?.swotNotes || '',
                selectedTags: curatorAssessment?.tags || [],
                isCuratorValidated: isCuratorValidated,
              }}
            />
          )}

          {activeTab === 'input' && (
            <div className="max-w-5xl mx-auto bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600"/> Data Input Registrasi Peserta
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(formData || {}).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return null;
                  const isUrl = typeof value === 'string' && value.startsWith('http');
                  const isArray = Array.isArray(value);
                  return (
                    <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{formatKey(key)}</p>
                      {isUrl ? (
                         <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline">Lihat Lampiran</a>
                      ) : isArray ? (
                         <div className="flex flex-wrap gap-1.5 mt-1">{(value as string[]).map((item, i) => <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>)}</div>
                      ) : (
                         <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}