// src/components/admin/AdminExportPDF.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

export function AdminExportPDF({ data }: { data: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    const container = pdfRef.current;
    if (!container) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const { namaUsaha } = data;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const pages = container.querySelectorAll('.pdf-page');

        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          const dataUrl = await toJpeg(pageEl, { quality: 0.95, pixelRatio: 1.5, backgroundColor: '#ffffff' });
          
          if (i > 0) pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        
        const safeName = namaUsaha?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'laporan';
        pdf.save(`Laporan_Kurasi_${safeName}.pdf`);
      } catch (error) {
        console.error("Gagal melakukan export PDF", error);
        alert("Terjadi kesalahan saat mengekspor dokumen.");
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  const { formData, aiResult, score, readinessLevel, trackType, namaUsaha, createdAt, curatorNotes } = data;
  const isValidated = !!curatorNotes;

  const metrics = aiResult?.metrics || [];
  const METRICS_PER_PAGE = 10; 
  const metricsChunks = [];
  for (let i = 0; i < metrics.length; i += METRICS_PER_PAGE) {
    metricsChunks.push(metrics.slice(i, i + METRICS_PER_PAGE));
  }
  if (metricsChunks.length === 0) metricsChunks.push([]);

  const recs = aiResult?.recommendations || [];
  const REC_PER_PAGE = 10; 
  const recChunks = [];
  for (let i = 0; i < recs.length; i += REC_PER_PAGE) {
    recChunks.push(recs.slice(i, i + REC_PER_PAGE));
  }
  if (recChunks.length === 0) recChunks.push([]);

  const rawDataEntries = Object.entries(formData || {}).filter(([k, v]) => v !== null && v !== '');
  const RAW_DATA_PER_PAGE = 10; 
  const rawDataChunks = [];
  for (let i = 0; i < rawDataEntries.length; i += RAW_DATA_PER_PAGE) {
    rawDataChunks.push(rawDataEntries.slice(i, i + RAW_DATA_PER_PAGE));
  }

  const pageStyle = { width: '1024px', height: '1448px', padding: '64px', boxSizing: 'border-box' as const, position: 'relative' as const, backgroundColor: '#ffffff', overflow: 'hidden' as const };

  let pageCounter = 1;

  return (
    <>
      <Button 
        onClick={handleExportPDF} 
        disabled={isExporting}
        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold rounded-xl h-10 px-4 shadow-sm transition-all active:scale-95"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Unduh Laporan PDF
      </Button>

      {/* RENDER TERSEMBUNYI UNTUK EXPORT PDF */}
      <div className="overflow-hidden absolute top-[-9999px] left-[-9999px]">
        <div ref={pdfRef}>
          
          {/* HALAMAN 1: EKSEKUTIF SUMMARY & RISIKO */}
          <div className="pdf-page flex flex-col justify-start font-sans text-slate-800" style={pageStyle}>
            
            {/* STEMPEL VALIDASI LAPANGAN */}
            {isValidated && (
              <div className="absolute top-[64px] right-[64px] border-[6px] border-emerald-500 text-emerald-500 px-6 py-2 rotate-12 opacity-80 z-50 rounded-2xl">
                <p className="text-3xl font-black tracking-[0.2em] uppercase m-0 leading-none">FIELD</p>
                <p className="text-3xl font-black tracking-[0.2em] uppercase m-0 leading-none">VALIDATED</p>
              </div>
            )}

            <h1 className="text-2xl font-black text-slate-900 border-b-[4px] border-indigo-600 pb-3 mb-5 w-3/4">
              Laporan Analisis Eksekutif AI
            </h1>
            <div className="flex justify-between font-bold text-slate-500 mb-6 text-sm">
              <span>Entitas: <span className="text-slate-800">{namaUsaha}</span></span>
              <span>Kategori: {trackType}</span>
              <span>Tanggal: {new Date(createdAt).toLocaleDateString('id-ID')}</span>
            </div>

            <div className={`border-2 p-6 text-center rounded-3xl mb-8 ${isValidated ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <h2 className={`text-[60px] font-black m-0 tracking-tighter leading-none ${isValidated ? 'text-emerald-900' : 'text-slate-900'}`}>{score || 0} / 100</h2>
              <p className={`font-black text-xl mt-3 uppercase tracking-widest ${isValidated ? 'text-emerald-600' : 'text-indigo-600'}`}>{readinessLevel}</p>
              <p className="text-slate-500 text-base mt-2 font-medium">Rekomendasi Rute: {aiResult?.incubationRoute || '-'}</p>
            </div>

            {/* SEKSI CATATAN KURATOR */}
            {isValidated && (
              <div className="bg-emerald-50 border-l-[6px] border-emerald-500 p-5 mt-2 mb-6">
                <h3 className="text-emerald-800 font-bold mb-2 text-base flex items-center gap-2">Catatan Validasi Lapangan (Oleh Kurator)</h3>
                <p className="text-sm text-emerald-900 font-medium whitespace-pre-wrap leading-relaxed">{curatorNotes}</p>
              </div>
            )}

            <h2 className="text-xl font-bold text-indigo-700 mt-2 mb-3 border-b-2 border-slate-200 pb-2">1. Executive Summary</h2>
            <p className="text-justify text-sm leading-relaxed mb-6 text-slate-700">
              {aiResult?.recommendations?.[0]?.content || "Analisis telah selesai dievaluasi."}
            </p>

            {aiResult?.riskAssessment?.criticalRisks?.length > 0 && (
              <div className="bg-rose-50 border-l-[6px] border-rose-500 p-5 mt-2">
                <h3 className="text-rose-700 font-bold mb-2 text-base">Peringatan Risiko Kritis</h3>
                <ul className="list-disc pl-5 text-sm space-y-1.5 text-rose-900 font-medium">
                  {aiResult.riskAssessment.criticalRisks.slice(0, 5).map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            
            <div className="absolute bottom-12 left-[64px] right-[64px] text-center text-xs font-bold text-slate-400 border-t-2 border-slate-100 pt-4">Halaman {pageCounter++} — Smart Curation System</div>
          </div>

          {/* HALAMAN 2: DIMENSI KINERJA */}
          {metricsChunks.map((chunk, idx) => (
            <div key={`dimensi-${idx}`} className="pdf-page flex flex-col justify-start font-sans text-slate-800" style={pageStyle}>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-slate-200 pb-2">
                2. Analisis Dimensi Kinerja
              </h2>
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-3 text-left w-[25%]">Dimensi</th>
                    <th className="border border-slate-300 p-3 text-center w-[10%]">Skor</th>
                    <th className="border border-slate-300 p-3 text-left w-[65%]">Analisis AI</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="border border-slate-300 p-3 font-bold text-slate-800">{m.label}</td>
                      <td className="border border-slate-300 p-3 text-center font-black text-indigo-600 text-xl">{m.score}</td>
                      <td className="border border-slate-300 p-3 leading-relaxed text-slate-700 text-justify">{m.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="absolute bottom-12 left-[64px] right-[64px] text-center text-xs font-bold text-slate-400 border-t-2 border-slate-100 pt-4">Halaman {pageCounter++} — Smart Curation System</div>
            </div>
          ))}

          {/* HALAMAN 3: MATRIKS SWOT */}
          <div className="pdf-page flex flex-col justify-start font-sans text-slate-800" style={pageStyle}>
            <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-slate-200 pb-2">3. Matriks SWOT Strategis</h2>
            <div className="flex flex-col gap-4 text-sm flex-1 max-h-[1200px]">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col">
                <h3 className="text-emerald-800 font-bold mb-2 text-base">Strengths (Kekuatan)</h3>
                <ul className="list-disc pl-5 space-y-1 text-emerald-900 font-medium">
                  {aiResult?.swotAnalysis?.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>) || '-'}
                </ul>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col">
                <h3 className="text-rose-800 font-bold mb-2 text-base">Weaknesses (Kelemahan)</h3>
                <ul className="list-disc pl-5 space-y-1 text-rose-900 font-medium">
                  {aiResult?.swotAnalysis?.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>) || '-'}
                </ul>
              </div>
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex flex-col">
                <h3 className="text-sky-800 font-bold mb-2 text-base">Opportunities (Peluang)</h3>
                <ul className="list-disc pl-5 space-y-1 text-sky-900 font-medium">
                  {aiResult?.swotAnalysis?.opportunities?.map((o: string, i: number) => <li key={i}>{o}</li>) || '-'}
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col">
                <h3 className="text-amber-800 font-bold mb-2 text-base">Threats (Ancaman)</h3>
                <ul className="list-disc pl-5 space-y-1 text-amber-900 font-medium">
                  {aiResult?.swotAnalysis?.threats?.map((t: string, i: number) => <li key={i}>{t}</li>) || '-'}
                </ul>
              </div>
            </div>
            <div className="absolute bottom-12 left-[64px] right-[64px] text-center text-xs font-bold text-slate-400 border-t-2 border-slate-100 pt-4">Halaman {pageCounter++} — Smart Curation System</div>
          </div>

          {/* HALAMAN 4: REKOMENDASI TAKTIS & ACTION PLAN GABUNGAN */}
          {recChunks.map((chunk, idx) => (
            <div key={`rec-${idx}`} className="pdf-page flex flex-col justify-start font-sans text-slate-800" style={pageStyle}>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-slate-200 pb-2">
                4. Rekomendasi Taktis & Solusi
              </h2>
              <div className="space-y-4">
                {chunk.map((rec: any, i: number) => (
                  <div key={i}>
                    <h3 className="font-black text-base mb-1 text-slate-900">{i + 1}. {rec.title}</h3>
                    <p className="text-sm leading-relaxed text-justify text-slate-700">{rec.content}</p>
                  </div>
                ))}
              </div>

              {/* Action Plan Digabung di Halaman Ini */}
              {idx === recChunks.length - 1 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h2 className="text-xl font-bold text-indigo-700 mb-3 border-b-2 border-slate-200 pb-2">5. Action Plan (30 Hari)</h2>
                  <div className="space-y-4">
                    {aiResult?.nextActionSteps?.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 border-b border-slate-200 pb-4 last:border-0 last:pb-0">
                        <div className="bg-slate-900 text-white w-24 py-1.5 flex items-center justify-center font-black shrink-0 text-[10px] uppercase tracking-widest text-center rounded-sm">
                          {step.timeframe}
                        </div>
                        <p className="text-sm text-slate-800 font-semibold leading-relaxed text-justify">{step.task}</p>
                      </div>
                    )) || <p className="text-sm text-slate-700">Tidak ada action plan.</p>}
                  </div>
                </div>
              )}

              <div className="absolute bottom-12 left-[64px] right-[64px] text-center text-xs font-bold text-slate-400 border-t-2 border-slate-100 pt-4">Halaman {pageCounter++} — Smart Curation System</div>
            </div>
          ))}

          {/* HALAMAN 5+: LAMPIRAN DATA RAW DIBAGI 2 / 3 HALAMAN */}
          {rawDataChunks.map((chunk, idx) => (
            <div key={`raw-${idx}`} className="pdf-page flex flex-col justify-start font-sans text-slate-800" style={pageStyle}>
              <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-slate-200 pb-2">
                Lampiran: Data Raw Peserta {rawDataChunks.length > 1 ? `(Bagian ${idx + 1})` : ''}
              </h2>
              <table className="w-full border-collapse border border-slate-300 text-sm">
                <tbody>
                  {chunk.map(([key, value]) => {
                    const formatKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    const valStr = Array.isArray(value) ? value.join(', ') : String(value);
                    return (
                      <tr key={key}>
                        <td className="border border-slate-300 py-3 px-4 font-bold w-[35%] bg-slate-50 text-slate-600">{formatKey}</td>
                        <td className="border border-slate-300 py-3 px-4 w-[65%] text-slate-800 leading-relaxed">{valStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="absolute bottom-12 left-[64px] right-[64px] text-center text-xs font-bold text-slate-400 border-t-2 border-slate-100 pt-4">
                Halaman {pageCounter++} — Digenerate oleh Smart Curation AI System
              </div>
            </div>
          ))}
          
        </div>
      </div>
    </>
  );
}