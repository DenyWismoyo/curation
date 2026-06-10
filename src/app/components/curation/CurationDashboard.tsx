'use client';

import React, { useRef, useState } from 'react';
import { 
  RotateCcw, ShieldCheck, Target, Sparkles, Activity, 
  Route, ListChecks, Download, Loader2, ChevronDown, 
  AlertTriangle, Zap, TrendingUp, Lightbulb, Banknote, Users, Search, 
  FileText, ImagePlus, Award, Shield, Building2, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurationFormData, AIResult } from '@/types/curation';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PDFReportTemplate } from './PDFReportTemplate';

interface Props {
  trackType: string;
  formData: CurationFormData;
  aiResult: AIResult;
  programName?: string; 
  onRestart: () => void;
}

export function CurationDashboard({ trackType, formData, aiResult, programName, onRestart }: Props) {
  // Pengaman skor utama
  const safeTotalScore = aiResult?.totalScore || 0;
  const isHighTier = safeTotalScore >= 75;
  
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('rec-0');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setLogoUrl(objectUrl);
    }
  };

  const handleExportPDF = async () => {
    const element = pdfTemplateRef.current;
    if (!element) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const dataUrl = await toJpeg(element, { quality: 0.85, pixelRatio: 1.5, backgroundColor: '#ffffff' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(dataUrl);
        const totalImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = totalImgHeight;
        let position = 0;

        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, totalImgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 2) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, totalImgHeight);
          heightLeft -= pdfHeight;
        }
        
        const safeName = formData?.namaUsaha?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'asesmen';
        pdf.save(`Laporan_AI_Asesmen_${safeName}.pdf`);
      } catch (error) {
        console.error("Gagal melakukan export PDF:", error);
        alert("Gagal mengekspor PDF.");
      } finally {
        setIsExporting(false);
      }
    }, 500); 
  };

  // Pengaman data Radar Chart untuk metrics array
  const radarData = aiResult?.metrics?.map((m, idx) => ({
    subject: m?.label || `Metrik ${idx+1}`,
    shortLabel: `D${idx + 1}`,
    A: m?.score || 0,
    fullMark: 100
  })) || [];

  const InsightAccordion = ({ id, title, icon: Icon, content }: any) => {
    const isOpen = expandedSection === id;
    return (
      <div className="bg-white ring-1 ring-slate-100 rounded-2xl overflow-hidden transition-all duration-300">
        <button onClick={() => setExpandedSection(isOpen ? null : id)} className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
              <Icon size={16} />
            </div>
            <h4 className={`text-sm font-black uppercase tracking-widest ${isOpen ? 'text-indigo-900' : 'text-slate-700'}`}>
              {title || "Rekomendasi"}
            </h4>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 sm:p-5 pt-0 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-50 whitespace-pre-wrap">
            {content || "Tidak ada detail yang diberikan."}
          </div>
        </div>
      </div>
    );
  };

  const renderDynamicIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'finance': return <Banknote className="w-4 h-4" />;
      case 'users': return <Users className="w-4 h-4" />;
      case 'idea': return <Lightbulb className="w-4 h-4" />;
      case 'award': return <Award className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'shield': return <Shield className="w-4 h-4" />;
      case 'target':
      default: return <Target className="w-4 h-4" />;
    }
  };

  const borderColors = ['ring-indigo-200', 'ring-emerald-200', 'ring-amber-200', 'ring-blue-200', 'ring-rose-200'];
  const textColors = ['text-indigo-600', 'text-emerald-600', 'text-amber-600', 'text-blue-600', 'text-rose-600'];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-12 animate-in fade-in duration-700">
      <div className="overflow-hidden absolute top-[-9999px] left-[-9999px]">
        <PDFReportTemplate ref={pdfTemplateRef} trackType={trackType} formData={formData} aiResult={aiResult as any} logoUrl={logoUrl} />
      </div>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* ACTION BAR ATAS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={onRestart} className="gap-2 text-slate-500 hover:text-slate-900 -ml-2 active:scale-95">
            <RotateCcw className="h-4 w-4" /> Kembali ke Awal
          </Button>
          <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row">
            <div>
              <input type="file" id="logo-upload" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={handleLogoUpload} />
              <label htmlFor="logo-upload" className="flex items-center justify-center w-full sm:w-auto gap-2 bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl h-10 px-4 transition-all active:scale-95 cursor-pointer shadow-sm">
                <ImagePlus className="h-4 w-4" /> {logoUrl ? 'Ganti Logo' : 'Upload Logo'}
              </label>
            </div>
            <Button onClick={handleExportPDF} disabled={isExporting} className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-indigo-600 text-white shadow-lg font-bold rounded-xl transition-all active:scale-95 h-10">
              {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Render PDF...</> : <><Download className="h-4 w-4" /> Unduh Full Report</>}
            </Button>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-6 lg:p-8 rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden relative">
          
          {/* DISCLAIMER BANNER */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 p-5 sm:p-6 rounded-[2rem] mb-8 flex flex-col gap-4 mx-2 sm:mx-0 mt-2 sm:mt-0 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-6 -translate-y-6">
              <Shield size={160} />
            </div>
            <div className="flex flex-col lg:flex-row gap-4 items-start relative z-10">
              <div className="bg-amber-100/80 p-3 rounded-2xl shrink-0 text-amber-600 ring-1 ring-amber-200 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100/80 text-amber-800 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest ring-1 ring-amber-200">
                    Status Laporan
                  </span>
                  <h4 className="text-amber-900 font-black text-sm sm:text-base uppercase tracking-wider">
                    Draft Evaluasi Awal (AI-Generated)
                  </h4>
                </div>
                <p className="text-amber-800/90 text-sm font-medium leading-relaxed text-justify">
                  Laporan analitik ini dihasilkan secara otomatis oleh AI berdasarkan data mandiri. <b>Hasil ini bersifat tidak mengikat dan wajib melalui tahapan verifikasi resmi.</b>
                </p>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 ring-1 ring-amber-200/60 shadow-sm border-l-4 border-l-amber-500">
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" /> Panduan Peningkatan Kapasitas
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Manfaatkan poin analisis strategis di bawah ini sebagai panduan mandiri untuk melakukan <b>upgrade/perbaikan berkelanjutan</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 1. HEADER & EXECUTIVE SUMMARY */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-12 px-2 sm:px-0">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight text-balance mb-3">
                  CSRS Assessment Report
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <p className="text-indigo-600 font-bold text-base sm:text-lg bg-indigo-50 px-3 py-1.5 rounded-lg ring-1 ring-indigo-100">
                    {formData?.namaUsaha || formData?.namaProyek || "Entitas Tanpa Nama"}
                  </p>
                  <span className="bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg uppercase tracking-widest ring-1 ring-slate-200">
                    {trackType}
                  </span>
                  {programName && (
                    <span className="bg-emerald-50 text-emerald-600 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg uppercase tracking-widest ring-1 ring-emerald-200 flex items-center gap-1.5">
                       <Building2 className="w-3.5 h-3.5" /> {programName}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-50 ring-1 ring-slate-100 p-6 rounded-2xl">
                <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-500"/> Executive Summary
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  {aiResult?.executiveSummary || "Ringkasan eksekutif tidak tersedia untuk laporan ini."}
                </p>
              </div>
            </div>

            <div className={`w-full lg:w-[340px] shrink-0 p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-center items-center shadow-lg ${isHighTier ? 'bg-gradient-to-br from-[#0f3d32] to-emerald-800' : 'bg-gradient-to-br from-slate-900 to-indigo-900'}`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-30 mix-blend-overlay"></div>
              <p className="relative z-10 text-white/70 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4"/> AI Readiness Score
              </p>
              <span className="relative z-10 text-[100px] font-black leading-none tracking-tighter drop-shadow-md mb-4">
                {Math.min(safeTotalScore, 100)}
              </span>
              <span className="relative z-10 text-sm font-bold bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-full ring-1 ring-white/30 text-center">
                {aiResult?.readinessLevel || "Belum Ditentukan"}
              </span>
            </div>
          </div>

          {/* 2. DYNAMIC ANALYSIS BLOCKS (Kustom Blok AI) */}
          {aiResult?.customAnalysisBlocks && aiResult.customAnalysisBlocks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 px-2 sm:px-0">
              {aiResult.customAnalysisBlocks.map((block, idx) => {
                 const ringColor = borderColors[idx % borderColors.length];
                 const textColor = textColors[idx % textColors.length];
                 
                 return (
                   <div key={idx} className={`bg-white ring-1 ${ringColor} p-6 rounded-2xl hover:shadow-md transition-shadow`}>
                     <h3 className={`text-xs font-black uppercase ${textColor} tracking-widest mb-4 flex items-center gap-2`}>
                       {renderDynamicIcon(block?.iconType)} {block?.title || "Analisis Block"}
                     </h3>
                     <div className="space-y-4">
                       {block?.metrics?.map((metric, mIdx) => (
                         <div key={mIdx}>
                           <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">{metric?.label || "Indikator"}</p>
                           <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{metric?.value || "Tidak ada deskripsi."}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )
              })}

              {/* File Insights */}
              {aiResult?.fileAnalysisInsights && (aiResult.fileAnalysisInsights.documentQuality || aiResult.fileAnalysisInsights.keyFindingsFromFiles?.length > 0) && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md md:col-span-2 lg:col-span-2 relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><FileText size={160} className="transform translate-x-8 -translate-y-8"/></div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-300"><Search className="w-4 h-4"/> Document / File Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Kualitas Berkas</p>
                      <p className="text-sm text-slate-200">{aiResult.fileAnalysisInsights.documentQuality || "Belum dievaluasi"}</p>
                      {aiResult.fileAnalysisInsights.discrepancies && (
                        <>
                          <p className="text-[10px] uppercase text-slate-400 font-bold mt-4 mb-1 text-rose-300">Data Discrepancies (Kesenjangan)</p>
                          <p className="text-sm text-rose-200 italic">{aiResult.fileAnalysisInsights.discrepancies}</p>
                        </>
                      )}
                    </div>
                    {aiResult.fileAnalysisInsights.keyFindingsFromFiles && aiResult.fileAnalysisInsights.keyFindingsFromFiles.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Key Findings dari Lampiran</p>
                        <ul className="space-y-2">
                          {aiResult.fileAnalysisInsights.keyFindingsFromFiles.map((find, i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">•</span> <span className="leading-snug">{find}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. DIMENSI KINERJA & METRIK DETAIL */}
          {aiResult?.metrics && aiResult.metrics.length > 0 && (
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] ring-1 ring-slate-200 shadow-sm mb-12 mx-2 sm:mx-0">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5"/>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">Dimensi Kinerja</h3>
                  <p className="text-sm text-slate-500 font-medium">Analisis mendalam setiap pilar metrik utama</p>
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
                        <Tooltip labelFormatter={(label) => radarData.find(d => d.shortLabel === label)?.subject || label} wrapperClassName="!z-[9999] rounded-xl font-bold text-sm shadow-xl" />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="w-full lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {aiResult.metrics.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-100 hover:ring-indigo-200 transition-all hover:shadow-md flex flex-col">
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          <span className="text-indigo-600 mr-1.5">D{idx + 1}.</span>{item?.label || `Pilar ${idx+1}`}
                        </h4>
                        <div className="bg-white ring-1 ring-slate-200 px-2 py-1 rounded-md shrink-0">
                          <span className={`text-base font-black ${(item?.score || 0) >= 80 ? 'text-emerald-600' : (item?.score || 0) >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {item?.score || 0}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed flex-1">
                        {item?.description || "Deskripsi skor tidak tersedia."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. SWOT MATRIX */}
          {aiResult?.swotAnalysis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 px-2 sm:px-0">
              <div className="bg-emerald-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-emerald-200/60 shadow-sm transition-all hover:shadow-md">
                  <h4 className="text-emerald-900 font-black flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5"/> Strengths</h4>
                  <ul className="list-disc list-inside text-emerald-800/80 text-sm font-medium space-y-2.5">
                    {aiResult.swotAnalysis.strengths?.length > 0 
                      ? aiResult.swotAnalysis.strengths.map((s,i)=><li key={i}>{s}</li>)
                      : <li>Tidak teridentifikasi</li>}
                  </ul>
              </div>
              <div className="bg-rose-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-rose-200/60 shadow-sm transition-all hover:shadow-md">
                  <h4 className="text-rose-900 font-black flex items-center gap-2 mb-4"><Activity className="h-5 w-5"/> Weaknesses</h4>
                  <ul className="list-disc list-inside text-rose-800/80 text-sm font-medium space-y-2.5">
                    {aiResult.swotAnalysis.weaknesses?.length > 0 
                      ? aiResult.swotAnalysis.weaknesses.map((w,i)=><li key={i}>{w}</li>)
                      : <li>Tidak teridentifikasi</li>}
                  </ul>
              </div>
              <div className="bg-blue-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-blue-200/60 shadow-sm transition-all hover:shadow-md">
                  <h4 className="text-blue-900 font-black flex items-center gap-2 mb-4"><Lightbulb className="h-5 w-5"/> Opportunities</h4>
                  <ul className="list-disc list-inside text-blue-800/80 text-sm font-medium space-y-2.5">
                    {aiResult.swotAnalysis.opportunities?.length > 0 
                      ? aiResult.swotAnalysis.opportunities.map((o,i)=><li key={i}>{o}</li>)
                      : <li>Tidak teridentifikasi</li>}
                  </ul>
              </div>
              <div className="bg-amber-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-amber-200/60 shadow-sm transition-all hover:shadow-md">
                  <h4 className="text-amber-900 font-black flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5"/> Threats</h4>
                  <ul className="list-disc list-inside text-amber-800/80 text-sm font-medium space-y-2.5">
                    {aiResult.swotAnalysis.threats?.length > 0 
                      ? aiResult.swotAnalysis.threats.map((t,i)=><li key={i}>{t}</li>)
                      : <li>Tidak teridentifikasi</li>}
                  </ul>
              </div>
            </div>
          )}

          {/* 5. RISK & MITIGATION */}
          {aiResult?.riskAssessment?.criticalRisks && aiResult.riskAssessment.criticalRisks.length > 0 && (
            <div className="mb-12 p-6 sm:p-8 rounded-[2rem] ring-1 ring-rose-200 bg-rose-50/30 mx-2 sm:mx-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle className="h-5 w-5"/></div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Critical Risks & Mitigation Map</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiResult.riskAssessment.criticalRisks.map((risk, idx) => (
                  <div key={idx} className="flex flex-col ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="bg-rose-50/50 p-4 border-b border-rose-100/50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Identifikasi Risiko</h4>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{risk || "Risiko tidak diketahui"}</p>
                    </div>
                    <div className="p-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1.5"><ShieldCheck size={12}/> Strategi Mitigasi</h4>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">{aiResult.riskAssessment.mitigationStrategies?.[idx] || "Belum ada mitigasi khusus."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. STRATEGIC ROADMAP & TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2 sm:px-0">
            {aiResult?.recommendations && aiResult.recommendations.length > 0 && (
              <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5"/></div>
                  <h3 className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Rekomendasi Strategis</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {aiResult.recommendations.map((rec, idx) => (
                     <InsightAccordion 
                       key={idx}
                       id={`rec-${idx}`} 
                       title={rec?.title} 
                       icon={Briefcase} 
                       content={rec?.content} 
                     />
                  ))}
                </div>
              </div>
            )}
            
            <div className={`${(!aiResult?.recommendations || aiResult.recommendations.length === 0) ? 'lg:col-span-3' : 'lg:col-span-1'} flex flex-col gap-4 sm:gap-6`}>
              <div className={`p-6 sm:p-8 rounded-[2rem] text-center ring-1 shadow-sm ${isHighTier ? 'bg-emerald-50 ring-emerald-200/60 text-emerald-900' : 'bg-indigo-50 ring-indigo-200/60 text-indigo-900'}`}>
                <Route className={`mx-auto mb-3 h-8 w-8 ${isHighTier ? 'text-emerald-500' : 'text-indigo-500'}`} />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5">Rekomendasi Tindak Lanjut</p>
                <h4 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-balance">{aiResult?.incubationRoute || "Reguler Track"}</h4>
              </div>
              
              {aiResult?.nextActionSteps && aiResult.nextActionSteps.length > 0 && (
                <div className="flex-1 bg-white ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm flex flex-col rounded-[2rem]">
                  <h3 className="font-black text-slate-900 text-lg tracking-tight mb-6 flex items-center gap-2"><ListChecks className="h-5 w-5 text-indigo-600"/> Action Plan Timeline</h3>
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-5 pb-2">
                    {aiResult.nextActionSteps.map((step: any, idx: number) => {
                      const isUrgent = step?.timeframe?.includes('30') || false;
                      const markerColor = isUrgent ? 'bg-rose-500 ring-rose-100' : 'bg-indigo-500 ring-indigo-100';
                      return (
                        <div key={idx} className="relative pl-6">
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ${markerColor}`} />
                          <div className="bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100 hover:bg-white hover:shadow-md transition-all">
                            <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-200 text-slate-700 rounded-md mb-2">{step?.timeframe || "TBD"}</span>
                            <p className="text-sm text-slate-700 font-bold leading-relaxed">{step?.task || "Langkah belum ditentukan."}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}