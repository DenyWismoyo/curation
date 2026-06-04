import React, { useRef, useState } from 'react';
import {
  RotateCcw, ShieldCheck, Target, Sparkles, Activity,
  Route, ListChecks, CheckSquare, Download, Loader2, ChevronDown,
  AlertTriangle, Zap, TrendingUp, Lightbulb, Package, Banknote, ImagePlus
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
  onRestart: () => void;
}

export function CurationDashboard({ trackType, formData, aiResult, onRestart }: Props) {
  const isHighTier = aiResult.totalScore >= 75;
  
  // Referensi baru khusus untuk komponen template PDF yang tersembunyi
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('market');
  
  // State untuk menyimpan URL sementara dari logo yang diunggah
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Fungsi untuk menangani unggah logo secara lokal (browser-side)
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Buat URL lokal untuk gambar yang diunggah
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
        // Render keseluruhan template (yang berisi 4 halaman A4 panjang)
        const dataUrl = await toJpeg(element, {
          quality: 0.85,
          pixelRatio: 1.5,
          backgroundColor: '#ffffff', // PERUBAHAN: Background murni putih (sebelumnya #f1f5f9)
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // imgHeight adalah tinggi TOTAL gambar yang difoto.
        // Karena element kita (1024x1448 px) sudah dirancang memiliki proporsi A4
        // Maka gambar ini sejatinya adalah susunan 4 buah A4 yang ditumpuk secara vertikal.
        const imgProps = pdf.getImageProperties(dataUrl);
        const totalImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = totalImgHeight;
        let position = 0;

        // Cetak Halaman 1
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, totalImgHeight);
        heightLeft -= pdfHeight;

        // Loop untuk memotong dan mencetak sisa halaman (Hal 2, 3, 4)
        // Batas toleransi 2mm untuk menghindari mencetak halaman kosong di akhir
        while (heightLeft > 2) { 
          position -= pdfHeight; // Geser pandangan "kamera" ke bawah sejauh 1 kertas A4
          pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, totalImgHeight);
          heightLeft -= pdfHeight;
        }
        
        const safeName = formData.namaUsaha?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'startup';
        pdf.save(`Laporan_Eksekutif_${safeName}.pdf`);
      } catch (error) {
        console.error("Gagal melakukan export PDF:", error);
        alert("Gagal melakukan eksport PDF. Pastikan aset mendukung CORS.");
      } finally {
        setIsExporting(false);
      }
    }, 500); 
  };



  const radarData = [
    { subject: 'Produk & Inovasi', A: aiResult.radarMetrics?.productInnovation || 0, fullMark: 100 },
    { subject: 'Potensi Pasar', A: aiResult.radarMetrics?.marketPotential || 0, fullMark: 100 },
    { subject: 'Finansial', A: aiResult.radarMetrics?.financialHealth || 0, fullMark: 100 },
    { subject: 'Kapabilitas Tim', A: aiResult.radarMetrics?.teamCapability || 0, fullMark: 100 },
    { subject: 'Skalabilitas', A: aiResult.radarMetrics?.operationalScalability || 0, fullMark: 100 },
    { subject: 'Legalitas', A: aiResult.radarMetrics?.legalAndCompliance || 0, fullMark: 100 },
  ];

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
              {title}
            </h4>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 sm:p-5 pt-0 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-50">
            {content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-12 animate-in fade-in duration-700">
      
      {/* Container Tersembunyi untuk Template PDF 
        (Posisi absolut dipindah ke luar layar agar tidak merusak tampilan web)
      */}
      <div className="overflow-hidden absolute top-[-9999px] left-[-9999px]">
        <PDFReportTemplate 
          ref={pdfTemplateRef}
          trackType={trackType}
          formData={formData}
          aiResult={aiResult}
          logoUrl={logoUrl}
        />
      </div>

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header Aksi - Tambah tombol Upload Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={onRestart} className="gap-2 text-slate-500 hover:text-slate-900 -ml-2 active:scale-95">
            <RotateCcw className="h-4 w-4" /> Kembali ke Awal
          </Button>
          
          <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row">
            {/* Input Hidden & Tombol Kustom untuk Logo */}
            <div>
              <input 
                type="file" 
                id="logo-upload" 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg" 
                onChange={handleLogoUpload} 
              />
              <label htmlFor="logo-upload" className="flex items-center justify-center w-full sm:w-auto gap-2 bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl h-10 px-4 transition-all active:scale-95 cursor-pointer shadow-sm">
                <ImagePlus className="h-4 w-4" /> {logoUrl ? 'Ganti Logo' : 'Upload Logo'}
              </label>
            </div>

            <Button onClick={handleExportPDF} disabled={isExporting} className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-indigo-600 text-white shadow-lg font-bold rounded-xl transition-all active:scale-95 h-10">
              {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Render PDF...</> : <><Download className="h-4 w-4" /> Unduh Laporan Eksekutif</>}
            </Button>
          </div>
        </div>

        {/* VIEW DASHBOARD REGULER */}
        <div className="space-y-6 sm:space-y-8 bg-slate-50 p-2 sm:p-6 lg:p-8 rounded-2xl relative overflow-hidden">
          
          <div className="relative z-10 space-y-6 sm:space-y-8">
            
            {/* Report Header dengan Logo Kustom */}
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 border-b border-slate-200 pb-6">
              <div className="text-center sm:text-left w-full sm:w-auto">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight text-balance">Laporan Analisis Eksekutif</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  <p className="text-slate-600 font-bold text-base sm:text-lg">{formData.namaUsaha}</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <p className="text-slate-500 font-medium text-sm sm:text-base uppercase tracking-widest">{trackType}</p>
                </div>
              </div>
              
              {/* Display Logo Kustom */}
              {logoUrl && (
                <div className="h-16 sm:h-20 max-w-[200px] shrink-0 p-2 bg-white rounded-xl ring-1 ring-slate-100 shadow-sm flex items-center justify-center">
                  <img src={logoUrl} alt="Logo Usaha" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>

            {/* Banner Peringatan Risiko Kritis */}
            {aiResult.riskAssessment?.criticalRisks?.length > 0 && (
              <div className="bg-rose-50/80 backdrop-blur-sm ring-1 ring-rose-200 border-l-[6px] border-l-rose-500 p-5 rounded-r-xl flex items-start gap-4 shadow-sm">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600 shrink-0"><AlertTriangle className="h-6 w-6" /></div>
                <div>
                  <h4 className="text-rose-900 font-black text-lg mb-1.5 tracking-tight">Peringatan Risiko Kritis</h4>
                  <ul className="list-disc list-inside text-rose-700 font-medium text-sm space-y-1">
                    {aiResult.riskAssessment.criticalRisks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* Hero Score - Executive View */}
            <div className={`relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 lg:p-16 text-white shadow-xl shadow-slate-200/50 flex flex-col items-center sm:items-start text-center sm:text-left ${isHighTier ? 'bg-[#0f3d32]' : 'bg-slate-900'}`}>
              <div className={`absolute top-0 right-0 w-[120%] sm:w-[80%] h-full opacity-40 blur-[80px] pointer-events-none ${isHighTier ? 'bg-gradient-to-bl from-teal-400 to-emerald-600' : 'bg-gradient-to-bl from-blue-400 to-indigo-600'}`} />
              <div className="relative z-10 w-full flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12">
                <div className="flex-1">
                  <p className="text-white/70 text-xs sm:text-sm font-black uppercase tracking-widest mb-3 flex items-center justify-center sm:justify-start gap-2">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5"/> Overall Readiness Score
                  </p>
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mb-6">
                    {/* Pembatasan Visual (meski backend sudah dibatasi, kita cegah >100 tampil) */}
                    <span className="text-[100px] lg:text-[130px] font-black leading-[0.85] tracking-tighter drop-shadow-2xl">
                      {Math.min(aiResult.totalScore, 100)}
                    </span>
                    <div className="pb-2 lg:pb-5">
                      <span className="text-sm md:text-base font-bold bg-white/10 backdrop-blur-md px-6 py-3 rounded-full ring-1 ring-white/20 block text-center shadow-lg">
                        {aiResult.readinessLevel}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Executive Summary Mini-Card */}
                <div className="lg:max-w-md w-full bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-6 rounded-3xl shadow-2xl">
                  <h3 className="text-indigo-200 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2"><Zap className="h-4 w-4"/> AI Executive Summary</h3>
                  <p className="text-slate-100 leading-relaxed text-sm font-medium">{aiResult.recommendations?.executiveSummary}</p>
                </div>
              </div>
            </div>

            {/* SECTION: Radar & SWOT (Core Analytics) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Kolom Kiri: Radar Chart 6 Dimensi */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="font-black text-slate-900 mb-6 text-center text-lg tracking-tight">Analisis 6 Dimensi</h4>
                <div className="flex-1 min-h-[300px] w-full relative -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Skor" dataKey="A" stroke={isHighTier ? '#10b981' : '#4f46e5'} strokeWidth={2.5} fill={isHighTier ? '#10b981' : '#4f46e5'} fillOpacity={0.15} />
                        <Tooltip wrapperClassName="rounded-xl font-bold text-sm shadow-xl" />
                      </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Kolom Kanan: Matrix SWOT */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-emerald-200/60 shadow-sm transition-all hover:shadow-md">
                    <h4 className="text-emerald-900 font-black flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5"/> Strengths</h4>
                    <ul className="list-disc list-inside text-emerald-800/80 text-sm font-medium space-y-2.5">
                      {aiResult.swotAnalysis?.strengths?.map((s,i)=><li key={i}>{s}</li>)}
                    </ul>
                </div>
                <div className="bg-rose-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-rose-200/60 shadow-sm transition-all hover:shadow-md">
                    <h4 className="text-rose-900 font-black flex items-center gap-2 mb-4"><Activity className="h-5 w-5"/> Weaknesses</h4>
                    <ul className="list-disc list-inside text-rose-800/80 text-sm font-medium space-y-2.5">
                      {aiResult.swotAnalysis?.weaknesses?.map((w,i)=><li key={i}>{w}</li>)}
                    </ul>
                </div>
                <div className="bg-blue-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-blue-200/60 shadow-sm transition-all hover:shadow-md">
                    <h4 className="text-blue-900 font-black flex items-center gap-2 mb-4"><Lightbulb className="h-5 w-5"/> Opportunities</h4>
                    <ul className="list-disc list-inside text-blue-800/80 text-sm font-medium space-y-2.5">
                      {aiResult.swotAnalysis?.opportunities?.map((o,i)=><li key={i}>{o}</li>)}
                    </ul>
                </div>
                <div className="bg-amber-50/80 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-amber-200/60 shadow-sm transition-all hover:shadow-md">
                    <h4 className="text-amber-900 font-black flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5"/> Threats</h4>
                    <ul className="list-disc list-inside text-amber-800/80 text-sm font-medium space-y-2.5">
                      {aiResult.swotAnalysis?.threats?.map((t,i)=><li key={i}>{t}</li>)}
                    </ul>
                </div>
              </div>
            </div>

            {/* SECTION: Deep Dive Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5"/></div>
                  <h3 className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Rekomendasi Taktis & Strategis</h3>
                </div>
                
                <div className="flex flex-col gap-3">
                  <InsightAccordion id="market" title="Strategi Go-To-Market" icon={Target} content={aiResult.recommendations?.goToMarketStrategy} />
                  <InsightAccordion id="product" title="Product Roadmap" icon={Package} content={aiResult.recommendations?.productRoadmap} />
                  <InsightAccordion id="finance" title="Optimasi Finansial" icon={Banknote} content={aiResult.recommendations?.financialOptimization} />
                  <InsightAccordion id="investment" title="Kesiapan Investasi" icon={ShieldCheck} content={aiResult.recommendations?.investmentReadiness} />
                </div>
              </div>
              
              <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6">
                <div className={`p-6 sm:p-8 rounded-[2rem] text-center ring-1 shadow-sm ${isHighTier ? 'bg-emerald-50 ring-emerald-200/60 text-emerald-900' : 'bg-indigo-50 ring-indigo-200/60 text-indigo-900'}`}>
                  <Route className={`mx-auto mb-3 h-8 w-8 ${isHighTier ? 'text-emerald-500' : 'text-indigo-500'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5">Saran Rute Inkubasi</p>
                  <h4 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-balance">{aiResult.recommendations?.incubationRoute}</h4>
                </div>
                
                <div className="flex-1 bg-white ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm flex flex-col rounded-[2rem]">
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight mb-5 flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-indigo-600"/> Action Plan (30 Hari)
                  </h3>
                  <div className="space-y-3 flex-1">
                    {aiResult.nextActionSteps?.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl">
                        <CheckSquare className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-slate-700 font-bold leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}