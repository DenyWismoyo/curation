// src/components/curation/DynamicField.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FormField } from '@/features/assessment/types/assessment.types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { VoiceInputRecorder } from '../VoiceInputRecorder';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, storage } from '@/lib/firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { getAuth } from 'firebase/auth';

// IMPORT CUSTOM ICON
import { DocExportIcon } from '@/components/icon';

const renderMarkdownText = (str: string) => {
  if (typeof str !== 'string') return str;
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index} className="font-bold text-indigo-600 dark:text-indigo-400">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
};

interface DynamicFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}

export function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const getOptionLabel = (opt: any): string => {
    return typeof opt === 'object' && opt !== null ? opt.label : String(opt);
  };

  const analyzeFile = useCallback(async (fileToAnalyze: File) => {
    if (isAnalyzing || analysisResult) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(fileToAnalyze);
      reader.onloadend = async () => {
        try {
          const base64 = reader.result?.toString().split(',')[1];
          if (!base64) throw new Error("Gagal konversi ke Base64");
          
          const functions = getFunctions(app, 'asia-southeast2');
          const analyze = httpsCallable(functions, 'analyzeEvidence');
          const res = await analyze({ 
            fileBase64: base64, 
            mimeType: fileToAnalyze.type,
            context: `Tolong analisis validitas dokumen ini berdasarkan konteks pertanyaan form berikut: "${field.label}". ${field.description ? `(Info tambahan: ${field.description})` : ''}`
          });
          const data = res.data as any;
          setAnalysisResult(data.analysisResult);
        } catch (error) {
          console.error("Error dalam callback FileReader:", error);
          toast.error("Gagal menganalisis dokumen.");
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (error) {
      console.error(error);
      toast.error("Gagal memproses dokumen.");
      setIsAnalyzing(false);
    }
  }, [field.label, field.description, isAnalyzing, analysisResult]);

  useEffect(() => {
    // Auto-analyze hanya jika value adalah URL string (sudah terupload)
    if (field.type === 'file' && value && typeof value === 'object' && value.downloadURL && !analysisResult && !isAnalyzing) {
      // Tidak auto-analyze karena file sudah ada di storage, analisis dilakukan di orchestrator
    }
  }, [value, field.type, analysisResult, isAnalyzing, analyzeFile]);

  const handleCheckboxChange = (optionLabel: string, isChecked: boolean) => {
    let currentValues = Array.isArray(value) ? [...value] : [];
    if (isChecked) {
      currentValues.push(optionLabel);
    } else {
      currentValues = currentValues.filter((v) => v !== optionLabel);
    }
    onChange(currentValues);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <div className="flex flex-col">
            <Input type="text" placeholder={field.placeholder || 'Ketik di sini...'} value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-12 bg-muted text-muted-foreground border-border focus-visible:ring-indigo-500 rounded-xl transition-all font-medium text-slate-700" />
            <VoiceInputRecorder onTranscription={(text) => onChange(text)} contextPrompt={`Pertanyaan: ${field.label}. Deskripsi: ${field.description || ''}`} />
          </div>
        );
      case 'number':
        return (
          <Input type="number" placeholder={field.placeholder || '0'} value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-12 bg-muted text-muted-foreground border-border focus-visible:ring-indigo-500 rounded-xl transition-all font-medium text-slate-700" />
        );
      case 'textarea':
        return (
          <div className="flex flex-col">
            <Textarea placeholder={field.placeholder || 'Ketik penjelasan detail di sini...'} value={value || ''} onChange={(e) => onChange(e.target.value)} className="bg-muted text-muted-foreground border-border focus-visible:ring-indigo-500 rounded-xl min-h-[100px] resize-y transition-all font-medium text-slate-700" />
            <VoiceInputRecorder onTranscription={(text) => onChange(text)} contextPrompt={`Pertanyaan: ${field.label}. Deskripsi: ${field.description || ''}`} />
          </div>
        );
      case 'date':
        return (
          <Input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-12 bg-muted text-muted-foreground border-border focus-visible:ring-indigo-500 rounded-xl transition-all font-medium text-slate-700 w-full" />
        );
      case 'select':
        return (
          <div className="relative">
            <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full h-12 bg-muted text-muted-foreground border border-border text-slate-700 font-medium rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
              <option value="" disabled>-- Pilih salah satu opsi --</option>
              {field.options?.map((opt, idx) => {
                const optLabel = getOptionLabel(opt);
                return <option key={idx} value={optLabel}>{optLabel.replace(/\*/g, '')}</option>;
              })}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        );
      case 'radio':
        return (
          <div className="flex flex-col gap-3 pt-1">
            {field.options?.map((opt, idx) => {
              const optLabel = getOptionLabel(opt);
              return (
                <label key={idx} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${value === optLabel ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10/50 text-indigo-900 shadow-sm' : 'border-border card-solid hover:bg-muted text-muted-foreground text-muted-foreground'}`}>
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${value === optLabel ? 'border-indigo-600' : 'border-border'}`}>
                    {value === optLabel && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                  </div>
                  <input type="radio" name={field.id} value={optLabel} checked={value === optLabel} onChange={(e) => onChange(e.target.value)} className="hidden" />
                  <span className="font-medium text-sm leading-relaxed">{renderMarkdownText(optLabel)}</span>
                </label>
              );
            })}
          </div>
        );
      case 'checkbox':
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-col gap-3 pt-1">
            {field.options?.map((opt, idx) => {
              const optLabel = getOptionLabel(opt);
              const isChecked = checkedValues.includes(optLabel);
              return (
                <label key={idx} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${isChecked ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10/50 text-indigo-900 shadow-sm' : 'border-border card-solid hover:bg-muted text-muted-foreground text-muted-foreground'}`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-border'}`}>
                    {isChecked && <Check size={14} strokeWidth={3} />}
                  </div>
                  <input type="checkbox" value={optLabel} checked={isChecked} onChange={(e) => handleCheckboxChange(optLabel, e.target.checked)} className="hidden" />
                  <span className="font-medium text-sm leading-relaxed">{renderMarkdownText(optLabel)}</span>
                </label>
              );
            })}
          </div>
        );
      case 'file':
        // Nilai file sekarang adalah objek: { downloadURL, storagePath, fileName }
        // atau null/undefined jika belum ada file.
        const fileValue = value && typeof value === 'object' && value.downloadURL ? value : null;
        const legacyFileValue = value instanceof File ? value : null; // fallback jika masih ada File object

        const handleDrag = (e: React.DragEvent) => {
          e.preventDefault(); e.stopPropagation();
          if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
          else if (e.type === 'dragleave') setDragActive(false);
        };
        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault(); e.stopPropagation();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
        };

        const handleFileUpload = async (file: File) => {
          setIsUploading(true);
          setAnalysisResult(null);
          
          // Daftar MIME type yang TIDAK didukung Gemini AI untuk analisis otomatis
          const UNSUPPORTED_FOR_AI: Record<string, string> = {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx)',
            'application/vnd.ms-excel': 'Excel (.xls)',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
            'application/msword': 'Word (.doc)',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint (.pptx)',
            'application/vnd.ms-powerpoint': 'PowerPoint (.ppt)',
            'application/zip': 'ZIP',
            'application/x-rar-compressed': 'RAR',
          };
          const unsupportedLabel = UNSUPPORTED_FOR_AI[file.type];
          if (unsupportedLabel) {
            toast.warning(
              `⚠️ Format ${unsupportedLabel} tidak dapat dianalisis oleh AI. ` +
              `File tetap diunggah untuk referensi kurator, namun ` +
              `konversi ke PDF agar mendapat analisis AI yang optimal.`,
              { duration: 8000 }
            );
          }

          try {
            const auth = getAuth(app);
            const userId = auth.currentUser?.uid || 'guest';
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `assessments/${userId}/${Date.now()}_${safeName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            // Simpan sebagai objek { downloadURL, storagePath, fileName }
            onChange({ downloadURL, storagePath, fileName: file.name });
            if (!unsupportedLabel) {
              toast.success(`File "${file.name}" berhasil diunggah & siap dianalisis AI.`);
            } else {
              toast.success(`File "${file.name}" berhasil diunggah (tersimpan untuk kurator).`);
            }
          } catch (err) {
            console.error('Upload file gagal:', err);
            toast.error('Gagal mengunggah file. Pastikan koneksi internet Anda stabil.');
          } finally {
            setIsUploading(false);
          }
        };

        const displayFileName = fileValue?.fileName || legacyFileValue?.name || (typeof value === 'string' ? value.split('/').pop() : null);
        const displayURL = fileValue?.downloadURL || null;
        const hasFile = !!(fileValue || legacyFileValue);

        return (
          <div className="mt-1">
            {hasFile ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                      <DocExportIcon size={20} />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-emerald-900 truncate">{displayFileName || 'Dokumen Terlampir'}</p>
                      {displayURL ? (
                        <a href={displayURL} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline">✅ Tersimpan di cloud — Klik untuk lihat</a>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⏳ Mengunggah...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {displayURL && (
                      <button 
                        type="button" 
                        onClick={() => {
                          // Analisis ulang via Cloud Function jika perlu
                          if (legacyFileValue) analyzeFile(legacyFileValue);
                        }} 
                        disabled={isAnalyzing || !legacyFileValue}
                        className="px-3 py-1.5 card-solid border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-500" />}
                        {isAnalyzing ? 'Menganalisis...' : 'Analisis Ulang AI'}
                      </button>
                    )}
                    <button type="button" onClick={() => { onChange(null); setAnalysisResult(null); }} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:text-rose-400 rounded-full transition-colors shrink-0"><X size={18} /></button>
                  </div>
                </div>

                {analysisResult && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl text-amber-900 text-sm shadow-inner relative">
                    <div className="flex items-center gap-2 mb-2 font-black text-amber-700 dark:text-amber-300">
                      <Sparkles size={16} /> Hasil Analisis Bukti
                    </div>
                    <div className="prose prose-sm prose-amber max-w-none leading-relaxed">
                      {renderMarkdownText(analysisResult)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  isUploading ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 cursor-wait' :
                  dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 cursor-copy' : 
                  'border-border bg-muted text-muted-foreground hover:bg-secondary text-secondary-foreground cursor-pointer'
                }`}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={!isUploading ? handleDrop : undefined}
                onClick={!isUploading ? () => fileInputRef.current?.click() : undefined}
              >
                <div className="w-12 h-12 card-solid rounded-full shadow-sm ring-1 ring-border flex items-center justify-center text-indigo-500 mb-2">
                  {isUploading ? <Loader2 size={24} className="animate-spin text-indigo-500" /> : <DocExportIcon size={24} />}
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {isUploading ? 'Mengunggah ke cloud...' : <><span className="text-indigo-600 dark:text-indigo-400">Klik untuk unggah</span> atau seret file ke sini</>}
                </p>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Mendukung format: {field.fileAccept ? field.fileAccept.replace(/,/g, ', ') : 'Semua Format'}</p>
                <input ref={fileInputRef} type="file" accept={field.fileAccept} className="hidden" disabled={isUploading} onChange={(e) => { if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]); }} />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 ${field.gridSpan === 2 ? 'sm:col-span-2' : ''}`}>
      <label className="text-sm font-bold text-foreground flex items-start gap-1">
        <span className="flex-1 leading-snug">{renderMarkdownText(field.label)}</span>
        {field.required && <span className="text-rose-500 text-lg leading-none shrink-0">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-muted-foreground font-medium -mt-1 mb-2 leading-relaxed">{renderMarkdownText(field.description)}</p>
      )}
      {renderField()}
    </div>
  );
}