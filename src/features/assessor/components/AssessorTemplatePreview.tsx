// src/app/components/assessor/AssessorTemplatePreview.tsx
'use client';

import React from 'react';
import { X, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DynamicWizard } from '@/features/assessment/components/wizard/DynamicWizard';
import { FormTemplate } from '@/features/assessment/types/assessment.types';

interface AssessorTemplatePreviewProps {
  template: FormTemplate;
  onClose: () => void;
}

export function AssessorTemplatePreview({ template, onClose }: AssessorTemplatePreviewProps) {
  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-muted text-muted-foreground animate-in fade-in duration-300">
      
      {/* HEADER PREVIEW */}
      <div className="card-solid px-6 py-4 border-b border-border flex justify-between items-center shadow-sm shrink-0 relative z-50">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Preview Mode: {template.trackName}
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Ini adalah simulasi. Data yang Anda isi di sini tidak akan disimpan ke database maupun mengurangi kuota.
          </p>
        </div>
        <Button 
          onClick={onClose} 
          variant="ghost" 
          className="h-10 px-4 rounded-xl text-muted-foreground hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-500/10 font-bold gap-2 ring-1 ring-border"
        >
          <X className="w-5 h-5" /> Tutup Preview
        </Button>
      </div>

      {/* AREA FORM PREVIEW (Memanggil Engine Asli) */}
      <div className="flex-1 overflow-y-auto relative bg-background text-foreground">
        <DynamicWizard
          template={template}
          onBack={onClose}
          onComplete={(data) => {
            // Mencegah form benar-benar disubmit ke server
            alert("Simulasi Selesai!\n\nKarena ini adalah mode Preview, form tidak akan dikirim ke AI.\n\nStruktur JSON Output Anda:\n" + JSON.stringify(data, null, 2));
            onClose();
          }}
        />
      </div>
      
    </div>
  );
}