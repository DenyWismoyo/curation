// src/app/assessment/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCuration } from '@/features/assessment/hooks/useCuration';
import { DynamicTrackSelector } from '@/features/assessment/components/DynamicTrackSelector';

// IMPORT CUSTOM ICON
import { BrainIcon } from '@/components/icon';

export default function AssessmentIndexPage() {
  const router = useRouter();
  const { state } = useCuration();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [allowedTemplates, setAllowedTemplates] = useState<string[] | null>(null);

  // Proteksi Halaman: Cek Token & Ambil Filter dari Session
  useEffect(() => {
    const activeToken = sessionStorage.getItem('active_token');
    if (!activeToken) {
      router.replace('/');
    } else {
      setIsAuthorized(true);
      
      const savedAllowed = sessionStorage.getItem('active_allowed_templates');
      if (savedAllowed) {
        try {
          setAllowedTemplates(JSON.parse(savedAllowed));
        } catch (e) {
          console.error('Gagal memparsing allowed templates dari session');
        }
      }
    }
  }, [router]);

  const filteredTemplates = useMemo(() => {
    if (!allowedTemplates || allowedTemplates.length === 0) {
      return state.templates; 
    }
    return state.templates.filter(t => allowedTemplates.includes(t.id));
  }, [state.templates, allowedTemplates]);

  // UI Loading Menggunakan Custom BrainIcon
  if (state.isLoadingTemplates || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted text-muted-foreground">
        <div className="w-14 h-14 mb-4 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[4px] border-indigo-100 border-t-indigo-600 animate-spin" />
          <BrainIcon size={24} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
        </div>
        <p className="text-muted-foreground font-medium tracking-wide">
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
          sessionStorage.removeItem('active_token'); 
          sessionStorage.removeItem('active_allowed_templates'); 
          router.push('/login?next=/assessment');
        }} 
      />
    </main>
  );
}