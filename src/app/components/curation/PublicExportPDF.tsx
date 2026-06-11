'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Lock } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useAuth } from '@/contexts/AuthContext'; // Menggunakan AuthContext untuk mengambil profil Google
import { UniversalPDFDocument } from '@/app/components/shared/UniversalPDFDocument';

interface PublicExportPDFProps {
  trackType: string;
  formData: any;
  aiResult: any;
  logoUrl?: string | null;
}

export function PublicExportPDF({ trackType, formData, aiResult, logoUrl }: PublicExportPDFProps) {
  const { exportToPDF, isExporting } = usePDFExport();
  const { user, loginWithGoogle } = useAuth(); // Menarik state user dan fungsi login

  const handleDownload = async () => {
    // 1. CEK AUTENTIKASI: Paksa login jika belum ada sesi Google
    if (!user) {
      alert("Pemberitahuan Keamanan: Anda harus masuk menggunakan Akun Google untuk mengunduh laporan PDF ini.");
      await loginWithGoogle();
      return; 
    }

    // 2. TANGKAP IDENTITAS: Ambil nama dan email asli dari Google
    const downloadedBy = {
      name: user.displayName || 'Anonim',
      email: user.email || 'no-email'
    };

    // 3. RENDER PDF
    const documentComponent = (
      <UniversalPDFDocument 
        role="user" 
        trackType={trackType} 
        formData={formData} 
        aiResult={aiResult} 
        downloadedBy={downloadedBy} // Lempar identitas ke pembuat PDF
      />
    );
    
    exportToPDF(documentComponent, formData?.namaUsaha || 'Asesmen');
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isExporting}
      className={`w-full sm:w-auto text-white gap-2 font-bold rounded-xl h-10 px-6 shadow-sm transition-all ${
        !user ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'
      }`}
    >
      {isExporting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : !user ? (
        <Lock className="w-5 h-5" /> // Ikon Gembok jika belum login
      ) : (
        <Download className="w-5 h-5" /> // Ikon Download normal jika sudah login
      )}
      
      {isExporting 
        ? 'Memproses Dokumen...' 
        : !user 
          ? 'Login Google untuk Unduh' 
          : 'Unduh Full Report (PDF)'}
    </Button>
  );
}