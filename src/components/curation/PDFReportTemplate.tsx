import React, { forwardRef } from 'react';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, Lightbulb, 
  Package, Banknote, Scale, Users, LineChart, Target, Activity, Compass,
  ChevronRight, ArrowRight
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
    
    const radarData = [
      { subject: 'Inovasi', A: aiResult.radarMetrics?.productInnovation || 0, fullMark: 100 },
      { subject: 'Pasar', A: aiResult.radarMetrics?.marketPotential || 0, fullMark: 100 },
      { subject: 'Finansial', A: aiResult.radarMetrics?.financialHealth || 0, fullMark: 100 },
      { subject: 'Tim', A: aiResult.radarMetrics?.teamCapability || 0, fullMark: 100 },
      { subject: 'Operasi', A: aiResult.radarMetrics?.operationalScalability || 0, fullMark: 100 },
      { subject: 'Legal', A: aiResult.radarMetrics?.legalAndCompliance || 0, fullMark: 100 },
    ];

    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    // Ukuran A4 yang ketat: 1024px x 1448px (Tidak boleh lebih, tidak boleh kurang)
    const pageStyle = { 
      width: '1024px', 
      height: '1448px', 
      padding: '64px 80px', // Padding lebih proporsional
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      backgroundColor: '#ffffff',
      overflow: 'hidden' as const
    };

    // --- REUSABLE COMPONENTS ---
    const PageHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
      <div className="border-b-[3px] border-slate-900 pb-6 mb-12 flex justify-between items-end">
        <div>
          <p className="text-[12px] font-bold tracking-[0.2em] text-indigo-600 uppercase mb-2">Smart Curation System</p>
          <h2 className="text-[32px] font-black text-slate-900 tracking-tight uppercase leading-none">{title}</h2>
          {subtitle && <p className="text-[14px] font-medium text-slate-500 mt-3">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-1">{formData.namaUsaha}</p>
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
        <div className="tracking-[0.4em] text-slate-300">FOR INTERNAL REVIEW</div>
        <div className="text-slate-700">Page {pageNum} <span className="mx-2 text-slate-300">/</span> 5</div>
      </div>
    );

    return (
      <div ref={ref} className="bg-white flex flex-col font-sans text-slate-900 w-[1024px]">
        
        {/* ========================================================= */}
        {/* HALAMAN 1: COVER & EXECUTIVE SUMMARY                      */}
        {/* ========================================================= */}
        <div style={pageStyle} className="flex flex-col relative">
          
          {/* Top Brand Area */}
          <div className="flex justify-between items-start mb-16">
            <div className="h-20 w-48 flex items-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain grayscale" />
              ) : (
                <div className="h-16 w-16 bg-slate-900 text-white flex items-center justify-center font-black text-3xl">
                  {formData.namaUsaha?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="border border-slate-300 px-4 py-2">
              <p className="text-[10px] font-black tracking-[0.3em] text-slate-900 uppercase">Assessment Report</p>
            </div>
          </div>

          {/* Title Area */}
          <div className="mb-16">
            <p className="text-[14px] font-bold tracking-[0.4em] text-indigo-600 uppercase mb-4">Executive Review</p>
            <h1 className="text-[64px] font-black text-slate-900 tracking-tighter uppercase leading-[1.05] mb-4 text-balance break-words line-clamp-3">
              {formData.namaUsaha}
            </h1>
            <p className="text-xl font-semibold text-slate-500 uppercase tracking-widest border-l-4 border-indigo-600 pl-4">{trackType}</p>
          </div>

          {/* Score & Summary Grid */}
          <div className="grid grid-cols-12 gap-12">
            
            {/* Score Box */}
            <div className="col-span-4 flex flex-col">
              <div className="bg-slate-50 border border-slate-200 p-8 flex flex-col items-center justify-center text-center aspect-square mb-6">
                <p className="text-[12px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Readiness Score</p>
                <div className="text-[100px] font-black text-slate-900 leading-none tracking-tighter mb-4">
                  {Math.min(aiResult.totalScore, 100)}
                </div>
                <div className="h-1 w-12 bg-indigo-600 mb-4"></div>
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-700">{aiResult.readinessLevel}</p>
              </div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                Asesmen dilakukan berdasarkan data yang diinput pada {today}.
              </div>
            </div>

            {/* Executive Summary */}
            <div className="col-span-8 flex flex-col">
               <h3 className="text-[14px] font-black tracking-[0.2em] text-slate-900 uppercase mb-6 border-b-2 border-slate-900 pb-3">
                 Executive Summary
               </h3>
               {/* Membatasi teks agar tidak merusak layout PDF */}
               <div className="text-slate-700 leading-[1.8] text-[16px] text-justify font-medium max-h-[300px] overflow-hidden">
                  {aiResult.recommendations?.executiveSummary}
               </div>
            </div>
          </div>

          {/* Critical Risks (Absolute Positioning near bottom to ensure it doesn't overlap) */}
          {aiResult.riskAssessment?.criticalRisks?.length > 0 && (
            <div className="absolute bottom-[120px] left-[80px] right-[80px] border-l-[6px] border-rose-600 bg-rose-50 p-8">
               <div className="flex items-center gap-3 mb-4">
                 <AlertTriangle className="text-rose-600" size={24}/>
                 <h3 className="text-rose-900 font-black text-[14px] uppercase tracking-[0.2em]">Critical Risk Factors</h3>
               </div>
               <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                 {aiResult.riskAssessment.criticalRisks.slice(0, 4).map((risk, idx) => ( // Dibatasi maks 4 risiko agar muat
                   <div key={idx} className="flex gap-4 items-start">
                     <span className="text-rose-500 font-black text-lg leading-none mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                     <p className="text-rose-900 text-[13px] font-medium leading-relaxed line-clamp-3">{risk}</p>
                   </div>
                 ))}
               </div>
            </div>
          )}
          
          <PageFooter pageNum={1} />
        </div>

        {/* ========================================================= */}
        {/* HALAMAN 2: METRICS & RADAR CHART                          */}
        {/* ========================================================= */}
        <div style={pageStyle} className="flex flex-col">
          <PageHeader title="Dimensional Analysis" subtitle="Evaluasi komprehensif pada 6 pilar fundamental operasional dan strategis bisnis." />
          
          {/* Memastikan tinggi grid tetap agar tidak merusak wrapper saat dirender JS */}
          <div className="grid grid-cols-12 gap-16 mt-8 h-[700px]">
            
            {/* Chart Area */}
            <div className="col-span-6 flex flex-col justify-center">
              <div className="w-full h-[450px] relative bg-slate-50 border border-slate-100 flex items-center justify-center p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#0f172a', fontSize: 13, fontWeight: 800 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skor" dataKey="A" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.15} isAnimationActive={false} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Metrics Detail Area */}
            <div className="col-span-6 flex flex-col justify-center gap-6">
              {[
                { label: 'Produk & Inovasi', score: aiResult.radarMetrics?.productInnovation, icon: Package, desc: 'Diferensiasi, keunggulan kompetitif, dan nilai tambah produk.' },
                { label: 'Potensi Pasar', score: aiResult.radarMetrics?.marketPotential, icon: Target, desc: 'Ukuran pasar, model akuisisi, dan strategi penetrasi.' },
                { label: 'Kesehatan Finansial', score: aiResult.radarMetrics?.financialHealth, icon: Banknote, desc: 'Arus kas, margin keuntungan, dan model monetisasi.' },
                { label: 'Kapabilitas Tim', score: aiResult.radarMetrics?.teamCapability, icon: Users, desc: 'Keahlian founder, struktur organisasi, dan retensi.' },
                { label: 'Skalabilitas Ops.', score: aiResult.radarMetrics?.operationalScalability, icon: LineChart, desc: 'Kapasitas produksi, sistem, dan efisiensi alur kerja.' },
                { label: 'Legalitas & Kepatuhan', score: aiResult.radarMetrics?.legalAndCompliance, icon: Scale, desc: 'Badan hukum, perizinan, HAKI, dan mitigasi risiko hukum.' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                  <div className="mt-1">
                    <item.icon size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                       <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">{item.label}</h4>
                       <div className="text-right">
                         <span className="text-xl font-black text-slate-900">{item.score || 0}</span>
                         <span className="text-[10px] font-bold text-slate-400 ml-1">/100</span>
                       </div>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed pr-8 line-clamp-2">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <PageFooter pageNum={2} />
        </div>

        {/* ========================================================= */}
        {/* HALAMAN 3: STRATEGIC SWOT MATRIX                          */}
        {/* ========================================================= */}
        <div style={pageStyle} className="flex flex-col">
          <PageHeader title="Strategic SWOT Matrix" subtitle="Pemetaan posisi kompetitif internal dan dinamika eksternal pasar." />
          
          {/* Matriks 2x2 yang sangat terstruktur */}
          <div className="flex-1 mt-4 mb-24 grid grid-cols-2 grid-rows-2 gap-8">
            
            {/* Strengths */}
            <div className="border border-slate-200 p-8 flex flex-col">
              <div className="border-b-[3px] border-indigo-600 pb-4 mb-6 flex justify-between items-center">
                <h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Strengths</h4>
                <TrendingUp className="text-indigo-600" size={24}/>
              </div>
              <ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">
                {aiResult.swotAnalysis?.strengths?.slice(0, 4).map((s,i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0"></div>
                    <span className="text-justify line-clamp-4">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="border border-slate-200 p-8 flex flex-col bg-slate-50/50">
              <div className="border-b-[3px] border-rose-500 pb-4 mb-6 flex justify-between items-center">
                <h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Weaknesses</h4>
                <Activity className="text-rose-500" size={24}/>
              </div>
              <ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">
                {aiResult.swotAnalysis?.weaknesses?.slice(0, 4).map((w,i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                    <span className="text-justify line-clamp-4">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Opportunities */}
            <div className="border border-slate-200 p-8 flex flex-col bg-slate-50/50">
              <div className="border-b-[3px] border-emerald-500 pb-4 mb-6 flex justify-between items-center">
                <h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Opportunities</h4>
                <Lightbulb className="text-emerald-500" size={24}/>
              </div>
              <ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">
                {aiResult.swotAnalysis?.opportunities?.slice(0, 4).map((o,i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                    <span className="text-justify line-clamp-4">{o}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div className="border border-slate-200 p-8 flex flex-col">
              <div className="border-b-[3px] border-amber-500 pb-4 mb-6 flex justify-between items-center">
                <h4 className="text-slate-900 font-black text-xl uppercase tracking-[0.2em]">Threats</h4>
                <AlertTriangle className="text-amber-500" size={24}/>
              </div>
              <ul className="space-y-4 text-slate-700 text-[13px] font-medium leading-[1.7] overflow-hidden flex-1">
                {aiResult.swotAnalysis?.threats?.slice(0, 4).map((t,i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                    <span className="text-justify line-clamp-4">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <PageFooter pageNum={3} />
        </div>

        {/* ========================================================= */}
        {/* HALAMAN 4: ROADMAP & ACTION PLAN                          */}
        {/* ========================================================= */}
        <div style={pageStyle} className="flex flex-col">
          <PageHeader title="Roadmap & Action Plan" subtitle="Rekomendasi taktis dan rencana aksi spesifik untuk akselerasi bisnis." />
          
          <div className="mt-4 mb-12">
            <h3 className="text-[14px] font-black tracking-[0.2em] text-slate-900 uppercase mb-8 border-b-2 border-slate-900 pb-3 inline-block">
              Strategic Blueprint
            </h3>
            <div className="grid grid-cols-2 gap-x-16 gap-y-12">
              <div className="flex flex-col">
                <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Go-To-Market Strategy</p>
                <p className="text-[14px] text-slate-700 font-medium leading-[1.8] text-justify line-clamp-6">{aiResult.recommendations?.goToMarketStrategy}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Product Development</p>
                <p className="text-[14px] text-slate-700 font-medium leading-[1.8] text-justify line-clamp-6">{aiResult.recommendations?.productRoadmap}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Financial Optimization</p>
                <p className="text-[14px] text-slate-700 font-medium leading-[1.8] text-justify line-clamp-6">{aiResult.recommendations?.financialOptimization}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Investment Readiness</p>
                <p className="text-[14px] text-slate-700 font-medium leading-[1.8] text-justify line-clamp-6">{aiResult.recommendations?.investmentReadiness}</p>
              </div>
            </div>
          </div>

          {/* PERUBAHAN: Dibuat fleksibel tanpa batasan tinggi (max-h) agar tidak terpotong */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-10 mb-20">
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest mb-8 text-center">30-Day Action Plan</h3>
            <div className="space-y-6">
              {aiResult.nextActionSteps?.slice(0, 5).map((step: string, idx: number) => (
                <div key={idx} className="flex items-start gap-6 border-b border-slate-200 pb-6 last:border-0 last:pb-0">
                  <div className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center font-black shrink-0 text-sm">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <p className="text-[14px] text-slate-800 font-semibold leading-relaxed pt-1 text-justify">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <PageFooter pageNum={4} />
        </div>

        {/* ========================================================= */}
        {/* HALAMAN 5: RECOMMENDED PATHWAY (HIGHLIGHT TERPISAH)       */}
        {/* ========================================================= */}
        <div style={{...pageStyle, backgroundColor: '#0f172a'}} className="text-white flex flex-col justify-center items-center text-center">
          
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center">
            
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-12">
              <Compass className="text-indigo-400 w-10 h-10" />
            </div>
            
            <p className="text-[14px] font-bold tracking-[0.4em] text-indigo-400 uppercase mb-8 border-b border-indigo-500/30 pb-4 inline-block">
              Final Recommendation & Pathway
            </p>
            
            {/* PERUBAHAN: Menghapus line-clamp dan menyesuaikan ukuran font agar teks panjang muat */}
            <h2 className="text-[28px] md:text-[36px] font-black text-white leading-[1.3] tracking-tight mb-12 text-balance max-w-3xl">
              {aiResult.recommendations?.incubationRoute}
            </h2>
            
            <div className="text-[16px] text-slate-400 font-medium leading-[2] text-balance max-w-2xl text-justify">
              Berdasarkan sintesis data operasional, metrik kesiapan, dan profil risiko yang telah dikalkulasi, rute ini dirancang sebagai panduan strategis utama. Eksekusi yang disiplin pada rute ini akan memaksimalkan potensi pertumbuhan sekaligus memitigasi celah kelemahan struktural entitas Anda.
            </div>

            <div className="mt-20 flex items-center gap-4 border border-slate-700 rounded-full px-6 py-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300">Ready for Execution</span>
            </div>
            
          </div>
          
          <div className="absolute bottom-12 left-0 right-0 text-center">
             <p className="text-[10px] font-bold tracking-[0.4em] text-slate-500 uppercase">
               End of Document <span className="mx-3">•</span> {formData.namaUsaha} <span className="mx-3">•</span> {today}
             </p>
          </div>
        </div>

      </div>
    );
  }
);

PDFReportTemplate.displayName = 'PDFReportTemplate';