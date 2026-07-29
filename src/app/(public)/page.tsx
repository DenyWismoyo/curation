// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCuration } from '@/hooks/useCuration';
import { CurationLanding } from '@/app/components/curation/CurationLanding';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { CurationHistory } from '@/types/curation';
import { X } from 'lucide-react';

// IMPORT CUSTOM ICON
import { BrainIcon } from '@/components/icon';

// IMPORT CUSTOM HOOK MOBILE BACK
import { useMobileBack } from '@/hooks/useMobileBack';

export default function Home() {
  const router = useRouter();
  const { state, actions } = useCuration();
  const { user, role, loading, loginWithGoogle, logout } = useAuth();

  const [dbHistory, setDbHistory] = useState<CurationHistory[]>([]);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  // 1. Tarik Data Riwayat dari Database secara REAL-TIME berdasarkan UID (userId)
  useEffect(() => {
    // Jika belum login, pastikan riwayat kosong
    if (!user?.uid) {
      setDbHistory([]);
      return;
    }

    // KUNCI UTAMA: Kita query menggunakan 'userId' agar benar-benar melekat dengan Google Auth UID.
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const historyData: CurationHistory[] = [];

      snap.forEach((doc) => {
        const data = doc.data();
        historyData.push({
          id: doc.id,
          // Handle format tanggal secara aman untuk data baru (timestamp) maupun data lama
          date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          trackType: data.trackType || 'Evaluasi',
          namaUsaha: data.namaUsaha || 'Tanpa Nama',
          score: data.score || 0,
          data: data.formData,
          result: data.aiResult || data.originalAiResult,
        });
      });

      setDbHistory(historyData);
    }, (error) => {
      console.error("Gagal mengambil riwayat real-time dari database:", error);
    });

    // Cleanup memori listener saat berpindah halaman
    return () => unsubscribe();
  }, [user]);

  // CHECK ONBOARDING STATUS
  useEffect(() => {
    if (!user?.uid) { setShowOnboardingBanner(false); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists() && snap.data()?.onboardingCompleted !== true) {
        setShowOnboardingBanner(true);
      }
    }).catch(() => {});
  }, [user]);

  // ==========================================
  // IMPLEMENTASI MOBILE BACK HANDLER UNTUK DASHBOARD
  // ==========================================
  const isDashboardActive = state.viewState === 'dashboard' && !!state.aiResult;

  useMobileBack(isDashboardActive, () => {
    actions.restart();
    router.push('/');
  });

  // 2. TAMPILKAN DASHBOARD LOKAL JIKA USER BARU SAJA MENYELESAIKAN ASESMEN BARU
  if (isDashboardActive) {
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

  // 3. Gabungkan Riwayat Local Storage & DB (Mencegah Duplikasi Tampilan)
  const combinedHistory = [...dbHistory];
  state.history.forEach((localItem) => {
    const exists = combinedHistory.find(
      (dbItem) => dbItem.namaUsaha === localItem.namaUsaha && dbItem.score === localItem.score
    );
    if (!exists) combinedHistory.push(localItem);
  });

  // Urutkan selalu dari yang paling baru di paling atas
  combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 4. HANDLER KLIK RIWAYAT (Menggunakan Shareable Link Baru)
  const handleLoadHistory = (item: CurationHistory) => {
    if (item.id) {
      // Jika dokumen memiliki ID (berasal dari Firestore), buka URL publik yang bisa dibagikan
      router.push(`/result/${item.id}`);
    } else {
      // Fallback: Jika data berasal dari local storage versi lama yang belum memiliki ID
      actions.loadHistoryItem(item);
    }
  };

  // UI LOADING MENGGUNAKAN CUSTOM BRAIN ICON
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-14 h-14 mb-4 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[4px] border-secondary border-t-primary animate-spin" />
          <BrainIcon size={24} className="text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground font-medium tracking-wide">Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {/* ONBOARDING NUDGE BANNER */}
      {showOnboardingBanner && (
        <div className="fixed top-0 left-0 right-0 md:left-60 z-40 bg-primary text-primary-foreground text-center px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-bold shadow-lg">
          <span>✨ Personalisasi pengalaman Anda!</span>
          <button
            onClick={() => router.push('/onboarding')}
            className="underline underline-offset-2 hover:no-underline"
          >
            Mulai Onboarding →
          </button>
          <button onClick={() => setShowOnboardingBanner(false)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>
      )}
      <CurationLanding
        onStart={() => router.push('/assessment')}
        history={combinedHistory}
        onLoadHistory={handleLoadHistory}
        user={user}
        role={role as any}
        onLogin={loginWithGoogle}
        onLogout={logout}
      />
    </main>
  );
}