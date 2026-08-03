// src/app/components/curation/ActionPlanBuilder.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Loader2, Sparkles, Target, 
  PlayCircle, ChevronDown, 
  ChevronUp, Trophy, CalendarPlus 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ActionItem } from '@/types/curation';

interface ActionPlanBuilderProps {
  assessmentId: string;
  initialData?: ActionItem[];
  aiResult: any;
}

export function ActionPlanBuilder({ assessmentId, initialData, aiResult }: ActionPlanBuilderProps) {
  const [checklist, setChecklist] = useState<ActionItem[]>(initialData || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedCount = checklist.filter(item => item.isCompleted).length;
  const totalCount = checklist.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const generatePlan = httpsCallable(functions, 'generateActionPlanChecklist');
      const response = await generatePlan({ assessmentId, aiResult });
      const data = response.data as { actionPlan: ActionItem[] };
      setChecklist(data.actionPlan);
      toast.success("Action Plan lengkap (sub-task + rekomendasi YouTube) berhasil disusun!");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyusun Action Plan. Coba lagi nanti.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleComplete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedChecklist = checklist.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setChecklist(updatedChecklist);
    saveToFirestore(updatedChecklist);
    
    if (updatedChecklist.filter(i => i.isCompleted).length === totalCount) {
        toast.success("Luar Biasa! Fase ini telah selesai.", { icon: '🏆' });
    }
  };

  const toggleSubTaskComplete = async (itemId: string, subTaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId && item.subTasks) {
        const updatedSubTasks = item.subTasks.map(st => 
          st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        return { ...item, subTasks: updatedSubTasks };
      }
      return item;
    });
    setChecklist(updatedChecklist);
    saveToFirestore(updatedChecklist);
  };

  const saveToFirestore = async (dataToSave: ActionItem[]) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'assessments', assessmentId);
      await updateDoc(docRef, { 'aiResult.customActionPlan': dataToSave });
    } catch (error) {
      console.error("Gagal menyimpan progress", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openYoutubeSearch = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`, '_blank');
  };

  // FUNGSI DIPERBARUI: DETEKSI TIMEFRAME UNTUK RECURRENCE CALENDAR
  const handleAddToCalendar = (
    taskTitle: string, 
    description: string, 
    timeframe: string, 
    tip?: string, 
    subTasks?: { id: string; text: string; isCompleted: boolean }[], 
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    
    // Set Judul
    const eventTitle = encodeURIComponent(`Fokus Eksekusi: ${taskTitle}`);
    
    // Set Deskripsi & Daftar Sub-tugas
    let detailsText = `${description}\n\n`;
    if (tip) detailsText += `Panduan Eksekusi: ${tip}\n\n`;
    
    if (subTasks && subTasks.length > 0) {
      detailsText += `Langkah Taktis (Micro-steps):\n`;
      subTasks.forEach((st, idx) => {
        detailsText += `${idx + 1}. ${st.text}\n`;
      });
      detailsText += `\n`;
    }
    
    detailsText += `Akses Workspace Anda: https://omnifit.cloud/workspace`;
    const eventDetails = encodeURIComponent(detailsText);
    
    // SET PARAMETER PENGULANGAN (RECURRENCE)
    let recurParam = '';
    const lowerTime = timeframe.toLowerCase();
    
    if (lowerTime.includes('harian')) {
      recurParam = '&recur=RRULE:FREQ=DAILY';
    } else if (lowerTime.includes('mingguan')) {
      recurParam = '&recur=RRULE:FREQ=WEEKLY';
    } else if (lowerTime.includes('bulanan')) {
      recurParam = '&recur=RRULE:FREQ=MONTHLY';
    }
    
    // Gabungkan URL
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}${recurParam}`;
    window.open(url, '_blank');
  };

  const getTimeframeStyle = (timeframe: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-slate-100 text-slate-400 ring-slate-200';
    const lowerTime = timeframe.toLowerCase();
    if (lowerTime.includes('harian')) return 'bg-emerald-50 text-emerald-600 ring-emerald-200';
    if (lowerTime.includes('mingguan')) return 'bg-sky-50 text-sky-600 ring-sky-200';
    if (lowerTime.includes('bulanan')) return 'bg-indigo-50 text-indigo-600 ring-indigo-200';
    return 'bg-slate-50 text-slate-600 ring-slate-200';
  };

  const baseScore = Math.min(100, Math.max(0, Number(aiResult?.totalScore || 50)));
  const scoreGain = Math.round((100 - baseScore) * (progressPercentage / 100));
  const projectedScore = Math.min(100, baseScore + scoreGain);
  const getProjectedLevel = (score: number) => {
    if (score >= 80) return "Tinggi (Siap Akselerasi)";
    if (score >= 60) return "Sedang (Penyesuaian Taktis)";
    return "Perlu Pendampingan Tambahan";
  };

  if (checklist.length === 0) {
    return (
      <div className="bg-slate-900 p-6 sm:p-14 rounded-3xl sm:rounded-[3rem] text-center shadow-2xl flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 text-indigo-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 ring-1 ring-white/10 backdrop-blur-md z-10">
          <Target className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight z-10">Cetak Biru Eksekusi</h3>
        <p className="text-slate-400 text-xs sm:text-sm font-medium mb-8 max-w-lg mx-auto leading-relaxed z-10">
          Sistem akan merangkum seluruh temuan dan merekonstruksinya menjadi <strong className="text-indigo-400">10 Langkah Strategis</strong> lengkap dengan sub-task dan rekomendasi konten YouTube.
        </p>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base shadow-[0_0_30px_rgb(79,70,229,0.3)] transition-all group z-10"
        >
          {isGenerating ? (
            <><Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Menyiapkan Misi...</>
          ) : (
            <><Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" /> Hasilkan 10 Misi Sekarang</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl sm:rounded-[3rem] ring-1 ring-slate-200 relative overflow-hidden flex flex-col h-full shadow-sm">
      <div className="bg-slate-900 p-5 sm:p-10 relative overflow-hidden shrink-0">
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-[80px]"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h3 className="font-black text-white text-xl sm:text-3xl tracking-tight mb-1 flex items-center gap-2 sm:gap-3">
              Timeline Eksekusi <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] uppercase rounded-lg tracking-widest ring-1 ring-emerald-500/30 backdrop-blur-sm">Aktif</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Selesaikan misi untuk meningkatkan metrik operasional harian Anda.</p>
          </div>
          <div className="shrink-0 flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-white/10 self-start sm:self-auto">
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" /> <span className="text-[11px] sm:text-xs font-bold text-slate-300">Menyimpan...</span></>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-[11px] sm:text-xs font-bold text-slate-300">Tersinkronisasi</span></>
            )}
          </div>
        </div>

        {/* WHAT-IF SCORE SIMULATOR CARD */}
        <div className="relative z-10 bg-gradient-to-r from-indigo-950/90 to-slate-900/90 p-4 sm:p-6 rounded-2xl ring-1 ring-indigo-500/30 backdrop-blur-md mb-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-300">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> What-If Score Simulator
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              +{scoreGain} Poin Proyeksi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-medium text-slate-400 block">Skor Asli</span>
              <span className="text-xl sm:text-2xl font-black text-slate-300">{baseScore}</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] font-medium text-emerald-300 block">Proyeksi Skor Baru</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{projectedScore}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col justify-center">
              <span className="text-[10px] font-medium text-slate-400 block">Proyeksi Kesiapan</span>
              <span className="text-xs font-bold text-indigo-300 truncate">{getProjectedLevel(projectedScore)}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 bg-white/5 p-4 sm:p-5 rounded-2xl ring-1 ring-white/10">
            <div className="flex justify-between items-end mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progres Keseluruhan</span>
                <span className="text-xl sm:text-2xl font-black text-white">{progressPercentage}%</span>
            </div>
            <div className="h-2.5 sm:h-3 w-full bg-slate-800/50 rounded-full overflow-hidden inset-shadow-sm">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${isAllCompleted ? 'bg-emerald-500 shadow-[0_0_15px_rgb(16,185,129,0.5)]' : 'bg-gradient-to-r from-indigo-500 to-blue-400 shadow-[0_0_15px_rgb(79,70,229,0.5)]'}`}
                />
            </div>
        </div>
      </div>


      <div className="p-4 sm:p-10 space-y-3 sm:space-y-5 flex-1 bg-[#FAFAFA]">
        {isAllCompleted && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] text-center mb-6 sm:mb-8 shadow-sm"
            >
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 mx-auto mb-3 sm:mb-4" />
                <h4 className="text-emerald-900 font-black text-lg sm:text-xl mb-2">Siklus Eksekusi Selesai!</h4>
                <p className="text-emerald-700 text-xs sm:text-sm font-medium mb-5 sm:mb-6">Anda telah menyelesaikan 10 langkah krusial awal. Pertahankan ritme Anda.</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 sm:h-12 shadow-md px-4 sm:px-6 text-sm">
                    <Sparkles className="w-4 h-4 mr-2" /> Inisiasi Fase Berikutnya
                </Button>
            </motion.div>
        )}

        <AnimatePresence>
          {checklist.map((item, index) => {
            const isExpanded = expandedId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={`flex flex-col p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] ring-1 transition-all duration-300 cursor-pointer overflow-hidden ${
                  item.isCompleted 
                    ? 'bg-white ring-slate-100 opacity-60 grayscale-[0.5]' 
                    : isExpanded 
                      ? 'bg-white ring-indigo-300 shadow-xl shadow-indigo-500/10 scale-[1.01] z-10' 
                      : 'bg-white ring-slate-200 hover:shadow-md hover:ring-indigo-200'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-5">
                  <button 
                    onClick={(e) => toggleComplete(item.id, e)}
                    className="mt-0.5 sm:mt-1 focus:outline-none shrink-0 transition-transform hover:scale-110 active:scale-90"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 drop-shadow-sm" />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 sm:border-[3px] border-slate-300 hover:border-indigo-400 transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md ring-1 transition-colors shadow-sm ${getTimeframeStyle(item.timeframe, item.isCompleted)}`}>
                        {item.timeframe}
                      </span>
                    </div>
                    
                    <h4 className={`text-base sm:text-xl font-black leading-tight transition-all duration-300 mb-1.5 sm:mb-2 pr-4 sm:pr-6 ${
                      item.isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
                    }`}>
                      {item.task}
                    </h4>
                    
                    <p className={`text-xs sm:text-sm font-medium leading-relaxed transition-all duration-300 ${
                      item.isCompleted ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-slate-400 mt-0.5 sm:mt-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && !item.isCompleted && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-6 pt-6 border-t border-slate-100"
                    >
                      {item.contextualTip && (
                        <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 flex gap-3 mb-6 shadow-sm">
                          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Panduan Eksekusi</p>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">{item.contextualTip}</p>
                          </div>
                        </div>
                      )}

                      {/* RENDER SUB-TASKS JIKA ADA */}
                      {item.subTasks && item.subTasks.length > 0 && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Langkah Taktis (Micro-Steps)</p>
                           <div className="space-y-4">
                             {item.subTasks.map((sub) => (
                                <div key={sub.id} className="flex items-start gap-3 group">
                                   <button 
                                      onClick={(e) => toggleSubTaskComplete(item.id, sub.id, e)}
                                      className="mt-0.5 focus:outline-none shrink-0 transition-transform active:scale-90"
                                    >
                                      {sub.isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors" />
                                      )}
                                    </button>
                                    <span className={`text-sm font-bold leading-snug ${sub.isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                      {sub.text}
                                    </span>
                                </div>
                             ))}
                           </div>
                        </div>
                      )}

                      {item.youtubeRecommendations && item.youtubeRecommendations.length > 0 && (
                        <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-100/70 mb-6">
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3">Rekomendasi Konten YouTube</p>
                          <div className="space-y-2">
                            {item.youtubeRecommendations.map((rec, recIdx) => (
                              <button
                                key={`${item.id}-yt-${recIdx}`}
                                onClick={(e) => openYoutubeSearch(rec.query, e)}
                                className="w-full text-left bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl px-3 py-2 transition-colors"
                                type="button"
                              >
                                <p className="text-xs font-black text-slate-800 leading-snug">{rec.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{rec.query}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* ACTION BUTTONS */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* UPDATE: Memasukkan timeframe pada handleAddToCalendar */}
                        <Button 
                          onClick={(e) => handleAddToCalendar(item.task, item.description, item.timeframe, item.contextualTip, item.subTasks, e)}
                          variant="outline" 
                          className="flex-1 bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 h-12 rounded-xl shadow-sm"
                        >
                          <CalendarPlus size={16} className="mr-2 text-emerald-600" /> Masukkan ke Kalender
                        </Button>

                        {item.searchKeyword && (
                          <Button 
                            onClick={(e) => openYoutubeSearch(item.searchKeyword!, e)}
                            variant="outline" 
                            className="flex-1 bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 h-12 rounded-xl shadow-sm"
                          >
                            <PlayCircle size={16} className="mr-2 text-rose-500" /> Cari Referensi Visual
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}