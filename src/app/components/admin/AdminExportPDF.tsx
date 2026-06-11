'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';
import { UniversalPDFDocument } from '@/app/components/shared/UniversalPDFDocument';

export function AdminExportPDF({ data }: { data: any }) {
  const { exportToPDF, isExporting } = usePDFExport();

  const handleDownload = () => {
    // Gabungkan riwayat AI asli dengan reviu final kurator agar tersaji akurat di PDF
    const patchedAiResult = {
      ...data.aiResult,
      totalScore: data.score !== undefined ? data.score : data.aiResult?.totalScore,
      readinessLevel: data.readinessLevel || data.aiResult?.readinessLevel,
      incubationRoute: data.curatorAssessment?.finalRoute || data.aiResult?.incubationRoute,
      curatorNotes: data.curatorNotes || ''
    };

    const documentComponent = (
      <UniversalPDFDocument 
        role="admin_csrs" 
        trackType={data.trackType} 
        formData={data.formData} 
        aiResult={patchedAiResult} 
      />
    );
    
    exportToPDF(documentComponent, data.namaUsaha || 'Admin');
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isExporting}
      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold rounded-xl h-10 px-4 shadow-sm transition-all active:scale-95"
    >
      {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {isExporting ? 'Memproses PDF...' : 'Unduh Laporan Internal (Admin)'}
    </Button>
  );
}