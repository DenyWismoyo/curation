'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Lock } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useAuth } from '@/contexts/AuthContext'; 

interface PublicExportPDFProps {
  assessmentId: string;     // <-- Props Baru yang Wajib
  templateVersion?: number; // <-- Props Baru
  trackType: string;
  formData: any;
  aiResult: any;
  logoUrl?: string | null;
}

export function PublicExportPDF({ assessmentId, templateVersion = 4, trackType, formData, aiResult, logoUrl }: PublicExportPDFProps) {
  const { exportToPDF, isExporting } = usePDFExport();
  const { user, loginWithGoogle } = useAuth(); 

  const handleDownload = async () => {
    if (!user) {
      alert("Pemberitahuan Keamanan: Anda harus masuk menggunakan Akun Google untuk mengunduh laporan PDF ini.");
      await loginWithGoogle();
      return; 
    }

    const downloadedBy = {
      name: user.displayName || 'Anonim',
      email: user.email || 'no-email'
    };

    // Susun payload untuk backend
    const payload = {
      trackType,
      formData,
      aiResult,
      downloadedBy
    };
    
    // Panggil hook dengan role "user", forceRegenerate = false agar hemat server
    exportToPDF(
      "user", 
      payload, 
      formData?.namaUsaha || 'Asesmen', 
      assessmentId, 
      templateVersion, 
      false
    );
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isExporting}
      className={`w-full sm:w-auto text-white dark:text-white gap-2 font-bold rounded-xl h-10 px-6 shadow-sm transition-all ${
        !user 
          ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600' 
          : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
      }`}
    >
      {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : !user ? <Lock className="w-5 h-5" /> : <Download className="w-5 h-5" />}
      {isExporting ? 'Memproses Dokumen...' : !user ? 'Login Google untuk Unduh' : 'Unduh Full Report (PDF)'}
    </Button>
  );
}