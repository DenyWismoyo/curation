// src/app/components/shared/UniversalAssessmentView.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurationFormData, AIResult } from '@/types/curation';
import { AiSparkIcon, AILensIcon, AdminShieldIcon, InfinityWorkflowIcon, GlobalTargetIcon, DocExportIcon, TechCardIcon, BrainIcon, EcosystemIcon } from '@/types';
import { ActionPlanBuilder } from '../curation/ActionPlanBuilder';

// ========================================================
// 1. HELPER COMPONENTS
// ========================================================
const renderRichText = (str: string) => {
  if (!str) return null;
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic text-slate-800 font-medium">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

export const TextToBullets = ({ text, colorClass = "text-indigo-500" }: { text: string, colorClass?: string }) => {
  if (!text) return <span className="italic text-slate-400">Tidak ada deskripsi.</span>;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 1 && !lines[0].includes('-')) {
    return <p className="leading-relaxed">{renderRichText(text)}</p>;
  }
  return (
    <ul className="space-y-2 mt-2">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^[\-\*\ ]\s*/, '').trim();
        if (cleanLine.startsWith('###') || cleanLine.startsWith('##') || (cleanLine === cleanLine.toUpperCase() && cleanLine.length > 5)) {
           return (
            <li key={idx} className="block mt-5 mb-1 list-none">
               <strong className="text-slate-900 font-black text-sm uppercase tracking-wide border-b border-slate-100 pb-1.5 w-full block">
                 {renderRichText(cleanLine.replace(/^#+\s*/, ''))}
               </strong>
            </li>
          );
        }
        return (
          <li key={idx} className="flex items-start gap-2.5">
            <span className={`mt-1 flex-shrink-0 text-[10px] ${colorClass}`}>●</span>
            <span className="leading-relaxed">{renderRichText(cleanLine)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const InsightAccordion = ({ id, title, icon: Icon, content }: any) => {
  const [isOpen, setIsOpen] = useState(id === 'rec-0');
  return (
    <div className="bg-white ring-1 ring-slate-100 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-white hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
            <Icon size={18} />
          </div>
          <h4 className={`text-sm font-black uppercase tracking-widest ${isOpen ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</h4>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-fit opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 sm:p-6 pt-0 text-sm font-medium text-slate-600 border-t border-slate-50">
          <TextToBullets text={content || "Tidak ada detail."} colorClass="text-indigo-400" />
        </div>
      </div>
    </div>
  );
};

const renderDynamicIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'finance': return <TechCardIcon size={16} />;
    case 'users': return <EcosystemIcon size={16} />;
    case 'idea': return <AiSparkIcon size={16} />;
    case 'award': return <BrainIcon size={16} />;
    case 'document': return <DocExportIcon size={16} />;
    case 'shield': return <AdminShieldIcon size={16} />;
    case 'target': default: return <GlobalTargetIcon size={16} />;
  }
};

const borderColors = ['ring-indigo-200', 'ring-emerald-200', 'ring-amber-200', 'ring-blue-200', 'ring-rose-200'];
const textColors = ['text-indigo-600', 'text-emerald-600', 'text-amber-600', 'text-blue-600', 'text-rose-600'];

// ========================================================
// 2. INTERFACES (Props)
// ========================================================
export interface CuratorDataProps {
  isEditing: boolean;
  curatorScore: number;
  setCuratorScore?: (v: number) => void;
  curatorLevel: string;
  setCuratorLevel?: (v: string) => void;
  curatorRoute: string;
  setCuratorRoute?: (v: string) => void;
  curatorNotes: string;
  setCuratorNotes?: (v: string) => void;
  customBlockNotes: Record<string, string>;
  setCustomBlockNotes?: (title: string, v: string) => void;
  documentNotes: string;
  setDocumentNotes?: (v: string) => void;
  metricsNotes: string;
  setMetricsNotes?: (v: string) => void;
  swotNotes: string;
  setSwotNotes?: (v: string) => void;
  selectedTags: string[];
  toggleTag?: (tag: string) => void;
  availableTags?: string[];
  isCuratorValidated?: boolean;
  voiceDictation?: {
    isListening: boolean;
    toggleRecord: () => void;
  };
}

export interface UniversalAssessmentProps {
  mode: 'dashboard' | 'curator' | 'admin';
  trackType: string;
  programName?: string;
  corporateEntity?: string;
  formData: CurationFormData | any;
  aiResult: AIResult | any;
  headerActions?: React.ReactNode; 
  curatorData?: CuratorDataProps;
  pdfRef?: React.RefObject<HTMLDivElement>;
  assessmentId?: string;
}

// ========================================================
// 3. MAIN COMPONENT
// ========================================================
export function UniversalAssessmentView({ 
  mode, trackType, programName, corporateEntity, formData, aiResult, headerActions, curatorData, pdfRef, assessmentId 
}: UniversalAssessmentProps) {
  const isPublic = mode === 'dashboard';
  const isInternal = mode === 'curator' || mode === 'admin';
  const isEditing = curatorData?.isEditing || false;
  
  const aiScore = aiResult?.totalScore || 0;
  const finalScore = isInternal ? (curatorData?.curatorScore || 0) : aiScore;
  const isHighTier = finalScore >= 75;

  const formPurpose = aiResult?.formPurpose || 'assessment';
  const customUiLabels = aiResult?.customUiLabels || {};
  const isCounseling = formPurpose === 'counseling';
  const isMonitoring = formPurpose === 'monitoring';
  const isConsultation = formPurpose === 'consultation';

  const getLabel = (key: 'score' | 'swot' | 'risk' | 'roadmap' | 'execution') => {
    if (customUiLabels[key + 'Label']) return customUiLabels[key + 'Label'];
    
    switch(key) {
      case 'score':
        if (isCounseling) return 'Indeks Kepribadian';
        if (isMonitoring) return 'Persentase Capaian Target';
        if (isConsultation) return 'Tingkat Urgensi Solusi';
        return 'AI Readiness Score';
      case 'swot':
        if (isCounseling) return 'Pemetaan Karakter (SWOT)';
        if (isMonitoring) return 'Matriks Kondisi Lapangan (SWOT)';
        return 'Capability Matrix (SWOT)';
      case 'risk':
        if (isCounseling) return 'Pemicu Konflik & Penanganan';
        if (isMonitoring) return 'Hambatan & Alternatif Mitigasi';
        return 'Critical Risks & Mitigation Map';
      case 'roadmap':
        if (isCounseling) return 'Rekomendasi Rencana Pendampingan';
        if (isMonitoring) return 'Rencana Aksi Korektif Strategis';
        return 'Rekomendasi Strategis';
      case 'execution':
        if (isCounseling) return 'Timeline Intervensi & Konseling';
        if (isMonitoring) return 'Timeline Progres Kerja';
        return 'Action Plan Timeline';
    }
  };

  const radarData = aiResult?.metrics?.map((m: any, idx: number) => ({
    subject: m?.label || `Metrik ${idx+1}`, shortLabel: `D${idx + 1}`, A: m?.score || 0, fullMark: 100
  })) || [];

  // =========================================================================
  // INTEGRASI OPENCLAW (BROADCAST DATA ASESMEN KE SESSION STORAGE)
  // =========================================================================
  useEffect(() => {
    if (typeof window !== 'undefined' && aiResult) {
      const activeDataPayload = {
        subjek: formData?.namaUsaha || formData?.namaPengisi || 'Proyek Tanpa Nama',
        skor_akhir: aiResult.totalScore,
        level_kesiapan: aiResult.readinessLevel,
        swot: aiResult.swotAnalysis,
        risiko: aiResult.riskAssessment?.criticalRisks,
        mitigasi: aiResult.riskAssessment?.mitigationStrategies,
        rekomendasi: aiResult.recommendations?.map((r: any) => ({ judul: r.title, isi: r.content })),
        actionSteps: aiResult.nextActionSteps?.map((a: any) => `${a.timeframe}: ${a.task}`)
      };
      sessionStorage.setItem('openclaw_active_data', JSON.stringify(activeDataPayload));
    }
    return () => {
      if (typeof window !== 'undefined') sessionStorage.removeItem('openclaw_active_data');
    };
  }, [formData, aiResult]);

  return (
    <div ref={pdfRef} className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-500">
       
      {headerActions && (
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
          <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row ml-auto">
            {headerActions}
          </div>
        </div>
      )}

      {isPublic && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 p-5 sm:p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-6 -translate-y-6">
            <AdminShieldIcon size={160} />
          </div>
          <div className="flex flex-col lg:flex-row gap-4 items-start relative z-10">
            <div className="bg-amber-100/80 p-3 rounded-2xl shrink-0 text-amber-600 ring-1 ring-amber-200 shadow-inner">
              <AdminShieldIcon size={28} />
            </div>
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100/80 text-amber-800 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest ring-1 ring-amber-200">Status Laporan</span>
                <h4 className="text-amber-900 font-black text-sm sm:text-base uppercase tracking-wider">Hasil Pemrosesan Komputasi Otomatis (AI-Generated)</h4>
              </div>
              <p className="text-amber-800/90 text-sm font-medium leading-relaxed">Laporan analitik ini dihasilkan secara otomatis oleh sistem AI berdasarkan data mandiri pengguna. <b>Bersifat tidak mengikat sebelum divalidasi resmi.</b></p>
            </div>
          </div>
        </div>
      )}

      {isInternal && curatorData && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm ring-1 ring-slate-200 w-full">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
            <TechCardIcon size={16} className="text-indigo-500"/> Kustomisasi Quick Tags
          </h3>
          <div className="flex flex-wrap items-center gap-2.5">
            {isEditing ? (
              curatorData.availableTags?.map(tag => {
                const isSelected = curatorData.selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => curatorData.toggleTag && curatorData.toggleTag(tag)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                  >
                    {tag}
                  </button>
                );
              })
            ) : (
              curatorData.selectedTags.length > 0 ? curatorData.selectedTags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full ring-1 ring-indigo-200">{tag}</span>
              )) : (
                <span className="text-xs italic text-slate-400">Tidak ada tag yang disematkan.</span>
              )
            )}
          </div>
        </div>
      )}

      {isInternal && curatorData && (
        <div className={`p-6 sm:p-8 rounded-3xl shadow-sm ring-1 transition-all w-full ${isEditing ? 'bg-white ring-indigo-500 shadow-indigo-100 ring-2' : 'bg-white ring-slate-200'}`}>
          <h3 className="font-black text-slate-900 text-lg mb-2 flex items-center gap-2">
            <DocExportIcon size={20} className="text-indigo-600"/> Catatan & Kesimpulan Lapangan Peninjau Eksternal <span className="text-rose-500">*</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-medium">Ringkasan peninjauan langsung hasil verifikasi fisik, wawancara mendalam, dan fakta objektif.</p>
          
          {isEditing ? (
            <div className="relative">
              <Textarea 
                value={curatorData.curatorNotes}
                onChange={(e) => curatorData.setCuratorNotes && curatorData.setCuratorNotes(e.target.value)}
                placeholder="Isi catatan peninjau di sini..."
                className="min-h-[140px] bg-slate-50 rounded-2xl border-slate-200 text-sm font-medium focus-visible:ring-indigo-500 pb-12"
              />
              {curatorData.voiceDictation && (
                <button
                  onClick={curatorData.voiceDictation.toggleRecord}
                  type="button"
                  className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${curatorData.voiceDictation.isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
                >
                  {curatorData.voiceDictation.isListening ? <><MicOff size={14} /> Mendengarkan...</> : <><Mic size={14} /> Dikte Suara</>}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-100 min-h-[90px] text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
              {curatorData.curatorNotes || <span className="italic text-slate-400">Belum ada catatan utama dari lapangan.</span>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full">
        <div className="flex-1 flex flex-col gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight text-balance mb-3">
              {isPublic ? 'Laporan Narasi Analitik AI' : 'Workspace Penilai Internal'}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-indigo-600 font-bold text-base sm:text-lg bg-indigo-50 px-3 py-1.5 rounded-lg ring-1 ring-indigo-100">
                {formData?.namaUsaha || formData?.namaPengisi || formData?.namaProyek || "Subjek Terkait"}
              </p>
              <span className="bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg uppercase tracking-widest ring-1 ring-slate-200">{trackType}</span>
              
              {programName && (
                <span className="bg-emerald-50 text-emerald-600 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg uppercase tracking-widest ring-1 ring-emerald-200 flex items-center gap-1.5">
                   <EcosystemIcon size={14} /> {programName}
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-white ring-1 ring-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <AiSparkIcon size={16} className="text-indigo-500"/> Ringkasan Eksekutif Utama (AI)
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open_omniai_chat'))}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors border border-indigo-100/60"
                >
                  <AiSparkIcon size={14} className="text-indigo-500" /> Tanya AI
                </button>
                {assessmentId && (
                  <button 
                    onClick={() => window.location.href = `/result/${assessmentId}/consultation`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-full transition-colors shadow-sm"
                  >
                    <AiSparkIcon size={14} className="text-white" /> Konsultasi Premium
                  </button>
                )}
              </div>
            </div>
            <div className="text-slate-600 text-sm font-medium flex-1">
              <TextToBullets text={aiResult?.executiveSummary || "Ringkasan analisis tidak tersedia."} colorClass="text-indigo-500" />
            </div>
          </div>
        </div>


        <div className={`w-full lg:w-[360px] shrink-0 p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-center items-center shadow-lg ${isHighTier ? 'bg-gradient-to-br from-[#0f3d32] to-emerald-800' : 'bg-gradient-to-br from-slate-900 to-indigo-900'}`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-30 mix-blend-overlay"></div>
          
          <p className="relative z-10 text-white/70 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <AiSparkIcon size={16}/> {getLabel('score')}
          </p>
          <span className="relative z-10 text-[100px] font-black leading-none tracking-tighter drop-shadow-md mb-4">{Math.min(aiScore, 100)}</span>
          
          <div className="relative z-10 flex flex-col items-center gap-2 w-full">
            <span className="text-sm font-black bg-white/20 backdrop-blur-md px-6 py-2 rounded-full ring-1 ring-white/30 text-center uppercase tracking-wider text-balance">
              {aiResult?.readinessLevel?.split('|')[0]?.trim() || "Zonasi Normal"}
            </span>
            {aiResult?.readinessLevel?.includes('|') && (
              <span className="text-[11px] font-bold text-white/90 bg-black/20 px-4 py-1.5 rounded-full text-center text-balance leading-snug">
                {aiResult.readinessLevel.split('|')[1]?.trim()}
              </span>
            )}
          </div>
        </div>
      </div>

      {isInternal && (
        <div className="w-full bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl ring-1 ring-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-10 -translate-y-10">
            <AdminShieldIcon size={200} />
          </div>
          
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
            <AILensIcon size={20} className="text-indigo-400"/> Validasi Silang Logika & Integritas Pengisian Data (AI)
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
             <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Tingkat Konsistensi Jawaban</p>
                  <p className="text-xs font-medium text-slate-500">Data Confidence Score</p>
                </div>
                <div className="text-right">
                  {aiResult?.dataConfidenceScore !== undefined ? (
                    <span className={`text-4xl font-black ${aiResult.dataConfidenceScore >= 80 ? 'text-emerald-400' : aiResult.dataConfidenceScore >= 50 ? 'text-amber-400' : 'text-rose-500'}`}>
                      {aiResult.dataConfidenceScore}
                    </span>
                  ) : (
                    <span className="text-2xl font-black text-slate-500">N/A</span>
                  )}
                </div>
              </div>
              
              <div className={`flex-1 rounded-2xl p-5 border ${aiResult?.contradictionsFound?.length > 0 ? 'bg-rose-950/30 border-rose-900/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
                <h4 className={`text-[10px] uppercase font-black tracking-widest mb-3 flex items-center gap-1.5 ${aiResult?.contradictionsFound?.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  <AILensIcon size={14}/> Deteksi Kontradiksi Pernyataan
                </h4>
                {aiResult?.contradictionsFound && aiResult.contradictionsFound.length > 0 ? (
                  <ul className="space-y-3">
                    {aiResult.contradictionsFound.map((anomaly: string, i: number) => (
                      <li key={i} className="text-xs font-medium text-rose-200/90 leading-relaxed flex items-start gap-2">
                        <span className="text-rose-500 mt-0.5">●</span> <span>{renderRichText(anomaly)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">Tidak terdeteksi anomali informasi antar seksi pengisian berkas.</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-700/50 flex flex-col">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
                <BrainIcon size={14}/> Logika Pertimbangan Otak AI (Internal Reasoning)
              </h4>
              <div className="flex-1 overflow-y-auto max-h-[250px] custom-scrollbar pr-2 text-sm text-slate-300 font-medium leading-relaxed">
                {aiResult?._internalReasoning ? (
                  <TextToBullets text={aiResult._internalReasoning} colorClass="text-indigo-400" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50 py-8">
                    <AdminShieldIcon size={32} className="mb-1" />
                    <span className="text-xs font-bold uppercase tracking-widest">Informasi Disembunyikan</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISEMBUNYIKAN DARI PUBLIK: CUSTOM BLOCKS & FILE ANALYSIS */}
      {isInternal && aiResult?.customAnalysisBlocks && aiResult.customAnalysisBlocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {aiResult.customAnalysisBlocks.map((block: any, idx: number) => { 
            const ringColor = borderColors[idx % borderColors.length];
            const textColor = textColors[idx % textColors.length];
            
            return (
               <div key={idx} className={`bg-white ring-1 ${ringColor} p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col justify-between`}>
                 <div>
                   <h3 className={`text-xs font-black uppercase ${textColor} tracking-widest mb-4 flex items-center gap-2`}>
                     {renderDynamicIcon(block?.iconType)} {block?.title}
                   </h3>
                   <div className="space-y-4 mb-4">
                     {block?.metrics?.map((metric: any, mIdx: number) => (
                       <div key={mIdx}>
                         <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">{metric?.label}</p>
                         <div className="text-[13px] font-medium text-slate-700">
                           <TextToBullets text={metric?.value} colorClass={textColor} />
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 {isInternal && curatorData && (
                    <div className="pt-4 border-t border-slate-100 mt-auto">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                        <AdminShieldIcon size={14} className="text-emerald-500" /> Tanggapan Ahli Ahli
                      </h4>
                      {isEditing ? (
                        <Textarea 
                          value={curatorData.customBlockNotes?.[block.title] || ''}
                          onChange={(e) => curatorData.setCustomBlockNotes && curatorData.setCustomBlockNotes(block.title, e.target.value)}
                          placeholder={`Validasi aspek ${block.title}...`}
                          className="bg-indigo-50/40 border-indigo-100 text-xs h-24 rounded-xl" 
                        />
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-700 min-h-[60px]">
                          {curatorData.customBlockNotes?.[block.title] || <span className="italic text-slate-400">Belum ditanggapi.</span>}
                        </div>
                      )}
                    </div>
                 )}
               </div>
             )
          })}

          {/* DISEMBUNYIKAN DARI PUBLIK: DOKUMEN FORENSIK AI */}
          {isInternal && aiResult?.fileAnalysisInsights && (
            <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md md:col-span-2 lg:col-span-2 relative flex flex-col justify-between overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                <DocExportIcon size={160} className="transform translate-x-8 -translate-y-8"/>
              </div>
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-300">
                  <AILensIcon size={16}/> Hasil Validasi Dokumen Unggahan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-6">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Status Keaslian & Kualitas</p>
                    <div className="text-sm text-slate-200"><TextToBullets text={aiResult.fileAnalysisInsights.documentQuality} colorClass="text-emerald-400" /></div>
                    
                    {aiResult.fileAnalysisInsights.discrepancies && (
                      <>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mt-4 mb-1 text-rose-300">Kesenjangan Bukti Fisik</p>
                        <div className="text-sm text-rose-200 italic"><TextToBullets text={aiResult.fileAnalysisInsights.discrepancies} colorClass="text-rose-400" /></div>
                      </>
                    )}
                  </div>
                  {aiResult.fileAnalysisInsights.keyFindingsFromFiles && (
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Temuan Pokok Berkas</p>
                      <ul className="space-y-2">
                        {aiResult.fileAnalysisInsights.keyFindingsFromFiles.map((find: string, i: number) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5">●</span> <span className="leading-snug">{renderRichText(find)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {isInternal && curatorData && (
                <div className="pt-4 border-t border-slate-800 relative z-10 mt-auto">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <AdminShieldIcon size={14} className="text-emerald-400" /> Hasil Konfirmasi Otentisitas Berkas
                  </h4>
                  {isEditing ? (
                    <Textarea 
                      value={curatorData.documentNotes}
                      onChange={(e) => curatorData.setDocumentNotes && curatorData.setDocumentNotes(e.target.value)}
                      placeholder="Catatan keabsahan dokumen..."
                      className="bg-slate-800 border-slate-700 text-white text-xs h-20 rounded-xl" 
                    />
                  ) : (
                    <div className="bg-slate-800/60 p-3 rounded-xl text-xs font-medium text-slate-300 min-h-[50px]">
                      {curatorData.documentNotes || <span className="italic text-slate-500">Belum ada catatan validasi fisik berkas.</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DISEMBUNYIKAN DARI PUBLIK: METRIK KOMPARATIF RADAR CHART */}
      {isInternal && aiResult?.metrics && aiResult.metrics.length > 0 && (
        <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-3xl ring-1 ring-slate-200 shadow-sm w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <AILensIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Pilar Pemetaan Komparatif</h3>
              <p className="text-sm text-slate-500 font-medium">Visualisasi perbandingan parameter kuantitatif</p>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-center">
            <div className="w-full lg:w-2/5 flex flex-col items-center shrink-0">
              <div className={`w-full relative ${
                radarData.length > 12 ? 'h-[550px] sm:h-[650px]' : 
                radarData.length > 7  ? 'h-[420px] sm:h-[500px]' : 
                'h-[320px] sm:h-[400px]'
              }`}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="shortLabel" tick={{ fill: '#4f46e5', fontSize: 14, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skor" dataKey="A" stroke={isHighTier ? '#10b981' : '#4f46e5'} strokeWidth={3} fill={isHighTier ? '#10b981' : '#4f46e5'} fillOpacity={0.15} />
                    <Tooltip labelFormatter={(label) => radarData.find((d: any) => d.shortLabel === label)?.subject || label} wrapperClassName="!z-[9999] rounded-xl font-bold text-sm shadow-xl" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="w-full lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {aiResult.metrics.map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-100 flex flex-col">
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <h4 className="text-sm font-black text-slate-900 leading-tight"><span className="text-indigo-600 mr-1.5">D{idx + 1}.</span>{item?.label}</h4>
                    <div className="bg-white ring-1 ring-slate-200 px-2 py-1 rounded-md shrink-0">
                      <span className={`text-base font-black ${item?.score >= 80 ? 'text-emerald-600' : item?.score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{item?.score}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex-1">
                    <TextToBullets text={item?.description} colorClass="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isInternal && curatorData && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2">
                <AdminShieldIcon size={16} className="text-emerald-600"/> Catatan Kalibrasi Angka Lapangan
              </h4>
              {isEditing ? (
                <Textarea 
                  value={curatorData.metricsNotes}
                  onChange={(e) => curatorData.setMetricsNotes && curatorData.setMetricsNotes(e.target.value)}
                  placeholder="Justifikasi penyesuaian pilar matriks..."
                  className="bg-indigo-50/40 border-indigo-100 text-sm min-h-[90px] rounded-xl"
                />
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl text-sm font-medium text-slate-700 min-h-[60px]">
                  {curatorData.metricsNotes || <span className="italic text-slate-400">Belum ada penyesuaian nilai pilar.</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DISEMBUNYIKAN DARI PUBLIK: SWOT ANALYSIS */}
      {isInternal && aiResult?.swotAnalysis && (
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-50/80 p-6 rounded-3xl ring-1 ring-emerald-200/60 shadow-sm">
                <h4 className="text-emerald-900 font-black flex items-center gap-2 mb-4">
                  <GlobalTargetIcon size={20} /> {isCounseling ? 'Potensi Diri Sisi Unggul' : 'Strengths'}
                </h4>
                <ul className="list-disc list-inside text-emerald-800/80 text-sm font-medium space-y-2.5">
                  {aiResult.swotAnalysis.strengths?.map((s: string, i: number) => <li key={i}>{renderRichText(s)}</li>)}
                </ul>
            </div>
            <div className="bg-rose-50/80 p-6 rounded-3xl ring-1 ring-rose-200/60 shadow-sm">
                <h4 className="text-rose-900 font-black flex items-center gap-2 mb-4">
                  <AILensIcon size={20} /> {isCounseling ? 'Titik Buta / Kendala Batin' : 'Weaknesses'}
                </h4>
                <ul className="list-disc list-inside text-rose-800/80 text-sm font-medium space-y-2.5">
                  {aiResult.swotAnalysis.weaknesses?.map((w: string, i: number) => <li key={i}>{renderRichText(w)}</li>)}
                </ul>
            </div>
            <div className="bg-blue-50/80 p-6 rounded-3xl ring-1 ring-blue-200/60 shadow-sm">
                <h4 className="text-blue-900 font-black flex items-center gap-2 mb-4">
                  <AiSparkIcon size={20} /> {isCounseling ? 'Peluang Ruang Terapi' : 'Opportunities'}
                </h4>
                <ul className="list-disc list-inside text-blue-800/80 text-sm font-medium space-y-2.5">
                  {aiResult.swotAnalysis.opportunities?.map((o: string, i: number) => <li key={i}>{renderRichText(o)}</li>)}
                </ul>
            </div>
            <div className="bg-amber-50/80 p-6 rounded-3xl ring-1 ring-amber-200/60 shadow-sm">
                <h4 className="text-amber-900 font-black flex items-center gap-2 mb-4">
                  <AdminShieldIcon size={20} /> {isCounseling ? 'Faktor Pemicu Stres (Triggers)' : 'Threats'}
                </h4>
                <ul className="list-disc list-inside text-amber-800/80 text-sm font-medium space-y-2.5">
                  {aiResult.swotAnalysis.threats?.map((t: string, i: number) => <li key={i}>{renderRichText(t)}</li>)}
                </ul>
            </div>
          </div>

          {isInternal && curatorData && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2">
                <AdminShieldIcon size={16} className="text-emerald-600"/> {getLabel('swot')} Peninjau
              </h4>
              {isEditing ? (
                <Textarea 
                  value={curatorData.swotNotes}
                  onChange={(e) => curatorData.setSwotNotes && curatorData.setSwotNotes(e.target.value)}
                  placeholder="Tambahkan variabel eksternal atau dinamika khusus..."
                  className="bg-indigo-50/40 border-indigo-100 text-sm min-h-[80px] rounded-xl"
                />
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 min-h-[50px]">
                  {curatorData.swotNotes || <span className="italic text-slate-400">Belum ada validasi matriks SWOT.</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TETAP DITAMPILKAN: CRITICAL RISKS MAP */}
      {aiResult?.riskAssessment?.criticalRisks && aiResult.riskAssessment.criticalRisks.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl ring-1 ring-rose-200 bg-rose-50/30 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <AdminShieldIcon size={20} />
            </div>
            <h3 className="font-black text-slate-900 text-xl tracking-tight">{getLabel('risk')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
              <div key={idx} className="flex flex-col ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                <div className="bg-rose-50/50 p-4 border-b border-rose-100/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Identifikasi Hambatan Kritis</h4>
                  <div className="text-sm font-semibold text-slate-800">
                    <TextToBullets text={risk} colorClass="text-rose-400" />
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1.5">
                    <AdminShieldIcon size={12}/> Strategi Tindakan Penyelamatan
                  </h4>
                  <div className="text-sm font-medium text-slate-600">
                    <TextToBullets text={aiResult.riskAssessment.mitigationStrategies?.[idx]} colorClass="text-emerald-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TETAP DITAMPILKAN: ACTION PLAN & RECOMMENDATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {aiResult?.recommendations && aiResult.recommendations.length > 0 && (
          <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 bg-white ring-1 ring-slate-200 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <AiSparkIcon size={20} />
              </div>
              <h3 className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight">{getLabel('roadmap')}</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {aiResult.recommendations.map((rec: any, idx: number) => (
                 <InsightAccordion key={idx} id={`rec-${idx}`} title={rec?.title} icon={TechCardIcon} content={rec?.content} />
              ))}
            </div>
          </div>
        )}
        
        <div className={`${(!aiResult?.recommendations || aiResult.recommendations.length === 0) ? 'lg:col-span-3' : 'lg:col-span-1'} flex flex-col gap-6`}>
          <div className={`p-6 sm:p-8 rounded-3xl text-center ring-1 shadow-sm ${isHighTier ? 'bg-emerald-50 ring-emerald-200/60 text-emerald-900' : 'bg-indigo-50 ring-indigo-200/60 text-indigo-900'}`}>
            <div className="flex justify-center mb-3">
              <InfinityWorkflowIcon size={32} className={isHighTier ? 'text-emerald-500' : 'text-indigo-500'} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5">Rute Pengembangan Disarankan</p>
            {isEditing && curatorData ? (
              <Input 
                  value={curatorData.curatorRoute}
                  onChange={(e) => curatorData.setCuratorRoute && curatorData.setCuratorRoute(e.target.value)}
                  className="bg-white font-black text-center h-10 border-slate-300 rounded-xl text-slate-900 mt-2"
                  placeholder="Tentukan Jalur Akhir..." 
              />
            ) : (
              <h4 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-balance">
                {isInternal ? (curatorData?.curatorRoute || aiResult?.incubationRoute) : aiResult?.incubationRoute}
              </h4>
            )}
          </div>
          
          {aiResult?.nextActionSteps && aiResult.nextActionSteps.length > 0 && (
            <div className="flex-1 bg-white ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm flex flex-col rounded-3xl">
              <h3 className="font-black text-slate-900 text-lg tracking-tight mb-6 flex items-center gap-2">
                <InfinityWorkflowIcon size={20} className="text-indigo-600"/> {getLabel('execution')}
              </h3>
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-5 pb-2">
                {aiResult.nextActionSteps.map((step: any, idx: number) => {
                  const isUrgent = step?.timeframe?.includes('30') || step?.timeframe?.includes('1') || false;
                  const markerColor = isUrgent ? 'bg-rose-500 ring-rose-100' : 'bg-indigo-500 ring-indigo-100';
                  return (
                    <div key={idx} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ${markerColor}`} />
                      <div className="bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100 hover:bg-white hover:shadow-md transition-all">
                        <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-200 text-slate-700 rounded-md mb-2">{step?.timeframe || "Timeframe"}</span>
                        <div className="text-sm text-slate-700 font-bold">
                          <TextToBullets text={step?.task} colorClass="text-indigo-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {assessmentId && isPublic && (
        <div className="w-full mt-8">
        <ActionPlanBuilder 
            assessmentId={assessmentId} 
            initialData={aiResult?.customActionPlan} 
            aiResult={aiResult}
          />
        </div>
      )}
    </div>
  );
}