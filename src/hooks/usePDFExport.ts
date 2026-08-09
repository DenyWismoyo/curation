// src/hooks/usePDFExport.ts
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/firebase';

export function usePDFExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async (
    role: string, 
    payload: any, 
    fileName: string, 
    assessmentId: string, 
    templateVersion: number = 4, 
    forceRegenerate: boolean = false
  ) => {
    setIsExporting(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2'); 
      const generatePDFCloud = httpsCallable(functions, 'generatePDFReport');

      // Mengirim payload lengkap beserta ID dan instruksi arsip
      const result = await generatePDFCloud({ 
        role, 
        payload, 
        assessmentId, 
        templateVersion, 
        forceRegenerate 
      });
      
      const data = result.data as { downloadUrl: string; cached: boolean };
      
      // (Opsional) Anda bisa memunculkan toast: data.cached ? "Mengambil dari arsip" : "PDF baru dibuat"

      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.target = '_blank';
      
      const safeName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `Report_CSRS_${safeName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Gagal melakukan export PDF:", error);
      alert("Terjadi kesalahan sistem saat mengambil dokumen PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToPDF, isExporting };
}