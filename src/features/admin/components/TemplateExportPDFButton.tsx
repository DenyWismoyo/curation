// src/app/components/shared/TemplateExportPDFButton.tsx
'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FormTemplate } from '@/features/assessment/types/assessment.types';
import { pdf } from '@react-pdf/renderer';
import { TemplateQuestionsPDF } from '@/features/assessment/components/pdf/TemplateQuestionsPDF';

export function TemplateExportPDFButton({ template }: { template: FormTemplate }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAndDownload = async (e: React.MouseEvent) => {
    // SANGAT PENTING: Mencegah efek klik merambat ke parent Card 
    // (agar tidak tidak sengaja membuka halaman editor form saat menekan tombol unduh)
    e.stopPropagation(); 
    
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // 1. Memanggil dan merender PDF HANYA PADA SAAT DIKLIK (On-Demand)
      const doc = <TemplateQuestionsPDF template={template} />;
      const asPdf = pdf();
      asPdf.updateContainer(doc);
      
      // 2. Mengubah hasil render menjadi Blob Data
      const blob = await asPdf.toBlob();

      // 3. Membuat URL sementara dan memicu klik unduhan secara programatis
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Membersihkan nama file agar aman untuk Windows/Mac
      const safeName = template.trackName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      link.download = `Form_Asesmen_${safeName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Membersihkan memori browser setelah selesai

    } catch (error) {
      console.error("Gagal merender PDF:", error);
      alert("Gagal mengunduh dokumen. Pastikan koneksi stabil dan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerateAndDownload}
      disabled={isGenerating}
      title="Unduh Struktur Form (PDF)"
      // Gaya menyesuaikan screenshot: tombol kecil minimalis di samping badge
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all ring-1 ring-indigo-200 dark:ring-indigo-500/20 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Download size={14} />
      )}
    </button>
  );
}