'use client';

import React, { useState, useEffect } from 'react';
import { X, Briefcase, CheckCircle2, Edit3, ShieldCheck, BarChart3 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminExportPDF } from './AdminExportPDF';

// IMPORT KOMPONEN UNIVERSAL (Sesuaikan path jika perlu)
import { UniversalAssessmentView } from '@/app/components/shared/UniversalAssessmentView';

interface AdminAssessmentDetailProps {
  data: any;
  onClose: () => void;
}

export function AdminAssessmentDetail({ data, onClose }: AdminAssessmentDetailProps) {
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input' | 'analytics'>('evaluasi');
  
  // STATE UNTUK GABUNGAN DATA AI PUBLIK DAN INTERNAL
  const [mergedAiResult, setMergedAiResult] = useState(data.aiResult || {});
  
  // Deteksi ID dokumen dari props (bisa bernama 'id' atau 'assessmentId')
  const documentId = data.id || data.assessmentId;
  
  // Destructuring sisa data
  const { formData, score, readinessLevel, trackType, namaUsaha, createdAt, corporateEntity, status, curatorAssessment, curatorNotes, analyticsSummary } = data;

  // EFEK UNTUK MENARIK DATA RAHASIA SAAT PANEL INI DIBUKA
  useEffect(() => {
    const fetchInternalDetails = async () => {
      // Jika ID tidak ada, batalkan penarikan data dan tampilkan pesan error di console
      if (!documentId) {
        console.error("🚨 ALERT: ID Dokumen tidak ditemukan di props 'data'. Tabel Admin Anda tidak mengirimkan ID dokumen.");
        return;
      }
      
      try {
        console.log(`Mengambil data internal untuk ID: ${documentId}...`);
        const internalDocRef = doc(db, 'assessments', documentId, 'internal', 'details');
        const internalSnap = await getDoc(internalDocRef);
        
        if (internalSnap.exists()) {
          console.log("✅ Data internal berhasil ditemukan dan digabungkan!");
          // Gabungkan data publik dari tabel dengan data rahasia dari sub-collection
          setMergedAiResult((prev: any) => ({ ...prev, ...internalSnap.data() }));
        } else {
          console.warn("⚠️ Dokumen internal/details tidak ditemukan di database untuk ID ini.");
        }
      } catch (error) {
        console.error("❌ Gagal menarik data internal:", error);
      }
    };

    fetchInternalDetails();
  }, [documentId]);

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
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{namaUsaha || 'Entitas Tanpa Nama'}</h2>
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
              <span className="inline-flex px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{trackType || 'Asesmen'}</span>
              <span className="inline-flex px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 ring-1 ring-slate-200">{corporateEntity || 'Program Umum'}</span>
              {createdAt && (
                <span className="text-xs text-slate-400 font-medium">Masuk: {new Date(createdAt).toLocaleDateString('id-ID')}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Update props PDF agar mendapatkan data gabungan terbaru */}
            <AdminExportPDF data={{ ...data, aiResult: mergedAiResult }} />
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
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Ringkasan Analytics</span>
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
              aiResult={mergedAiResult} // MENGGUNAKAN DATA GABUNGAN
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

          {activeTab === 'analytics' && (
            <div className="max-w-5xl mx-auto bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600"/> Ringkasan Analytics Performa
              </h3>

              {!analyticsSummary ? (
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 text-sm font-semibold text-slate-600">
                  Ringkasan analytics belum tersedia untuk assessment ini.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-indigo-50 ring-1 ring-indigo-200 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Performance Score</p>
                      <p className="text-2xl font-black text-indigo-700 mt-1">{analyticsSummary.performanceScore ?? '-'} / 100</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">Performance Band</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">{analyticsSummary.performanceBand ?? '-'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Analytics Version</p>
                      <p className="text-2xl font-black text-slate-700 mt-1">{analyticsSummary.version ?? '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                      <p className="text-sm font-black text-slate-900 mb-3">Dimensi Skor</p>
                      <div className="space-y-2 text-sm text-slate-700 font-semibold">
                        <p>Business Readiness: {analyticsSummary.dimensions?.businessReadiness ?? '-'} / 100</p>
                        <p>Data Quality: {analyticsSummary.dimensions?.dataQuality ?? '-'} / 100</p>
                        <p>Consistency: {analyticsSummary.dimensions?.consistency ?? '-'} / 100</p>
                        <p>Execution Clarity: {analyticsSummary.dimensions?.executionClarity ?? '-'} / 100</p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                      <p className="text-sm font-black text-slate-900 mb-3">Ringkasan Temuan</p>
                      <p className="text-sm text-slate-700 font-semibold mb-3">{analyticsSummary.summary?.headline || '-'}</p>
                      <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
                        {(analyticsSummary.summary?.keyFindings || []).map((finding: string, idx: number) => (
                          <li key={`finding-${idx}`}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
                      <p className="text-sm font-black text-amber-800 mb-3">Risiko Utama</p>
                      <ul className="space-y-2 text-sm text-amber-900 list-disc pl-5">
                        {(analyticsSummary.risks || []).length > 0 ? (
                          (analyticsSummary.risks || []).map((risk: string, idx: number) => <li key={`risk-${idx}`}>{risk}</li>)
                        ) : (
                          <li>Tidak ada risiko kritikal pada ringkasan analytics.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-indigo-50 ring-1 ring-indigo-200 p-4">
                      <p className="text-sm font-black text-indigo-800 mb-3">Fokus Rekomendasi</p>
                      <ul className="space-y-2 text-sm text-indigo-900 list-disc pl-5">
                        {(analyticsSummary.summary?.recommendedFocus || []).map((focus: string, idx: number) => (
                          <li key={`focus-${idx}`}>{focus}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}