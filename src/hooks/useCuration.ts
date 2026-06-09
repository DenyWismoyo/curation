// src/hooks/useCuration.ts
import { useState, useEffect } from 'react';
import { ViewState, CurationFormData, AIResult, CurationHistory, FormTemplate } from '@/types/curation';
import { processAIAssessment } from '@/services/ai.service';
import { collection, addDoc, getDocs, setDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore'; 
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

  // PERUBAHAN DI SINI: Tambahkan parameter `firestoreId` opsional
  const saveToHistory = (data: CurationFormData, result: AIResult, track: string, firestoreId?: string) => {
    const newEntry: CurationHistory = {
      id: firestoreId || Date.now().toString(), // Gunakan ID asli dari Firestore jika ada
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

    // Pisahkan token agar tidak masuk ke formData bisnis
    const tokenUsed = finalData.token;
    delete finalData.token;

    setFormData(finalData as CurationFormData);
    setViewState('processing');
    
    try {
      const dbData: Record<string, any> = { ...finalData };
      const uploadPromises: Promise<void>[] = [];
      
      for (const key in dbData) {
        const value = dbData[key];
        if (value instanceof File) {
          const fileName = `curation_files/${Date.now()}_${value.name.replace(/\s+/g, '_')}`;
          const storageRef = ref(storage, fileName);
          const uploadTask = uploadBytes(storageRef, value).then(async (snapshot) => {
            const downloadUrl = await getDownloadURL(snapshot.ref);
            dbData[key] = downloadUrl; 
          });
          uploadPromises.push(uploadTask);
        }
      }

      await Promise.all(uploadPromises);
      
      const trackNameStr = selectedTemplate.trackName;
      
      // Kirim data, track, instruksi AI, dan TOKEN ke Backend
      const result = await processAIAssessment(
        dbData as CurationFormData, 
        trackNameStr, 
        selectedTemplate.aiPromptConfig,
        tokenUsed
      );
      
      setAiResult(result);
      
      // Ambil nama corporate secara dinamis dari token batch untuk di-link ke curator dashboard
      let corporateEntityName = null;

      // =========================================================
      // BLOK EKSEKUSI PEMBAKARAN (BURN) TOKEN DI FIRESTORE & AMBIL NAMA PROGRAM
      // =========================================================
      if (tokenUsed && typeof tokenUsed === 'string' && tokenUsed.includes('-')) {
        try {
          const [corpId, tokenCode] = tokenUsed.split('-');
          const tokenDocRef = doc(db, 'corporate_tokens', corpId);

          // Ambil snapshot data token batch untuk mendapatkan corporateName asli secara aman
          const tokenDocSnap = await getDoc(tokenDocRef);
          if (tokenDocSnap.exists()) {
            corporateEntityName = tokenDocSnap.data().corporateName;
          }

          // Update status token spesifik di dalam objek JSON tokens dan naikkan count
          await updateDoc(tokenDocRef, {
            [`tokens.${tokenCode}.isUsed`]: true,
            [`tokens.${tokenCode}.usedAt`]: new Date().toISOString(),
            [`tokens.${tokenCode}.usedByNamaUsaha`]: dbData.namaUsaha || 'Tanpa Nama',
            usedCount: increment(1)
          });

          // Bersihkan session agar tidak bisa di-refresh untuk bypass
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('active_token');
            sessionStorage.removeItem('active_model');
          }
        } catch (tokenError) {
          console.error("Gagal melakukan update status token atau mengambil nama korporat:", tokenError);
        }
      }
      // =========================================================
      
      // PERUBAHAN DI SINI: Tangkap Response dari addDoc sebagai `docRef`
      const docRef = await addDoc(collection(db, "assessments"), {
        trackType: trackNameStr,
        corporateEntity: corporateEntityName, 
        namaUsaha: dbData.namaUsaha || 'Tanpa Nama',
        email: dbData.email || '',
        whatsapp: dbData.whatsapp || '',
        score: result.totalScore || 0,
        readinessLevel: result.readinessLevel || 'Belum Ditentukan',
        formData: dbData,
        aiResult: result,
        tokenUsed: tokenUsed || null, 
        createdAt: new Date().toISOString()
      });

      // PERUBAHAN DI SINI: Kirim docRef.id ke fungsi saveToHistory
      saveToHistory(dbData, result, trackNameStr, docRef.id);

      // Hapus cache lokal HANYA jika proses asessemen sukses sepenuhnya
      if (typeof window !== 'undefined' && selectedTemplate) {
        localStorage.removeItem(`curation_draft_dynamic_${selectedTemplate.id}`);
      }
      
      setViewState('dashboard');

      if (typeof window !== 'undefined' && window.parent !== window) {
        window.parent.postMessage({
          type: 'CURATION_COMPLETED',
          payload: { namaUsaha: finalData.namaUsaha, track: selectedTemplate?.trackName }
        }, '*');
      }

    } catch (error: any) {
      console.error("Terjadi kesalahan saat memproses data:", error);
      alert(error.message || "Gagal memproses AI. Pastikan Token benar.");
      setViewState('wizard'); // Kembalikan ke layar form jika error
    }
  };

  return {
    state: { viewState, templates, selectedTemplate, isLoadingTemplates, formData, aiResult, history },
    actions: { setViewState, setSelectedTemplate, loadHistoryData, loadHistoryItem, submitAssessment, restart }
  };
}