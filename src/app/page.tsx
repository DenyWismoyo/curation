// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // UPGRADE: Menggunakan onSnapshot
import { db } from '@/lib/firebase';
import { useCuration } from '@/hooks/useCuration';
import { CurationLanding } from '@/app/components/curation/CurationLanding';
import { CurationDashboard } from '@/app/components/curation/CurationDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { CurationHistory } from '@/types/curation';

export default function Home() {
  const router = useRouter();
  const { state, actions } = useCuration();
  const { user, role, loading, loginWithGoogle, logout } = useAuth();
  
  const [dbHistory, setDbHistory] = useState<CurationHistory[]>([]);

  // 1. Tarik Data Riwayat dari Database secara REAL-TIME
  useEffect(() => {
    // Jika tidak ada user login, pastikan history kosong
    if (!user) {
      setDbHistory([]);
      return;
    }

    // Menggunakan query berdasarkan userId (UID Google yang sangat aman)
    // yang sudah kita atur untuk disimpan di Cloud Function sebelumnya.
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', user.uid) 
    );

    // onSnapshot mendengarkan perubahan (Live Sync). 
    // Jika AI selesai memproses di latar belakang, daftar ini akan otomatis berkedip dan bertambah!
    const unsubscribe = onSnapshot(q, (snap) => {
      const historyData: CurationHistory[] = [];
      
      snap.forEach((doc) => {
        const data = doc.data();
        historyData.push({
          id: doc.id,
          // Handle format tanggal secara aman untuk data baru (timestamp) maupun lokal lama
          date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          trackType: data.trackType || 'Evaluasi',
          namaUsaha: data.namaUsaha || 'Tanpa Nama',
          score: data.score || 0,
          data: data.formData,
          result: data.aiResult,
        });
      });
      
      setDbHistory(historyData);
    }, (error) => {
      console.error("Gagal mengambil riwayat real-time dari database:", error);
    });

    // Cleanup memori listener saat berpindah halaman
    return () => unsubscribe();
  }, [user]); // Eksekusi ulang jika state user berubah

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
        onLoadHistory={handleLoadHistory}
        user={user}
        role={role}
        onLogin={loginWithGoogle}
        onLogout={logout}
      />
    </main>
  );
}