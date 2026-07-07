// src/app/components/admin/template-builder/TabFormBuilder.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';
import { 
  ChevronUp, ChevronDown, Trash2, Sparkles, ArrowUp, 
  ArrowDown, Plus, Bot, Loader2, GitBranch, Save, AlertTriangle 
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 1. Kamus Aturan Checkbox untuk Meta-Prompting AI
const QUESTION_TYPE_OPTIONS = [
  { 
    id: 'radio_weight', 
    label: 'Skoring Ganda Berbobot', 
    icon: '🎯',
    rule: 'WAJIB maksimalkan penggunaan tipe "radio" atau "select" dengan array "options" berbobot (weight 0-100) untuk keperluan kalkulasi nilai otomatis.' 
  },
  { 
    id: 'conditional_logic', 
    label: 'Logika Bercabang (ShowIf)', 
    icon: '🔀',
    rule: 'TERAPKAN INTEROGASI BERLAPIS: Gunakan properti "showIf". Jika peserta merespon klaim besar pada opsi radio/select, WAJIB pancing pertanyaan baru bertipe "file" atau "textarea" untuk menagih bukti.' 
  },
  { 
    id: 'file_upload', 
    label: 'Upload Bukti', 
    icon: '📄',
    rule: 'WAJIB sertakan tipe input "file" untuk menagih unggahan dokumen bukti (legalitas, laporan, portofolio, dll) guna menekan potensi manipulasi data.' 
  },
  { 
    id: 'number_metric', 
    label: 'Angka & Nominal', 
    icon: '🔢',
    rule: 'Gunakan tipe "number" secara spesifik untuk menangkap data kuantitatif presisi (seperti Omzet, Jumlah Karyawan, Biaya, Persentase) agar data tidak tercampur teks.' 
  },
  { 
    id: 'text_justification', 
    label: 'Teks Analisa / Alasan', 
    icon: '✍️',
    rule: 'Gunakan tipe "textarea" secara strategis untuk menuntut penjelasan, justifikasi, keluhan, atau uraian deskriptif yang mendalam dari peserta.' 
  }
];

interface TabFormBuilderProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
  onAutoSave?: (templateToSave?: FormTemplate) => Promise<void>;
}

