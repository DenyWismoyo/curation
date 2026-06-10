// src/components/curation/PDFReportTemplate.tsx
import React, { forwardRef } from 'react';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, Lightbulb, 
  Target, Activity, Compass, FileText, Banknote, Users, Award, Shield
} from 'lucide-react';
import { CurationFormData, AIResult } from '@/types/curation';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface PDFTemplateProps {
  trackType: string;
  formData: CurationFormData;
  aiResult: AIResult;
  logoUrl: string | null;
}

export const PDFReportTemplate = forwardRef<HTMLDivElement, PDFTemplateProps>(
  ({ trackType, formData, aiResult, logoUrl }, ref) => {
    
    const radarData = aiResult.metrics?.map((m, idx) => ({
      subject: m.label,
      shortLabel: `D${idx + 1}`,
      A: m.score,
      fullMark: 100
    })) || [];

    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    const pageStyle = { 
      width: '1024px', 
      height: '1448px', 
      padding: '64px 80px',
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      backgroundColor: '#ffffff',
      overflow: 'hidden' as const
    };

    const PageHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
      <div className="border-b-[3px] border-slate-900 pb-6 mb-12 flex justify-between items-end">
        <div>
          <p className="text-[12px] font-bold tracking-[0.2em] text-indigo-600 uppercase mb-2">Smart Curation System</p>
          <h2 className="text-[32px] font-black text-slate-900 tracking-tight uppercase leading-none">{title}</h2>
          {subtitle && <p className="text-[14px] font-medium text-slate-500 mt-3">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-1">{formData.namaUsaha || formData.namaProyek || "Peserta"}</p>
          <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">{today} | {trackType}</p>
        </div>
      </div>
    );

    const PageFooter = ({ pageNum }: { pageNum: number }) => (
      <div className="absolute bottom-12 left-[80px] right-[80px] flex justify-between items-center border-t-2 border-slate-100 pt-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600"/> 
          <span className="text-slate-700">Strictly Confidential</span>
        </div>
        <div className="tracking-[0.4em] text-slate-300">ASSESSMENT REPORT</div>
        <div className="text-slate-700">Page {pageNum} <span className="mx-2 text-slate-300">/</span> 5</div>
      </div>
    );

    const renderDynamicIcon = (type: string) => {
      switch (type) {
        case 'finance': return <Banknote size={14} />;
        case 'users': return <Users size={14} />;
        case 'idea': return <Lightbulb size={14} />;
        case 'award': return <Award size={14} />;
        case 'document': return <FileText size={14} />;
        case 'shield': return <Shield size={14} />;
        case 'target':
        default: return <Target size={14} />;
      }
    };

    return (
      <div ref={ref} className="bg-white flex flex-col font-sans text-slate-900 w-[1024px]">
        
        {/* HALAMAN 1: COVER, EXECUTIVE & ADVANCED INSIGHTS */}
        <div style={pageStyle} className="flex flex-col relative">
          <div className="flex justify-between items-start mb-16">
            <div className="h-20 w-48 flex items-center">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain grayscale" /> : <div className="h-16 w-16 bg-slate-900 text-white flex items-center justify-center font-black text-3xl">{(formData.namaUsaha || formData.namaProyek || "P")?.charAt(0).toUpperCase()}</div>}
            </div>
            <div className="border border-slate-300 px-4 py-2">
              <p className="text-[10px] font-black tracking-[0.3em] text-slate-900 uppercase">Assessment Report</p>
            </div>
          </div>

          <div className="mb-12">
            <p className="text-[14px] font-bold tracking-[0.4em] text-indigo-600 uppercase mb-4">Executive Review</p>
            <h1 className="text-[64px] font-black text-slate-900 tracking-tighter uppercase leading-[1.05] mb-4 text-balance break-words line-clamp-2">
              {formData.namaUsaha || formData.namaProyek || "Profil Peserta"}
            </h1>
            <p className="text-xl font-semibold text-slate-500 uppercase tracking-widest border-l-4 border-indigo-600 pl-4">{trackType}</p>
          </div>

          <div className="grid grid-cols-12 gap-10 mb-8">
            <div className="col-span-4 flex flex-col">
              <div className="bg-slate-50 border border-slate-200 p-8 flex flex-col items-center justify-center text-center aspect-square mb-6">
                <p className="text-[12px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Readiness Score</p>
                <div className="text-[100px] font-black text-slate-900 leading-none tracking-tighter mb-4">{Math.min(aiResult.totalScore, 100)}</div>
                <div className="h-1 w-12 bg-indigo-600 mb-4"></div>
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-700">{aiResult.readinessLevel}</p>
              </div>
            </div>

            <div className="col-span-8 flex flex-col">
               <h3 className="text-[14px] font-black tracking-[0.2em] text-slate-900 uppercase mb-4 border-b-2 border-slate-900 pb-3">Executive Summary</h3>
               <div className="text-slate-700 leading-[1.8] text-[15px] text-justify font-medium max-h-[220px] overflow-hidden whitespace-pre-wrap mb-8">
                  {aiResult.executiveSummary}
               </div>

               {/* Grid Kecil untuk Custom Blocks (Maksimal 4 blok agar muat di PDF) */}
               <div className="grid grid-cols-2 gap-6">
                 {aiResult.customAnalysisBlocks?.slice(0, 4).map((block, idx) => (
                   <div key={idx} className="bg-slate-50 p-5 border border-slate-200">
                     <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-3 flex items-center gap-2">
                        {renderDynamicIcon(block.iconType)} {block.title}
                     </p>
                     {/* Menampilkan maksimal 2 baris metrik per kotak agar desain rapi */}
                     {block.metrics.slice(0, 2).map((m, mIdx) => (
                       <p key={mIdx} className="text-[12px] text-slate-700 mb-1 line-clamp-2">
                         <span className="font-bold text-slate-900">{m.label}:</span> {m.value}
                       </p>
                     ))}
                   </div>
                 ))}
               </div>
            </div>
          </div>
          
          {/* File Insights */}
          {aiResult.fileAnalysisInsights?.keyFindingsFromFiles && aiResult.fileAnalysisInsights.keyFindingsFromFiles.length > 0 && (
            <div className="bg-slate-900 text-white p-6 border-l-4 border-indigo-500">
               <h3 className="text-[12px] font-black uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2"><FileText size={16}/> Document Verification Findings</h3>
               <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] font-medium leading-relaxed">
                 {aiResult.fileAnalysisInsights.keyFindingsFromFiles.slice(0, 4).map((f, i) => <li key={i} className="flex gap-2"><span className="text-indigo-400 mt-1">●</span> <span className="line-clamp-2">{f}</span></li>)}
               </ul>
            </div>
          )}
          <PageFooter pageNum={1} />
        </div>

        {/* HALAMAN 2: METRICS & RADAR CHART */}
        <div style={pageStyle} className="flex flex-col">
          <PageHeader title="Dimensional Analysis" subtitle="Evaluasi komprehensif pada pilar fundamental operasional dan strategis." />
          <div className="grid grid-cols-12 gap-16 mt-8 h-[700px]">
            <div className="col-span-6 flex flex-col justify-center">
              <div className="w-full h-[450px] relative bg-slate-50 border border-slate-100 flex items-center justify-center p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                    <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="shortLabel" tick={{ fill: '#4f46e5', fontSize: 16, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skor" dataKey="A" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.15} isAnimationActive={false} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-6 flex flex-col justify-center gap-6">
              {aiResult.metrics?.slice(0, 7).map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                       <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest"><span className="text-indigo-600 mr-1.5">D{idx + 1}.</span>{item.label}</h4>
                       <div className="text-right"><span className="text-xl font-black text-slate-900">{item.score || 0}</span><span className="text-[10px] font-bold text-slate-400 ml-1">/100</span></div>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed pr-8 line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PageFooter pageNum={2} />
        </div>

        {/* HALAMAN 3: STRATEGIC SWOT MATRIX */}
        <div style={pageStyle} className="flex flex-col">
          <PageHeader title="SWOT & Capability Matrix" subtitle="Pemetaan posisi kompetitif internal dan dinamika eksternal pasar." />
          
          <div className="mt-4 mb-8 grid grid-cols-2 grid-rows-2 gap-8 h-[750px]">
            <div className="border border-slate-200 p-8 flex flex-col"><div className="border-b-[3px] border-indigo-600 pb-4 mb-6 flex justify-between items-center"><h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Strengths</h4><TrendingUp className="text-indigo-600" size={24}/></div><ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">{aiResult.swotAnalysis?.strengths?.slice(0, 5).map((s,i) => <li key={i} className="flex gap-4 items-start"><div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0"></div><span className="text-justify line-clamp-4">{s}</span></li>)}</ul></div>
            <div className="border border-slate-200 p-8 flex flex-col bg-slate-50/50"><div className="border-b-[3px] border-rose-500 pb-4 mb-6 flex justify-between items-center"><h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Weaknesses</h4><Activity className="text-rose-500" size={24}/></div><ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">{aiResult.swotAnalysis?.weaknesses?.slice(0, 5).map((w,i) => <li key={i} className="flex gap-4 items-start"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div><span className="text-justify line-clamp-4">{w}</span></li>)}</ul></div>
            <div className="border border-slate-200 p-8 flex flex-col bg-slate-50/50"><div className="border-b-[3px] border-emerald-500 pb-4 mb-6 flex justify-between items-center"><h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Opportunities</h4><Lightbulb className="text-emerald-500" size={24}/></div><ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">{aiResult.swotAnalysis?.opportunities?.slice(0, 5).map((o,i) => <li key={i} className="flex gap-4 items-start"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span className="text-justify line-clamp-4">{o}</span></li>)}</ul></div>
            <div className="border border-slate-200 p-8 flex flex-col"><div className="border-b-[3px] border-amber-500 pb-4 mb-6 flex justify-between items-center"><h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Threats</h4><AlertTriangle className="text-amber-500" size={24}/></div><ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">{aiResult.swotAnalysis?.threats?.slice(0, 5).map((t,i) => <li key={i} className="flex gap-4 items-start"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div><span className="text-justify line-clamp-4">{t}</span></li>)}</ul></div>
          </div>
          <PageFooter pageNum={3} />
        </div>

        {/* HALAMAN 4: RISK MITIGATION & ACTION PLAN */}
        <div style={pageStyle} className="flex flex-col">
          <PageHeader title="Risk Map & Execution Plan" subtitle="Manajemen risiko dan rencana taktis terjadwal." />
          
          <div className="mt-4 mb-12">
            <h3 className="text-[14px] font-black tracking-[0.2em] text-slate-900 uppercase mb-6 border-b-2 border-slate-900 pb-3 inline-block">Risk to Mitigation Flow</h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              {aiResult.riskAssessment?.criticalRisks?.slice(0, 4).map((risk, idx) => (
                <div key={idx} className="flex flex-col border border-slate-200 rounded-lg overflow-hidden">
                   <div className="bg-rose-50 p-4 border-b border-rose-100"><p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Risiko</p><p className="text-[12px] font-semibold text-slate-800 line-clamp-2">{risk}</p></div>
                   <div className="bg-white p-4"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Mitigasi</p><p className="text-[12px] font-medium text-slate-600 line-clamp-3">{aiResult.riskAssessment?.mitigationStrategies[idx]}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-200 p-10 mb-20">
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest mb-8 text-center">Timeline Execution</h3>
            <div className="space-y-6">
              {aiResult.nextActionSteps?.slice(0, 5).map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-6 border-b border-slate-200 pb-6 last:border-0 last:pb-0">
                  <div className="bg-slate-900 text-white w-24 py-2 flex items-center justify-center font-black shrink-0 text-[11px] uppercase tracking-widest text-center">{step.timeframe}</div>
                  <p className="text-[14px] text-slate-800 font-semibold leading-relaxed pt-1 text-justify">{step.task}</p>
                </div>
              ))}
            </div>
          </div>
          <PageFooter pageNum={4} />
        </div>

        {/* HALAMAN 5: RECOMMENDED PATHWAY */}
        <div style={{...pageStyle, backgroundColor: '#0f172a'}} className="text-white flex flex-col justify-center items-center text-center">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-12">
              <Compass className="text-indigo-400 w-10 h-10" />
            </div>
            <p className="text-[14px] font-bold tracking-[0.4em] text-indigo-400 uppercase mb-8 border-b border-indigo-500/30 pb-4 inline-block">Final Recommendation & Pathway</p>
            <h2 className="text-[28px] md:text-[36px] font-black text-white leading-[1.3] tracking-tight mb-12 text-balance max-w-3xl">
              {aiResult.incubationRoute || "Reguler"}
            </h2>
            <div className="text-[16px] text-slate-400 font-medium leading-[2] text-balance max-w-2xl text-justify">
              Berdasarkan sintesis dari bacaan form, indikator analisis dinamis, metrik evaluasi khusus, dan profil risiko yang telah dikalkulasi oleh mesin *AI Analyzer* kami, rute dan rekomendasi di atas dirancang sebagai panduan eksekusi paling rasional untuk mengoptimalkan potensi dan kelayakan entitas Anda.
            </div>
            <div className="mt-20 flex items-center gap-4 border border-slate-700 rounded-full px-6 py-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300">Ready for Execution</span>
            </div>
          </div>
          <div className="absolute bottom-12 left-0 right-0 text-center">
             <p className="text-[10px] font-bold tracking-[0.4em] text-slate-500 uppercase">End of Document <span className="mx-3">•</span> {formData.namaUsaha || formData.namaProyek} <span className="mx-3">•</span> {today}</p>
          </div>
        </div>

      </div>
    );
  }
);

PDFReportTemplate.displayName = 'PDFReportTemplate';