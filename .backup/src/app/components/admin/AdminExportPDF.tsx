'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';

export function AdminExportPDF({ data }: { data: any }) {
  const { exportToPDF, isExporting } = usePDFExport();

  const handleDownload = (forceRegenerate: boolean = false) => {
    const patchedAiResult = {
      ...data.aiResult,
      totalScore: data.score !== undefined ? data.score : data.aiResult?.totalScore,
      readinessLevel: data.readinessLevel || data.aiResult?.readinessLevel,
      incubationRoute: data.curatorAssessment?.finalRoute || data.aiResult?.incubationRoute,
      curatorNotes: data.curatorNotes || ''
    };

    // Susun payload untuk backend
    const payload = {
      trackType: data.trackType,
      formData: data.formData,
      aiResult: patchedAiResult
    };
    
    // Pastikan data.id merujuk ke ID dokumen Firestore
    const assessmentId = data.id || data.assessmentId; 
    const templateVersion = data.templateVersion || 1;

    // Panggil hook dengan role "admin_csrs" beserta instruksi cache
    exportToPDF(
      "admin_csrs", 
      payload, 
      data.namaUsaha || 'Admin', 
      assessmentId, 
      templateVersion, 
      forceRegenerate
    );
  };

  return (
    <div className="flex gap-2">
      {/* Tombol Unduh Standar (Memanfaatkan Arsip jika ada) */}
      <Button 
        onClick={() => handleDownload(false)} 
        disabled={isExporting}
        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold rounded-xl h-10 px-4 shadow-sm transition-all active:scale-95"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isExporting ? 'Memproses...' : 'Unduh Laporan Internal'}
      </Button>

      {/* Tombol Force Regenerate (Memaksa Render Ulang jika ada data baru) */}
      <Button 
        onClick={() => handleDownload(true)} 
        disabled={isExporting}
        variant="outline"
        title="Render Ulang PDF Baru (Abaikan Arsip)"
        className="h-10 px-3 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
      >
        <RefreshCw className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}