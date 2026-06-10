// src/components/admin/AdminAssessmentDetail.tsx
'use client';

import React, { useState } from 'react';
import { 
  X, Briefcase, Sparkles, AlertTriangle, TrendingUp, 
  Activity, Lightbulb, Target, Route, ChevronDown, ShieldCheck,
  ListChecks, Zap, Banknote, Users, Search, FileText, Landmark,
  CheckCircle2, Edit3, MessageSquare, Tag, Compass
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

import { AdminExportPDF } from './AdminExportPDF';

interface AdminAssessmentDetailProps {
  data: any;
  onClose: () => void;
}

const InsightAccordion = ({ id, title, icon: Icon, content, expandedSection, setExpandedSection }: any) => {
  const isOpen = expandedSection === id;
  return (
    <div className="bg-white ring-1 ring-slate-100 rounded-2xl overflow-hidden transition-all duration-300">
      <button onClick={() => setExpandedSection(isOpen ? null : id)} className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
            <Icon size={16} />
          </div>
          <h4 className={`text-sm font-black uppercase tracking-widest ${isOpen ? 'text-indigo-900' : 'text-slate-700'}`}>
            {title}
          </h4>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 sm:p-5 pt-0 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-50 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}

export function AdminAssessmentDetail({ data, onClose }: AdminAssessmentDetailProps) {
  // Tambahkan 'curator' pada opsi activeTab
  const [activeTab, setActiveTab] = useState<'ai' | 'input' | 'curator'>('ai');
  const [expandedSection, setExpandedSection] = useState<string | null>('rec-0');
  
  const { formData, aiResult, score, readinessLevel, trackType, namaUsaha, createdAt, corporateEntity, status, curatorAssessment, curatorNotes } = data;
  
  // Data AI
  const totalScore = aiResult?.totalScore || score || 0;
  const isHighTier = totalScore >= 75;
  const radarData = aiResult?.metrics?.map((m: any, idx: number) => ({
    subject: m.label,
    shortLabel: `D${idx + 1}`,
    A: m.score,
    fullMark: 100
  })) || [];

  // Data Kurator
  const isCuratorValidated = status === 'Curator_Validated' || curatorAssessment !== undefined;
  const isCuratorDraft = status === 'Curator_Draft';
  const finalCuratorScore = curatorAssessment?.verifiedScore || 0;
  const isCuratorHighTier = finalCuratorScore >= 75;

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
              ) : isCuratorDraft ? (
                <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                  <Edit3 size={12}/> Draf Kurasi
                </span>
              ) : null}
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="inline-flex px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                {trackType}
              </span>
              <span className="inline-flex px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                {corporateEntity || 'Program Umum'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {new Date(createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
              </span>
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
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Due Diligence AI</span>
          </button>
          <button 
            onClick={() => setActiveTab('curator')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'curator' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Hasil Kurasi Manual</span>
          </button>
          <button 
            onClick={() => setActiveTab('input')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Peserta</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar relative">
          
          {/* TAB DATA INPUT */}
          {activeTab === 'input' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
              <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600"/> Detail Informasi Bisnis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(formData || {}).map(([key, value]) => {
                    if (value === null || value === undefined || value === '') return null;
                    const isUrl = typeof value === 'string' && value.startsWith('http');
                    const isArray = Array.isArray(value);
                    return (
                      <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          {formatKey(key)}
                        </p>
                        {isUrl ? (
                          <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
                            Lihat Dokumen Terlampir
                          </a>
                        ) : isArray ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(value as string[]).map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {String(value)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB AI (EXISTING) */}
          {activeTab === 'ai' && aiResult && (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
              {/* 1. HEADER & EXECUTIVE SUMMARY */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-white ring-1 ring-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm">
                    <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-indigo-500"/> Executive Summary
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm font-medium">
                      {aiResult.executiveSummary || aiResult.recommendations?.[0]?.content || "Analisis strategis selesai dievaluasi."}
                    </p>
                  </div>
                </div>
                {/* Skor Panel */}
                <div className={`w-full lg:w-[340px] shrink-0 p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-center items-center shadow-lg ${isHighTier ? 'bg-gradient-to-br from-[#0f3d32] to-emerald-800' : 'bg-gradient-to-br from-slate-900 to-indigo-900'}`}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-30 mix-blend-overlay"></div>
                  <p className="relative z-10 text-white/70 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4"/> AI Readiness Score
                  </p>
                  <span className="relative z-10 text-[100px] font-black leading-none tracking-tighter drop-shadow-md mb-4">
                    {Math.min(totalScore, 100)}
                  </span>
                  <span className="relative z-10 text-sm font-bold bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-full ring-1 ring-white/30 text-center">
                    {aiResult.readinessLevel || readinessLevel}
                  </span>
                </div>
              </div>

              {/* 2. ADVANCED ANALYSIS GRIDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aiResult.marketPositioning && (
                  <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl">
                    <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest mb-4 flex items-center gap-2"><Target className="w-4 h-4"/> Market Positioning</h3>
                    <div className="space-y-4">
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Niche Pasar</p><p className="text-sm font-semibold text-slate-800">{aiResult.marketPositioning.niche}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Unfair Advantage</p><p className="text-sm font-semibold text-slate-800">{aiResult.marketPositioning.competitorAdvantage}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Potensi Skalabilitas</p>
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md ring-1 ring-indigo-200">{aiResult.marketPositioning.marketScalability}</span>
                      </div>
                    </div>
                  </div>
                )}
                {aiResult.financialHealth && (
                  <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl">
                    <h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-4 flex items-center gap-2"><Banknote className="w-4 h-4"/> Financial Health</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Financial Score</p>
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{aiResult.financialHealth.financialScore}/100</span>
                      </div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Model Pendapatan</p><p className="text-sm font-medium text-slate-700">{aiResult.financialHealth.revenueModelViability}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Burn Rate / Runway</p><p className="text-sm font-medium text-slate-700">{aiResult.financialHealth.burnRateOrRunwayAssessment}</p></div>
                    </div>
                  </div>
                )}
                {aiResult.investmentReadiness && (
                  <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl">
                    <h3 className="text-xs font-black uppercase text-amber-600 tracking-widest mb-4 flex items-center gap-2"><Landmark className="w-4 h-4"/> Investment Readiness</h3>
                    <div className="space-y-4">
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Funding Stage</p><p className="text-sm font-semibold text-slate-800">{aiResult.investmentReadiness.currentFundingStage}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Instrumen Rekomendasi</p><p className="text-sm font-semibold text-slate-800">{aiResult.investmentReadiness.recommendedInstrument}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Daya Tarik Investor</p>
                        <span className={`inline-block text-xs font-bold px-2 py-1 rounded-md ring-1 ${aiResult.investmentReadiness.investorAttractiveness?.includes('Ready') || aiResult.investmentReadiness.investorAttractiveness?.includes('Not') ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                          {aiResult.investmentReadiness.investorAttractiveness}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {aiResult.teamAssessment && (
                  <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl md:col-span-2 lg:col-span-1">
                    <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> Team & Execution</h3>
                    <div className="space-y-4">
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Founder-Market Fit</p><p className="text-sm font-medium text-slate-700 leading-relaxed">{aiResult.teamAssessment.founderMarketFit}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Identified Skill Gaps</p>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.teamAssessment.identifiedSkillGaps?.map((gap: string, i: number) => (
                            <span key={i} className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded ring-1 ring-slate-200">{gap}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {aiResult.fileAnalysisInsights && (
                  <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md md:col-span-2 lg:col-span-2 relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><FileText size={160} className="transform translate-x-8 -translate-y-8"/></div>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-300"><Search className="w-4 h-4"/> Document / File Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Kualitas Berkas</p>
                        <p className="text-sm text-slate-200">{aiResult.fileAnalysisInsights.documentQuality}</p>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mt-4 mb-1 text-rose-300">Data Discrepancies (Kesenjangan)</p>
                        <p className="text-sm text-rose-200 italic">{aiResult.fileAnalysisInsights.discrepancies}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Key Findings dari Lampiran</p>
                        <ul className="space-y-2">
                          {aiResult.fileAnalysisInsights.keyFindingsFromFiles?.map((find: string, i: number) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">●</span> <span className="leading-snug">{find}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. DIMENSI KINERJA & METRIK DETAIL */}
              <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5"/>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Dimensi Kinerja</h3>
                    <p className="text-sm text-slate-500 font-medium">Analisis mendalam setiap pilar metrik</p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-center">
                  <div className="w-full lg:w-2/5 flex flex-col items-center shrink-0">
                    <div className="w-full h-[320px] sm:h-[400px] relative">
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
                    {aiResult.metrics?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-100 hover:ring-indigo-200 transition-all hover:shadow-md flex flex-col">
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <h4 className="text-sm font-black text-slate-900 leading-tight">
                            <span className="text-indigo-600 mr-1.5">D{idx + 1}.</span>{item.label}
                          </h4>
                          <div className="bg-white ring-1 ring-slate-200 px-2 py-1 rounded-md shrink-0">
                            <span className={`text-base font-black ${item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {item.score}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed flex-1">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. STRATEGIC ROADMAP & TIMELINE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
                <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm">
                  <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5"/></div>
                    <h3 className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Rekomendasi AI</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {aiResult.recommendations?.map((rec: any, idx: number) => (
                      <InsightAccordion 
                        key={idx}
                        id={`rec-${idx}`} 
                        title={rec.title} 
                        icon={Briefcase} 
                        content={rec.content} 
                        expandedSection={expandedSection} 
                        setExpandedSection={setExpandedSection} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6">
                  <div className={`p-6 sm:p-8 rounded-[2rem] text-center ring-1 shadow-sm ${isHighTier ? 'bg-emerald-50 ring-emerald-200/60 text-emerald-900' : 'bg-indigo-50 ring-indigo-200/60 text-indigo-900'}`}>
                    <Route className={`mx-auto mb-3 h-8 w-8 ${isHighTier ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5">Rute Akselerasi</p>
                    <h4 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-balance">{aiResult.incubationRoute || "Reguler Track"}</h4>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!aiResult && activeTab === 'ai' && (
            <div className="py-20 text-center text-slate-500 font-medium">Hasil Analisis AI tidak tersedia untuk profil ini.</div>
          )}

          {/* TAB HASIL KURASI MANUAL */}
          {activeTab === 'curator' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              {!isCuratorValidated ? (
                <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-12 text-center flex flex-col items-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck size={32}/>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Belum Diverifikasi</h3>
                  <p className="text-slate-500 font-medium max-w-md">Kurator belum menyelesaikan atau memfinalisasi validasi lapangan untuk entitas ini. Harap menunggu hingga proses kurasi selesai.</p>
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-10">
                  
                  {/* Summary Score & Tag Kurator */}
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Ringkasan Catatan Utama */}
                    <div className="flex-1 bg-white ring-1 ring-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600"/> Kesimpulan Validasi Kurator
                      </h3>
                      <div className="bg-emerald-50/50 p-5 rounded-2xl flex-1 text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed ring-1 ring-emerald-100">
                        {curatorNotes || <span className="italic text-slate-400">Tidak ada catatan lapangan utama.</span>}
                      </div>
                      
                      {/* Tags */}
                      <div className="mt-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Tag size={12}/> Tag Tersemat</h4>
                        <div className="flex flex-wrap gap-2">
                          {curatorAssessment?.tags?.length > 0 ? (
                            curatorAssessment.tags.map((tag: string) => (
                              <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase tracking-wider rounded-md ring-1 ring-indigo-200">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs italic text-slate-400">Tidak ada tag.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final Result Card */}
                    <div className={`w-full lg:w-[340px] shrink-0 p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-center items-center shadow-md ${isCuratorHighTier ? 'bg-emerald-700' : 'bg-indigo-700'}`}>
                       <p className="relative z-10 text-white/80 text-xs font-black uppercase tracking-widest mb-2 text-center">
                         Skor Akhir Validasi
                       </p>
                       <span className="relative z-10 text-[80px] font-black leading-none tracking-tighter mb-4">
                         {finalCuratorScore}
                       </span>
                       <div className="relative z-10 flex flex-col gap-2 w-full">
                         <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
                           <p className="text-[10px] uppercase text-white/70 font-bold mb-0.5">Level Kesiapan</p>
                           <p className="text-sm font-black">{curatorAssessment?.verifiedLevel || '-'}</p>
                         </div>
                         <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
                           <p className="text-[10px] uppercase text-white/70 font-bold mb-0.5">Penetapan Rute</p>
                           <p className="text-sm font-black">{curatorAssessment?.finalRoute || '-'}</p>
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Catatan Aspek Spesifik */}
                  <div className="bg-white ring-1 ring-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600"/> Catatan Review per Aspek (Koreksi AI)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      
                      <div className="p-6 space-y-6">
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-indigo-400"/> Market Positioning</h4>
                          <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">{curatorAssessment?.marketNotes || '-'}</p>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-emerald-400"/> Financial Health</h4>
                          <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">{curatorAssessment?.financialNotes || '-'}</p>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Landmark className="w-4 h-4 text-amber-400"/> Investment Readiness</h4>
                          <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">{curatorAssessment?.investmentNotes || '-'}</p>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-400"/> Team & Execution</h4>
                          <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">{curatorAssessment?.teamNotes || '-'}</p>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Search className="w-4 h-4 text-purple-400"/> Analisis Berkas & Dokumen</h4>
                          <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">{curatorAssessment?.documentNotes || '-'}</p>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Compass className="w-4 h-4 text-rose-400"/> SWOT & Strategi Eksternal</h4>
                          <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">{curatorAssessment?.swotNotes || '-'}</p>
                        </div>
                      </div>

                    </div>
                    {curatorAssessment?.metricsNotes && (
                      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-indigo-500"/> Kalibrasi Pilar / Metrik Kinerja</h4>
                        <p className="text-sm text-slate-700 font-medium bg-white ring-1 ring-slate-200 p-4 rounded-xl">{curatorAssessment.metricsNotes}</p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}