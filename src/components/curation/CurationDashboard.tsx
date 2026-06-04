// src/components/curation/CurationDashboard.tsx
import React, { useRef, useState } from 'react';
import { RotateCcw, ShieldCheck, Package, Target, Sparkles, Globe, Activity, Route, ListChecks, CheckSquare, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CurationFormData, AIResult } from '@/types/curation';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  trackType: string;
  formData: CurationFormData;
  aiResult: AIResult;
  onRestart: () => void;
}

export function CurationDashboard({ trackType, formData, aiResult, onRestart }: Props) {
  const isHighTier = aiResult.totalScore >= 75;
  const badgeColor = isHighTier ? 'from-emerald-600 to-teal-800' : aiResult.totalScore >= 60 ? 'from-blue-600 to-indigo-800' : 'from-slate-600 to-slate-800';
  
  // State dan Ref untuk fitur Export PDF
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    const element = dashboardRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      // Render elemen React menjadi gambar Canvas (Scale 2 agar resolusi PDF tidak pecah/blur)
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#f8fafc' // Warna slate-50 menyesuaikan background
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Setup PDF ukuran A4 (p = portrait, mm = milimeter)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Menghitung rasio tinggi gambar agar proporsional di A4
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Bersihkan nama file dari spasi agar rapi saat diunduh
      const safeName = formData.namaUsaha?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'startup';
      pdf.save(`Hasil_Kurasi_${safeName}.pdf`);

    } catch (error) {
      console.error("Gagal melakukan export PDF:", error);
      alert("Terjadi kesalahan saat membuat PDF. Pastikan browser Anda mendukung fitur ini.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 lg:px-12 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Aksi (Tidak ikut di-render ke PDF karena di luar dashboardRef) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <Button variant="outline" onClick={onRestart} className="gap-2 border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
            <RotateCcw className="h-4 w-4" /> Kembali ke Awal
          </Button>
          
          <Button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold transition-all"
          >
            {isExporting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan Dokumen...</>
            ) : (
              <><Download className="h-4 w-4" /> Unduh PDF Asesmen</>
            )}
          </Button>
        </div>

        {/* =========================================================================
            AREA YANG AKAN DI-EXPORT KE PDF (Dibungkus dengan ref={dashboardRef})
            ========================================================================= */}
        <div ref={dashboardRef} className="space-y-8 bg-slate-50 p-2 sm:p-4 rounded-xl">
          
          {/* Judul Dokumen */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Hasil Kurasi Bisnis</h1>
            <p className="text-slate-500 font-medium text-lg mt-1">{formData.namaUsaha} • {trackType}</p>
          </div>

          {/* Hero Score */}
          <div className={`rounded-[2rem] p-10 lg:p-14 text-white shadow-xl flex flex-col md:flex-row justify-between md:items-center relative overflow-hidden bg-gradient-to-br ${badgeColor}`}>
            <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10">
              <p className="text-white/80 text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5"/> Readiness Level Assessment
              </p>
              <div className="flex items-end gap-6">
                <span className="text-8xl lg:text-9xl font-black leading-none tracking-tighter">{aiResult.totalScore}</span>
                <div className="pb-3">
                  <span className="text-sm md:text-lg font-bold bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/30 block w-fit">
                    {aiResult.readinessLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-blue-500"/> Kualitas & Kapasitas</p>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-slate-800">{aiResult.scoreBreakdown.productAndTech}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${aiResult.scoreBreakdown.productAndTech}%` }} /></div>
              </div>
            </Card>
            <Card className="p-8 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-500"/> Pasar & Finansial</p>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-slate-800">{aiResult.scoreBreakdown.marketAndFinancial}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${aiResult.scoreBreakdown.marketAndFinancial}%` }} /></div>
              </div>
            </Card>
            <Card className="p-8 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-500"/> Legal & Kepatuhan</p>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-slate-800">{aiResult.scoreBreakdown.legalAndCompliance}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="bg-amber-500 h-3 rounded-full" style={{ width: `${aiResult.scoreBreakdown.legalAndCompliance}%` }} /></div>
              </div>
            </Card>
          </div>

          {/* AI Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-8 lg:p-10 border-indigo-100 rounded-2xl border-2 bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-slate-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Sparkles className="h-6 w-6"/></div>
                <h3 className="font-black text-slate-900 text-2xl tracking-tight">AI Strategic Insights</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Globe className="h-4 w-4"/> Potensi Pasar</h4>
                  <p className="text-sm bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 font-medium text-slate-700 min-h-[100px] leading-relaxed">{aiResult.recommendations.targetMarket}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Activity className="h-4 w-4"/> Monetisasi</h4>
                  <p className="text-sm bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 font-medium text-slate-700 min-h-[100px] leading-relaxed">{aiResult.recommendations.pricingAndMonetization}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Target className="h-4 w-4"/> Distribusi</h4>
                  <p className="text-sm bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 font-medium text-slate-700 min-h-[100px] leading-relaxed">{aiResult.recommendations.distributionAndGrowth}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Package className="h-4 w-4"/> Pengembangan</h4>
                  <p className="text-sm bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 font-medium text-slate-700 min-h-[100px] leading-relaxed">{aiResult.recommendations.productImprovement}</p>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className={`p-8 rounded-[2rem] text-center border-2 shadow-sm ${isHighTier ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                <Route className={`mx-auto mb-4 h-10 w-10 ${isHighTier ? 'text-emerald-500' : 'text-blue-500'}`} />
                <p className="text-[11px] font-black uppercase tracking-widest opacity-70 mb-2">Rekomendasi Program</p>
                <h4 className="text-2xl font-black leading-tight tracking-tight">{aiResult.recommendations.incubationRoute}</h4>
              </div>

              <Card className="flex-1 bg-indigo-50/50 border-indigo-100 p-8 shadow-sm flex flex-col rounded-2xl border-2">
                <h3 className="font-black text-indigo-900 text-lg tracking-tight mb-6 flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-indigo-600"/> Rencana Tindak Lanjut
                </h3>
                <div className="space-y-4 flex-1">
                  {aiResult.recommendations.nextActionSteps.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                      <CheckSquare className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
          
        </div>
        {/* AKHIR AREA EXPORT */}

      </div>
    </div>
  );
}