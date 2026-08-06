// src/app/components/admin/AdminTemplatePreview.tsx
'use client';

import React, { useState } from 'react';
import { FormTemplate } from '@/features/assessment/types/assessment.types';
import { DynamicField } from '@/features/assessment/components/wizard/DynamicField'; 
import { ChevronLeft, ArrowRight, Eye, Bot, LayoutGrid, Download, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// Import standar @react-pdf/renderer
import { pdf } from '@react-pdf/renderer';
import { AIPromptBlueprintPDF } from '@/features/assessment/components/pdf/AIPromptBlueprintPDF';
import { TemplateQuestionsPDF } from '@/features/assessment/components/pdf/TemplateQuestionsPDF';

export function AdminTemplatePreview({ template }: { template: FormTemplate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [dummyData, setDummyData] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'form' | 'ai'>('form');
  
  // State Loading untuk masing-masing fungsi Export PDF
  const [isExportingAI, setIsExportingAI] = useState(false);
  const [isExportingForm, setIsExportingForm] = useState(false);

  const totalSteps = template.steps.length;
  const currentStepData = template.steps[currentStep - 1];
  
  // Bypass strict type untuk konfigurasi AI
  const ai: any = template.aiPromptConfig || {};

  const handleDummyChange = (id: string, value: any) => {
    setDummyData(prev => ({ ...prev, [id]: value }));
  };

  const isStepValid = () => {
    if (!currentStepData) return false;
    const requiredFields = currentStepData.fields.filter(f => f.required);
    for (const field of requiredFields) {
      const val = dummyData[field.id];
      if (!val || (Array.isArray(val) && val.length === 0)) return false;
    }
    return true;
  };

  // ========================================================
  // FUNGSI 1: EXPORT PDF STRUKTUR FORM
  // ========================================================
  const handleExportFormPDF = async () => {
    if (isExportingForm) return;
    setIsExportingForm(true);

    try {
      const doc = <TemplateQuestionsPDF template={template} />;
      const asPdf = pdf();
      asPdf.updateContainer(doc);
      
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const safeName = template.trackName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      link.download = `Struktur_Form_${safeName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Dokumen Struktur Form berhasil diunduh!");
    } catch (error) {
      console.error("Gagal merender PDF Form:", error);
      toast.error("Gagal mengunduh dokumen Struktur Form.");
    } finally {
      setIsExportingForm(false);
    }
  };

  // ========================================================
  // FUNGSI 2: EXPORT PDF BLUEPRINT AI
  // ========================================================
  const handleExportAIPDF = async () => {
    if (isExportingAI) return;
    setIsExportingAI(true);

    try {
      const doc = <AIPromptBlueprintPDF template={template} />;
      const asPdf = pdf();
      asPdf.updateContainer(doc);
      
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const safeName = template.trackName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      link.download = `AI_Blueprint_${safeName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF Blueprint AI berhasil diunduh!");
    } catch (error) {
      console.error("Gagal merender PDF Blueprint AI:", error);
      toast.error("Gagal mengunduh dokumen Blueprint AI.");
    } finally {
      setIsExportingAI(false);
    }
  };

  if (!currentStepData && template.steps.length > 0) {
    setCurrentStep(1);
    return null;
  }

  return (
    <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-indigo-600" /> Mode Preview
          </h3>
          <p className="text-xs text-slate-500 font-medium">Uji coba interaksi form dan cek parameter AI.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            variant={viewMode === 'form' ? 'default' : 'outline'} 
            onClick={() => setViewMode('form')}
            className={`justify-start rounded-2xl h-11 cursor-pointer transition-all ${viewMode === 'form' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600'}`}
          >
            <LayoutGrid className="w-4 h-4 mr-3 opacity-70" /> Simulasi Formulir
          </Button>
          <Button 
            variant={viewMode === 'ai' ? 'default' : 'outline'} 
            onClick={() => setViewMode('ai')}
            className={`justify-start rounded-2xl h-11 cursor-pointer transition-all ${viewMode === 'ai' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600'}`}
          >
            <Bot className="w-4 h-4 mr-3 opacity-70" /> Ringkasan Prompt AI
          </Button>
        </div>

        {/* Hanya tampilkan Navigasi Step jika berada di mode Formulir */}
        {viewMode === 'form' && totalSteps > 0 && (
          <div className="mt-auto pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-widest text-[10px]">Progres Form</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2 bg-slate-200" />
            <div className="flex items-center justify-between gap-2 bg-white ring-1 ring-slate-200 rounded-xl p-1 shadow-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))} disabled={currentStep === 1} className="px-3 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft className="w-4 h-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Langkah Sebelumnya</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-xs font-black text-slate-700">{currentStep} / {totalSteps}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))} disabled={currentStep === totalSteps} className="px-3 hover:bg-slate-100 rounded-lg text-slate-500"><ArrowRight className="w-4 h-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Langkah Berikutnya</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto bg-slate-50/50 custom-scrollbar relative">
        
        {/* VIEW 1: SIMULASI FORMULIR */}
        {viewMode === 'form' && (
          template.steps.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold text-lg">Belum ada langkah formulir yang dibuat.</p>
              <p className="text-sm font-medium mt-1">Kembali ke tab Editor Formulir untuk merancang pertanyaan.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Simulasi Formulir</h2>
                  <p className="text-sm text-slate-500 font-medium">Pratinjau antarmuka pendaftaran untuk peserta (End-User).</p>
                </div>
                <Button 
                  onClick={handleExportFormPDF}
                  disabled={isExportingForm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-200 font-bold shrink-0 h-10 px-4"
                >
                  {isExportingForm ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isExportingForm ? 'Merender...' : 'Unduh Struktur Form (PDF)'}
                </Button>
              </div>

              <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-md p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50 pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="mb-10">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-3 ring-1 ring-indigo-100">
                      <Sparkles size={12} />
                      Langkah {currentStep} dari {totalSteps}
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">{currentStepData.title}</h2>
                    {currentStepData.description && (
                      <p className="text-slate-500 text-sm md:text-base mt-2 leading-relaxed font-medium">
                        {currentStepData.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    {currentStepData.fields.map((field) => (
                      <div key={field.id} className={field.type === 'textarea' || field.type === 'file' ? 'md:col-span-2' : ''}>
                        <DynamicField 
                          field={field} 
                          value={dummyData[field.id]} 
                          onChange={(val) => handleDummyChange(field.id, val)} 
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-10 mt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Preview {currentStep === totalSteps ? 'Selesai' : 'Berjalan'}
                    </p>
                    <Button 
                      disabled={!isStepValid()} 
                      onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-12 font-bold shadow-lg w-full sm:w-auto transition-transform active:scale-95"
                    >
                      {currentStep < totalSteps ? 'Simulasi Langkah Berikutnya' : 'Kirim & Selesai (Simulasi)'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* VIEW 2: RINGKASAN PROMPT AI (TERMINAL VIEW DIUPDATE) */}
        {viewMode === 'ai' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Kompilasi Instruksi AI</h2>
                <p className="text-sm text-slate-500 font-medium">Pratinjau parameter yang akan dikirim ke mesin LLM.</p>
              </div>
              <Button 
                onClick={handleExportAIPDF}
                disabled={isExportingAI}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-200 font-bold shrink-0 h-10 px-4"
              >
                {isExportingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {isExportingAI ? 'Merender...' : 'Unduh PDF Blueprint AI'}
              </Button>
            </div>
            
            <div className="bg-slate-900 rounded-3xl p-6 text-emerald-400 font-mono text-xs sm:text-sm leading-relaxed shadow-2xl ring-1 ring-slate-800 mb-10">
              <ScrollArea className="max-h-[600px] pr-4">
                <p className="text-slate-400 mb-4 italic text-base">/* System Prompt Configuration */</p>
                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-2">
                    <span className="text-pink-400 font-bold min-w-28">Persona:</span>
                    <Badge variant="outline" className="border-pink-500/40 text-pink-300 font-mono">"{ai.aiPersona || 'Pakar'}"</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-pink-400 font-bold min-w-28">Target Analisis:</span>
                    <span className="text-slate-200">"{ai.assessmentGoal}"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-pink-400 font-bold min-w-28">Keketatan:</span>
                    <Badge variant="secondary" className="bg-slate-800 text-slate-200 uppercase font-mono">{ai.gradingStrictness || 'Standard'}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-pink-400 font-bold min-w-28">Gaya Bahasa:</span>
                    <Badge variant="secondary" className="bg-slate-800 text-slate-200 uppercase font-mono">{ai.reportTone || 'Consultative'}</Badge>
                  </div>
                  {ai.mediaAnalysisFocus && (
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold min-w-28">Fokus Media:</span>
                      <span className="text-amber-300">{ai.mediaAnalysisFocus}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-slate-400 mb-2 italic">/* Metrik Penilaian Radar (0-100) */</p>
                <ul className="list-disc list-inside pl-2 mb-8 text-indigo-300 space-y-1">
                  {(ai.expectedMetrics || []).map((m: any, i: number) => <li key={i}>{m}</li>)}
                  {(!ai.expectedMetrics || ai.expectedMetrics.length === 0) && <li>Belum dikonfigurasi</li>}
                </ul>

                <p className="text-slate-400 mb-2 italic">/* Tiers Level Readiness (Klaster Hasil Akhir) */</p>
                <ul className="list-disc list-inside pl-2 mb-8 text-purple-300 space-y-1">
                  {(ai.customReadinessTiers || []).map((t: any, i: number) => <li key={i}>{t}</li>)}
                  {(!ai.customReadinessTiers || ai.customReadinessTiers.length === 0) && <li>Belum dikonfigurasi</li>}
                </ul>

                <p className="text-slate-400 mb-2 italic">/* Target Blok Analisis */</p>
                <ul className="list-disc list-inside pl-2 mb-8 text-sky-300 space-y-1">
                  {(ai.expectedAnalysisBlocks || []).map((b: any, i: number) => <li key={i}>{b}</li>)}
                  {(!ai.expectedAnalysisBlocks || ai.expectedAnalysisBlocks.length === 0) && <li>Belum dikonfigurasi</li>}
                </ul>

                <p className="text-slate-400 mb-2 italic">/* Area Rekomendasi Output */</p>
                <ul className="list-disc list-inside pl-2 mb-8 text-rose-300 space-y-1">
                  {(ai.expectedRecommendations || []).map((r: any, i: number) => <li key={i}>{r}</li>)}
                  {(!ai.expectedRecommendations || ai.expectedRecommendations.length === 0) && <li>Belum dikonfigurasi</li>}
                </ul>

                {/* ADVANCED PROMPTING PREVIEW */}
                {ai.riskFramework && (
                  <>
                    <p className="text-slate-400 mb-2 italic mt-8">/* Fokus Mitigasi Risiko Khusus */</p>
                    <p className="text-amber-200 bg-slate-800/50 p-4 rounded-xl border border-slate-700 leading-loose">"{ai.riskFramework}"</p>
                  </>
                )}

                {ai.customScoringRubric && (
                  <>
                    <p className="text-slate-400 mb-2 italic mt-6">/* Rubrik Penilaian Matematis */</p>
                    <p className="text-amber-300 bg-amber-900/30 p-4 rounded-xl border border-amber-800/50 leading-loose">"{ai.customScoringRubric}"</p>
                  </>
                )}

                {ai.customSystemPrompt && (
                  <>
                    <p className="text-slate-400 mb-2 italic mt-6">/* Logika Kondisional & System Rules */</p>
                    <p className="text-indigo-300 bg-indigo-900/30 p-4 rounded-xl border border-indigo-800/50 leading-loose">"{ai.customSystemPrompt}"</p>
                  </>
                )}

                {ai.negativePrompts && (
                  <>
                    <p className="text-slate-400 mb-2 italic mt-6">/* Pantangan AI (Negative Prompts) */</p>
                    <p className="text-rose-300 bg-rose-900/30 p-4 rounded-xl border border-rose-800/50 leading-loose">"{ai.negativePrompts}"</p>
                  </>
                )}

                {ai.formatInstructions && (
                  <>
                    <p className="text-slate-400 mb-2 italic mt-6">/* Instruksi Pemformatan & Markdown Output */</p>
                    <p className="text-emerald-300 bg-emerald-900/30 p-4 rounded-xl border border-emerald-800/50 leading-loose">"{ai.formatInstructions}"</p>
                  </>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}