export function TabFormBuilder({ template, onChange, onAutoSave }: TabFormBuilderProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [stepToDelete, setStepToDelete] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ phase: string; message: string } | null>(null);

  // REALTIME SNAPSHOT LISTENER
  useEffect(() => {
    if (!template.id) return;
    
    const db = getFirestore();
    const unsubscribe = onSnapshot(doc(db, "form_templates", template.id), (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        const status = docData.aiGenerationStatus;
        
        if (status) {
          setDbStatus({ phase: status.phase, message: status.message });
          
          if (status.phase === 'RESEARCHING' || status.phase === 'BUILDING_FORM') {
            setIsGenerating(true);
          } else if (status.phase === 'COMPLETED') {
            setIsGenerating(false);
            if (docData.steps) {
              onChange({ ...template, steps: docData.steps });
            }
          } else if (status.phase === 'FAILED') {
            setIsGenerating(false);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [template.id]);

  const getAllAvailableFields = () => {
    const fields: { id: string; label: string; options?: any[] }[] = [];
    template.steps?.forEach(step => {
      step.fields?.forEach(f => {
        if (f.id !== 'namaUsaha') fields.push({ id: f.id, label: f.label, options: f.options });
      });
    });
    return fields;
  };

  // HANDLER TOGGLE CHECKBOX
  const toggleQuestionType = (typeId: string) => {
    const currentTypes = template.preferredQuestionTypes || [];
    const newTypes = currentTypes.includes(typeId) 
      ? currentTypes.filter(id => id !== typeId)
      : [...currentTypes, typeId];
    onChange({ ...template, preferredQuestionTypes: newTypes });
  };

  // TRIGGER GENERATE AI SECARA ASYNCHRONOUS
  const handleGenerateFormByAI = async () => {
    // --- START VALIDASI SUPER ADMIN ---
    const auth = getAuth();
    const currentUserEmail = auth.currentUser?.email?.toLowerCase();
    
    if (currentUserEmail !== 'deny.wismoyo@gmail.com') {
      alert("  AKSES DITOLAK: Fitur AI Form Builder Enterprise ini menggunakan komputasi tingkat tinggi dan saat ini dikunci eksklusif hanya untuk DENY.WISMOYO@GMAIL.COM guna mencegah penyalahgunaan kuota token.");
      return;
    }
    // --- END VALIDASI ---

    if (!template.aiPromptConfig?.assessmentGoal) {
      alert("Mohon isi 'Tujuan Asesmen Utama' di Tab AI Config terlebih dahulu agar AI memahami tujuan pembuatan form.");
      return;
    }

    if (template.steps?.length > 0) {
      const confirmOverwrite = confirm("PERINGATAN: Proses ini akan menghapus dan menimpa seluruh langkah form Anda saat ini. Lanjutkan?");
      if (!confirmOverwrite) return;
    }

    // KOMPILASI INSTRUKSI DARI TEXTAREA + CHECKBOX
    let finalInstruction = template.formBuilderInstruction || "Rancang kuesioner penilaian secara sistematis.";
    if (template.preferredQuestionTypes && template.preferredQuestionTypes.length > 0) {
      const selectedRules = template.preferredQuestionTypes.map(id => {
        const opt = QUESTION_TYPE_OPTIONS.find(o => o.id === id);
        return opt ? `- ${opt.rule}` : '';
      }).filter(Boolean).join('\n');
      
      finalInstruction += `\n\nATURAN KOMPOSISI PERTANYAAN MUTLAK (WAJIB DIPATUHI):\n${selectedRules}`;
    }

    setIsGenerating(true);
    setDbStatus({ phase: "STARTING", message: "Menginisialisasi pipeline Multi-Agent AI..." });
    
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateFormFn = httpsCallable(functions, 'generateFormTemplateFromAI', { timeout: 900000 });
      
      generateFormFn({
        templateId: template.id,
        trackName: template.trackName || "Evaluasi Umum",
        aiPromptConfig: template.aiPromptConfig,
        archetypeInstruction: finalInstruction 
      }).catch((asyncError) => {
        console.error("Error latar belakang Cloud Function:", asyncError);
        setIsGenerating(false);
      });
    } catch (error: any) {
      console.error("Gagal memicu fungsi AI:", error);
      setIsGenerating(false);
    }
  };

  const handleManualSave = async () => {
    if (onAutoSave) {
      await onAutoSave(template);
    } else {
      try {
        const db = getFirestore();
        await updateDoc(doc(db, "form_templates", template.id), {
          steps: template.steps,
          lastUpdated: new Date().toISOString()
        });
        alert("Formulir berhasil disimpan secara permanen!");
      } catch (e: any) {
        alert("Gagal menyimpan perubahan: " + e.message);
      }
    }
  };

  const toggleStepExpansion = (stepIndex: number) => {
    setExpandedSteps(prev => prev.includes(stepIndex) ? prev.filter(idx => idx !== stepIndex) : [...prev, stepIndex]);
  };

  const addStep = () => {
    const currentSteps = template.steps || [];
    const newIdx = currentSteps.length;
    const newStep: FormStep = { stepNumber: newIdx + 1, title: `Langkah ${newIdx + 1}`, fields: [] };
    onChange({ ...template, steps: [...currentSteps, newStep] });
    setExpandedSteps([newIdx]);
  };

  const executeRemoveStep = () => {
    if (stepToDelete === null) return;
    const newSteps = [...template.steps];
    newSteps.splice(stepToDelete, 1);
    newSteps.forEach((step, idx) => step.stepNumber = idx + 1);
    onChange({ ...template, steps: newSteps });
    setStepToDelete(null);
  };

  const addField = (stepIndex: number) => {
    const newSteps = [...template.steps];
    const newField: FormField = { id: `field_${Date.now().toString().slice(-4)}`, label: "Pertanyaan Baru", type: "text", required: false, gridSpan: 2 };
    newSteps[stepIndex].fields = [...newSteps[stepIndex].fields, newField];
    onChange({ ...template, steps: newSteps });
  };

  const updateField = (stepIndex: number, fieldIndex: number, key: keyof FormField, value: any) => {
    const newSteps = [...template.steps];
    newSteps[stepIndex].fields[fieldIndex] = { ...newSteps[stepIndex].fields[fieldIndex], [key]: value };
    onChange({ ...template, steps: newSteps });
  };

  const generateAutoIdFromLabel = (stepIndex: number, fieldIndex: number) => {
    const label = template.steps[stepIndex].fields[fieldIndex].label;
    const cleanedId = label.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    updateField(stepIndex, fieldIndex, 'id', cleanedId || `field_${Date.now().toString().slice(-3)}`);
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    const newSteps = [...template.steps];
    newSteps[stepIndex].fields.splice(fieldIndex, 1);
    onChange({ ...template, steps: newSteps });
  };

  const moveField = (stepIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    const newSteps = [...template.steps];
    const fields = [...newSteps[stepIndex].fields];
    if (direction === 'up' && fieldIndex > 0) {
      [fields[fieldIndex - 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex - 1]];
    } else if (direction === 'down' && fieldIndex < fields.length - 1) {
      [fields[fieldIndex], fields[fieldIndex + 1]] = [fields[fieldIndex + 1], fields[fieldIndex]];
    }
    newSteps[stepIndex].fields = fields;
    onChange({ ...template, steps: newSteps });
  };

  return (
    <div className="space-y-4">
      {/* CARD RUNTIME MONITORING STATUS MULTI-AGENT */}
      {dbStatus && (dbStatus.phase === 'RESEARCHING' || dbStatus.phase === 'BUILDING_FORM' || dbStatus.phase === 'FAILED') && (
        <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${dbStatus.phase === 'FAILED' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {dbStatus.phase === 'FAILED' ? <AlertTriangle className="w-5 h-5 animate-bounce text-rose-600 shrink-0"/> : <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />}
          <div className="flex-1 text-sm">
            <span className="font-black block uppercase tracking-wider text-[11px] opacity-70">Sistem Monitoring Latar Belakang ({dbStatus.phase})</span>
            <p className="font-medium mt-0.5">{dbStatus.message}</p>
          </div>
        </div>
      )}

      {/* UI BANNER AI DESIGNER & CONTROLLER */}
      <div className="flex flex-col p-6 bg-indigo-50/70 rounded-3xl ring-1 ring-indigo-100/80 border border-indigo-200/40 gap-5 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        
        <div className="flex justify-between items-start gap-4 mb-2">
          <div>
            <h4 className="font-black text-indigo-900 flex items-center gap-2 text-lg">
              <Bot className="w-6 h-6 text-indigo-600" /> AI Form Builder Enterprise
            </h4>
            <p className="text-xs text-indigo-700/80 font-medium mt-1 max-w-xl leading-relaxed">
              Didukung Agen Riset Internasional. Memformulasikan pertanyaan, matriks nilai, dan validasi dokumen secara dinamis berdasarkan instruksi Anda.
            </p>
          </div>
          <Button onClick={handleManualSave} disabled={isGenerating} size="sm" variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 font-bold hidden sm:flex gap-2 rounded-xl h-10 shadow-sm">
            <Save className="w-4 h-4 text-slate-500" /> Simpan Form
          </Button>
        </div>

        {/* --- DYNAMIC INSTRUCTION AREA --- */}
        <div className="w-full space-y-4">
          <div className="flex justify-between items-end mb-2">
            <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">
              Komposisi Tipe Pertanyaan (Checklist AI):
            </label>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
            {QUESTION_TYPE_OPTIONS.map((opt) => {
              const isChecked = (template.preferredQuestionTypes || []).includes(opt.id);
              return (
                <label 
                  key={opt.id} 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center ${
                    isChecked 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isChecked}
                    onChange={() => toggleQuestionType(opt.id)}
                  />
                  <span className="text-xl mb-1">{opt.icon}</span>
                  <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
                </label>
              );
            })}
          </div>

          <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block mt-4">
            Instruksi Khusus Pembentukan Kuesioner (Opsional):
          </label>
          <Textarea
            value={template.formBuilderInstruction || ''}
            onChange={e => onChange({ ...template, formBuilderInstruction: e.target.value })}
            placeholder="Ketik instruksi tambahan untuk AI. Contoh: 'Wajibkan semua isian berupa angka menggunakan format Rupiah. Jika peserta memilih PT, gunakan fitur showIf untuk menanyakan Akta Notaris...'"
            className="min-h-[100px] bg-white border-indigo-200 text-sm font-medium leading-relaxed rounded-xl shadow-sm"
          />
        </div>

        <div className="flex w-full pt-2">
          <Button
            onClick={handleGenerateFormByAI}
            disabled={isGenerating}
            className={`w-full font-bold h-12 px-6 rounded-xl shadow-md transition-all text-sm duration-300 ${isGenerating ? 'bg-indigo-400 cursor-wait text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:-translate-y-0.5'}`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Sedang Diproses AI...</span>
            ) : (
              <span className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Mulai Generate Form</span>
            )}
          </Button>
        </div>
      </div>

      {/* RENDER FORM STEPS & FIELD CONFIGURATOR */}
      {(!template.steps || template.steps.length === 0) ? (
        <div className="text-center p-12 bg-white rounded-3xl ring-1 ring-slate-200 border border-dashed border-slate-300">
          <p className="text-slate-400 font-bold text-sm">Belum ada langkah formulir yang dibuat. Klik tombol di atas untuk rancangan instan AI.</p>
        </div>
      ) : (
        template.steps.map((step, sIdx) => {
          const isExpanded = expandedSteps.includes(sIdx);
          
          return (
            <div key={`step-${sIdx}`} className="bg-white rounded-[2rem] ring-1 ring-slate-200/80 shadow-sm overflow-hidden transition-all duration-300">
              <div 
                className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'hover:bg-slate-50/50'}`}
                onClick={() => toggleStepExpansion(sIdx)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black shrink-0 ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {step.stepNumber}
                  </span>
                  {isExpanded ? (
                    <Input 
                      value={step.title} 
                      onChange={e => {
                        const newSteps = [...template.steps];
                        newSteps[sIdx].title = e.target.value;
                        onChange({ ...template, steps: newSteps });
                      }} 
                      onClick={e => e.stopPropagation()}
                      className="bg-slate-800 border-slate-700 text-white font-bold h-9 w-full max-w-xs text-sm rounded-xl" 
                    />
                  ) : (
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">{step.title} <span className="text-slate-400 text-xs font-medium ml-2">({step.fields?.length || 0} Pertanyaan)</span></h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isExpanded && (
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setStepToDelete(sIdx); }} className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 px-2.5 rounded-xl text-xs font-bold mr-1 hidden sm:flex">
                      Hapus Step
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-6 bg-slate-50/40 space-y-6 border-t border-slate-100">
                  {step.fields?.map((field, fIdx) => {
                    const isPrimaryIdentity = ['namaUsaha', 'namaPengisi', 'emailAktif', 'nomorTelepon'].includes(field.id);
                    
                    return (
                      <div key={`field-${sIdx}-${fIdx}`} className={`p-4 sm:p-5 rounded-2xl ring-1 shadow-sm flex flex-col md:flex-row gap-5 relative transition-all ${isPrimaryIdentity ? 'bg-indigo-50/20 ring-indigo-100/60' : 'bg-white ring-slate-200/70 hover:ring-indigo-200'}`}>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label Pertanyaan</label>
                            <Input value={field.label} onChange={e => updateField(sIdx, fIdx, 'label', e.target.value)} className="bg-white border-slate-200 h-10 rounded-xl font-bold text-slate-800 text-sm" />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Input</label>
                            <select value={field.type} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'type', e.target.value as FieldType)} className="w-full border border-slate-200 h-10 rounded-xl text-xs px-3 bg-white text-slate-800 font-medium">
                              <option value="text">Teks Pendek</option>
                              <option value="textarea">Teks Panjang</option>
                              <option value="number">Angka / Nominal (IDR)</option>
                              <option value="date">Tanggal</option>
                              <option value="select">Dropdown</option>
                              <option value="radio">Pilihan Tunggal</option>
                              <option value="checkbox">Pilihan Ganda</option>
                              <option value="file">Upload Dokumen</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                              <span>Key Database (ID)</span>
                              {!isPrimaryIdentity && <button type="button" onClick={() => generateAutoIdFromLabel(sIdx, fIdx)} className="text-indigo-600 text-[9px] font-black flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded"><Sparkles className="w-2.5 h-2.5"/> Auto-ID</button>}
                            </label>
                            <Input value={field.id} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'id', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="bg-white border-slate-200 text-indigo-700 h-10 rounded-xl text-xs font-mono" />
                          </div>

                          <div className="flex items-center gap-5 pt-1 md:col-span-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                              <input type="checkbox" checked={field.required} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'required', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                              Wajib Diisi
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                              <input type="checkbox" checked={field.gridSpan === 2} onChange={e => updateField(sIdx, fIdx, 'gridSpan', e.target.checked ? 2 : 1)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                              Lebar Penuh (100%)
                            </label>
                          </div>

                          {/* LOGIKA BERCABANG (CONDITIONAL VISIBILITY) */}
                          {!isPrimaryIdentity && (
                            <div className="md:col-span-2 space-y-2 p-3.5 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                              <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-indigo-600"/> Logika Aliran Cabang Pertanyaan</label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select
                                  value={field.showIf ? "conditional" : "always"}
                                  onChange={(e) => {
                                    if (e.target.value === "always") {
                                      updateField(sIdx, fIdx, 'showIf', undefined);
                                    } else {
                                      const avail = getAllAvailableFields();
                                      updateField(sIdx, fIdx, 'showIf', { fieldId: avail[0]?.id || '', equals: '' });
                                    }
                                  }}
                                  className="border border-slate-200 h-9 rounded-lg text-xs px-2 bg-white text-slate-700"
                                >
                                  <option value="always">Tampilkan Selalu</option>
                                  <option value="conditional">Tampilkan Kondisional...</option>
                                </select>
                                
                                {field.showIf && (
                                  <>
                                    <select
                                      value={field.showIf.fieldId}
                                      onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, fieldId: e.target.value, equals: '' })}
                                      className="border border-slate-200 h-9 rounded-lg text-xs px-2 bg-white text-slate-700"
                                    >
                                      {getAllAvailableFields().map(f => (
                                        <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                                      ))}
                                    </select>
                                    <Input
                                      placeholder="Nilai Pemicu (Cth: Ya)"
                                      value={String(field.showIf.equals || '')}
                                      onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, equals: e.target.value })}
                                      className="bg-white border-slate-200 h-9 text-xs rounded-lg"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* SCORING MATRIX COMPONENT */}
                          {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && !isPrimaryIdentity && (
                            <div className="md:col-span-2 space-y-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opsi Jawaban & Matrix Bobot Kuantitatif (0-100)</label>
                              <div className="space-y-2">
                                {(field.options || []).map((opt, optIdx) => {
                                  const isObj = typeof opt === 'object' && opt !== null;
                                  const optLabel = isObj ? opt.label : String(opt);
                                  const optWeight = isObj ? opt.weight : 0;

                                  return (
                                    <div key={optIdx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                                      <Input 
                                        value={optLabel} 
                                        onChange={e => {
                                          const newOpts = [...(field.options || [])];
                                          newOpts[optIdx] = { label: e.target.value, weight: optWeight };
                                          updateField(sIdx, fIdx, 'options', newOpts);
                                        }} 
                                        className="h-8 text-xs bg-white flex-1" 
                                      />
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[9px] font-bold text-indigo-500 uppercase">Bobot:</span>
                                        <Input 
                                          type="number" value={optWeight} min={0} max={100}
                                          onChange={e => {
                                            const newOpts = [...(field.options || [])];
                                            newOpts[optIdx] = { label: optLabel, weight: parseInt(e.target.value) || 0 };
                                            updateField(sIdx, fIdx, 'options', newOpts);
                                          }} 
                                          className="w-14 h-8 text-center text-xs font-bold text-indigo-600 bg-indigo-50/40 border-indigo-100" 
                                        />
                                      </div>
                                      <Button variant="ghost" onClick={() => {
                                        const newOpts = [...(field.options || [])];
                                        newOpts.splice(optIdx, 1);
                                        updateField(sIdx, fIdx, 'options', newOpts);
                                      }} className="h-8 w-8 text-slate-400 hover:text-rose-500 p-0 rounded-md">
                                        <Trash2 className="w-3.5 h-3.5"/>
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                              <Button variant="outline" size="sm" onClick={() => {
                                const newOpts = [...(field.options || [])];
                                newOpts.push({ label: `Pilihan ${newOpts.length + 1}`, weight: 0 });
                                updateField(sIdx, fIdx, 'options', newOpts);
                              }} className="w-full h-8 text-[11px] border-dashed font-bold text-slate-500">
                                <Plus className="w-3.5 h-3.5 mr-1"/> Tambah Parameter Pilihan Berbobot
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex md:flex-col gap-1 items-center justify-center pt-3 md:pt-0 md:pl-3 border-t md:border-t-0 md:border-l border-slate-100 shrink-0">
                          <button type="button" onClick={() => moveField(sIdx, fIdx, 'up')} disabled={fIdx === 0} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => moveField(sIdx, fIdx, 'down')} disabled={fIdx === step.fields.length - 1} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeField(sIdx, fIdx)} disabled={isPrimaryIdentity} className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 h-12 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50"><Plus className="h-4 w-4 mr-1.5" /> Tambah Kuesioner Pertanyaan</Button>
                </div>
              )}
            </div>
          );
        })
      )}

      <Button onClick={addStep} className="w-full bg-slate-900 text-white hover:bg-slate-800 h-12 font-bold text-sm rounded-xl shadow-md mt-4"><Plus className="h-4 w-4 mr-1.5" /> Tambah Seksi Langkah Baru</Button>

      {/* DIALOG MODAL CONFIRM DELETE STEP */}
      {stepToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[1.5rem] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-black text-slate-900 text-center">Hapus Langkah Formulir Ini?</h3>
            <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">Seluruh susunan variabel kuesioner di dalam seksi langkah ini akan terhapus secara permanen.</p>
            <div className="flex gap-2.5 mt-6">
              <Button variant="outline" onClick={() => setStepToDelete(null)} className="w-full h-10 text-xs font-bold rounded-xl">Batal</Button>
              <Button onClick={executeRemoveStep} className="w-full h-10 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Ya, Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}