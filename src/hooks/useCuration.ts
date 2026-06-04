import { useState, useEffect } from 'react';
import { ViewState, CurationFormData, AIResult, CurationHistory, FormTemplate } from '@/types/curation';
import { processAIAssessment } from '@/services/ai.service';
import { collection, addDoc, getDocs, setDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { defaultTemplates } from '@/data/defaultTemplates';

export function useCuration() {
  const [viewState, setViewState] = useState<ViewState>('landing');
  
  // State Baru untuk Form Dinamis
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // State Lama
  const [formData, setFormData] = useState<CurationFormData>({});
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [history, setHistory] = useState<CurationHistory[]>([]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'form_templates'));
      
      // Jika koleksi kosong, lakukan SEEDING (Pengisian Data Awal)
      if (querySnapshot.empty) {
        console.log("Seeding default templates to Firestore...");
        for (const tpl of defaultTemplates) {
          await setDoc(doc(db, 'form_templates', tpl.id), tpl);
        }
        setTemplates(defaultTemplates);
      } else {
        // Jika sudah ada, load dari database
        const loadedTemplates: FormTemplate[] = [];
        querySnapshot.forEach((doc) => {
          loadedTemplates.push(doc.data() as FormTemplate);
        });
        setTemplates(loadedTemplates);
      }
    } catch (error) {
      console.error("Gagal mengambil Form Templates:", error);
      // Fallback lokal jika Firebase error
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

  const saveToHistory = (data: CurationFormData, result: AIResult, track: string) => {
    const newEntry: CurationHistory = {
      id: Date.now().toString(),
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

  const submitAssessment = async (finalData: CurationFormData) => {
    if (!selectedTemplate) return;

    setFormData(finalData);
    setViewState('processing');
    
    try {
      const dbData: Record<string, any> = { ...finalData };
      const uploadPromises: Promise<void>[] = [];
      
      // 1. Upload semua file dari dynamic forms ke Storage
      for (const key in dbData) {
        const value = dbData[key];
        if (value instanceof File) {
          const fileName = `curation_files/${Date.now()}_${value.name.replace(/\s+/g, '_')}`;
          const storageRef = ref(storage, fileName);
          const uploadTask = uploadBytes(storageRef, value).then(async (snapshot) => {
            const downloadUrl = await getDownloadURL(snapshot.ref);
            dbData[key] = downloadUrl; // Timpa object File dengan String URL Firebase
          });
          uploadPromises.push(uploadTask);
        }
      }
      await Promise.all(uploadPromises);
      
      // 2. Kirim data ke AI Service (Menggunakan nama track dinamis)
      const trackNameStr = selectedTemplate.trackName;
      const result = await processAIAssessment(dbData as CurationFormData, trackNameStr);
      setAiResult(result);
      
      // 3. Simpan data yang bersih ke database
      await addDoc(collection(db, "assessments"), {
        trackType: trackNameStr,
        namaUsaha: dbData.namaUsaha || 'Tanpa Nama',
        email: dbData.email || '',
        whatsapp: dbData.whatsapp || '',
        score: result.totalScore,
        readinessLevel: result.readinessLevel,
        formData: dbData,
        aiResult: result,
        createdAt: new Date().toISOString()
      });
      
      saveToHistory(dbData, result, trackNameStr);
    } catch (error) {
      console.error("Terjadi kesalahan saat memproses data:", error);
    }
    
    setViewState('dashboard');
    
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'CURATION_COMPLETED',
        payload: { namaUsaha: finalData.namaUsaha, track: selectedTemplate?.trackName }
      }, '*');
    }
  };

  return {
    state: { viewState, templates, selectedTemplate, isLoadingTemplates, formData, aiResult, history },
    actions: { setViewState, setSelectedTemplate, loadHistoryData, loadHistoryItem, submitAssessment, restart }
  };
}