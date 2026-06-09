'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCuration } from '@/hooks/useCuration';
import { CurationLanding } from '@/components/curation/CurationLanding';
import { CurationDashboard } from '@/components/curation/CurationDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { CurationHistory } from '@/types/curation';

export default function Home() {
  const router = useRouter();
  const { state, actions } = useCuration();
  const { user, role, loading, loginWithGoogle, logout } = useAuth();
  
  const [dbHistory, setDbHistory] = useState<CurationHistory[]>([]);

  // 1. Tarik Data Riwayat dari Database
  useEffect(() => {
    const fetchUserHistory = async () => {
      if (!user?.email) return;
      try {
        const q = query(
          collection(db, 'assessments'),
          where('email', '==', user.email)
        );
        const snap = await getDocs(q);
        const historyData: CurationHistory[] = [];
        
        snap.forEach((doc) => {
          const data = doc.data();
          historyData.push({
            id: doc.id,
            date: data.createdAt,
            trackType: data.trackType,
            namaUsaha: data.namaUsaha,
            score: data.score,
            data: data.formData,
            result: data.aiResult,
          });
        });
        
        setDbHistory(historyData);
      } catch (error) {
        console.error("Gagal mengambil riwayat dari database:", error);
      }
    };

    fetchUserHistory();
  }, [user?.email]);

  // 2. TAMPILKAN DASHBOARD LOKAL JIKA USER BARU SAJA MENYELESAIKAN ASESMEN BARU
  // (Ini mempertahankan fungsi sistem lama agar tidak patah saat form baru disubmit)
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

  // 3. Gabungkan Riwayat (Mencegah Duplikasi)
  const combinedHistory = [...dbHistory];
  state.history.forEach((localItem) => {
    const exists = combinedHistory.find(
      (dbItem) => dbItem.namaUsaha === localItem.namaUsaha && dbItem.score === localItem.score
    );
    if (!exists) combinedHistory.push(localItem);
  });

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <CurationLanding
        onStart={() => router.push('/assessment')}
        history={combinedHistory}
        onLoadHistory={handleLoadHistory} // Panggil Handler Baru di sini
        user={user}
        role={role}
        onLogin={loginWithGoogle}
        onLogout={logout}
      />
    </main>
  );
}