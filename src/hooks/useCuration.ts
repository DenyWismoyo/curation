import { useState, useEffect } from 'react';
import { ViewState, CurationFormData, AIResult, CurationHistory } from '@/types/curation';
import { processAIAssessment } from '@/services/ai.service';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export function useCuration() {
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [trackType, setTrackType] = useState<string>('');
  const [formData, setFormData] = useState<CurationFormData>({});
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [history, setHistory] = useState<CurationHistory[]>([]);

  // --- FUNGSI HISTORY & NAVIGATION ---

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

    // Update state history terbaru
    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);

    // Simpan ke localStorage browser agar data tidak hilang saat direfresh
    if (typeof window !== 'undefined') {
      localStorage.setItem('curationHistory', JSON.stringify(updatedHistory));
    }
  };

  const loadHistoryData = () => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('curationHistory');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Gagal memuat history", e);
        }
      }
    }
  };

  const restart = () => {
    // Kembalikan semua state ke kondisi awal
    setViewState('landing');
    setTrackType('');
    setFormData({});
    setAiResult(null);
  };

  // Panggil loadHistoryData sekali saat komponen pertama kali dimuat
  useEffect(() => {
    loadHistoryData();
  }, []);

  // --- AKHIR FUNGSI HISTORY ---


  // --- FUNGSI UTAMA PROSES ASESMEN ---

  const submitAssessment = async (finalData: CurationFormData) => {
    setFormData(finalData);
    setViewState('processing');
    
    try {
      // 1. SIAPKAN DATA UNTUK DATABASE & AI
      const dbData: Record<string, any> = { ...finalData };
      const uploadPromises: Promise<void>[] = [];

      // 2. UPLOAD FILE KE FIREBASE STORAGE
      for (const key in dbData) {
        const value = dbData[key];
        // Jika valuenya adalah object File, kita upload ke Storage
        if (value instanceof File) {
          // Buat nama file unik
          const fileName = `curation_files/${Date.now()}_${value.name.replace(/\s+/g, '_')}`;
          const storageRef = ref(storage, fileName);
          
          // Upload dan ganti object File dengan String URL
          const uploadTask = uploadBytes(storageRef, value).then(async (snapshot) => {
            const downloadUrl = await getDownloadURL(snapshot.ref);
            dbData[key] = downloadUrl; 
          });
          uploadPromises.push(uploadTask);
        }
      }

      // Tunggu semua proses upload file selesai
      await Promise.all(uploadPromises);

      // 3. KIRIM KE AI SERVICE 
      // (Kita kirim finalData asli agar service bisa merubah File ke Base64 untuk dibaca AI)
      const result = await processAIAssessment(finalData, trackType);
      setAiResult(result);

      // 4. SIMPAN KE FIRESTORE 
      // (Gunakan dbData yang sudah bersih dari object File dan hanya berisi URL)
      await addDoc(collection(db, "assessments"), {
        trackType: trackType,
        namaUsaha: dbData.namaUsaha || 'Tanpa Nama',
        email: dbData.email || '',
        whatsapp: dbData.whatsapp || '',
        score: result.totalScore,
        readinessLevel: result.readinessLevel,
        formData: dbData,
        aiResult: result,
        createdAt: new Date().toISOString()
      });
      console.log("Data & URL File berhasil disimpan ke Firestore!");

      // 5. SIMPAN KE HISTORY LOCAL BROWSER
      saveToHistory(dbData, result, trackType || "Umum");

    } catch (error) {
      console.error("Terjadi kesalahan saat memproses data:", error);
      // Anda bisa menambahkan UI Toast/Alert error di sini nantinya
    }

    // 6. TAMPILKAN HASIL KE DASHBOARD
    setViewState('dashboard');

    // 7. KOMUNIKASI IFRAME (Opsional)
    if (typeof window !== 'undefined' && window.parent !== window) {
      // Catatan Keamanan: Untuk di production, disarankan mengganti '*' dengan
      // domain spesifik Anda, misal: 'https://sintesa.solotechnopark.id'
      window.parent.postMessage({
        type: 'CURATION_COMPLETED',
        payload: { namaUsaha: finalData.namaUsaha, track: trackType }
      }, '*');
    }
  };

  return {
    state: { viewState, trackType, formData, aiResult, history },
    actions: { setViewState, setTrackType, loadHistoryData, submitAssessment, restart }
  };
}