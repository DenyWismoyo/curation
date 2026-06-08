// src/app/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCuration } from '@/hooks/useCuration';
import { CurationLanding } from '@/components/curation/CurationLanding';
import { CurationDashboard } from '@/components/curation/CurationDashboard';

export default function Home() {
  const router = useRouter();
  const { state, actions } = useCuration();

  // TAMPILKAN DASHBOARD JIKA USER MEMBUKA RIWAYAT LAMA
  if (state.viewState === 'dashboard' && state.aiResult) {
    return (
      <CurationDashboard
        trackType={state.selectedTemplate?.trackName || 'Model Bisnis'}
        formData={state.formData}
        aiResult={state.aiResult}
        onRestart={() => {
          actions.restart();
          router.push('/');
        }}
      />
    );
  }

  // DEFAULT: TAMPILKAN LANDING PAGE
  return (
    <main className="min-h-screen">
      <CurationLanding
        onStart={() => router.push('/assessment')} // Arahkan ke rute baru
        history={state.history}
        onLoadHistory={actions.loadHistoryItem}
      />
    </main>
  );
}