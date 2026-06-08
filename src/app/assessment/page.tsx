// src/app/assessment/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCuration } from '@/hooks/useCuration';
import { DynamicTrackSelector } from '@/components/curation/DynamicTrackSelector';

export default function AssessmentIndexPage() {
  const router = useRouter();
  const { state } = useCuration();

  // Layar Loading saat mengambil daftar template dari Firebase
  if (state.isLoadingTemplates) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-[4px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">Memuat Katalog Modul...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <DynamicTrackSelector 
        templates={state.templates} 
        onBack={() => router.push('/')} // Jika tombol kembali di-klik, kembali ke Landing Page
      />
    </main>
  );
}