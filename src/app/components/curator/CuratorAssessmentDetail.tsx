'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  X, Briefcase, AlertTriangle, Edit3, CheckCircle2,
  ShieldCheck, Loader2, MapPin, MessageCircle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CuratorExportPDF } from './PDFReportTemplate';
import { UniversalAssessmentView } from '@/app/components/shared/UniversalAssessmentView';

interface CuratorAssessmentDetailProps {
  data: any;
  availableTags?: string[];
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function CuratorAssessmentDetail({ data, availableTags = [], onClose, onSaveSuccess }: CuratorAssessmentDetailProps) {
  const { formData, id, trackType, namaUsaha, corporateEntity, status } = data;
  
  const currentAiResult = data.aiResult || {};
  const isAlreadyValidated = status === 'Curator_Validated';
  const isDraft = status === 'Curator_Draft' || (!isAlreadyValidated && data.curatorAssessment !== undefined);

  // --- KONTROL UI & TABS ---
  const [activeTab, setActiveTab] = useState<'evaluasi' | 'input'>('evaluasi');
  const [isEditing, setIsEditing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialRender = useRef(true);

  // --- DATA KURATOR (STATE) ---
  const aiScore = currentAiResult.totalScore || data.score || 0;
  const [curatorScore, setCuratorScore] = useState<number>(data.curatorAssessment?.verifiedScore || aiScore);
  const [curatorLevel, setCuratorLevel] = useState<string>(data.curatorAssessment?.verifiedLevel || currentAiResult.readinessLevel || '');
  const [curatorRoute, setCuratorRoute] = useState<string>(data.curatorAssessment?.finalRoute || currentAiResult.incubationRoute || '');
  const [curatorNotes, setCuratorNotes] = useState<string>(data.curatorNotes || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(data.curatorAssessment?.tags || []);
  const [customBlockNotes, setCustomBlockNotes] = useState<Record<string, string>>(data.curatorAssessment?.customBlockNotes || {});
  const [documentNotes, setDocumentNotes] = useState<string>(data.curatorAssessment?.documentNotes || '');
  const [metricsNotes, setMetricsNotes] = useState<string>(data.curatorAssessment?.metricsNotes || '');
  const [swotNotes, setSwotNotes] = useState<string>(data.curatorAssessment?.swotNotes || '');

  // --- LOGIC AUTOSAVE ---
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (!isEditing) return;

    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'assessments', id);
        const payload: any = {
          curatorNotes, 
          score: Number(curatorScore), 
          readinessLevel: curatorLevel,
          status: status === 'Curator_Validated' ? 'Curator_Validated' : 'Curator_Draft',
          updatedAt: new Date().toISOString(),
          curatorAssessment: {
            verifiedScore: Number(curatorScore),
            verifiedLevel: curatorLevel,
            finalRoute: curatorRoute,
            tags: selectedTags,
            customBlockNotes, 
            documentNotes, 
            metricsNotes, 
            swotNotes
          }
        };

        if (!data.originalAiResult) payload.originalAiResult = currentAiResult;
        await updateDoc(docRef, payload);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) {
        setAutoSaveStatus('error');
      }
    }, 2500); 

    return () => clearTimeout(timer);
  }, [
    curatorScore, curatorLevel, curatorRoute, curatorNotes, selectedTags, 
    customBlockNotes, documentNotes, metricsNotes, swotNotes, isEditing
  ]);

  // --- LOGIC FINALISASI ---
  const handleFinalizeClick = () => {
    if (!curatorNotes.trim()) {
      setErrorMsg('Catatan Validasi Lapangan Utama WAJIB diisi untuk melakukan Finalisasi.');
      return;
    }
    setErrorMsg('');
    setIsConfirmModalOpen(true);
  };

  const executeFinalization = async () => {
    setIsFinalizing(true);
    try {
      const docRef = doc(db, 'assessments', id);
      const payload: any = {
        curatorNotes, 
        score: Number(curatorScore), 
        readinessLevel: curatorLevel,
        status: 'Curator_Validated', 
        validatedAt: new Date().toISOString(),
        curatorAssessment: {
          verifiedScore: Number(curatorScore),
          verifiedLevel: curatorLevel,
          finalRoute: curatorRoute,
          tags: selectedTags,
          customBlockNotes, documentNotes, metricsNotes, swotNotes
        }
      };

      if (!data.originalAiResult) payload.originalAiResult = currentAiResult;

      await updateDoc(docRef, payload);
      setIsConfirmModalOpen(false);
      alert('Data telah difinalisasi secara permanen!');
      onSaveSuccess(); 
    } catch (error) {
      setErrorMsg('Gagal terhubung ke database. Silakan periksa kembali koneksi Anda.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsFinalizing(false);
    }
  };

  // --- LOGIC VOICE TO TEXT & WHATSAPP ---
  const toggleVoiceRecord = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Browser Anda tidak mendukung fitur Dikte Suara."); return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; 
    recognition.interimResults = false;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCuratorNotes((prev) => prev + (prev ? ' ' : '') + transcript + '. ');
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    }
  };

  const handleShareWhatsApp = () => {
    const phone = formData?.whatsapp || '';
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const textMessage = `Halo tim *${namaUsaha}*,\n\nTerima kasih telah mengikuti tahapan Kurasi bersama kami. Berikut ringkasan hasil akhir:\n\n*Skor Kesiapan Akhir:* ${curatorScore}/100\n*Level Kesiapan:* ${curatorLevel}\n\n*Catatan Kurator:*\n_"${curatorNotes || 'Terus tingkatkan kapasitas bisnis Anda.'}"_\n\nSalam hangat,\n*Tim Penilai*`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full h-full sm:h-[95vh] max-w-7xl sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER MODAL TETAP */}
        <div className="bg-white px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
          <div className="w-full lg:w-auto min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">{namaUsaha}</h2>
              {isAlreadyValidated ? (
                <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={12}/> Final</span>
              ) : isDraft ? (
                <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1"><Edit3 size={12}/> Draf</span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 truncate flex items-center gap-1.5">
              <MapPin size={12}/> {formData?.kota || 'Lokasi tidak diketahui'} • {trackType}
              {corporateEntity && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] ml-1 font-bold">{corporateEntity}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors hidden lg:flex" title="Tutup Panel">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS KONTROL */}
        <div className="flex gap-4 px-6 sm:px-8 pt-4 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('evaluasi')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'evaluasi' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Evaluasi Kurator</span>
          </button>
          <button onClick={() => setActiveTab('input')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Input Peserta</span>
          </button>
        </div>

        {/* AREA KERJA KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          {errorMsg && (
            <div className="max-w-6xl mx-auto mb-6 bg-rose-50 text-rose-600 p-4 rounded-2xl font-bold flex items-center gap-3 ring-1 ring-rose-200">
              <AlertTriangle className="w-5 h-5 shrink-0"/> {errorMsg}
            </div>
          )}

          {activeTab === 'evaluasi' && (
            <UniversalAssessmentView
              mode="curator"
              trackType={trackType}
              corporateEntity={corporateEntity}
              formData={formData}
              aiResult={currentAiResult}
              curatorData={{
                isEditing,
                curatorScore, setCuratorScore,
                curatorLevel, setCuratorLevel,
                curatorRoute, setCuratorRoute,
                curatorNotes, setCuratorNotes,
                customBlockNotes, setCustomBlockNotes: (t, v) => setCustomBlockNotes(p => ({...p, [t]: v})),
                documentNotes, setDocumentNotes,
                metricsNotes, setMetricsNotes,
                swotNotes, setSwotNotes,
                selectedTags, toggleTag: (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag]),
                availableTags,
                isCuratorValidated: isAlreadyValidated,
                voiceDictation: { isListening, toggleRecord: toggleVoiceRecord }
              }}
              headerActions={
                <>
                  {isEditing && (
                    <div className="hidden sm:flex items-center mr-2 text-[10px] font-bold uppercase tracking-widest">
                      {autoSaveStatus === 'saving' && <span className="text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Menyimpan...</span>}
                      {autoSaveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3"/> Draf Tersimpan</span>}
                    </div>
                  )}
                  
                  {/* Ekspor Terintegrasi State Realtime Kurator */}
                  <CuratorExportPDF 
                    trackType={trackType}
                    formData={formData}
                    aiResult={currentAiResult}
                    namaUsaha={namaUsaha}
                    liveData={{
                      curatorScore,
                      curatorLevel,
                      curatorRoute,
                      curatorNotes
                    }}
                  />

                  <Button onClick={handleShareWhatsApp} variant="outline" className="bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200 rounded-xl font-bold h-10 px-4 shadow-sm">
                    <MessageCircle className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Bagikan</span>
                  </Button>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-4 shadow-md">
                      <Edit3 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Lanjutkan Validasi</span>
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl h-10 px-4 font-bold border-slate-200 text-slate-600">Tutup Editor</Button>
                      <Button onClick={handleFinalizeClick} disabled={isFinalizing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-10 px-4 shadow-md">
                        <CheckCircle2 className="w-4 h-4 mr-2"/> Finalisasi
                      </Button>
                    </>
                  )}
                </>
              }
            />
          )}

          {activeTab === 'input' && (
            <div className="max-w-5xl mx-auto bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600"/> Detail Informasi Bisnis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(formData || {}).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return null;
                  const isUrl = typeof value === 'string' && value.startsWith('http');
                  const isArray = Array.isArray(value);
                  return (
                    <div key={key} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      {isUrl ? (
                         <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline">Lihat Dokumen Lampiran</a>
                      ) : isArray ? (
                         <div className="flex flex-wrap gap-1.5 mt-1">{(value as string[]).map((item, i) => <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>)}</div>
                      ) : (
                         <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL KONFIRMASI FINALISASI */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl ring-1 ring-slate-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6" /></div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Finalisasi Penilaian?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">Apakah Anda yakin? Setelah difinalisasi, status peserta akan berubah menjadi &quot;Selesai&quot;.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="flex-1 rounded-xl font-bold h-11">Batal</Button>
              <Button onClick={executeFinalization} disabled={isFinalizing} className="flex-1 bg-emerald-600 text-white rounded-xl font-black h-11">
                {isFinalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>} Ya, Finalisasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}