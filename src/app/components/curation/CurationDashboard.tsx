// src/components/curation/CurationDashboard.tsx
'use client';

import React, { useState } from 'react';
import { 
  RotateCcw, Loader2, ChevronDown, Lock, ShoppingCart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CurationFormData, AIResult } from '@/types/curation';
import { PublicExportPDF } from './PublicExportPDF';
import { UniversalAssessmentView } from '@/app/components/shared/UniversalAssessmentView';
import { DocumentPresets } from '@/data/documentPromptTemplates'; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

// IMPORT CUSTOM ICONS
import { AiSparkIcon, DocExportIcon } from '@/types';

interface Props {
  assessmentId?: string;
  trackType: string;
  formData: CurationFormData | any;
  aiResult: AIResult | any;
  programName?: string;
  documentGenerationQuota?: number;
  hasPaidForDocument?: boolean;     
  allowedDocumentTemplates?: string[]; 
  onRestart: () => void;
}

export function CurationDashboard({ 
  assessmentId, trackType, formData, aiResult, programName, 
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

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-12 animate-in fade-in duration-700">
      <UniversalAssessmentView
        mode="dashboard"
        trackType={trackType}
        programName={programName}
        formData={formData}
        aiResult={aiResult}
        headerActions={
          <>
            <Button variant="ghost" onClick={onRestart} className="gap-2 text-slate-500 hover:text-slate-900 active:scale-95 w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" /> Mulai Ulang
            </Button>
            
            <div className="flex w-full sm:w-auto gap-3 flex-col lg:flex-row">
              
              {/* TOMBOL AI AUTO-DRAFT WORD (DINONAKTIFKAN SEMENTARA - TAHAP PENGEMBANGAN) */}
              <Button 
                disabled
                className="gap-2 font-bold rounded-xl h-10 px-4 shadow-inner w-full sm:w-auto text-slate-400 bg-slate-200/60 border border-slate-200 cursor-not-allowed"
              >
                <AiSparkIcon size={16} className="grayscale opacity-50" />
                AI Auto-Draft (Tahap Pengembangan)
              </Button>

              {/* KODE ASLI DROPDOWN AI AUTO-DRAFT (DISIMPAN UNTUK RILIS NANTI) 
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={isGeneratingDoc} className={`gap-2 font-bold rounded-xl h-10 px-4 shadow-sm w-full sm:w-auto text-white ${canGenerateDocument ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                    {isGeneratingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : canGenerateDocument ? <AiSparkIcon size={16} /> : <ShoppingCart className="w-4 h-4" />}
                    {isGeneratingDoc ? 'Sedang Menulis...' : canGenerateDocument ? (documentGenerationQuota > 0 ? `AI Auto-Draft (${documentGenerationQuota} Kuota)` : 'AI Auto-Draft Word') : 'Beli Akses Dokumen'}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-72 rounded-2xl p-2 bg-white shadow-xl border border-slate-200" align="end">
                  <div className="px-2 py-1.5 mb-1 flex justify-between items-center border-b border-slate-100 pb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Format Draf (Word)</p>
                    {!canGenerateDocument && <Lock className="w-3 h-3 text-amber-500"/>}
                  </div>
                  
                  {filteredDocumentPresets.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500 italic">Tidak ada dokumen yang diizinkan untuk program ini.</div>
                  ) : (
                    filteredDocumentPresets.map((preset) => (
                      <DropdownMenuItem 
                        key={preset.id}
                        onClick={() => handleGenerateWordDraft(preset.id, preset.name, preset.prompt)}
                        className="cursor-pointer font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl py-3 px-3 flex items-start gap-3 mt-1"
                      >
                        <div className="mt-0.5 shrink-0 w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                          <DocExportIcon size={16} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span>{preset.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 opacity-80 line-clamp-1">{preset.prompt.substring(0, 50)}...</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              */}

              <PublicExportPDF 
                assessmentId={assessmentId || ''} 
                trackType={trackType} 
                formData={formData} 
                aiResult={aiResult} 
              />
            </div>
          </>
        }
      />
    </div>
  );
}