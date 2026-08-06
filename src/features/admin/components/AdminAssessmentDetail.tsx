'use client';

import React, { useState, useEffect } from 'react';
import { X, Briefcase, CheckCircle2, Edit3, ShieldCheck, BarChart3, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AdminExportPDF } from './AdminExportPDF';
import { resolveAssessmentOutputMode } from '@/features/assessment/utils/assessmentOutputMode';

// IMPORT KOMPONEN UNIVERSAL (Sesuaikan path jika perlu)
import { UniversalAssessmentView } from '@/features/assessment/components/shared/UniversalAssessmentView';
import { AdaptiveAssessmentView } from '@/features/assessment/components/shared/AdaptiveAssessmentView';
import { AppModal, AppTabs, StatusBadge, SectionLabel } from '@/components/ui/design-system';
import { AppKeyValueList, AppKeyValueItem, AppInfoCard } from '@/components/ui/app-data-display';

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
      // Jika ID tidak ada, batalkan penarikan data
      if (!documentId) {
        return;
      }
      
      try {
        const internalDocRef = doc(db, 'assessments', documentId, 'internal', 'details');
        const internalSnap = await getDoc(internalDocRef);
        
        if (internalSnap.exists()) {
          // Gabungkan data publik dari tabel dengan data rahasia dari sub-collection
          setMergedAiResult((prev: any) => ({ ...prev, ...internalSnap.data() }));
        }
      } catch (error) {
        // Fail silently or handle accordingly
      }
    };

    fetchInternalDetails();
  }, [documentId]);

  const finalCuratorScore = curatorAssessment?.verifiedScore || 0;
  const isCuratorValidated = status === 'Curator_Validated' || curatorAssessment !== undefined;

  const isAdaptiveMode = resolveAssessmentOutputMode(data?.aiPromptConfig, mergedAiResult, formData) === 'adaptive';

  const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <AppModal 
      open={true} 
      onClose={onClose} 
      size="2xl" 
      hideCloseButton={true}
      header={
        <div className="bg-white px-6 py-5 sm:px-8 border-b border-slate-200 flex justify-between items-start lg:items-center flex-col lg:flex-row gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{namaUsaha || 'Entitas Tanpa Nama'}</h2>
              {status === 'Curator_Validated' ? (
                <StatusBadge variant="success" icon={<CheckCircle2 size={12}/>}>
                  Kurasi Selesai
                </StatusBadge>
              ) : status === 'Curator_Draft' ? (
                <StatusBadge variant="warning" icon={<Edit3 size={12}/>}>
                  Draf Kurasi
                </StatusBadge>
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
          
          <div className="flex items-center gap-3 shrink-0">
            {/* Update props PDF agar mendapatkan data gabungan terbaru */}
            <AdminExportPDF data={{ ...data, aiResult: mergedAiResult }} />
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors active:scale-95" title="Tutup Panel">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      }
    >
        {/* TABS */}
        <div className="bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar w-full pt-2">
          <AppTabs 
            active={activeTab} 
            onChange={(val: any) => setActiveTab(val)}
            variant="underline"
            tabs={[
              { id: 'evaluasi', label: 'Lembar Hasil Evaluasi', icon: <ShieldCheck className="w-4 h-4"/> },
              { id: 'input', label: 'Data Input Peserta', icon: <Briefcase className="w-4 h-4"/> },
              { id: 'analytics', label: 'Ringkasan Analytics', icon: <BarChart3 className="w-4 h-4"/> },
            ]}
          />
        </div>

        {/* KONTEN */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          {activeTab === 'evaluasi' && (
            isAdaptiveMode ? (
              <AdaptiveAssessmentView
                formData={formData}
                aiResult={mergedAiResult}
                assessmentId={documentId}
                aiPromptConfig={data?.aiPromptConfig}
              />
            ) : (
              <UniversalAssessmentView
                mode="admin"
                trackType={trackType}
                corporateEntity={corporateEntity}
                formData={formData}
                aiResult={mergedAiResult}
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
            )
          )}

          {activeTab === 'input' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <SectionLabel icon={<Briefcase size={16} />}>Data Input Registrasi Peserta</SectionLabel>
              <AppKeyValueList variant="card">
                {Object.entries(formData || {}).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return null;
                  const isUrl = typeof value === 'string' && value.startsWith('http');
                  const isArray = Array.isArray(value);
                  
                  let displayValue: React.ReactNode = String(value);
                  if (isUrl) {
                    displayValue = <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline">Lihat Lampiran</a>;
                  } else if (isArray) {
                    displayValue = (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(value as string[]).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <AppKeyValueItem 
                      key={key}
                      label={formatKey(key)}
                      value={displayValue}
                    />
                  );
                })}
              </AppKeyValueList>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <SectionLabel icon={<BarChart3 size={16} />}>Ringkasan Analytics Performa</SectionLabel>

              {!analyticsSummary ? (
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-6 text-sm font-semibold text-slate-500 text-center">
                  Ringkasan analytics belum tersedia untuk assessment ini.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <AppInfoCard 
                      title="Performance Score" 
                      value={`${analyticsSummary.performanceScore ?? '-'} / 100`}
                      variant="primary"
                    />
                    <AppInfoCard 
                      title="Performance Band" 
                      value={analyticsSummary.performanceBand ?? '-'}
                      variant="success"
                    />
                    <AppInfoCard 
                      title="Analytics Version" 
                      value={analyticsSummary.version ?? '-'}
                      variant="default"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <SectionLabel icon={<Info size={16} />}>Dimensi Skor</SectionLabel>
                      <AppKeyValueList variant="striped">
                        <AppKeyValueItem label="Business Readiness" value={`${analyticsSummary.dimensions?.businessReadiness ?? '-'} / 100`} />
                        <AppKeyValueItem label="Data Quality" value={`${analyticsSummary.dimensions?.dataQuality ?? '-'} / 100`} />
                        <AppKeyValueItem label="Consistency" value={`${analyticsSummary.dimensions?.consistency ?? '-'} / 100`} />
                        <AppKeyValueItem label="Execution Clarity" value={`${analyticsSummary.dimensions?.executionClarity ?? '-'} / 100`} />
                      </AppKeyValueList>
                    </div>

                    <div className="space-y-4">
                      <SectionLabel icon={<Lightbulb size={16} />}>Ringkasan Temuan</SectionLabel>
                      <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-200/60 shadow-sm">
                        <p className="text-sm font-black text-slate-900 mb-3 leading-relaxed">
                          {analyticsSummary.summary?.headline || '-'}
                        </p>
                        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5 font-medium">
                          {(analyticsSummary.summary?.keyFindings || []).map((finding: string, idx: number) => (
                            <li key={`finding-${idx}`}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <SectionLabel icon={<AlertTriangle size={16} className="text-amber-500" />}>Risiko Utama</SectionLabel>
                      <div className="bg-amber-50 p-6 rounded-2xl ring-1 ring-amber-200/60 h-full">
                        <ul className="space-y-2 text-sm text-amber-900 list-disc pl-5 font-medium">
                          {(analyticsSummary.risks || []).length > 0 ? (
                            (analyticsSummary.risks || []).map((risk: string, idx: number) => <li key={`risk-${idx}`}>{risk}</li>)
                          ) : (
                            <li>Tidak ada risiko kritikal pada ringkasan analytics.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <SectionLabel icon={<CheckCircle2 size={16} className="text-indigo-500" />}>Fokus Rekomendasi</SectionLabel>
                      <div className="bg-indigo-50 p-6 rounded-2xl ring-1 ring-indigo-200/60 h-full">
                        <ul className="space-y-2 text-sm text-indigo-900 list-disc pl-5 font-medium">
                          {(analyticsSummary.summary?.recommendedFocus || []).map((focus: string, idx: number) => (
                            <li key={`focus-${idx}`}>{focus}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
    </AppModal>
  );
}