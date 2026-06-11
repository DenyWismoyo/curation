'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';
import { UniversalPDFDocument } from '@/app/components/shared/UniversalPDFDocument';

interface CuratorExportPDFProps {
  trackType: string;
  formData: any;
  aiResult: any;
  namaUsaha: string;
  liveData: {
    curatorScore: number;
    curatorLevel: string;
    curatorRoute: string;
    curatorNotes: string;
  };
}

export function CuratorExportPDF({ trackType, formData, aiResult, namaUsaha, liveData }: CuratorExportPDFProps) {
  const { exportToPDF, isExporting } = usePDFExport();

  const handleDownload = () => {
    // Selaraskan data hasil reviu realtime kurator ke dalam objek hasil analisis AI
    const patchedAiResult = {
      ...aiResult,
      totalScore: liveData.curatorScore,
      readinessLevel: liveData.curatorLevel,
      incubationRoute: liveData.curatorRoute,
      curatorNotes: liveData.curatorNotes
    };

    const documentComponent = (
      <UniversalPDFDocument 
        role="curator" 
        trackType={trackType} 
        formData={formData} 
        aiResult={patchedAiResult} 
      />
    );
    
    exportToPDF(documentComponent, namaUsaha || 'Curator');
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isExporting}
      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold rounded-xl h-10 px-4 shadow-sm transition-all active:scale-95"
    >
      {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
      {isExporting ? 'Menyiapkan Dokumen...' : 'Ekspor Laporan Kurasi'}
    </Button>
  );
}