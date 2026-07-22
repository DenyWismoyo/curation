// src/app/components/curation/DynamicWizard.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ArrowRight, Check, Trash2, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { FormTemplate, FormField, FormStep } from '@/types/curation';
import { DynamicField } from './DynamicField';
import { ReviewAndConfirm } from './ReviewAndConfirm';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { toast } from 'sonner';

// IMPORT CUSTOM ICONS
import { AiSparkIcon, DocExportIcon, BrainIcon } from '@/types';

const renderMarkdownText = (str: string) => {
  if (typeof str !== 'string') return str;
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-indigo-600">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index} className="font-bold text-indigo-600">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
};

export interface DynamicWizardProps {
  template: FormTemplate;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export function DynamicWizard({ template, onComplete, onBack }: DynamicWizardProps) {
  const CACHE_KEY = `curation_draft_dynamic_${template.id}`;
  
  // STATE MENGGUNAKAN LOCAL STEPS (Agar bisa diinjeksi pertanyaan baru oleh AI)
  const [localSteps, setLocalSteps] = useState<FormStep[]>(template.steps);
  const totalSteps = localSteps.length;
  
  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // State khusus saat AI sedang men-generate pertanyaan untuk step berikutnya
  const [isGeneratingStep, setIsGeneratingStep] = useState(false);

  // Ref untuk mengatur auto-scroll ke atas setiap ganti step
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {};
  });

  const currentStepData = localSteps[step - 1];
  const StepIcon = currentStepData?.icon && (LucideIcons as any)[currentStepData.icon] 
                      ? (LucideIcons as any)[currentStepData.icon] 
                      : AiSparkIcon;

  // Auto-Save ke LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataToSave: any = {};
      for (const key in formData) {
        if (formData[key] !== null && formData[key] !== undefined) {
          if (typeof formData[key] !== 'object' || Array.isArray(formData[key])) {
            dataToSave[key] = formData[key];
          }
        }
      }
      if (Object.keys(dataToSave).length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));
        setSaveStatus('Tersimpan');
        const timeout = setTimeout(() => setSaveStatus(''), 2500);
        return () => clearTimeout(timeout);
      }
    }
  }, [formData, CACHE_KEY]);

  const handleChange = (id: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleClearForm = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan semua isian form dan mengulang dari awal?')) {
      setFormData({});
      if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
      setStep(1);
      setLocalSteps(template.steps); // Reset steps ke awal template
      setIsReviewMode(false);
    }
  };

  const isFieldVisible = (field: FormField) => {
    if (!field.showIf) return true;
    const targetValue = formData[field.showIf.fieldId];
    if (Array.isArray(targetValue)) {
      return targetValue.includes(field.showIf.equals);
    }
    return targetValue === field.showIf.equals;
  };

  const isStepValid = () => {
    if (!currentStepData || !currentStepData.fields) return false;
    const visibleFields = currentStepData.fields.filter(isFieldVisible);
    const requiredFields = visibleFields.filter(f => f.required);
    for (const field of requiredFields) {
      const val = formData[field.id];
      if (!val || (Array.isArray(val) && val.length === 0)) return false;
    }
    return true;
  };

  // LOGIKA NAVIGASI & ADAPTIVE FORM INJECTION
  const handleNext = async () => {
    if (step < totalSteps) {
      const nextStepIndex = step; // Index array base-0
      const nextStepData = localSteps[nextStepIndex];

      // Jika step berikutnya kosong (Mode Adaptive), minta AI meracik pertanyaan
      if (!nextStepData.fields || nextStepData.fields.length === 0) {
        setIsGeneratingStep(true);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        
        try {
          const functions = getFunctions(app, 'asia-southeast2');
          const generateQuestions = httpsCallable(functions, 'generateAdaptiveQuestions');
          
          const response = await generateQuestions({ 
            formData, 
            trackName: template.trackName, 
            aiPromptConfig: template.aiPromptConfig,
            stepTitle: nextStepData.title,
            stepDescription: nextStepData.description
          });
          
          const data = response.data as { fields: FormField[] };
          
          if (data.fields && data.fields.length > 0) {
            // Suntikkan field baru ke step tersebut
            const updatedSteps = [...localSteps];
            updatedSteps[nextStepIndex].fields = data.fields;
            setLocalSteps(updatedSteps);
            setStep(step + 1);
          } else {
             // Fallback jika AI gagal membuat pertanyaan
             setStep(step + 1);
          }
        } catch (error: any) {
          console.error("AI Adaptive Generation Error:", error);
          toast.error("Gagal menyinkronkan pertanyaan AI. Silakan coba lagi atau lewati.", { duration: 4000 });
          setStep(step + 1);
        } finally {
          setIsGeneratingStep(false);
        }
      } else {
        // Mode Standar (Step sudah ada isi fields-nya)
        setStep(step + 1);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Form Selesai -> Lanjut ke Review
      setIsReviewMode(true);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formVariants: Variants = {
    enter: { opacity: 0, y: 30, filter: 'blur(8px)' },
    center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -30, filter: 'blur(8px)', transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  // ================= TAMPILAN REVIEW AKHIR =================
  if (isReviewMode) {
    return (
      <div className="w-full flex flex-col justify-center min-h-[100dvh] bg-[#FAFAFA] py-12 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tahap Akhir</h2>
            <p className="text-slate-500 mt-2 font-medium">Lakukan penilaian mandiri sebelum data dikirim ke mesin komputasi AI.</p>
          </div>
          <ReviewAndConfirm 
            answers={formData}
            onBack={() => setIsReviewMode(false)}
            onSubmit={(assessmentData) => {
              const finalPayload = { ...formData, ...assessmentData };
              onComplete(finalPayload);
            }}
          />
        </motion.div>
      </div>
    );
  }

  // ================= TAMPILAN WIZARD (FOCUS MODE) =================
  return (
    // Container utama mengunci layar (100dvh) agar tidak ikut scroll, hanya bagian tengah yang scroll
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAFA] overflow-hidden">
      
      {/* ================= HEADER (FIXED TOP) ================= */}
      <header className="bg-white border-b border-slate-200 shrink-0 relative z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Kiri: Tombol Kembali */}
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onBack()} 
            disabled={isGeneratingStep}
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors w-20 sm:w-28 disabled:opacity-50"
          >
            <ChevronLeft size={20} /> <span className="text-sm font-bold hidden sm:block">Kembali</span>
          </button>
          
          {/* Tengah: Judul Assessment & Judul Step */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2 text-center pt-1">
            <h1 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest truncate w-full">
              {template.trackName}
            </h1>
            {!isGeneratingStep && currentStepData && (
              <motion.div 
                key={`header-title-${step}`} 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex items-center justify-center gap-1.5 mt-1"
              >
                <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                <h2 className="text-[11px] sm:text-sm font-bold text-indigo-600 truncate max-w-[200px] sm:max-w-md">
                  {renderMarkdownText(currentStepData.title)}
                </h2>
              </motion.div>
            )}
          </div>

          {/* Kanan: Kosongkan & Status Auto-Save */}
          <div className="flex items-center justify-end gap-3 w-20 sm:w-28">
            <AnimatePresence mode="wait">
              {saveStatus && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden sm:flex text-[10px] text-emerald-600 font-bold items-center gap-1">
                  <Check size={12}/> {saveStatus}
                </motion.span>
              )}
            </AnimatePresence>
            <button 
              onClick={handleClearForm} 
              disabled={isGeneratingStep}
              className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Kosongkan Form"
            >
              <Trash2 size={14} /> <span className="hidden sm:block">Kosongkan</span>
            </button>
          </div>
        </div>
        
        {/* Progress Line */}
        <div className="w-full h-1 bg-slate-100 absolute bottom-0 left-0">
          <motion.div 
            className="h-full bg-indigo-600 rounded-r-full" 
            initial={{ width: 0 }} 
            animate={{ width: `${(step / totalSteps) * 100}%` }} 
            transition={{ duration: 0.5, ease: "easeOut" }} 
          />
        </div>
      </header>

      {/* ================= MAIN CONTENT (SCROLLABLE) ================= */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
          
          <AnimatePresence mode="wait">
            {isGeneratingStep ? (
              // LAYAR LOADING ADAPTIVE AI
              <motion.div key="ai-loading" variants={formVariants} initial="enter" animate="center" exit="exit" className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <motion.div 
                    animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-full"
                  ></motion.div>
                  <BrainIcon size={40} className="text-indigo-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Meracik Formulir Adaptif...</h3>
                  <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                    Sistem kami sedang membaca jawaban Anda di langkah sebelumnya dan menyusun pertanyaan khusus (tailor-made) untuk langkah berikutnya.
                  </p>
                </div>
              </motion.div>
            ) : (
              // LAYAR PERTANYAAN
              <motion.div key={`step-${step}`} variants={formVariants} initial="enter" animate="center" exit="exit">
                
                {/* Deskripsi Step Jika Ada */}
                {currentStepData?.description && (
                  <div className="mb-6 bg-indigo-50/50 p-4 rounded-2xl ring-1 ring-indigo-100 text-sm font-medium text-indigo-900 text-center shadow-sm">
                    {currentStepData.description}
                  </div>
                )}
                
                {/* Loop Rendering Form Fields */}
                <div className="space-y-6 sm:space-y-8 pt-2">
                  {!currentStepData?.fields || currentStepData.fields.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-medium italic">Seksi ini belum memiliki pertanyaan. Lanjutkan ke langkah berikutnya.</div>
                  ) : (
                    currentStepData.fields.filter(isFieldVisible).map((field, idx) => (
                      <motion.div 
                        key={field.id} 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }} 
                        className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:ring-indigo-200 hover:shadow-md"
                      >
                        <DynamicField field={field} value={formData[field.id]} onChange={(val) => handleChange(field.id, val)} />
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ================= FOOTER (FIXED BOTTOM) ================= */}
      {!isGeneratingStep && (
        <footer className="bg-white border-t border-slate-200 shrink-0 z-20 relative shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-4">
            
            {/* Kiri: Indikator Langkah */}
            <div className="text-sm font-bold text-slate-500 flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">Progres</span>
              <div>
                <span className="text-indigo-600 font-black text-xl sm:text-2xl">{step}</span> <span className="text-xs sm:text-sm">/ {totalSteps}</span>
              </div>
            </div>
            
            {/* Kanan: Aksi Selanjutnya */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {!isStepValid() && currentStepData?.fields?.length > 0 && (
                <span className="hidden sm:flex text-[10px] font-bold text-amber-600 items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <AlertTriangle size={14} /> Lengkapi Pertanyaan Wajib (*)
                </span>
              )}
              <Button 
                onClick={handleNext} 
                disabled={!isStepValid() && currentStepData?.fields?.length > 0}
                className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 rounded-xl sm:rounded-2xl bg-slate-900 text-white font-bold text-sm sm:text-base hover:bg-indigo-600 shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step < totalSteps ? (
                  <>Selanjutnya <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                ) : (
                  <>Tinjau Data <DocExportIcon size={18} className="group-hover:scale-110 transition-transform" /></>
                )}
              </Button>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}