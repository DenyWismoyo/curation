// src/hooks/useCuration.ts
import { useState, useEffect } from 'react';
import { ViewState, CurationFormData, AIResult, CurationHistory } from '@/types/curation';
import { processAIAssessment } from '@/services/ai.service';
import { collection, addDoc } from 'firebase/firestore'; // Tambahan import Firebase
import { db } from '@/lib/firebase'; // Pastikan konfigurasi .env Firebase Anda sudah terisi

export function useCuration() {
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [trackType, setTrackType] = useState<string>('');
  const [formData, setFormData] = useState<CurationFormData>({});
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [history, setHistory] = useState<CurationHistory[]>([]);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('curation_history');
      if (stored) setHistory(JSON.parse(stored));
    } catch (e) { 
      console.error("Gagal memuat riwayat", e); 
    }
  }, []);

  const saveToHistory = (data: CurationFormData, result: AIResult, track: string) => {
    try {
      const existing = localStorage.getItem('curation_history');
      const historyArr: CurationHistory[] = existing ? JSON.parse(existing) : [];
      
      // Hapus file dari history agar localStorage tidak error / penuh
      const dataWithoutFiles: Record<string, any> = {};
      for(const key in data) {
         const val = (data as any)[key];
         if(val && !(val instanceof File)) {
            dataWithoutFiles[key] = val;
         }
      }

      const newItem: CurationHistory = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        trackType: track,
        namaUsaha: data.namaUsaha || 'Tanpa Nama',
        score: result.totalScore,
        data: dataWithoutFiles,
        result: result
      };
      
      const newHistory = [newItem, ...historyArr].slice(0, 10); // Simpan max 10 riwayat
      setHistory(newHistory);
      localStorage.setItem('curation_history', JSON.stringify(newHistory));
    } catch (e) { 
      console.error("Gagal menyimpan riwayat", e); 
    }
  };

  const loadHistoryData = (historyItem: CurationHistory) => {
    setTrackType(historyItem.trackType);
    setFormData(historyItem.data);
    setAiResult(historyItem.result);
    setViewState('dashboard');
  };

  const submitAssessment = async (finalData: CurationFormData) => {
    setFormData(finalData);
    setViewState('processing');
    
    const result = await processAIAssessment(finalData, trackType);
    
    setAiResult(result);
    saveToHistory(finalData, result, trackType || "Umum");

    // === TAMBAHAN: SIMPAN KE FIREBASE ===
    try {
      // Hapus file dari object sebelum disimpan ke database (Firebase tidak bisa simpan object File langsung di Firestore)
      const dataToSaveDb: Record<string, any> = {};
      for(const key in finalData) {
         const val = (finalData as any)[key];
         if(val && !(val instanceof File)) {
            dataToSaveDb[key] = val;
         }
      }

      await addDoc(collection(db, "assessments"), {
        trackType: trackType,
        namaUsaha: finalData.namaUsaha || 'Tanpa Nama',
        email: finalData.email || '',
        whatsapp: finalData.whatsapp || '',
        score: result.totalScore,
        readinessLevel: result.readinessLevel,
        formData: dataToSaveDb,
        aiResult: result,
        createdAt: new Date().toISOString()
      });
      console.log("Data berhasil disimpan ke Firestore!");
    } catch (dbError) {
      console.error("Gagal menyimpan ke Firestore:", dbError);
      // Aplikasi tetap lanjut meski database gagal, agar user tidak stuck
    }
    // ===================================

    setViewState('dashboard');

    // MENGIRIM PESAN KE WEBSITE INDUK (EMBED-READY)
    // Jika aplikasi ini dibuka di dalam iframe, kirim sinyal ke parent window
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'CURATION_COMPLETED',
        payload: {
          namaUsaha: finalData.namaUsaha,
          track: trackType,
          score: result.totalScore,
          level: result.readinessLevel,
          route: result.recommendations.incubationRoute
        }
      }, '*'); // Catatan: Saat rilis production, ganti '*' dengan target origin website Anda untuk keamanan
    }
  };

  const restart = () => {
    setFormData({});
    setAiResult(null);
    setTrackType('');
    setViewState('landing');
  };

  return {
    state: { viewState, trackType, formData, aiResult, history },
    actions: { setViewState, setTrackType, loadHistoryData, submitAssessment, restart }
  };
}