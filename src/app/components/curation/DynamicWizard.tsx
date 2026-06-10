// src/components/curation/DynamicWizard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight, Sparkles, Check, Trash2, ClipboardCheck } from 'lucide-react';
import { FormTemplate } from '@/types/curation';
import { DynamicField } from './DynamicField';
import { ReviewAndConfirm } from './ReviewAndConfirm';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface DynamicWizardProps {
  template: FormTemplate;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export function DynamicWizard({ template, onComplete, onBack }: DynamicWizardProps) {
  const CACHE_KEY = `curation_draft_dynamic_${template.id}`;
  const totalSteps = template.steps.length;

  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [formData, setFormData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {};
  });

  // Render Icon Dinamis untuk header Form
  const currentStepData = template.steps[step - 1];
  const StepIcon = currentStepData.icon && (LucideIcons as any)[currentStepData.icon] 
                   ? (LucideIcons as any)[currentStepData.icon] 
                   : Sparkles;

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

  // Fungsi tunggal untuk handle perubahan data dari DynamicField
  const handleChange = (id: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleClearForm = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan semua isian form?')) {
      setFormData({});
      if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
      setStep(1);
      setIsReviewMode(false);
    }
  };

  const isStepValid = () => {
    const requiredFields = currentStepData.fields.filter(f => f.required);
    for (const field of requiredFields) {
      const val = formData[field.id];
      if (!val || (Array.isArray(val) && val.length === 0)) return false;
    }
    return true;
  };

  // Variants Animasi
  const formVariants: Variants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, x: -30, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  if (isReviewMode) {
    return (
      <div className="flex-1 w-full flex flex-col justify-center max-w-[1920px] mx-auto min-h-[calc(100vh-5.5rem)] bg-[#FAFAFA] p-4 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tahap Akhir</h2>
            <p className="text-slate-500 mt-2">Lakukan penilaian mandiri sebelum data dikirim ke sistem AI.</p>
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

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row max-w-[1920px] mx-auto min-h-[calc(100vh-5.5rem)] relative pb-24 lg:pb-0 bg-white">
      
      {/* PANEL KIRI: PROGRESS & INFO */}
      <div className="w-full lg:w-[380px] xl:w-[420px] lg:border-r border-slate-200 bg-white/90 lg:bg-[#FAFAFA] backdrop-blur-xl lg:h-[calc(100vh-5.5rem)] sticky top-0 z-40 lg:z-30 p-4 lg:p-10 xl:p-12 flex flex-col justify-between overflow-y-auto custom-scrollbar border-b lg:border-b-0">
        
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between w-full">
          <button onClick={() => step > 1 ? setStep(step - 1) : onBack()} className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 active:scale-95 transition-transform">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 px-4">
             <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
               <motion.div 
                 className="bg-indigo-600 h-full rounded-full" 
                 initial={{ width: 0 }}
                 animate={{ width: `${(step / totalSteps) * 100}%` }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
               />
             </div>
             <p className="text-[10px] font-black text-center text-slate-400 uppercase tracking-widest mt-1.5">Langkah {step} dari {totalSteps}</p>
          </div>
          <div className="w-[24px]">
            <AnimatePresence>
              {saveStatus && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Check size={18} className="text-emerald-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Sidebar Content */}
        <div className="hidden lg:block">
          <button onClick={() => step > 1 ? setStep(step - 1) : onBack()} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8 bg-white lg:bg-transparent px-4 py-2 lg:px-0 rounded-full lg:rounded-none shadow-sm lg:shadow-none border border-slate-200 lg:border-transparent w-fit">
            <ChevronLeft size={18} /> Kembali
          </button>

          <motion.h3 
            key={template.trackName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2"
          >
            {template.trackName} <br/><span className="text-indigo-600 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">Assessment</span>
          </motion.h3>
          
          <div className="mt-12 space-y-4">
             <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Progress Pengisian</div>
             <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
               <motion.div 
                 className="bg-indigo-600 h-full rounded-full" 
                 initial={{ width: 0 }}
                 animate={{ width: `${(step / totalSteps) * 100}%` }}
                 transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
               />
             </div>
             <p className="text-sm font-bold text-slate-600">Langkah <span className="text-indigo-600 text-lg">{step}</span> dari {totalSteps}</p>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-12 p-6 xl:p-8 bg-indigo-50/50 rounded-3xl ring-1 ring-indigo-100/50"
          >
             <Sparkles className="text-indigo-500 mb-4" size={24}/>
             <h4 className="font-black text-indigo-900 mb-2">Informasi Form</h4>
             <p className="text-sm text-indigo-800/80 font-medium leading-relaxed">
               Data Anda disimpan secara lokal. Pastikan kolom dengan tanda (*) diisi agar bisa melanjutkan.
             </p>
          </motion.div>
        </div>

        <div className="hidden lg:flex items-center justify-between pt-8 border-t border-slate-200 mt-12">
          <button onClick={handleClearForm} className="text-xs font-bold text-rose-500 flex items-center gap-1.5 hover:underline bg-rose-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
            <Trash2 size={14}/> Kosongkan
          </button>
          
          <AnimatePresence mode="wait">
            {saveStatus && (
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-2 py-1.5 rounded-lg"
              >
                <Check size={12}/> {saveStatus}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* PANEL KANAN: AREA INPUT DINAMIS */}
      <div className="flex-1 w-full bg-white px-5 py-8 lg:p-12 xl:p-20 relative overflow-x-hidden">
         <div className="max-w-4xl mx-auto lg:mx-0">
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={step}
                variants={formVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative z-10"
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 mb-6 sm:mb-8 tracking-tight border-b border-slate-100 pb-4 sm:pb-6">
                  <div className="p-2.5 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100/50">
                    <StepIcon className="text-indigo-600 w-6 h-6 sm:w-8 sm:h-8 shrink-0"/> 
                  </div>
                  {currentStepData.title}
                </h2>
                {currentStepData.description && (
                  <p className="text-slate-500 text-sm sm:text-base mb-8 leading-relaxed max-w-2xl">
                    {currentStepData.description}
                  </p>
                )}

                {/* RENDER FIELDS BERDASARKAN JSON SCHEMA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
                  {currentStepData.fields.map((field, idx) => (
                    <motion.div 
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={field.type === 'textarea' || field.type === 'file' ? 'lg:col-span-2' : ''}
                    >
                      <DynamicField 
                        field={field}
                        value={formData[field.id]}
                        onChange={(val) => handleChange(field.id, val)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* ACTION BAR BAWAH */}
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/70 backdrop-blur-2xl border-t border-slate-200/50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-50 lg:static lg:bg-transparent lg:border-t lg:border-slate-100 lg:shadow-none lg:p-0 lg:mt-16 lg:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
               <p className="text-xs text-slate-400 font-medium hidden sm:block">
                 Pastikan kolom bertanda <span className="text-rose-500">*</span> terisi.
               </p>
               <button 
                  onClick={() => {
                    if (step < totalSteps) {
                      setStep(step + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      setIsReviewMode(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }} 
                  disabled={!isStepValid()}
                  className="w-full sm:w-auto py-4 px-8 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 text-base active:scale-[0.98] disabled:opacity-50 group"
               >
                  {step < totalSteps ? (
                    <>Langkah Selanjutnya <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                  ) : (
                    <>Tinjau & Konfirmasi <ClipboardCheck size={18} className="group-hover:scale-110 transition-transform" /></>
                  )}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}