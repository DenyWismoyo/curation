'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { defaultTemplates } from '@/data/defaultTemplates';
import { DynamicWizard } from '@/components/curation/DynamicWizard';

export default function AssessmentPage({ params }: { params: { trackId: string } }) {
  const router = useRouter();
  
  // Cari template berdasarkan ID di URL
  const template = defaultTemplates.find((t) => t.id === params.trackId);

  // Jika URL ngawur, kembalikan ke halaman utama
  if (!template) {
    router.push('/');
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <DynamicWizard 
        template={template} 
        onBack={() => {
          // Fungsi tombol kembali
          router.push('/');
        }}
        onComplete={async (data) => {
          console.log("Data siap dikirim:", data);
          alert("Data berhasil diproses! (Tambahkan fungsi API Firebase di sini)");
          router.push('/');
        }}
      />
    </main>
  );
}
