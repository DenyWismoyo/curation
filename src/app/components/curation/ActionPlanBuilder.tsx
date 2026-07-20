// src/app/components/curation/ActionPlanBuilder.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Sparkles, Target, PlayCircle, SplitSquareVertical, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
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
  
  // State untuk melacak tugas mana yang sedang digenerate sub-task nya
  const [isGeneratingSubtask, setIsGeneratingSubtask] = useState<string | null>(null);

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
      toast.success("10 Langkah Eksekusi telah disusun!");
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

  // FUNGSI BARU: Toggle Sub-Task
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

  // FUNGSI BARU: Request Sub-Task dari AI
  const handleGenerateSubTasks = async (item: ActionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.subTasks && item.subTasks.length > 0) return; // Jika sudah ada, jangan generate lagi

    setIsGeneratingSubtask(item.id);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const generateSubTask = httpsCallable(functions, 'generateSubTaskChecklist');
      
      const response = await generateSubTask({ taskName: item.task, taskDescription: item.description });
      const data = response.data as { subTasks: any[] };

      // Update state lokal
      const updatedChecklist = checklist.map(chk => 
        chk.id === item.id ? { ...chk, subTasks: data.subTasks } : chk
      );
      
      setChecklist(updatedChecklist);
      saveToFirestore(updatedChecklist); // Simpan ke database
      toast.success("Tugas berhasil dipecah menjadi langkah kecil!");

    } catch (error: any) {
      toast.error("Gagal memecah tugas. Coba lagi.");
    } finally {
      setIsGeneratingSubtask(null);
    }
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

  const getTimeframeStyle = (timeframe: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-slate-100 text-slate-400 ring-slate-200';
    const lowerTime = timeframe.toLowerCase();
    if (lowerTime.includes('harian')) return 'bg-emerald-50 text-emerald-600 ring-emerald-200';
    if (lowerTime.includes('mingguan')) return 'bg-sky-50 text-sky-600 ring-sky-200';
    if (lowerTime.includes('bulanan')) return 'bg-indigo-50 text-indigo-600 ring-indigo-200';
    return 'bg-slate-50 text-slate-600 ring-slate-200';
  };

  if (checklist.length === 0) {
    return (
      <div className="bg-slate-900 p-8 sm:p-12 rounded-[2rem] text-center shadow-xl flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-16 h-16 bg-white/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-white/20 backdrop-blur-sm z-10">
          <Target className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight z-10">Cetak Biru Eksekusi</h3>
        <p className="text-slate-400 font-medium mb-8 max-w-md mx-auto leading-relaxed z-10">
          Sistem akan merangkum seluruh temuan dan merekonstruksinya menjadi <strong className="text-indigo-400">10 Langkah Strategis</strong> harian yang dapat dilacak progresnya.
        </p>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-14 px-8 text-base shadow-lg shadow-indigo-600/30 transition-all group z-10"
        >
          {isGenerating ? (
            <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Menyiapkan Misi...</>
          ) : (
            <><Sparkles className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Hasilkan 10 Misi Sekarang</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] relative overflow-hidden flex flex-col h-full">
      <div className="bg-slate-900 p-6 sm:p-8 relative overflow-hidden shrink-0">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h3 className="font-black text-white text-xl sm:text-2xl tracking-tight mb-1 flex items-center gap-2">
              Timeline Eksekusi <span className="px-2 py-0.5 bg-white/10 text-indigo-300 text-[10px] uppercase rounded-md tracking-widest ring-1 ring-white/20 backdrop-blur-sm">Aktif</span>
            </h3>
            <p className="text-sm text-slate-400 font-medium">Selesaikan misi untuk meningkatkan metrik operasional.</p>
          </div>
          <div className="shrink-0 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" /> <span className="text-xs font-bold text-slate-300">Sinkronisasi...</span></>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-xs font-bold text-slate-300">Tersimpan</span></>
            )}
          </div>
        </div>

        <div className="relative z-10">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Progres Fase 1</span>
                <span className="text-xl font-black text-white">{progressPercentage}%</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-700 inset-shadow-sm">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${isAllCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-blue-400'}`}
                />
            </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-4 flex-1">
        {isAllCompleted && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center mb-6"
            >
                <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h4 className="text-emerald-900 font-black text-lg mb-1">Siklus Eksekusi Selesai!</h4>
                <p className="text-emerald-700 text-sm font-medium mb-4">Anda telah menyelesaikan 10 langkah krusial awal. Bersiap untuk fase eskalasi berikutnya.</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                    <Sparkles className="w-4 h-4 mr-2" /> Inisiasi Fase 2 (Segera Hadir)
                </Button>
            </motion.div>
        )}

        <AnimatePresence>
          {checklist.map((item, index) => {
            const isExpanded = expandedId === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={`flex flex-col p-5 sm:p-6 rounded-2xl ring-1 transition-all duration-300 cursor-pointer overflow-hidden ${
                  item.isCompleted 
                    ? 'bg-slate-50 ring-slate-100 opacity-60 grayscale-[0.5]' 
                    : isExpanded
                      ? 'bg-white ring-indigo-300 shadow-xl shadow-indigo-500/10 scale-[1.01] z-10'
                      : 'bg-white ring-slate-200 hover:shadow-md hover:ring-indigo-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={(e) => toggleComplete(item.id, e)}
                    className="mt-0.5 focus:outline-none shrink-0 transition-transform hover:scale-110 active:scale-90"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 drop-shadow-sm" />
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-slate-300 hover:border-indigo-400 transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ring-1 transition-colors shadow-sm ${getTimeframeStyle(item.timeframe, item.isCompleted)}`}>
                        {item.timeframe}
                      </span>
                    </div>
                    
                    <h4 className={`text-base sm:text-[17px] font-black leading-tight transition-all duration-300 mb-1.5 pr-6 ${
                      item.isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
                    }`}>
                      {item.task}
                    </h4>
                    
                    <p className={`text-sm font-medium leading-relaxed transition-all duration-300 ${
                      item.isCompleted ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {item.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && !item.isCompleted && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-slate-100"
                    >
                      {item.contextualTip && (
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex gap-3 mb-4 shadow-sm">
                          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Panduan Ahli</p>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">{item.contextualTip}</p>
                          </div>
                        </div>
                      )}

                      {/* RENDER SUB-TASKS JIKA ADA */}
                      {item.subTasks && item.subTasks.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Langkah Kecil Eksekusi (Micro-Steps)</p>
                           <div className="space-y-3">
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
                                    <span className={`text-sm font-medium leading-snug ${sub.isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                      {sub.text}
                                    </span>
                                </div>
                             ))}
                           </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        {item.searchKeyword && (
                          <Button 
                            onClick={(e) => openYoutubeSearch(item.searchKeyword!, e)}
                            variant="outline" 
                            className="flex-1 bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 h-11 rounded-xl shadow-sm"
                          >
                            <PlayCircle size={16} className="mr-2 text-rose-500" /> Cari Referensi Visual
                          </Button>
                        )}

                        {/* TOMBOL MICRO-AGENT BARU */}
                        {(!item.subTasks || item.subTasks.length === 0) && (
                          <Button 
                            onClick={(e) => handleGenerateSubTasks(item, e)}
                            disabled={isGeneratingSubtask === item.id}
                            variant="outline" 
                            className="flex-1 bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 h-11 rounded-xl shadow-sm"
                          >
                            {isGeneratingSubtask === item.id ? (
                              <><Loader2 size={16} className="mr-2 animate-spin text-indigo-500" /> Memecah Tugas...</>
                            ) : (
                              <><SplitSquareVertical size={16} className="mr-2 text-indigo-500" /> Pecah Sub-Tugas (AI)</>
                            )}
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