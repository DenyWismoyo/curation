// src/components/curator/CuratorAssessmentDetail.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  X, Briefcase, Sparkles, AlertTriangle, TrendingUp, 
  Activity, Lightbulb, Save, Edit3, CheckCircle2,
  ListChecks, ShieldCheck, FileText, Loader2, MapPin,
  Banknote, Users, Search, ChevronDown, Landmark, Compass,
  Target, MessageCircle, Mic, MicOff, Tag, Zap, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

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

  // --- STATE KONTROL UI ---
  const [activeTab, setActiveTab] = useState<'ai' | 'input'>('ai');
  const [isEditing, setIsEditing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('rec-0');
  const [isListening, setIsListening] = useState(false);
  
  // State Autosave
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialRender = useRef(true);

  // --- DATA AI (READ-ONLY) ---
  const aiScore = currentAiResult.totalScore || data.score || 0;
  const aiLevel = currentAiResult.readinessLevel || data.readinessLevel || '';
  const aiRoute = currentAiResult.incubationRoute || '';
  const aiMetrics = currentAiResult.metrics || [];

  // --- STATE PENILAIAN INDEPENDEN KURATOR (EDITABLE) ---
  const [curatorScore, setCuratorScore] = useState<number>(data.curatorAssessment?.verifiedScore || aiScore);
  const [curatorLevel, setCuratorLevel] = useState<string>(data.curatorAssessment?.verifiedLevel || aiLevel);
  const [curatorRoute, setCuratorRoute] = useState<string>(data.curatorAssessment?.finalRoute || aiRoute);
  const [curatorNotes, setCuratorNotes] = useState<string>(data.curatorNotes || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(data.curatorAssessment?.tags || []);

  const [marketNotes, setMarketNotes] = useState<string>(data.curatorAssessment?.marketNotes || '');
  const [financialNotes, setFinancialNotes] = useState<string>(data.curatorAssessment?.financialNotes || '');
  const [investmentNotes, setInvestmentNotes] = useState<string>(data.curatorAssessment?.investmentNotes || '');
  const [teamNotes, setTeamNotes] = useState<string>(data.curatorAssessment?.teamNotes || '');
  const [documentNotes, setDocumentNotes] = useState<string>(data.curatorAssessment?.documentNotes || '');
  const [metricsNotes, setMetricsNotes] = useState<string>(data.curatorAssessment?.metricsNotes || '');
  const [swotNotes, setSwotNotes] = useState<string>(data.curatorAssessment?.swotNotes || '');

  const isHighTier = curatorScore >= 75;

  // --- LOGIC AUTOSAVE (DRAFTING) ---
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
          curatorNotes: curatorNotes, 
          score: Number(curatorScore), 
          readinessLevel: curatorLevel,
          // Tetap biarkan Validated jika sebelumnya sudah Validated dan hanya diedit kecil
          status: status === 'Curator_Validated' ? 'Curator_Validated' : 'Curator_Draft',
          updatedAt: new Date().toISOString(),
          curatorAssessment: {
            verifiedScore: Number(curatorScore),
            verifiedLevel: curatorLevel,
            finalRoute: curatorRoute,
            tags: selectedTags,
            marketNotes, financialNotes, investmentNotes, teamNotes, documentNotes, metricsNotes, swotNotes
          }
        };

        if (!data.originalAiResult) payload.originalAiResult = currentAiResult;

        await updateDoc(docRef, payload);
        setAutoSaveStatus('saved');
        
        // Hapus status 'saved' setelah 3 detik untuk UI yang lebih bersih
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) {
        console.error("Autosave failed:", error);
        setAutoSaveStatus('error');
      }
    }, 2500); // Trigger save 2.5 detik setelah user berhenti mengetik (Debounce)

    return () => clearTimeout(timer);
  }, [
    curatorScore, curatorLevel, curatorRoute, curatorNotes, selectedTags, 
    marketNotes, financialNotes, investmentNotes, teamNotes, documentNotes, 
    metricsNotes, swotNotes, isEditing
  ]);


  // --- LOGIC FINALISASI (SUBMIT VALIDATED) ---
  const handleFinalizeClick = () => {
    if (!curatorNotes.trim()) {
      setErrorMsg('Catatan Validasi Lapangan Utama WAJIB diisi untuk melakukan Finalisasi.');
      // Scroll ke atas agar error terlihat
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        curatorNotes: curatorNotes, 
        score: Number(curatorScore), 
        readinessLevel: curatorLevel,
        status: 'Curator_Validated', // Kunci status menjadi tervalidasi final
        validatedAt: new Date().toISOString(),
        curatorAssessment: {
          verifiedScore: Number(curatorScore),
          verifiedLevel: curatorLevel,
          finalRoute: curatorRoute,
          tags: selectedTags,
          marketNotes, financialNotes, investmentNotes, teamNotes, documentNotes, metricsNotes, swotNotes
        }
      };

      if (!data.originalAiResult) payload.originalAiResult = currentAiResult;

      await updateDoc(docRef, payload);
      setIsConfirmModalOpen(false);
      alert('Data telah difinalisasi secara permanen!');
      onSaveSuccess(); // Akan men-trigger tutup modal dan refresh dari parent
    } catch (error) {
      console.error('Gagal memfinalisasi kurator:', error);
      setErrorMsg('Gagal terhubung ke database. Silakan periksa kembali koneksi Anda.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsFinalizing(false);
    }
  };


  // --- LOGIC VOICE-TO-TEXT ---
  const toggleVoiceRecord = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Browser Anda tidak mendukung fitur Dikte Suara. Gunakan Chrome/Safari terbaru.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

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
    const phone = data.formData?.whatsapp || '';
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const textMessage = `Halo tim *${namaUsaha}*, 👋\n\nTerima kasih telah mengikuti tahapan Kurasi bersama kami. Berikut adalah ringkasan hasil validasi lapangan dan asesmen akhir dari tim Penilai:\n\n📊 *Skor Kesiapan Akhir:* ${curatorScore}/100\n📈 *Level Kesiapan:* ${curatorLevel}\n🛣️ *Rekomendasi Rute:* ${curatorRoute}\n\n*📝 Catatan Tim Kurator:*\n_"${curatorNotes || 'Tetap semangat dan terus tingkatkan kapasitas bisnis Anda.'}"_\n\nUntuk informasi lebih lanjut mengenai langkah selanjutnya, tim kami akan menghubungi Anda kembali.\n\nSalam hangat,\n*Tim Penilai & Kurator*`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`, '_blank');
  };

  const radarData = aiMetrics.map((m: any, idx: number) => ({
    subject: m.label, shortLabel: `D${idx + 1}`, A: m.score, fullMark: 100
  }));

  const InsightAccordion = ({ id: accordId, title, icon: Icon, content }: any) => {
    const isOpen = expandedSection === accordId;
    return (
      <div className="bg-white ring-1 ring-slate-100 rounded-2xl overflow-hidden transition-all duration-300">
        <button onClick={() => setExpandedSection(isOpen ? null : accordId)} className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
              <Icon size={16} />
            </div>
            <h4 className={`text-sm font-black uppercase tracking-widest ${isOpen ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</h4>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 sm:p-5 pt-0 text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-50">
            <p className="whitespace-pre-wrap pt-2 font-medium text-slate-600">{content}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full h-full sm:h-[95vh] max-w-7xl sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        {/* HEADER */}
        <div className="bg-white px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
          <div className="w-full lg:w-auto min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">{namaUsaha}</h2>
              {isAlreadyValidated ? (
                <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 size={12}/> Final
                </span>
              ) : isDraft ? (
                <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                  <Edit3 size={12}/> Draf
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 truncate flex items-center gap-1.5">
              <MapPin size={12}/> {formData?.kota || 'Lokasi tidak diketahui'} • {trackType}
              {corporateEntity && (
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] ml-1 font-bold">
                  {corporateEntity}
                </span>
              )}
            </p>
          </div>
          
          {/* Action Buttons Top Bar */}
          <div className="flex flex-wrap items-center w-full lg:w-auto justify-between lg:justify-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-0 border-slate-100">
            
            {/* Indikator Autosave (Hanya tampil saat mode edit) */}
            {isEditing && (
              <div className="hidden sm:flex items-center mr-2 text-[10px] font-bold uppercase tracking-widest">
                {autoSaveStatus === 'saving' && <span className="text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Menyimpan...</span>}
                {autoSaveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3"/> Draf Tersimpan</span>}
                {autoSaveStatus === 'error' && <span className="text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Gagal Simpan</span>}
              </div>
            )}

            <Button onClick={handleShareWhatsApp} variant="outline" className="bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200 rounded-xl font-bold h-10 px-3 sm:px-4 shadow-sm flex-1 sm:flex-none">
              <MessageCircle className="w-4 h-4 sm:mr-2" /> <span className="sm:hidden lg:inline">Share</span>
            </Button>
            
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-3 sm:px-4 shadow-md flex-1 sm:flex-none">
                <Edit3 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Lanjutkan Validasi</span><span className="sm:hidden">Edit</span>
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl h-10 px-3 font-bold border-slate-200 text-slate-600 flex-1 sm:flex-none">
                  Tutup Editor
                </Button>
                {/* Tombol Finalisasi Atas dengan Pop-up Konfirmasi */}
                <Button onClick={handleFinalizeClick} disabled={isFinalizing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-10 px-4 shadow-md shadow-emerald-200 flex-1 sm:flex-none">
                  <CheckCircle2 className="w-4 h-4 mr-2"/>
                  Finalisasi
                </Button>
              </>
            )}
            
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors active:scale-95 shrink-0" title="Tutup Panel">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLLER NAVIGATION TABS */}
        <div className="flex gap-4 px-6 sm:px-8 pt-4 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('ai')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Validasi & Rekap Laporan</span>
          </button>
          <button onClick={() => setActiveTab('input')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Input Peserta</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          
          {/* TAB INPUT RAW DATA */}
          {activeTab === 'input' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
              <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm">
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
                          <a href={value as string} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">Lihat Dokumen Terlampir</a>
                        ) : isArray ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(value as string[]).map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-white ring-1 ring-slate-200 rounded-md text-xs font-semibold text-slate-700">{item}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB AI & CURATOR MATRIX ASSESSMENT REPORT */}
          {activeTab === 'ai' && (
            <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 animate-in fade-in duration-500">
              
              {errorMsg && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl font-bold flex items-center gap-3 ring-1 ring-rose-200">
                  <AlertTriangle className="w-5 h-5 shrink-0"/> {errorMsg}
                </div>
              )}

              {/* CONSUME QUICK TAGS SECTION */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-500"/> Kustomisasi Quick Tags
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  {isEditing ? (
                    availableTags.length > 0 ? availableTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter(t => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                        >
                          {tag}
                        </button>
                      );
                    }) : (
                      <span className="text-xs italic text-slate-400">Belum ada master tag yang diatur di Dashboard.</span>
                    )
                  ) : (
                    selectedTags.length > 0 ? selectedTags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full ring-1 ring-indigo-200">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-xs italic text-slate-400">Tidak ada tag yang dipilih untuk profil ini. Aktifkan mode edit untuk menyematkan.</span>
                    )
                  )}
                </div>
              </div>

              {/* HUBUNGAN UTAMA: CATATAN VALIDASI LAPANGAN KURATOR */}
              <div className={`p-6 sm:p-8 rounded-[2rem] shadow-sm ring-2 transition-all ${isEditing ? 'bg-white ring-indigo-500 shadow-indigo-100' : 'bg-white ring-slate-200'}`}>
                <h3 className="font-black text-slate-900 text-lg mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600"/> Kesimpulan Utama Validasi Lapangan <span className="text-rose-500">*</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">Berikan ringkasan penilaian langsung hasil verifikasi fisik, wawancara tatap muka, dan argumentasi dasar keselarasan bisnis.</p>
                {isEditing ? (
                  <div className="relative">
                    <Textarea 
                      value={curatorNotes} 
                      onChange={(e) => setCuratorNotes(e.target.value)} 
                      placeholder="Gunakan keyboard atau tombol suara (dikte) untuk mengisi catatan lapangan..." 
                      className="min-h-[140px] bg-slate-50 rounded-2xl border-slate-200 text-sm font-medium focus-visible:ring-indigo-500 pb-12"
                    />
                    <button
                      onClick={toggleVoiceRecord}
                      type="button"
                      className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-500 hover:text-indigo-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                      title="Dikte Suara (Voice to Text)"
                    >
                      {isListening ? <><MicOff size={14} /> Mendengarkan...</> : <><Mic size={14} /> Dikte Suara</>}
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-100 min-h-[90px] text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                    {curatorNotes || <span className="italic text-slate-400">Belum ada catatan lapangan utama. Aktifkan mode edit untuk mengisi.</span>}
                  </div>
                )}
              </div>

              {/* 1. COMPONENT SUMMARY & KALIBRASI SKOR BERSAMA */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-white ring-1 ring-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm">
                    <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-indigo-500"/> Executive Summary (AI Draft)
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm font-medium">
                      {currentAiResult.executiveSummary || "Analisis penilaian komprehensif strategis."}
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-[400px] shrink-0 p-6 rounded-3xl text-white relative overflow-hidden shadow-lg bg-slate-900 flex flex-col justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-30 mix-blend-overlay"></div>
                  <div className="flex justify-between gap-4 relative z-10 w-full">
                    <div className="flex-1 text-center bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Rekomendasi AI</p>
                      <p className="text-5xl font-black text-white/50 leading-none mb-2">{aiScore}</p>
                      <span className="inline-block text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/50">{aiLevel}</span>
                    </div>

                    <div className={`flex-1 text-center rounded-2xl p-4 ring-2 shadow-xl ${isHighTier ? 'bg-emerald-800 ring-emerald-400' : 'bg-indigo-600 ring-indigo-400'}`}>
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/90 mb-2">Skor Final Kurator</p>
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Input type="number" min="0" max="100" value={curatorScore} onChange={(e) => setCuratorScore(Number(e.target.value))} className="w-20 text-center text-3xl font-black bg-white/20 text-white border-white/30 h-11 rounded-xl" />
                          <Input value={curatorLevel} onChange={(e) => setCuratorLevel(e.target.value)} className="text-center text-[10px] font-bold bg-white/20 border-white/30 text-white rounded-lg h-7 px-2 w-full" placeholder="Ubah Level" />
                        </div>
                      ) : (
                        <>
                          <p className="text-5xl font-black text-white leading-none mb-2">{curatorScore}</p>
                          <span className="inline-block text-[10px] font-black bg-white/20 px-2 py-0.5 rounded text-white">{curatorLevel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. ADVANCED MATRIX INTERACTIVE PANELS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4"/> Market Positioning (AI)
                    </h3>
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Niche Pasar</p>
                        <p className="text-sm font-semibold text-slate-800">{currentAiResult.marketPositioning?.niche || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Unfair Advantage</p>
                        <p className="text-sm font-semibold text-slate-800">{currentAiResult.marketPositioning?.competitorAdvantage || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Potensi Skalabilitas</p>
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded ring-1 ring-indigo-200">
                          {currentAiResult.marketPositioning?.marketScalability || 'Medium'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" /> Tanggapan Kurator
                    </h4>
                    {isEditing ? (
                      <Textarea 
                        value={marketNotes} 
                        onChange={(e) => setMarketNotes(e.target.value)} 
                        placeholder="Berikan reviu aspek pasar berdasarkan temuan riil..."
                        className="bg-indigo-50/40 border-indigo-100 text-xs h-24 rounded-xl" 
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-700 min-h-[60px]">
                        {marketNotes || <span className="italic text-slate-400">Belum ada catatan peninjau pasar.</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-4 flex items-center gap-2">
                      <Banknote className="w-4 h-4"/> Financial Health (AI)
                    </h3>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Financial Score</p>
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs">{currentAiResult.financialHealth?.financialScore || 0}/100</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Model Pendapatan</p>
                        <p className="text-sm font-medium text-slate-700">{currentAiResult.financialHealth?.revenueModelViability || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Burn Rate / Runway</p>
                        <p className="text-sm font-medium text-slate-700">{currentAiResult.financialHealth?.burnRateOrRunwayAssessment || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" /> Tanggapan Kurator
                    </h4>
                    {isEditing ? (
                      <Textarea 
                        value={financialNotes} 
                        onChange={(e) => setFinancialNotes(e.target.value)} 
                        placeholder="Validasi kebenaran omzet riil vs rekening koran pendaftar..."
                        className="bg-indigo-50/40 border-indigo-100 text-xs h-24 rounded-xl" 
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-700 min-h-[60px]">
                        {financialNotes || <span className="italic text-slate-400">Belum ada catatan validasi keuangan.</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-amber-600 tracking-widest mb-4 flex items-center gap-2">
                      <Landmark className="w-4 h-4"/> Investment Readiness (AI)
                    </h3>
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Funding Stage</p>
                        <p className="text-sm font-semibold text-slate-800">{currentAiResult.investmentReadiness?.currentFundingStage || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Instrumen Rekomendasi</p>
                        <p className="text-sm font-semibold text-slate-800">{currentAiResult.investmentReadiness?.recommendedInstrument || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Daya Tarik Investor</p>
                        <span className="inline-block text-xs font-bold px-2 py-0.5 rounded ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                          {currentAiResult.investmentReadiness?.investorAttractiveness || 'Angel/Seed'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" /> Tanggapan Kurator
                    </h4>
                    {isEditing ? (
                      <Textarea 
                        value={investmentNotes} 
                        onChange={(e) => setInvestmentNotes(e.target.value)} 
                        placeholder="Berikan analisis kelayakan instrumen investasi..."
                        className="bg-indigo-50/40 border-indigo-100 text-xs h-24 rounded-xl" 
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-700 min-h-[60px]">
                        {investmentNotes || <span className="italic text-slate-400">Belum ada catatan kesiapan investasi.</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white ring-1 ring-slate-200 p-6 rounded-2xl shadow-sm md:col-span-2 lg:col-span-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4"/> Team & Execution (AI)
                    </h3>
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Founder-Market Fit</p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{currentAiResult.teamAssessment?.founderMarketFit || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1.5">Identified Skill Gaps</p>
                        <div className="flex flex-wrap gap-1">
                          {(currentAiResult.teamAssessment?.identifiedSkillGaps || []).map((gap: string, i: number) => (
                            <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded ring-1 ring-slate-200">{gap}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" /> Tanggapan Kurator
                    </h4>
                    {isEditing ? (
                      <Textarea 
                        value={teamNotes} 
                        onChange={(e) => setTeamNotes(e.target.value)} 
                        placeholder="Catat komitmen founder, coachability, serta soliditas tim..."
                        className="bg-indigo-50/40 border-indigo-100 text-xs h-24 rounded-xl" 
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-700 min-h-[60px]">
                        {teamNotes || <span className="italic text-slate-400">Belum ada catatan kapabilitas tim.</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md md:col-span-2 lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                    <FileText size={160} className="transform translate-x-8 -translate-y-8"/>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-300">
                      <Search className="w-4 h-4"/> Document & File Insights (AI Verification)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 mb-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Kualitas Berkas</p>
                        <p className="text-xs text-slate-200 font-semibold">{currentAiResult.fileAnalysisInsights?.documentQuality || '-'}</p>
                        <p className="text-[10px] uppercase text-rose-300 font-bold mt-3 mb-0.5">Kesenjangan Data (Discrepancies)</p>
                        <p className="text-xs text-rose-200 italic font-medium">{currentAiResult.fileAnalysisInsights?.discrepancies || 'Tidak ada kesenjangan data.'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Temuan Kunci Dokumen</p>
                        <ul className="space-y-1">
                          {(currentAiResult.fileAnalysisInsights?.keyFindingsFromFiles || []).map((find: string, i: number) => (
                            <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1">
                              <span className="text-indigo-400 mt-0.5">●</span> <span className="leading-tight">{find}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 relative z-10 mt-auto">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" /> Hasil Konfirmasi Keabsahan Dokumen Fisik
                    </h4>
                    {isEditing ? (
                      <Textarea 
                        value={documentNotes} 
                        onChange={(e) => setDocumentNotes(e.target.value)} 
                        placeholder="Contoh: Kesesuaian berkas fisik NIB dan sertifikasi produk telah tervalidasi asli..."
                        className="bg-slate-800 border-slate-700 text-white text-xs h-20 rounded-xl placeholder:text-slate-500 focus-visible:ring-indigo-500" 
                      />
                    ) : (
                      <div className="bg-slate-800/60 p-3 rounded-xl text-xs font-medium text-slate-300 min-h-[50px]">
                        {documentNotes || <span className="italic text-slate-500">Belum ada catatan validasi fisik berkas.</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. PERFORMANCE DIMENSION RADAR AND CARDS LOCK MATRIX */}
              <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Activity className="h-5 w-5"/>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-xl tracking-tight">Dimensi Kinerja Komparatif</h3>
                      <p className="text-sm text-slate-500 font-medium">Visualisasi dan rekap sebaran pilar draf penilaian AI</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-center">
                  <div className="w-full lg:w-2/5 flex flex-col items-center shrink-0">
                    <div className="w-full h-[320px] sm:h-[360px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <PolarAngleAxis dataKey="shortLabel" tick={{ fill: '#4f46e5', fontSize: 13, fontWeight: 900 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Skor AI" dataKey="A" stroke={isHighTier ? '#10b981' : '#4f46e5'} strokeWidth={3} fill={isHighTier ? '#10b981' : '#4f46e5'} fillOpacity={0.15} />
                          <Tooltip labelFormatter={(label) => radarData.find((d: any) => d.shortLabel === label)?.subject || label} wrapperClassName="!z-[9999] rounded-xl font-bold text-sm shadow-xl" />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="w-full lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiMetrics.map((item: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2 gap-3">
                          <h4 className="text-xs font-black text-slate-900 leading-tight">
                            <span className="text-indigo-600 mr-1">D{idx + 1}.</span> {item.label}
                          </h4>
                          <span className={`text-sm font-black px-2 py-0.5 rounded-md bg-white ring-1 ring-slate-200 ${item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {item.score}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600"/> Catatan Kurator Terhadap Kalibrasi Pilar Penilaian
                  </h4>
                  {isEditing ? (
                    <Textarea
                      value={metricsNotes}
                      onChange={(e) => setMetricsNotes(e.target.value)}
                      placeholder="Masukkan justifikasi penguat jika nilai riil pilar kinerja lapangan berbeda dengan analisis berkas digital AI..."
                      className="bg-indigo-50/40 border-indigo-100 text-sm min-h-[90px] rounded-xl"
                    />
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl text-sm font-medium text-slate-700 min-h-[60px]">
                      {metricsNotes || <span className="italic text-slate-400">Belum ada catatan kalibrasi pilar penilaian.</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. SWOT MATRIX DISPLAY ONLY BLOCK */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-emerald-50/70 p-5 rounded-3xl ring-1 ring-emerald-200/60 shadow-sm">
                    <h4 className="text-emerald-900 font-black flex items-center gap-2 mb-3 text-sm"><TrendingUp className="h-4 w-4"/> Strengths</h4>
                    <ul className="list-disc list-inside text-emerald-800 text-xs font-medium space-y-1.5">
                      {(currentAiResult.swotAnalysis?.strengths || []).map((s: string, i: number) => s.trim() && <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-rose-50/70 p-5 rounded-3xl ring-1 ring-rose-200/60 shadow-sm">
                    <h4 className="text-rose-900 font-black flex items-center gap-2 mb-3 text-sm"><Activity className="h-4 w-4"/> Weaknesses</h4>
                    <ul className="list-disc list-inside text-rose-800 text-xs font-medium space-y-1.5">
                      {(currentAiResult.swotAnalysis?.weaknesses || []).map((w: string, i: number) => w.trim() && <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                  <div className="bg-blue-50/70 p-5 rounded-3xl ring-1 ring-blue-200/60 shadow-sm">
                    <h4 className="text-blue-900 font-black flex items-center gap-2 mb-3 text-sm"><Lightbulb className="h-4 w-4"/> Opportunities</h4>
                    <ul className="list-disc list-inside text-blue-800 text-xs font-medium space-y-1.5">
                      {(currentAiResult.swotAnalysis?.opportunities || []).map((o: string, i: number) => o.trim() && <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                  <div className="bg-amber-50/70 p-5 rounded-3xl ring-1 ring-amber-200/60 shadow-sm">
                    <h4 className="text-amber-900 font-black flex items-center gap-2 mb-3 text-sm"><AlertTriangle className="h-4 w-4"/> Threats</h4>
                    <ul className="list-disc list-inside text-amber-800 text-xs font-medium space-y-1.5">
                      {(currentAiResult.swotAnalysis?.threats || []).map((t: string, i: number) => t.trim() && <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600"/> Validasi Strategi Kompetitif (SWOT Lapangan)
                  </h4>
                  {isEditing ? (
                    <Textarea
                      value={swotNotes}
                      onChange={(e) => setSwotNotes(e.target.value)}
                      placeholder="Tambahkan faktor eksternal atau kelemahan fatal operasional usaha yang terlewat oleh analisa dokumen AI..."
                      className="bg-indigo-50/40 border-indigo-100 text-sm min-h-[80px] rounded-xl"
                    />
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 min-h-[50px]">
                      {swotNotes || <span className="italic text-slate-400">Belum ada catatan validasi SWOT.</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. CRITICAL RISKS MANAGEMENT REVIEWS MAP */}
              {currentAiResult.riskAssessment?.criticalRisks?.length > 0 && (
                <div className="p-6 sm:p-8 rounded-[2rem] ring-1 ring-rose-200 bg-rose-50/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5"/>
                    </div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Critical Risks & Mitigation Map (AI Assessment)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentAiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
                      <div key={idx} className="flex flex-col ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="bg-rose-50/30 p-4 border-b border-rose-100/50">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-0.5">Identifikasi Risiko</h4>
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{risk}</p>
                        </div>
                        <div className="p-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5 flex items-center gap-1">
                            <ShieldCheck size={12}/> Strategi Mitigasi AI
                          </h4>
                          <p className="text-xs font-medium text-slate-600 leading-relaxed">
                            {currentAiResult.riskAssessment.mitigationStrategies?.[idx] || "Mitigasi dasar diperlukan."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. STRATEGIC ROADMAP, FINAL ROUTE SELECTION & TIMELINE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
                <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5"/>
                    </div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Rekomendasi Rencana Program (AI Framework)</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(currentAiResult.recommendations || []).map((rec: any, idx: number) => (
                      <InsightAccordion 
                        key={idx}
                        id={`rec-${idx}`} 
                        title={rec.title} 
                        icon={Briefcase} 
                        content={rec.content}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className={`p-6 sm:p-8 rounded-[2rem] text-center ring-1 shadow-sm ${isHighTier ? 'bg-emerald-50 ring-emerald-200/60 text-emerald-900' : 'bg-indigo-50 ring-indigo-200/60 text-indigo-900'}`}>
                    <Compass className={`mx-auto mb-3 h-8 w-8 ${isHighTier ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5">Penetapan Rute Akselerasi Final</p>
                    {isEditing ? (
                      <Input 
                        value={curatorRoute} 
                        onChange={(e) => setCuratorRoute(e.target.value)} 
                        className="bg-white font-black text-center h-10 border-slate-300 rounded-xl text-slate-900" 
                        placeholder="Tentukan Rute Inkubasi Akhir..." 
                      />
                    ) : (
                      <h4 className="text-xl font-black leading-tight tracking-tight text-balance">{curatorRoute || "Reguler Track"}</h4>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-white ring-1 ring-slate-200 p-6 sm:p-8 shadow-sm flex flex-col rounded-[2rem]">
                    <h3 className="font-black text-slate-900 text-base tracking-tight mb-6 flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-indigo-600"/> Action Plan Timeline (AI Draft)
                    </h3>
                    <div className="relative border-l-2 border-slate-100 ml-3 space-y-5 pb-2">
                      {(currentAiResult.nextActionSteps || []).map((step: any, idx: number) => {
                        const isUrgent = step.timeframe?.includes('30');
                        const markerColor = isUrgent ? 'bg-rose-500 ring-rose-100' : 'bg-indigo-500 ring-indigo-100';
                        return (
                          <div key={idx} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ${markerColor}`} />
                            <div className="bg-slate-50 p-3 rounded-xl ring-1 ring-slate-100">
                              <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-200 text-slate-700 rounded mb-1">
                                {step.timeframe}
                              </span>
                              <p className="text-xs text-slate-700 font-bold leading-relaxed">{step.task}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL KONFIRMASI FINALISASI */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Finalisasi Penilaian?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
              Apakah Anda yakin ingin memfinalisasi data validasi untuk <strong>{namaUsaha}</strong>? Setelah difinalisasi, status peserta akan berubah menjadi "Selesai".
            </p>
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmModalOpen(false)} 
                className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 h-11 hover:bg-slate-50"
              >
                Batal
              </Button>
              <Button 
                onClick={executeFinalization} 
                disabled={isFinalizing} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-11 shadow-md shadow-emerald-200"
              >
                {isFinalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                Ya, Finalisasi
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}