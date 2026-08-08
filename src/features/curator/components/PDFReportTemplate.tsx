'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';

interface CuratorExportPDFProps {
  assessmentId: string;     // <-- Props Baru yang Wajib
  templateVersion?: number; // <-- Props Baru
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

export function CuratorExportPDF({ assessmentId, templateVersion = 1, trackType, formData, aiResult, namaUsaha, liveData }: CuratorExportPDFProps) {
  const { exportToPDF, isExporting } = usePDFExport();

  const handleDownload = (forceRegenerate: boolean = false) => {
    const patchedAiResult = {
      ...aiResult,
      totalScore: liveData.curatorScore,
      readinessLevel: liveData.curatorLevel,
      incubationRoute: liveData.curatorRoute,
      curatorNotes: liveData.curatorNotes
    };

    // Susun payload untuk backend
    const payload = {
      trackType,
      formData,
      aiResult: patchedAiResult
    };
    
    // Panggil hook dengan role "curator"
    exportToPDF(
      "curator", 
      payload, 
      namaUsaha || 'Curator', 
      assessmentId, 
      templateVersion, 
      forceRegenerate
    );
  };

  return (
    <div className="flex gap-2">
      {/* Tombol Unduh Standar (Dari Arsip) */}
      <Button 
        onClick={() => handleDownload(false)} 
        disabled={isExporting}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold rounded-xl h-10 px-4 shadow-sm transition-all active:scale-95"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {isExporting ? 'Menyiapkan...' : 'Ekspor Laporan Kurasi'}
      </Button>

      {/* Tombol Force Regenerate (Jika Kurator mengubah nilai / catatan) */}
      <Button 
        onClick={() => handleDownload(true)} 
        disabled={isExporting}
        variant="outline"
        title="Render Ulang PDF Baru dengan Perubahan Terbaru"
        className="h-10 px-3 rounded-xl border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:bg-emerald-500/10"
      >
        <RefreshCw className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}