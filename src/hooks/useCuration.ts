// src/hooks/useCuration.ts
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

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

  const normalizeHistoryItem = useCallback((item: any, templates: any[]) => {
    const templateMatch = templates.find((template) => template.trackName === item.trackType);
    const inferredAdaptive = Boolean(
      item?.result?.isAdaptiveAssessment ||
      item?.data?.formMode === 'adaptive' ||
      item?.data?.mode === 'adaptive' ||
      item?.data?.isAdaptive
    );

    return {
      ...item,
      aiPromptConfig: item.aiPromptConfig || templateMatch?.aiPromptConfig || (inferredAdaptive ? { isAdaptive: true, assessmentOutputMode: 'adaptive' } : undefined),
    };
  }, []);

  // 1. Ambil Template Kuesioner dari Database saat Hook pertama kali dimuat
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // PERBAIKAN FATAL: Menghapus orderBy('order', 'asc') agar Firestore 
        // tidak menyembunyikan dokumen yang tidak memiliki field 'order'
        const q = query(
          collection(db, 'form_templates'),
          where('isActive', '==', true)
        );

        const snap = await getDocs(q);
        const loadedTemplates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Urutkan menggunakan JavaScript (Memory) agar lebih aman
        loadedTemplates.sort((a: any, b: any) => {
          const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return dateB - dateA; // Urutkan dari yang paling baru di-update
        });

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
  }, []);

  useEffect(() => {
    if (state.isLoadingTemplates || state.templates.length === 0) return;
    if (typeof window === 'undefined') return;

    const savedHistory = localStorage.getItem('curationHistory');
    if (!savedHistory) return;

    try {
      const parsedHistory = JSON.parse(savedHistory);
      if (!Array.isArray(parsedHistory)) return;

      const normalizedHistory = parsedHistory.map((item) => normalizeHistoryItem(item, state.templates));
      setState(prev => ({ ...prev, history: normalizedHistory }));

      if (JSON.stringify(parsedHistory) !== JSON.stringify(normalizedHistory)) {
        localStorage.setItem('curationHistory', JSON.stringify(normalizedHistory));
      }
    } catch (e) {
      console.error("Gagal memparsing riwayat lokal:", e);
    }
  }, [state.isLoadingTemplates, state.templates, normalizeHistoryItem]);

  const saveToHistory = (item: any) => {
    setState(prev => {
      const historyItem = {
        ...item,
        aiPromptConfig: state.selectedTemplate?.aiPromptConfig || item.aiPromptConfig,
      };
      const newHistory = [historyItem, ...prev.history].slice(0, 50); // Maksimal simpan 50 riwayat lokal
      localStorage.setItem('curationHistory', JSON.stringify(newHistory));
      return { ...prev, history: newHistory };
    });
  };

  // 2. FUNGSI UTAMA: MENGIRIM ASESMEN DAN MEMANTAU AGEN AI SECARA DINAMIS
  const submitAssessment = async (data: any, templateOverride?: any) => {
    const activeTemplate = templateOverride || state.selectedTemplate;

    setState(prev => ({
      ...prev,
      selectedTemplate: activeTemplate || prev.selectedTemplate,
      formData: data,
      viewState: 'processing',
      currentAssessmentId: null,
      aiResult: null
    }));

    try {
      const tokenUsed = sessionStorage.getItem('active_token');
      const processAssessment = httpsCallable(functions, 'processCurationAssessment');
      
      // BERSIIHKAN FORM DATA DARI METADATA SISTEM
      const cleanFormData = { ...data };
      delete cleanFormData.storageFilePaths;
      delete cleanFormData.selfScore;
      delete cleanFormData.isConfirmedEarnest;
      delete cleanFormData.tokenUsed;

      const response = await processAssessment({
        formData: cleanFormData,
        trackType: activeTemplate?.trackName || 'Evaluasi Umum',
        templateId: activeTemplate?.id || null,
        tokenUsed: tokenUsed,
        aiPromptConfig: activeTemplate?.aiPromptConfig || {},
        storageFilePaths: data.storageFilePaths || []
      }) as any;

      const assessmentId = response.data.assessmentId;

      if (!assessmentId) {
        throw new Error("Sistem gagal menginisialisasi ruang kerja. ID Asesmen tidak ditemukan.");
      }

      // FIX: Bersihkan draf lokal karena data berhasil terkirim ke server
      if (activeTemplate?.id) {
        localStorage.removeItem(`curation_draft_dynamic_${activeTemplate.id}`);
      }

      setState(prev => ({ ...prev, currentAssessmentId: assessmentId }));

      const unsub = onSnapshot(doc(db, 'assessments', assessmentId), (docSnap) => {
        if (docSnap.exists()) {
          const docData = docSnap.data();
          const currentStatus = docData.status;

          if (currentStatus === 'COMPLETED') {
            const finalResult = docData.aiResult;

            setState(prev => ({
              ...prev,
              aiResult: finalResult,
              viewState: 'dashboard'
            }));

            saveToHistory({
              id: assessmentId,
              date: new Date().toISOString(),
              trackType: docData.trackType,
              namaUsaha: data.namaUsaha || 'Tanpa Nama',
              score: finalResult?.totalScore || 0,
              data: data,
              result: finalResult,
              aiPromptConfig: activeTemplate?.aiPromptConfig || docData.aiPromptConfig || {}
            });

            unsub();

          }
          else if (currentStatus === 'FAILED') {
            alert(`Sirkuit AI terputus: ${docData.errorMessage || 'Terjadi kesalahan sistem internal.'}`);
            setState(prev => ({ ...prev, viewState: 'form' }));
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
    const normalizedItem = normalizeHistoryItem(item, state.templates);
    const templateMatch = state.templates.find(
      (template) => template.trackName === normalizedItem.trackType
    );

    setState(prev => ({
      ...prev,
      selectedTemplate: templateMatch || prev.selectedTemplate,
      formData: normalizedItem.data,
      aiResult: normalizedItem.result,
      viewState: 'dashboard',
      currentAssessmentId: normalizedItem.id || null
    }));
  }, [normalizeHistoryItem, state.templates]);

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