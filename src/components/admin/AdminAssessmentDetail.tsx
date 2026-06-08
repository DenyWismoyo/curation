// src/components/admin/AdminAssessmentDetail.tsx
'use client';

import React, { useState } from 'react';
import { 
  X, Briefcase, Sparkles, AlertTriangle, TrendingUp, 
  Activity, Lightbulb, Target, CheckSquare, Route, ChevronDown, ShieldCheck,
  ListChecks
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Import Komponen Export PDF yang baru
import { AdminExportPDF } from './AdminExportPDF';

interface AdminAssessmentDetailProps {
  data: any;
  onClose: () => void;
}

const InsightAccordion = ({ id, title, icon: Icon, content, expandedSection, setExpandedSection }: any) => {
  const isOpen = expandedSection === id;
  return (
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
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
  const [activeTab, setActiveTab] = useState<'ai' | 'input'>('ai');
  const [expandedSection, setExpandedSection] = useState<string | null>('rec-0');
  
  const { formData, aiResult, score, readinessLevel, trackType, namaUsaha, createdAt } = data;
  const isHighTier = (score || 0) >= 75;

  const radarData = aiResult?.metrics?.map((m: any, idx: number) => ({
    subject: m.label,
    shortLabel: `D${idx + 1}`,
    A: m.score,
    fullMark: 100
  })) || [];

  const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-6xl h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER MODAL DENGAN TOMBOL EXPORT PDF */}
        <div className="bg-white px-6 py-5 sm:px-8 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{namaUsaha}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                {trackType}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {new Date(createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
              </span>
            </div>
          </div>
          
          {/* Tombol Aksi di Kanan */}
          <div className="flex items-center gap-3">
            {/* INJEKSI KOMPONEN EXPORT DI SINI */}
            <AdminExportPDF data={data} />
            
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors active:scale-95" title="Tutup Panel">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex gap-4 px-6 sm:px-8 pt-4 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Hasil Analisis AI</span>
          </button>
          <button 
            onClick={() => setActiveTab('input')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Input Peserta</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          {activeTab === 'input' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
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
                            Lihat Dokumen
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

          {activeTab === 'ai' && aiResult && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              
              <div className={`relative overflow-hidden rounded-[2rem] p-8 sm:p-10 text-white shadow-lg flex flex-col items-center sm:items-start text-center sm:text-left ${isHighTier ? 'bg-[#0f3d32]' : 'bg-slate-900'}`}>
                <div className={`absolute top-0 right-0 w-[120%] sm:w-[80%] h-full opacity-40 blur-[80px] pointer-events-none ${isHighTier ? 'bg-gradient-to-bl from-teal-400 to-emerald-600' : 'bg-gradient-to-bl from-blue-400 to-indigo-600'}`} />
                <div className="relative z-10 w-full flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12">
                  <div className="flex-1">
                    <p className="text-white/70 text-sm font-black uppercase tracking-widest mb-3 flex items-center justify-center sm:justify-start gap-2">
                      <ShieldCheck className="h-5 w-5"/> Overall Readiness Score
                    </p>
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-6">
                      <span className="text-[100px] lg:text-[120px] font-black leading-[0.85] tracking-tighter drop-shadow-2xl">
                        {Math.min(score || 0, 100)}
                      </span>
                      <div className="pb-2 lg:pb-4">
                        <span className="text-base font-bold bg-white/10 backdrop-blur-md px-6 py-3 rounded-full ring-1 ring-white/20 block text-center shadow-lg">
                          {readinessLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:max-w-md w-full bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-6 rounded-3xl shadow-xl">
                    <h3 className="text-indigo-200 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">AI Executive Summary</h3>
                    <p className="text-slate-100 leading-relaxed text-sm font-medium line-clamp-4">{aiResult.recommendations?.[0]?.content || "Analisis strategis selesai dievaluasi."}</p>
                  </div>
                </div>
              </div>

              {aiResult.riskAssessment?.criticalRisks?.length > 0 && (
                <div className="bg-rose-50/80 backdrop-blur-sm ring-1 ring-rose-200 border-l-[6px] border-l-rose-500 p-5 rounded-r-xl flex items-start gap-4 shadow-sm">
                  <div className="bg-rose-100 p-2 rounded-lg text-rose-600 shrink-0"><AlertTriangle className="h-6 w-6" /></div>
                  <div>
                    <h4 className="text-rose-900 font-black text-lg mb-1.5 tracking-tight">Peringatan Risiko Kritis</h4>
                    <ul className="list-disc list-inside text-rose-700 font-medium text-sm space-y-1">
                      {aiResult.riskAssessment.criticalRisks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] ring-1 ring-slate-200 shadow-sm flex flex-col items-center">
                  <h4 className="font-black text-slate-900 mb-2 text-center text-lg tracking-tight">Analisis Dimensi</h4>
                  
                  <div className="w-full h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <PolarAngleAxis dataKey="shortLabel" tick={{ fill: '#4f46e5', fontSize: 12, fontWeight: 800 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Skor" dataKey="A" stroke={isHighTier ? '#10b981' : '#4f46e5'} strokeWidth={2.5} fill={isHighTier ? '#10b981' : '#4f46e5'} fillOpacity={0.15} />
                          <Tooltip 
                             labelFormatter={(label) => radarData.find((d: any) => d.shortLabel === label)?.subject || label} 
                             wrapperClassName="rounded-xl font-bold text-sm shadow-xl" 
                           />
                        </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full mt-4 grid grid-cols-2 gap-x-2 gap-y-3 pt-4 border-t border-slate-100">
                    {radarData.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight text-slate-600">
                        <span className="font-black text-indigo-600 shrink-0">{item.shortLabel}.</span>
                        <span className="font-medium line-clamp-2" title={item.subject}>{item.subject}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-5 rounded-3xl ring-1 ring-emerald-200">
                      <h4 className="text-emerald-900 font-black flex items-center gap-2 mb-3"><TrendingUp className="h-5 w-5"/> Strengths</h4>
                      <ul className="list-disc list-inside text-emerald-800 text-sm font-medium space-y-2">
                        {aiResult.swotAnalysis?.strengths?.map((s: string, i: number)=><li key={i}>{s}</li>)}
                      </ul>
                  </div>
                  <div className="bg-rose-50 p-5 rounded-3xl ring-1 ring-rose-200">
                      <h4 className="text-rose-900 font-black flex items-center gap-2 mb-3"><Activity className="h-5 w-5"/> Weaknesses</h4>
                      <ul className="list-disc list-inside text-rose-800 text-sm font-medium space-y-2">
                        {aiResult.swotAnalysis?.weaknesses?.map((w: string, i: number)=><li key={i}>{w}</li>)}
                      </ul>
                  </div>
                  <div className="bg-blue-50 p-5 rounded-3xl ring-1 ring-blue-200">
                      <h4 className="text-blue-900 font-black flex items-center gap-2 mb-3"><Lightbulb className="h-5 w-5"/> Opportunities</h4>
                      <ul className="list-disc list-inside text-blue-800 text-sm font-medium space-y-2">
                        {aiResult.swotAnalysis?.opportunities?.map((o: string, i: number)=><li key={i}>{o}</li>)}
                      </ul>
                  </div>
                  <div className="bg-amber-50 p-5 rounded-3xl ring-1 ring-amber-200">
                      <h4 className="text-amber-900 font-black flex items-center gap-2 mb-3"><AlertTriangle className="h-5 w-5"/> Threats</h4>
                      <ul className="list-disc list-inside text-amber-800 text-sm font-medium space-y-2">
                        {aiResult.swotAnalysis?.threats?.map((t: string, i: number)=><li key={i}>{t}</li>)}
                      </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5"/></div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Rekomendasi Strategis</h3>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {aiResult.recommendations?.map((rec: any, idx: number) => (
                      <InsightAccordion 
                        key={idx}
                        id={`rec-${idx}`} 
                        title={rec.title} 
                        icon={Target} 
                        content={rec.content} 
                        expandedSection={expandedSection} 
                        setExpandedSection={setExpandedSection} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className={`p-6 rounded-[2rem] text-center ring-1 shadow-sm ${isHighTier ? 'bg-emerald-50 ring-emerald-200 text-emerald-900' : 'bg-indigo-50 ring-indigo-200 text-indigo-900'}`}>
                    <Route className={`mx-auto mb-3 h-8 w-8 ${isHighTier ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5">Rekomendasi</p>
                    <h4 className="text-xl font-black leading-tight tracking-tight text-balance">{aiResult.incubationRoute || "Reguler"}</h4>
                  </div>
                  
                  <div className="flex-1 bg-white ring-1 ring-slate-200 p-6 shadow-sm flex flex-col rounded-[2rem]">
                    <h3 className="font-black text-slate-900 text-base tracking-tight mb-4 flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-indigo-600"/> Action Plan (30 Hari)
                    </h3>
                    <div className="space-y-3">
                      {aiResult.nextActionSteps?.map((step: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
                          <CheckSquare className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-700 font-bold leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!aiResult && activeTab === 'ai' && (
            <div className="py-20 text-center text-slate-500">Hasil Analisis AI tidak tersedia untuk profil ini.</div>
          )}

        </div>
      </div>
    </div>
  );
}