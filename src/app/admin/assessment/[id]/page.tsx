// src/app/admin/assessment/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, Briefcase, ShieldCheck, Loader2, Mail, Phone, BarChart3, Brain, Cpu, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalAssessmentView } from '@/components/shared';
import { AdminExportPDF } from '@/app/components/admin/AdminExportPDF';

export default function AdminAssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input' | 'analytics' | 'argumen' | 'log_ai'>('evaluasi');

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      
      try {
        // 1. TARIK DATA PUBLIK (DOKUMEN INDUK)
        const docRef = doc(db, 'assessments', params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // FIX: Tambahkan tipe ": any" agar TypeScript tidak mengeluh (garis merah hilang)
          let combinedData: any = { id: docSnap.id, ...docSnap.data() }; // Added explicit any type to resolve TypeScript compilation complaints

          // 2. TARIK DATA RAHASIA (DARI SUB-COLLECTION INTERNAL/DETAILS)
          try {
            const internalDocRef = doc(db, 'assessments', params.id as string, 'internal', 'details');
            const internalSnap = await getDoc(internalDocRef);
            
            if (internalSnap.exists()) {
              // Gabungkan objek aiResult publik dengan data internal
              combinedData.aiResult = { 
                ...(combinedData.aiResult || {}), 
                ...internalSnap.data() 
              };
            } else {
              console.warn("⚠️ Data rahasia tidak ditemukan untuk dokumen ini.");
            }
          } catch (internalError) {
            console.error("Gagal menarik data sub-collection internal:", internalError);
          }

          // Simpan data yang sudah digabungkan secara utuh ke dalam state
          setData(combinedData);
        } else {
          alert('Data asesmen tidak ditemukan.');
          router.push('/admin');
        }
      } catch (error) {
        console.error("Gagal menarik detail data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p className="font-bold tracking-widest text-xs uppercase">Memuat Detail Asesmen...</p>
      </div>
    );
  }

  if (!data) return null;

  const { formData, aiResult, score, readinessLevel, trackType, corporateEntity, status, curatorAssessment, curatorNotes, analyticsSummary } = data;
  const isCuratorValidated = status === 'Curator_Validated' || curatorAssessment !== undefined;
  
  const formatKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  
  // Mencegah error jika format telepon mengandung karakter selain angka
  const waNumber = formData?.telepon ? String(formData.telepon).replace(/[^0-9]/g, '') : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER NAVIGASI & IDENTITAS KUNCI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl ring-1 ring-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => router.push('/admin')} className="w-10 h-10 mt-1 p-0 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 shrink-0 cursor-pointer transition-colors" title="Kembali ke Dasbor">
            <ChevronLeft size={20} />
          </Button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Preview Mode</p>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">{data.namaUsaha || 'Tanpa Nama'}</h1>
            
            {/* INJEKSI KONTAK PESERTA DARI FORMDATA */}
            <div className="flex flex-wrap items-center gap-3">
              {formData?.namaPengisi && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg ring-1 ring-slate-200/50 flex items-center gap-1.5">
                    {formData.namaPengisi}
                </span>
              )}
              {formData?.email && (
                <a href={`mailto:${formData.email}`} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg ring-1 ring-indigo-200/50 flex items-center gap-1.5 transition-colors">
                  <Mail size={12} /> {formData.email}
                </a>
              )}
              {formData?.telepon && (
                <a href={`https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg ring-1 ring-emerald-200/50 flex items-center gap-1.5 transition-colors">
                  <Phone size={12} /> {formData.telepon}
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className="shrink-0">
          <AdminExportPDF data={data} />
        </div>
      </div>

      {/* TABS */}
      <div className="sticky top-[60px] md:top-20 z-40 bg-[#FAFAFA]/95 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto custom-scrollbar flex-nowrap border-b border-slate-200/50 mb-6 w-[100vw] sm:w-full">
        <button onClick={() => setActiveTab('evaluasi')} className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'evaluasi' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 ring-1 ring-slate-200/80'}`}>
          <ShieldCheck className="w-4 h-4"/> Lembar Hasil Evaluasi
        </button>
        <button onClick={() => setActiveTab('input')} className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'input' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 ring-1 ring-slate-200/80'}`}>
          <Briefcase className="w-4 h-4"/> Data Input Peserta
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 ring-1 ring-slate-200/80'}`}>
          <BarChart3 className="w-4 h-4"/> Ringkasan Analytics
        </button>
        <button onClick={() => setActiveTab('argumen')} className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'argumen' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 ring-1 ring-slate-200/80'}`}>
          <Brain className="w-4 h-4"/> Argumen Jawaban AI
        </button>
        <button onClick={() => setActiveTab('log_ai')} className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'log_ai' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 ring-1 ring-slate-200/80'}`}>
          <Cpu className="w-4 h-4"/> Log Master AI
        </button>
      </div>

      {/* VIEW KONTEN */}
      {activeTab === 'evaluasi' && (
        <UniversalAssessmentView
          mode="admin"
          trackType={trackType}
          corporateEntity={corporateEntity}
          formData={formData}
          aiResult={aiResult}
          curatorData={{
            isEditing: false, 
            curatorScore: curatorAssessment?.verifiedScore || 0,
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
        <div className="max-w-5xl bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600"/> Data Input Registrasi Peserta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(formData || {}).map(([key, value]) => {
              if (!value) return null;
              if (['namaUsaha', 'namaPengisi', 'email', 'telepon'].includes(key)) return null;
              
              const isUrl = typeof value === 'string' && value.startsWith('http');
              const isArray = Array.isArray(value);
              
              return (
                <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{formatKey(key)}</p>
                  {isUrl ? <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">Lihat Lampiran</a> : isArray ? <div className="flex flex-wrap gap-1.5 mt-1">{(value as string[]).map((item, i) => <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>)}</div> : <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'argumen' && (
        <div className="max-w-5xl bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600"/> Argumen Jawaban AI (Bedah Formulir)
          </h3>
          
          {aiResult?.fieldArguments && aiResult.fieldArguments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResult.fieldArguments.map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <h4 className="text-xs font-black text-slate-900 leading-tight flex-1">{item?.label}</h4>
                    <div className="bg-white ring-1 ring-slate-200 px-2 py-1 rounded-md shrink-0">
                      <span className={`text-sm font-black ${item?.score >= 80 ? 'text-emerald-600' : item?.score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{item?.score}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium flex-1 leading-relaxed border-t border-slate-200/60 pt-2 mt-1 whitespace-pre-wrap">
                    {item?.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 text-sm font-semibold text-slate-600">
               Argumen bedah jawaban belum tersedia.
             </div>
          )}
        </div>
      )}

      {activeTab === 'log_ai' && (
        <div className="max-w-5xl bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600"/> Log Komputasi Internal Master AI
          </h3>
          <p className="text-sm text-slate-500 mb-6">Data ini adalah log rahasia dari "pemikiran" di balik layar agen AI saat memproses form.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TINGKAT KEPERCAYAAN & KONTRADIKSI */}
            <div className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200 space-y-4">
               <div>
                 <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Confidence Score</p>
                 <div className="flex items-center gap-3">
                   <span className={`text-2xl font-black ${aiResult?.dataConfidenceScore >= 80 ? 'text-emerald-600' : aiResult?.dataConfidenceScore >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                     {aiResult?.dataConfidenceScore || 0}%
                   </span>
                   <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1 rounded-md">
                     Kepercayaan AI thd Validitas Form
                   </span>
                 </div>
               </div>

               <div>
                 <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kontradiksi Data Ditemukan</p>
                 {aiResult?.contradictionsFound && aiResult.contradictionsFound.length > 0 ? (
                   <ul className="space-y-2">
                     {aiResult.contradictionsFound.map((item: string, idx: number) => (
                       <li key={idx} className="text-xs font-medium text-rose-700 bg-rose-50 px-3 py-2 rounded-xl ring-1 ring-rose-200/50 flex items-start gap-2">
                         <span className="shrink-0 mt-0.5">•</span> <span>{item}</span>
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl ring-1 ring-emerald-200/50">
                     Sempurna. Tidak ada klaim kontradiktif yang ditemukan.
                   </div>
                 )}
               </div>
            </div>

            {/* FORENSIK DOKUMEN */}
            <div className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSearch className="w-4 h-4 text-slate-600" />
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Forensik Dokumen Lampiran</p>
              </div>
              
              {!aiResult?.fileAnalysisInsights ? (
                <p className="text-xs text-slate-500 italic">Tidak ada dokumen lampiran yang diproses.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kualitas Dokumen</p>
                    <p className="text-sm font-semibold text-slate-800">{aiResult.fileAnalysisInsights.documentQuality}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Temuan Kunci Dokumen</p>
                    <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 mt-1">
                      {(aiResult.fileAnalysisInsights.keyFindingsFromFiles || []).map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  {aiResult.fileAnalysisInsights.discrepancies && (
                    <div>
                      <p className="text-[10px] font-bold text-rose-400 uppercase">Diskrepansi Dokumen vs Klaim</p>
                      <p className="text-xs font-medium text-rose-700 bg-rose-50 p-2 rounded-lg mt-1">{aiResult.fileAnalysisInsights.discrepancies}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* REASONING INTERNAL */}
          <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl ring-1 ring-slate-800 shadow-inner">
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Cpu className="w-3.5 h-3.5 text-indigo-400"/> Monolog Pemikiran Internal Master (Raw Reasoning)
             </p>
             <p className="text-sm font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
               {aiResult?._internalReasoning || 'Log pemikiran tidak tersedia.'}
             </p>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="max-w-5xl bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
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
  );
}