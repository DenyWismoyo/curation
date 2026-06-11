import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';

export function usePDFExport() {
  const [isExporting, setIsExporting] = useState(false);

  // Menerima komponen React secara langsung, bukan Ref!
  const exportToPDF = async (DocumentComponent: React.ReactElement, fileName: string) => {
    setIsExporting(true);
    try {
      // 1. Inisialisasi engine react-pdf
      const asPdf = pdf();
      // 2. Berikan struktur komponen Document
      asPdf.updateContainer(DocumentComponent);
      // 3. Render ke dalam bentuk file blob secara background
      const blob = await asPdf.toBlob();
      
      // 4. Unduh secara otomatis
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const safeName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `Report_CSRS_${safeName}.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Gagal melakukan export PDF", error);
      alert("Terjadi kesalahan sistem saat menyusun dokumen PDF. Pastikan data tidak kosong.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToPDF, isExporting };
}