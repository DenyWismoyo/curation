// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

  // 1. Tarik Data Riwayat dari Database secara REAL-TIME berdasarkan UID (userId)
  useEffect(() => {
    // Jika belum login, pastikan riwayat kosong
    if (!user?.uid) {
      setDbHistory([]);
      return;
    }

    // KUNCI UTAMA: Kita query menggunakan 'userId' agar benar-benar melekat dengan Google Auth UID.
    // Ini menghilangkan risiko gagal muat jika user salah mengetik email di form.
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', user.uid)
    );

    // onSnapshot mendengarkan perubahan secara Live. Jika AI selesai di latar belakang, 
    // atau jika Anda mengerjakan di Localhost, data akan otomatis muncul di Produksi.
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

  // 2. TAMPILKAN DASHBOARD LOKAL JIKA USER BARU SAJA MENYELESAIKAN ASESMEN BARU
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

  // 3. Gabungkan Riwayat Local Storage & DB (Mencegah Duplikasi Tampilan)
  const combinedHistory = [...dbHistory];
  state.history.forEach((localItem) => {
    const exists = combinedHistory.find(
      (dbItem) => dbItem.namaUsaha === localItem.namaUsaha && dbItem.score === localItem.score
    );
    if (!exists) combinedHistory.push(localItem);
  });

  // Urutkan selalu dari yang paling baru di paling atas (Di-handle oleh Javascript agar tidak terkena error Firestore Missing Index)
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
        role={role as any}
        onLogin={loginWithGoogle}
        onLogout={logout}
      />
    </main>
  );
}