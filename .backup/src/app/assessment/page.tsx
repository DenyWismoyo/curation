// src/app/assessment/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCuration } from '@/hooks/useCuration';
import { DynamicTrackSelector } from '@/app/components/curation/DynamicTrackSelector';

export default function AssessmentIndexPage() {
  const router = useRouter();
  const { state } = useCuration();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [allowedTemplates, setAllowedTemplates] = useState<string[] | null>(null);

  // Proteksi Halaman: Cek Token & Ambil Filter dari Session
  useEffect(() => {
    const activeToken = sessionStorage.getItem('active_token');
    if (!activeToken) {
      // Jika tidak ada token di session, tendang kembali ke landing page
      router.replace('/');
    } else {
      setIsAuthorized(true);
      
      // --- TAMBAHAN FILTERING ---
      const savedAllowed = sessionStorage.getItem('active_allowed_templates');
      if (savedAllowed) {
        try {
          setAllowedTemplates(JSON.parse(savedAllowed));
        } catch (e) {
          console.error('Gagal memparsing allowed templates dari session');
        }
      }
      // --------------------------
    }
  }, [router]);

  // --- TAMBAHAN FILTERING: Filter template sebelum dikirim ke Selector ---
  const filteredTemplates = useMemo(() => {
    if (!allowedTemplates || allowedTemplates.length === 0) {
      return state.templates; // Jika tidak ada batasan, tampilkan semua
    }
    return state.templates.filter(t => allowedTemplates.includes(t.id));
  }, [state.templates, allowedTemplates]);
  // -----------------------------------------------------------------------

  // Layar Loading saat mengambil daftar template dari Firebase atau sedang mengecek authorisasi
  if (state.isLoadingTemplates || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-[4px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">
          {!isAuthorized ? 'Memverifikasi Akses...' : 'Memuat Katalog Modul...'}
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <DynamicTrackSelector 
        templates={filteredTemplates} 
        onBack={() => {
          sessionStorage.removeItem('active_token'); // Hapus token jika batal
          sessionStorage.removeItem('active_allowed_templates'); // Bersihkan filter sesi
          router.push('/');
        }} 
      />
    </main>
  );
}