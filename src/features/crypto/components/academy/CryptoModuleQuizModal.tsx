import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { DynamicWizard } from '@/features/assessment/components/wizard/DynamicWizard';
import { FormTemplate } from '@/features/assessment/types/assessment.types';
import { GlassPanel } from '@omnifit-ui/components';

interface CryptoModuleQuizModalProps {
  templateId: string;
  moduleId: string;
  moduleTitle: string;
  moduleLevel: string;
  onComplete: (result: any) => void;
  onClose: () => void;
}

export function CryptoModuleQuizModal({
  templateId,
  moduleId,
  moduleTitle,
  moduleLevel,
  onComplete,
  onClose
}: CryptoModuleQuizModalProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const snap = await getDoc(doc(db, 'assessmentTemplates', templateId));
        if (snap.exists()) {
          // Force formMode to 'standard' for module quizzes if it isn't already
          const data = snap.data() as FormTemplate;
          setTemplate({
            ...data,
            id: snap.id,
            formMode: 'standard', // Ensure it runs step-by-step non-adaptively by default
          });
        } else {
          console.error("Template not found");
        }
      } catch (error) {
        console.error("Error fetching template", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (templateId) fetchTemplate();
  }, [templateId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50">
          <div>
            <h2 className="text-lg font-black text-foreground">Kuis Modul: {moduleTitle}</h2>
            <p className="text-xs font-bold text-slate-400">{moduleLevel}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-secondary text-secondary-foreground dark:hover:bg-secondary text-secondary-foreground rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-background text-foreground custom-scrollbar">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-400">Memuat pertanyaan kuis...</p>
            </div>
          ) : template ? (
            <div className="p-6">
              <DynamicWizard 
                template={template}
                onComplete={onComplete}
                onBack={onClose} // Optional, allows backing out
              />
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center">
              <p className="text-sm font-bold text-rose-400">Gagal memuat kuis. Template tidak ditemukan.</p>
              <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground text-white rounded-lg text-sm font-bold"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
