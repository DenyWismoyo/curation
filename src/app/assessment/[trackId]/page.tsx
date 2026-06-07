import React from 'react';
import { notFound } from 'next/navigation';
// Sesuaikan import path dengan struktur Anda
import { defaultTemplates } from '@/data/defaultTemplates'; 
import { DynamicWizard } from '@/components/curation/DynamicWizard';

// Tipe untuk parameter dinamis
interface AssessmentPageProps {
  params: {
    trackId: string;
  };
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  // 1. Ambil ID dari URL
  const { trackId } = params;

  // 2. Cari template form berdasarkan ID tersebut
  const template = defaultTemplates.find((t) => t.id === trackId);

  // 3. Jika URL tidak cocok dengan track manapun, tampilkan halaman 404
  if (!template) {
    notFound();
  }

  // 4. Render form dinamis
  return (
    <main className="min-h-screen bg-slate-50">
      <DynamicWizard 
        template={template} 
        onBack={() => {
          // Navigasi kembali menggunakan window.location atau useRouter
          window.location.href = '/'; 
        }}
        onComplete={(data) => {
          console.log("Data dikirim:", data);
          // Tambahkan logika kirim ke AI di sini
        }}
      />
    </main>
  );
}
