'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, FileText } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

export function AdminExportPDF({ data }: { data: any }) {
  const { exportToPDF, isExporting } = usePDFExport();
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeVerification: true,
    includeCustomBlocks: true,
    includeMetricsSwot: true,
    includeStrategyRisks: true,
    includeAppendix: true,
  });

  const handleToggleOption = (key: keyof typeof exportOptions) => {
    setExportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownload = (forceRegenerate: boolean = false) => {
    const patchedAiResult = {
      ...data.aiResult,
      totalScore: data.analyticsSummary?.performanceScore !== undefined 
          ? data.analyticsSummary.performanceScore 
          : (data.score !== undefined ? data.score : data.aiResult?.totalScore),
      readinessLevel: data.analyticsSummary?.performanceBand || data.readinessLevel || data.aiResult?.readinessLevel,
      executiveSummary: data.analyticsSummary?.summary?.headline 
          ? `${data.analyticsSummary.summary.headline}\n${(data.analyticsSummary.summary.keyFindings || []).map((f: string) => `- ${f}`).join('\n')}`
          : data.aiResult?.executiveSummary,
      incubationRoute: data.curatorAssessment?.finalRoute || data.aiResult?.incubationRoute,
      curatorNotes: data.curatorNotes || ''
    };

    // Susun payload untuk backend
    const payload = {
      trackType: data.trackType,
      formData: data.formData,
      aiResult: patchedAiResult,
      exportOptions
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
    
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          disabled={isExporting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold rounded-xl h-10 px-4 shadow-sm transition-all active:scale-95"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? 'Memproses...' : 'Ekspor Laporan PDF'}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Konfigurasi Ekspor Laporan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground font-medium">
            Pilih bagian laporan yang ingin disertakan ke dalam file PDF.
          </p>
          <div className="space-y-3">
            {[
              { key: 'includeVerification', label: 'Verifikasi Dokumen' },
              { key: 'includeCustomBlocks', label: 'Parameter Spesifik' },
              { key: 'includeMetricsSwot', label: 'Performa & SWOT' },
              { key: 'includeStrategyRisks', label: 'Strategi & Risiko' },
              { key: 'includeAppendix', label: 'Data Input / Raw Data' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl ring-1 ring-border hover:bg-muted text-muted-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={exportOptions[key as keyof typeof exportOptions]}
                  onChange={() => handleToggleOption(key as keyof typeof exportOptions)}
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400 rounded-md border-border focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button 
            onClick={() => handleDownload(true)} 
            disabled={isExporting}
            variant="outline"
            title="Render Ulang PDF Baru (Abaikan Arsip)"
            className="rounded-xl font-bold h-11 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
            Render Ulang
          </Button>

          <Button 
            onClick={() => handleDownload(false)} 
            disabled={isExporting}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold h-11"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Ekspor Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}