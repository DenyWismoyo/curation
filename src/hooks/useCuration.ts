// src/hooks/useCuration.ts
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

// Sesuaikan dengan interface yang Anda miliki di types/curation.ts
interface CurationState {
  viewState: 'landing' | 'form' | 'processing' | 'dashboard';
  templates: any[];
  isLoadingTemplates: boolean;
  selectedTemplate: any | null;
  formData: any;
  aiResult: any | null;
  currentAssessmentId: string | null;
  history: any[];
}

export const useCuration = () => {
  const [state, setState] = useState<CurationState>({
    viewState: 'landing',
    templates: [],
    isLoadingTemplates: true,
    selectedTemplate: null,
    formData: {},
    aiResult: null,
    currentAssessmentId: null,
    history: [],
  });

  // 1. Ambil Template Kuesioner dari Database saat Hook pertama kali dimuat
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const q = query(
          collection(db, 'form_templates'),
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        const loadedTemplates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setState(prev => ({
          ...prev,
          templates: loadedTemplates,
          isLoadingTemplates: false
        }));
      } catch (error) {
        console.error("Gagal mengambil template kuesioner:", error);
        setState(prev => ({ ...prev, isLoadingTemplates: false }));
      }
    };

    fetchTemplates();
    
    // Muat riwayat lokal (Local Storage) untuk user tamu/anonim
    const savedHistory = localStorage.getItem('curationHistory');
    if (savedHistory) {
      try {
        setState(prev => ({ ...prev, history: JSON.parse(savedHistory) }));
      } catch (e) {
        console.error("Gagal memparsing riwayat lokal:", e);
      }
    }
  }, []);

  const saveToHistory = (item: any) => {
    setState(prev => {
      const newHistory = [item, ...prev.history].slice(0, 50); // Maksimal simpan 50 riwayat lokal
      localStorage.setItem('curationHistory', JSON.stringify(newHistory));
      return { ...prev, history: newHistory };
    });
  };

  // 2. FUNGSI UTAMA: MENGIRIM ASESMEN DAN MEMANTAU AGEN AI SECARA DINAMIS
  const submitAssessment = async (data: any) => {
    // Ubah layar ke mode 'processing' agar Skeleton Loading Dinamis muncul
    setState(prev => ({ 
      ...prev, 
      formData: data, 
      viewState: 'processing',
      currentAssessmentId: null, // Reset ID sebelumnya (jika ada)
      aiResult: null 
    }));

    try {
      const tokenUsed = sessionStorage.getItem('active_token');
      const processAssessment = httpsCallable(functions, 'processCurationAssessment');
      
      // A. Panggil Gateway Agent (Cloud Function) untuk inisiasi
      const response = await processAssessment({
        formData: data,
        trackType: state.selectedTemplate?.trackName || 'Evaluasi Umum',
        tokenUsed: tokenUsed,
        aiPromptConfig: state.selectedTemplate?.aiPromptConfig || {},
        storageFilePaths: data.storageFilePaths || []
      }) as any;

      // B. Tangkap ID Dokumen Asesmen dari server
      const assessmentId = response.data.assessmentId;
      
      if (!assessmentId) {
        throw new Error("Sistem gagal menginisialisasi ruang kerja. ID Asesmen tidak ditemukan.");
      }

      // Simpan ID ke state (Ini akan memicu efek onSnapshot di komponen Skeleton Loading)
      setState(prev => ({ ...prev, currentAssessmentId: assessmentId }));

      // C. MULAI MENDENGARKAN STATUS AGEN SECARA REAL-TIME DARI FIRESTORE
      const unsub = onSnapshot(doc(db, 'assessments', assessmentId), (docSnap) => {
        if (docSnap.exists()) {
          const docData = docSnap.data();
          const currentStatus = docData.status;

          // Jika semua Multi-Agent (Gateway, Triangulator, Domain Expert, Post-Processing) selesai
          if (currentStatus === 'COMPLETED') {
            const finalResult = docData.aiResult;
            
            setState(prev => ({ 
              ...prev, 
              aiResult: finalResult,
              viewState: 'dashboard' // Pindah ke layar Dasbor Utama
            }));

            // Simpan jejak ke riwayat lokal
            saveToHistory({
              id: assessmentId,
              date: new Date().toISOString(),
              trackType: docData.trackType,
              namaUsaha: data.namaUsaha || 'Tanpa Nama',
              score: finalResult?.totalScore || 0,
              data: data,
              result: finalResult
            });

            // Putuskan koneksi listener agar memori perangkat ringan kembali
            unsub(); 
            
          } 
          // Jika salah satu agen mengalami kegagalan/error
          else if (currentStatus === 'FAILED') {
            alert(`Sirkuit AI terputus: ${docData.errorMessage || 'Terjadi kesalahan sistem internal.'}`);
            setState(prev => ({ ...prev, viewState: 'form' })); // Kembalikan ke form
            unsub();
          }
        }
      }, (error) => {
        console.error("Gagal mendengarkan status AI:", error);
        alert("Koneksi pemantauan terputus. Pastikan koneksi internet Anda stabil.");
        setState(prev => ({ ...prev, viewState: 'form' }));
        unsub();
      });

    } catch (error: any) {
      console.error("Gagal memproses asesmen:", error);
      alert(error.message || "Gagal menghubungi server AI Omnifit.");
      setState(prev => ({ ...prev, viewState: 'form' }));
    }
  };

  const restart = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewState: 'landing',
      formData: {},
      aiResult: null,
      selectedTemplate: null,
      currentAssessmentId: null
    }));
  }, []);

  const setSelectedTemplate = useCallback((template: any) => {
    setState(prev => ({ ...prev, selectedTemplate: template, viewState: 'form' }));
  }, []);

  const loadHistoryItem = useCallback((item: any) => {
    setState(prev => ({
      ...prev,
      formData: item.data,
      aiResult: item.result,
      viewState: 'dashboard',
      currentAssessmentId: item.id || null
    }));
  }, []);

  return {
    state,
    actions: {
      submitAssessment,
      restart,
      setSelectedTemplate,
      loadHistoryItem
    }
  };
};