// src/app/components/shared/TokenExportPDFButton.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { TokenBatchPDFDocument } from './TokenBatchPDFDocument';
import { toast } from 'sonner';

interface TokenExportPDFButtonProps {
  batch: any;
  availableTemplates: any[];
}

export function TokenExportPDFButton({ batch, availableTemplates }: TokenExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      // 1. Generate Blob PDF di belakang layar dengan melempar data templates
      const blob = await pdf(<TokenBatchPDFDocument batch={batch} availableTemplates={availableTemplates} />).toBlob();
      const url = URL.createObjectURL(blob);
      
      // 2. Trigger proses Download
      const link = document.createElement('a');
      link.href = url;
      const safeName = batch.corporateName.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Token_Omnifit_${batch.id}_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Dokumen PDF berhasil diunduh!", {
        description: "PDF siap dicetak dan dibagikan ke klien Anda."
      });
    } catch (error) {
      console.error("Gagal export PDF Token:", error);
      toast.error("Gagal men-generate PDF Token.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isExporting} 
      variant="outline" 
      className="border-emerald-200 bg-emerald-50 w-10 h-10 p-0 hover:bg-emerald-100 transition-colors shadow-sm"
      title="Unduh PDF Daftar Token Resmi"
    >
      {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <FileDown className="w-4 h-4 text-emerald-600" />}
    </Button>
  );
}