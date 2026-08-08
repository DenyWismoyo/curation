// src/components/curation/CurationDashboard.tsx
'use client';

import React, { useState } from 'react';
import { 
  RotateCcw, Loader2, ChevronDown, Lock, ShoppingCart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CurationFormData, AIResult } from '@/features/assessment/types/assessment.types';
import { AiPromptConfig } from '@/features/assessment/types/assessment.types';
import { PublicExportPDF } from './pdf/PublicExportPDF';
import { UniversalAssessmentView } from '@/features/assessment/components/shared/UniversalAssessmentView';
import { AdaptiveAssessmentView } from '@/features/assessment/components/shared/AdaptiveAssessmentView';
import { DocumentPresets } from '@/config/templates/documentPromptTemplates';
import { resolveAssessmentOutputMode } from '@/features/assessment/utils/assessmentOutputMode';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/firebase';

// IMPORT CUSTOM ICONS
import { AiSparkIcon, DocExportIcon } from '@/components/icon';

interface Props {
  assessmentId?: string;
  trackType: string;
  formData: CurationFormData | any;
  aiResult: AIResult | any;
  aiPromptConfig?: AiPromptConfig | any;
  programName?: string;
  documentGenerationQuota?: number;
  hasPaidForDocument?: boolean;       
  allowedDocumentTemplates?: string[]; 
  onRestart: () => void;
}

export function CurationDashboard({ 
  assessmentId, trackType, formData, aiResult, aiPromptConfig, programName, 
  documentGenerationQuota = 0, hasPaidForDocument = false, allowedDocumentTemplates, 
  onRestart 
}: Props) {
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Logika tetap dipertahankan untuk kemudahan rilis di masa depan
  const filteredDocumentPresets = allowedDocumentTemplates && allowedDocumentTemplates.length > 0 
    ? DocumentPresets.filter(preset => allowedDocumentTemplates.includes(preset.id))
    : DocumentPresets;

  const canGenerateDocument = documentGenerationQuota > 0 || hasPaidForDocument;

  const handleGenerateWordDraft = async (presetId: string, docTitle: string, promptTemplate: string) => {
    if (!canGenerateDocument) {
      alert("Kuota gratis Anda habis. Fitur ini memerlukan pembayaran mandiri untuk diakses kembali.");
      return;
    }

    if (!assessmentId) return alert("ID Laporan tidak valid.");

    setIsGeneratingDoc(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const generateDocFn = httpsCallable(functions, 'generateDocumentDraft');
      
      const response = await generateDocFn({ assessmentId, docTitle, promptTemplate });
      const data = response.data as { htmlContent: string };
      
      const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${docTitle}</title>
        <style>
          body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
          h1 { font-size: 18pt; color: #1e1b4b; border-bottom: 2pt solid #1e1b4b; padding-bottom: 6pt; margin-bottom: 12pt; }
          h2 { font-size: 14pt; color: #312e81; margin-top: 18pt; margin-bottom: 8pt; }
          h3 { font-size: 12pt; color: #4338ca; font-weight: bold; margin-top: 12pt; }
        </style></head><body>`;
      
      const postHtml = `</body></html>`;
      const fullHtml = preHtml + data.htmlContent + postHtml;

      const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      
      const safeEntityName = (formData?.namaUsaha || 'Entitas').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Draft_${docTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}_${safeEntityName}.doc`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      alert(error.message || "Gagal membuat dokumen draf. Periksa koneksi Anda.");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const outputMode = resolveAssessmentOutputMode(aiPromptConfig, aiResult, formData);
  const isAdaptive = outputMode === 'adaptive';

  const resolvedAiResult = isAdaptive ? { ...aiResult, isAdaptiveAssessment: true } : aiResult;

  const headerActionsContent = (
    <>
      <Button variant="ghost" onClick={onRestart} className="gap-2 text-muted-foreground hover:text-foreground active:scale-95 w-full sm:w-auto">
        <RotateCcw className="h-4 w-4" /> Mulai Ulang
      </Button>
      
      <div className="flex w-full sm:w-auto gap-3 flex-col lg:flex-row">
        {/* TOMBOL AI AUTO-DRAFT WORD (DINONAKTIFKAN SEMENTARA - TAHAP PENGEMBANGAN) */}
        <Button 
          disabled
          className="gap-2 font-bold rounded-xl h-10 px-4 shadow-inner w-full sm:w-auto text-slate-400 bg-slate-200/60 border border-border cursor-not-allowed"
        >
          <AiSparkIcon size={16} className="grayscale opacity-50" />
          AI Auto-Draft (Tahap Pengembangan)
        </Button>
        <PublicExportPDF 
          assessmentId={assessmentId || ''} 
          trackType={trackType} 
          formData={formData} 
          aiResult={resolvedAiResult} 
        />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted text-muted-foreground py-8 px-4 sm:py-12 sm:px-6 lg:px-12 animate-in fade-in duration-700">
      {isAdaptive ? (
        <AdaptiveAssessmentView
          formData={formData}
          aiResult={resolvedAiResult}
          assessmentId={assessmentId}
          headerActions={headerActionsContent}
          aiPromptConfig={aiPromptConfig}
        />
      ) : (
        <UniversalAssessmentView
          mode="dashboard"
          assessmentId={assessmentId} // KUNCI PERBAIKAN: Melemparkan ID ke Universal View
          trackType={trackType}
          programName={programName}
          formData={formData}
          aiResult={resolvedAiResult}
          headerActions={headerActionsContent}
        />
      )}
    </div>
  );
}
