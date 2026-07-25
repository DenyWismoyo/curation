// src/app/components/assessor/AssessorAssessmentDetail.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Briefcase, ShieldCheck, Loader2, Edit3, CheckCircle2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalAssessmentView } from '@/components/shared';
import { CuratorExportPDF } from '@/app/components/curator/PDFReportTemplate';

export function AssessorAssessmentDetail({ data, onClose, onSaveSuccess }: any) {
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input'>('evaluasi');
  const [isEditing, setIsEditing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialRender = useRef(true);

  const [curatorScore, setCuratorScore] = useState<number>(0);
  const [curatorLevel, setCuratorLevel] = useState<string>('');
  const [curatorRoute, setCuratorRoute] = useState<string>('');
  const [curatorNotes, setCuratorNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customBlockNotes, setCustomBlockNotes] = useState<Record<string, string>>({});
  const [documentNotes, setDocumentNotes] = useState<string>('');
  const [metricsNotes, setMetricsNotes] = useState<string>('');
  const [swotNotes, setSwotNotes] = useState<string>('');

  useEffect(() => {
    if (data) {
      const aiRes = data.aiResult || {};
      setCuratorScore(data.curatorAssessment?.verifiedScore ?? aiRes.totalScore ?? 0);
      setCuratorLevel(data.curatorAssessment?.verifiedLevel ?? aiRes.readinessLevel ?? '');
      setCuratorRoute(data.curatorAssessment?.finalRoute ?? aiRes.incubationRoute ?? '');
      setCuratorNotes(data.curatorNotes ?? '');
      setSelectedTags(data.curatorAssessment?.tags ?? []);
      setCustomBlockNotes(data.curatorAssessment?.customBlockNotes ?? {});
      setDocumentNotes(data.curatorAssessment?.documentNotes ?? '');
      setMetricsNotes(data.curatorAssessment?.metricsNotes ?? '');
      setSwotNotes(data.curatorAssessment?.swotNotes ?? '');
    }
  }, [data]);

  // LOGIKA AUTO-SAVE LOKAL
  useEffect(() => {
    if (isInitialRender.current) { isInitialRender.current = false; return; }
    if (!isEditing || !data) return;
    
    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'assessments', data.id);
        const payload: any = {
          curatorNotes, score: Number(curatorScore), readinessLevel: curatorLevel,
          status: data.status === 'Curator_Validated' ? 'Curator_Validated' : 'Curator_Draft',
          updatedAt: new Date().toISOString(),
          curatorAssessment: { verifiedScore: Number(curatorScore), verifiedLevel: curatorLevel, finalRoute: curatorRoute, tags: selectedTags, customBlockNotes, documentNotes, metricsNotes, swotNotes }
        };
        await updateDoc(docRef, payload);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) { setAutoSaveStatus('error'); }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [curatorScore, curatorLevel, curatorRoute, curatorNotes, selectedTags, customBlockNotes, documentNotes, metricsNotes, swotNotes, isEditing, data]);

  const handleFinalize = async () => {
    if (!curatorNotes.trim()) return alert('Catatan Utama WAJIB diisi sebelum melakukan Finalisasi.');
    if (!confirm('Apakah Anda yakin ingin memfinalisasi data validasi? Setelah difinalisasi, status akan berubah menjadi Selesai.')) return;
    
    setIsFinalizing(true);
    try {
      const docRef = doc(db, 'assessments', data.id);
      await updateDoc(docRef, {
        curatorNotes, score: Number(curatorScore), readinessLevel: curatorLevel,
        status: 'Curator_Validated', validatedAt: new Date().toISOString(),
        curatorAssessment: { verifiedScore: Number(curatorScore), verifiedLevel: curatorLevel, finalRoute: curatorRoute, tags: selectedTags, customBlockNotes, documentNotes, metricsNotes, swotNotes }
      });
      alert('Data peserta berhasil difinalisasi!');
      onSaveSuccess();
    } catch (error) { alert('Gagal terhubung ke database.'); } finally { setIsFinalizing(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar">
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-24">
          
          {/* HEADER NAVIGASI */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm sticky top-4 z-40 w-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onClose} className="w-10 h-10 p-0 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-600 shrink-0">
                <X size={20} />
              </Button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace Evaluator</p>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{data.namaUsaha}</h1>
              </div>
            </div>
            
            {/* AKSI GLOBAL */}
            <div className="flex flex-wrap items-center gap-2">
              {isEditing && (
                  <div className="hidden sm:flex items-center mr-4 text-[10px] font-bold uppercase tracking-widest">
                    {autoSaveStatus === 'saving' && <span className="text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Menyimpan...</span>}
                    {autoSaveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3"/> Draf Tersimpan</span>}
                  </div>
              )}
              
              <CuratorExportPDF 
                assessmentId={data.id}
                trackType={data.trackType}
                formData={data.formData}
                aiResult={data.aiResult || {}}
                namaUsaha={data.namaUsaha}
                liveData={{ curatorScore, curatorLevel, curatorRoute, curatorNotes }}
              />

              {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-4 shadow-md">
                    <Edit3 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Validasi Manual</span>
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl h-10 px-4 font-bold border-slate-200 text-slate-600">Tutup Editor</Button>
                    <Button onClick={handleFinalize} disabled={isFinalizing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-10 px-4 shadow-md">
                      <CheckCircle2 className="w-4 h-4 mr-2"/> Finalisasi
                    </Button>
                  </>
              )}
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 w-full">
            <button onClick={() => setActiveTab('evaluasi')} className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'evaluasi' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm'}`}>
              <ShieldCheck className="w-4 h-4"/> Modul Evaluasi Lapangan
            </button>
            <button onClick={() => setActiveTab('input')} className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'input' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm'}`}>
              <Briefcase className="w-4 h-4"/> Data Input Peserta
            </button>
          </div>

          {/* VIEW KONTEN */}
          {activeTab === 'evaluasi' && (
            <UniversalAssessmentView
              mode="curator"
              trackType={data.trackType}
              corporateEntity={data.corporateEntity}
              formData={data.formData}
              aiResult={data.aiResult || {}}
              curatorData={{
                isEditing,
                curatorScore, setCuratorScore,
                curatorLevel, setCuratorLevel,
                curatorRoute, setCuratorRoute,
                curatorNotes, setCuratorNotes,
                customBlockNotes, setCustomBlockNotes: (t, v) => setCustomBlockNotes(p => ({...p, [t]: v})),
                documentNotes, setDocumentNotes,
                metricsNotes, setMetricsNotes,
                swotNotes, setSwotNotes,
                selectedTags, toggleTag: (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag]),
                availableTags: [], // Asesor mungkin tidak memiliki master tags dari kurator
                isCuratorValidated: data.status === 'Curator_Validated',
              }}
            />
          )}

          {activeTab === 'input' && (
            <div className="w-full bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600"/> Detail Informasi Bisnis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(data.formData || {}).map(([key, value]) => {
                  if (!value) return null;
                  const isUrl = typeof value === 'string' && value.startsWith('http');
                  const isArray = Array.isArray(value);
                  return (
                    <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                      {isUrl ? <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline">Lihat Lampiran</a> : isArray ? <div className="flex flex-wrap gap-1.5 mt-1">{(value as string[]).map((item, i) => <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>)}</div> : <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>}
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