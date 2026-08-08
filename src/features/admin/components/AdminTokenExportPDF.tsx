// src/components/admin/AdminTokenExportPDF.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

export function AdminTokenExportPDF({ batch }: { batch: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    const container = pdfRef.current;
    if (!container) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
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
        
        const safeName = batch.corporateName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'batch';
        pdf.save(`Panduan_Token_${safeName}.pdf`);
      } catch (error) {
        console.error("Gagal melakukan export PDF", error);
        alert("Terjadi kesalahan saat mengekspor dokumen.");
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  const tokensArr = Object.entries(batch.tokens || {});
  const printDate = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Paginasi Sangat Aman: Maksimal 14 Baris per Halaman Besar
  const ITEMS_PER_PAGE = 14;
  const tokenChunks = [];
  for (let i = 0; i < tokensArr.length; i += ITEMS_PER_PAGE) {
    tokenChunks.push(tokensArr.slice(i, i + ITEMS_PER_PAGE));
  }

  // Style Kanvas Identik dengan PDFReportTemplate
  const pageStyle = { width: '1024px', height: '1448px', padding: '64px 80px', boxSizing: 'border-box' as const, position: 'relative' as const, backgroundColor: '#ffffff', overflow: 'hidden' as const };

  return (
    <>
      <Button 
        onClick={handleExportPDF} 
        disabled={isExporting}
        className="btn-danger-rich gap-2 font-bold rounded-xl h-9 px-3 transition-all active:scale-95 shadow-sm"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">Unduh PDF Token</span>
        <span className="sm:hidden">PDF</span>
      </Button>

      {/* RENDER TERSEMBUNYI */}
      <div className="overflow-hidden absolute top-[-9999px] left-[-9999px]">
        <div ref={pdfRef}>
          
          {/* HALAMAN 1: PANDUAN PENGGUNAAN */}
          <div className="pdf-page flex flex-col justify-start font-sans text-foreground" style={pageStyle}>
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
              <span className="text-[120px] font-black -rotate-45 whitespace-nowrap">RAHASIA / CONFIDENTIAL</span>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-4xl font-black text-foreground border-b-[4px] border-indigo-600 pb-4 mb-10">
                Buku Panduan & Daftar Token Akses AI
              </h1>
              
              <div className="bg-muted text-muted-foreground border border-border p-8 rounded-2xl flex justify-between font-bold text-slate-700 text-lg mb-12">
                 <div>
                   <div className="text-2xl text-foreground mb-2">Entitas: {batch.corporateName}</div>
                   <div>Tipe Mesin AI: <span className="text-indigo-600 dark:text-indigo-400">AI {batch.modelType?.toUpperCase() || 'FLASH'}</span></div>
                 </div>
                 <div className="text-right space-y-2">
                   <div>ID Prefix: <span className="text-indigo-600 dark:text-indigo-400">{batch.id}</span></div>
                   <div>Total Alokasi: {batch.totalTokens} Token</div>
                   <div className="font-medium text-muted-foreground">Dicetak pada: {printDate} WIB</div>
                 </div>
              </div>

              <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-6 border-b-2 border-border pb-3">1. Pengenalan Token Akses</h2>
              <p className="text-justify text-lg leading-relaxed mb-10 text-slate-700">
                Token akses di bawah ini adalah <strong>kunci otentikasi (sekali pakai)</strong> yang diberikan kepada peserta/entitas UMKM/Startup untuk menggunakan Smart Curation AI System. Satu token hanya berlaku untuk satu kali submit evaluasi yang sukses. Harap jaga kerahasiaan token ini dan distribusikan dengan bijak.
              </p>

              <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-6 mb-6 border-b-2 border-border pb-3">2. Langkah-Langkah Pengisian Form</h2>
              <ol className="list-decimal pl-6 text-lg space-y-5 leading-relaxed text-justify text-slate-700">
                  <li><strong>Buka Portal Asesmen:</strong> Kunjungi tautan aplikasi kurasi resmi yang telah diberikan oleh panitia. Sangat disarankan menggunakan Laptop/PC.</li>
                  <li><strong>Pilih Kategori:</strong> Klik <em>"Mulai Asesmen Sekarang"</em>, lalu pilih Model Bisnis (Track) yang sesuai.</li>
                  <li><strong>Pengisian Data:</strong> Isi formulir dengan jujur dan lengkap. Data Anda secara otomatis tersimpan sementara (auto-save).</li>
                  <li><strong>Tahap Finalisasi:</strong> Setelah melewati semua langkah, Anda akan tiba di halaman <em>"Tinjauan Akhir & Konfirmasi"</em>.</li>
                  <li><strong>Input Token:</strong> Masukkan <strong>Kode Token Penuh</strong> ke dalam kolom <em>"Token Akses Kurasi"</em>.</li>
                  <li><strong>Kirim & Unduh:</strong> Centang pernyataan tanggung jawab, lalu klik <strong>"Kirim untuk Analisis AI"</strong>. Laporan Executive PDF akan keluar secara otomatis.</li>
              </ol>
            </div>
            
            <div className="absolute bottom-12 left-[80px] right-[80px] text-center text-sm font-bold text-slate-400 border-t-2 border-border pt-6">
              Halaman 1 — Dokumen Konfidensial (Smart Curation System)
            </div>
          </div>

          {/* HALAMAN 2+: DAFTAR TOKEN YANG DI-PAGINASI */}
          {tokenChunks.map((chunk, pageIndex) => (
            <div key={pageIndex} className="pdf-page flex flex-col justify-start font-sans text-foreground" style={pageStyle}>
              <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-8 border-b-2 border-border pb-3">
                3. Daftar Distribusi Kode Token {tokenChunks.length > 1 ? `(Bagian ${pageIndex + 1})` : ''}
              </h2>
              <table className="w-full border-collapse border border-border text-lg">
                 <thead>
                   <tr className="bg-secondary text-secondary-foreground text-foreground">
                     <th className="border border-border p-4 text-center w-[8%]">No</th>
                     <th className="border border-border p-4 text-left w-[35%]">Kode Token Penuh</th>
                     <th className="border border-border p-4 text-center w-[15%]">Ceklis</th>
                     <th className="border border-border p-4 text-left w-[42%]">Catatan / Diberikan Kepada</th>
                   </tr>
                 </thead>
                 <tbody>
                   {chunk.map(([code, data]: any, i: number) => {
                     const realIndex = (pageIndex * ITEMS_PER_PAGE) + i + 1;
                     return (
                       <tr key={code} className={data.isUsed ? "bg-emerald-50 dark:bg-emerald-500/10/30" : ""}>
                          <td className="border border-border p-4 text-center font-bold text-muted-foreground">{realIndex}</td>
                          <td className="border border-border p-4 font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10/50 text-xl tracking-widest">
                            {batch.id}-{code}
                          </td>
                          <td className="border border-border p-4 text-center">
                            {data.isUsed ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl">✓</span>
                            ) : (
                              <div className="w-6 h-6 border-[3px] border-border rounded mx-auto"></div>
                            )}
                          </td>
                          <td className="border border-border p-4 text-sm leading-relaxed text-slate-700">
                            {data.isUsed ? (
                              <><strong>User:</strong> {data.usedByNamaUsaha || '-'}<br/><strong className="text-slate-400">Waktu:</strong> {new Date(data.usedAt).toLocaleString('id-ID')}</>
                            ) : (
                              <span className="text-slate-300 tracking-widest">..........................................................</span>
                            )}
                          </td>
                       </tr>
                     );
                   })}
                 </tbody>
              </table>
              <div className="absolute bottom-12 left-[80px] right-[80px] text-center text-sm font-bold text-slate-400 border-t-2 border-border pt-6">
                Halaman {pageIndex + 2} — Dokumen Konfidensial
              </div>
            </div>
          ))}

        </div>
      </div>
    </>
  );
}