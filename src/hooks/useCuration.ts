// src/hooks/useCuration.ts
import { useState, useEffect } from 'react';
import { ViewState, CurationFormData, AIResult, CurationHistory, FormTemplate } from '@/types/curation';
import { processAIAssessment } from '@/services/ai.service';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { defaultTemplates } from '@/data/defaultTemplates';

export function useCuration() {
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [formData, setFormData] = useState<CurationFormData>({});
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [history, setHistory] = useState<CurationHistory[]>([]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'form_templates'));
      if (querySnapshot.empty) {
        console.log("Seeding default templates to Firestore...");
        for (const tpl of defaultTemplates) {
          await setDoc(doc(db, 'form_templates', tpl.id), tpl);
        }
        setTemplates(defaultTemplates);
      } else {
        const loadedTemplates: FormTemplate[] = [];
        querySnapshot.forEach((doc) => {
          loadedTemplates.push(doc.data() as FormTemplate);
        });
        setTemplates(loadedTemplates);
      }
    } catch (error) {
      console.error("Gagal mengambil Form Templates:", error);
      setTemplates(defaultTemplates);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadHistoryData = () => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('curationHistory');
      if (savedHistory) {
        try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
      }
    }
  };

  useEffect(() => {
    loadHistoryData();
    fetchTemplates();
  }, []);

  const saveToHistory = (data: CurationFormData, result: AIResult, track: string, firestoreId: string) => {
    const newEntry: CurationHistory = {
      id: firestoreId,
      date: new Date().toISOString(),
      trackType: track,
      namaUsaha: data.namaUsaha || 'Tanpa Nama',
      score: result.totalScore,
      data: data,
      result: result
    };

    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('curationHistory', JSON.stringify(updatedHistory));
    }
  };

  const loadHistoryItem = (item: CurationHistory) => {
    const templateMatch = templates.find(t => t.trackName === item.trackType);
    setSelectedTemplate(templateMatch || null);
    setFormData(item.data);
    setAiResult(item.result);
    setViewState('dashboard');
  };

  const restart = () => {
    setViewState('landing');
    setSelectedTemplate(null);
    setFormData({});
    setAiResult(null);
  };

  const submitAssessment = async (finalData: Record<string, any>) => {
    if (!selectedTemplate) return;

    const tokenUsed = finalData.token;
    delete finalData.token;

    setViewState('processing');
    
    try {
      const dbData: Record<string, any> = { ...finalData };
      const storageFilePaths: string[] = []; 
      const uploadPromises: Promise<void>[] = [];
      
      const rawNamaUsaha = finalData.namaUsaha || 'Tanpa_Nama';
      const safeNamaUsaha = rawNamaUsaha.replace(/[^a-zA-Z0-9]/g, '_'); 
      const folderPath = `curation_files/${safeNamaUsaha}_${Date.now()}`;

      for (const key in dbData) {
        const value = dbData[key];
        
        // SKENARIO 1: File Baru (Belum pernah diunggah)
        if (value instanceof File) {
          const safeFileName = value.name.replace(/\s+/g, '_');
          const filePath = `${folderPath}/${safeFileName}`; 
          const storageRef = ref(storage, filePath);
          
          const uploadTask = uploadBytes(storageRef, value).then(async (snapshot) => {
            const downloadUrl = await getDownloadURL(snapshot.ref);
            dbData[key] = downloadUrl; // Ganti File mentah dengan URL String
            storageFilePaths.push(filePath); 
          });
          uploadPromises.push(uploadTask);
        } 
        // SKENARIO 2: Bypass File (Sudah pernah terunggah tapi AI gagal/timeout sebelumnya)
        else if (typeof value === 'string' && value.includes('firebasestorage.googleapis.com')) {
          try {
            // Ekstrak letak path storage asli dari dalam URL Firebase
            const urlObj = new URL(value);
            const pathPart = urlObj.pathname.split('/o/')[1];
            if (pathPart) {
              const decodedPath = decodeURIComponent(pathPart.split('?')[0]);
              storageFilePaths.push(decodedPath);
            }
          } catch (e) {
            console.error("Gagal mengekstrak path dari URL Storage:", e);
          }
        }
      }

      // Tunggu hingga semua file (yang baru) terupload ke Storage
      await Promise.all(uploadPromises);
      
      // KRUSIAL: Update Form Data dengan URL, agar bisa otomatis diselamatkan oleh LocalStorage
      setFormData(dbData as CurationFormData);
      
      // Panggil Cloud Function
      const { assessmentId, aiResult } = await processAIAssessment(
        dbData as CurationFormData, 
        selectedTemplate.trackName, 
        storageFilePaths,
        selectedTemplate.aiPromptConfig,
        tokenUsed
      );
      
      setAiResult(aiResult);
      saveToHistory(dbData, aiResult, selectedTemplate.trackName, assessmentId);

      // Bersihkan session cache karena sudah berhasil
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('active_token');
        sessionStorage.removeItem('active_model');
        localStorage.removeItem(`curation_draft_dynamic_${selectedTemplate.id}`);
      }
      
      setViewState('dashboard');

      if (typeof window !== 'undefined' && window.parent !== window) {
        window.parent.postMessage({
          type: 'CURATION_COMPLETED',
          payload: { namaUsaha: dbData.namaUsaha, track: selectedTemplate?.trackName }
        }, '*');
      }

    } catch (error: any) {
      console.error("Terjadi kesalahan saat memproses data:", error);
      alert(error.message || "Gagal memproses AI. Pastikan Token benar.");
      // Kembalikan ke layar wizard. Berkat 'setFormData(dbData)' di atas, memori file sudah aman.
      setViewState('wizard'); 
    }
  };

  return {
    state: { viewState, templates, selectedTemplate, isLoadingTemplates, formData, aiResult, history },
    actions: { setViewState, setSelectedTemplate, loadHistoryData, loadHistoryItem, submitAssessment, restart }
  };
}