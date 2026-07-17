// src/app/components/curation/ActionPlanBuilder.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Sparkles, Target } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface ActionItem {
  id: string;
  task: string;
  description: string;
  timeframe: string;
  isCompleted: boolean;
}

interface ActionPlanBuilderProps {
  assessmentId: string;
  initialData?: ActionItem[];
  aiResult: any; // Mengambil seluruh hasil AI
}

export function ActionPlanBuilder({ assessmentId, initialData, aiResult }: ActionPlanBuilderProps) {
  const [checklist, setChecklist] = useState<ActionItem[]>(initialData || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const generatePlan = httpsCallable(functions, 'generateActionPlanChecklist');
      
      const response = await generatePlan({ 
        assessmentId, 
        aiResult // Kirim seluruh objek untuk dianalisis AI
      });
      
      const data = response.data as { actionPlan: ActionItem[] };
      setChecklist(data.actionPlan);
      toast.success("Timeline 10 Langkah berhasil disusun!");
    } catch (error: any) {
      console.error("Gagal menyusun Action Plan", error);
      toast.error(error.message || "Gagal menyusun Action Plan. Coba lagi nanti.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleComplete = async (id: string) => {
    const updatedChecklist = checklist.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setChecklist(updatedChecklist);
    saveToFirestore(updatedChecklist);
  };

  const saveToFirestore = async (dataToSave: ActionItem[]) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'assessments', assessmentId);
      await updateDoc(docRef, { customActionPlan: dataToSave });
    } catch (error) {
      console.error("Gagal menyimpan progress", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Pewarnaan dinamis berdasarkan tipe waktu
  const getTimeframeStyle = (timeframe: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-slate-200 text-slate-500 ring-slate-300';
    
    const lowerTime = timeframe.toLowerCase();
    if (lowerTime.includes('harian')) return 'bg-emerald-50 text-emerald-600 ring-emerald-200';
    if (lowerTime.includes('mingguan')) return 'bg-sky-50 text-sky-600 ring-sky-200';
    if (lowerTime.includes('bulanan')) return 'bg-indigo-50 text-indigo-600 ring-indigo-200';
    
    return 'bg-slate-50 text-slate-600 ring-slate-200'; // Default
  };

  if (checklist.length === 0) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-[2rem] ring-1 ring-slate-200 text-center shadow-sm flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-indigo-100 shadow-inner">
          <Target className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Cetak Biru Eksekusi</h3>
        <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto leading-relaxed">
          Omni AI akan merangkum seluruh temuan SWOT, risiko, dan rekomendasi menjadi <strong className="text-indigo-600">10 Langkah Strategis</strong> (Harian, Mingguan, Bulanan) yang siap dieksekusi.
        </p>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating} 
          className="bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl h-14 px-8 text-base shadow-xl shadow-slate-900/10 transition-all group"
        >
          {isGenerating ? (
            <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Menyatukan Berbagai Dimensi...</>
          ) : (
            <><Sparkles className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform text-indigo-400" /> Rumuskan 10 Langkah Sekarang</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] ring-1 ring-slate-200 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
        <div>
          <h3 className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight mb-1 flex items-center gap-2">
            Timeline 10 Langkah <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] uppercase rounded-md tracking-widest ring-1 ring-indigo-200">Kustom</span>
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Lacak progres Anda. Centang langkah yang telah diselesaikan untuk melihat perkembangannya.
          </p>
        </div>
        
        <div className="shrink-0 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-inner">
          {isSaving ? (
            <><Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" /> <span className="text-xs font-bold text-slate-500">Sinkronisasi...</span></>
          ) : (
            <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> <span className="text-xs font-bold text-slate-500">Tersimpan</span></>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {checklist.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }} // Efek muncul berurutan (cascade)
              className={`flex items-start gap-4 p-5 sm:p-6 rounded-2xl ring-1 transition-all duration-300 ${
                item.isCompleted 
                  ? 'bg-slate-50 ring-slate-200 opacity-60' 
                  : 'bg-white ring-slate-200 hover:shadow-md hover:shadow-slate-200/50 hover:ring-indigo-200'
              }`}
            >
              <button 
                onClick={() => toggleComplete(item.id)} 
                className="mt-0.5 focus:outline-none shrink-0 transition-transform active:scale-90"
              >
                {item.isCompleted ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 drop-shadow-sm" />
                ) : (
                  <Circle className="w-7 h-7 text-slate-300 hover:text-indigo-500 transition-colors" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ring-1 transition-colors shadow-sm ${getTimeframeStyle(item.timeframe, item.isCompleted)}`}>
                    {item.timeframe}
                  </span>
                </div>
                
                <h4 className={`text-base sm:text-[17px] font-black leading-tight transition-all duration-300 mb-1.5 ${
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}