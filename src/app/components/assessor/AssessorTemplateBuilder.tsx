// src/app/components/assessor/AssessorTemplateBuilder.tsx
'use client';

import React, { useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  X, Save, Loader2, BrainCircuit, FormInput, Settings2, 
  ChevronUp, ChevronDown, Trash2, Sparkles, ArrowUp, ArrowDown, Plus, GitBranch, Bot, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';

interface AssessorTemplateBuilderProps {
  templateData: FormTemplate; 
  allocationId: string; 
  assessorEmail: string;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function AssessorTemplateBuilder({ 
  templateData, allocationId, assessorEmail, onClose, onSaveSuccess 
}: AssessorTemplateBuilderProps) {
  
  const [activeTab, setActiveTab] = useState<'form' | 'ai'>('form');
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE LOKAL TEMPLATE ---
  // Clone data template ke state memori agar bisa diedit bebas sebelum disave
  const [templateState, setTemplateState] = useState<FormTemplate>(() => JSON.parse(JSON.stringify(templateData)));
  
  // --- STATE KONTROL UI FORM BUILDER ---
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [stepToDelete, setStepToDelete] = useState<number | null>(null);

  // ==========================================
  // FUNGSI BANTUAN FORM BUILDER
  // ==========================================
  const toggleStepExpansion = (stepIndex: number) => {
    setExpandedSteps(prev => prev.includes(stepIndex) ? prev.filter(idx => idx !== stepIndex) : [...prev, stepIndex]);
  };

  const getAllAvailableFields = () => {
    const fields: { id: string; label: string; options?: any[] }[] = [];
    templateState.steps?.forEach(step => {
      step.fields?.forEach(f => {
        if (f.id !== 'namaUsaha') fields.push({ id: f.id, label: f.label, options: f.options });
      });
    });
    return fields;
  };

  const addStep = () => {
    const currentSteps = templateState.steps || [];
    const newIdx = currentSteps.length;
    const newStep: FormStep = { stepNumber: newIdx + 1, title: `Langkah ${newIdx + 1}`, fields: [] };
    setTemplateState({ ...templateState, steps: [...currentSteps, newStep] });
    setExpandedSteps([newIdx]);
  };

  const executeRemoveStep = () => {
    if (stepToDelete === null) return;
    const newSteps = [...templateState.steps];
    newSteps.splice(stepToDelete, 1);
    newSteps.forEach((step, idx) => step.stepNumber = idx + 1);
    setTemplateState({ ...templateState, steps: newSteps });
    setStepToDelete(null);
  };

  const addField = (stepIndex: number) => {
    const newSteps = [...templateState.steps];
    const newField: FormField = { id: `field_${Date.now().toString().slice(-4)}`, label: "Pertanyaan Baru", type: "text", required: false, gridSpan: 2 };
    newSteps[stepIndex].fields = [...newSteps[stepIndex].fields, newField];
    setTemplateState({ ...templateState, steps: newSteps });
  };

  const updateField = (stepIndex: number, fieldIndex: number, key: keyof FormField, value: any) => {
    const newSteps = [...templateState.steps];
    newSteps[stepIndex].fields[fieldIndex] = { ...newSteps[stepIndex].fields[fieldIndex], [key]: value };
    setTemplateState({ ...templateState, steps: newSteps });
  };

  const generateAutoIdFromLabel = (stepIndex: number, fieldIndex: number) => {
    const label = templateState.steps[stepIndex].fields[fieldIndex].label;
    const cleanedId = label.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    updateField(stepIndex, fieldIndex, 'id', cleanedId || `field_${Date.now().toString().slice(-3)}`);
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    const newSteps = [...templateState.steps];
    newSteps[stepIndex].fields.splice(fieldIndex, 1);
    setTemplateState({ ...templateState, steps: newSteps });
  };

  const moveField = (stepIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    const newSteps = [...templateState.steps];
    const fields = [...newSteps[stepIndex].fields];
    if (direction === 'up' && fieldIndex > 0) {
      [fields[fieldIndex - 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex - 1]];
    } else if (direction === 'down' && fieldIndex < fields.length - 1) {
      [fields[fieldIndex], fields[fieldIndex + 1]] = [fields[fieldIndex + 1], fields[fieldIndex]];
    }
    newSteps[stepIndex].fields = fields;
    setTemplateState({ ...templateState, steps: newSteps });
  };

  // ==========================================
  // FUNGSI BANTUAN AI CONFIG
  // ==========================================
  const updateAiConfig = (key: string, value: any) => {
    setTemplateState({ ...templateState, aiPromptConfig: { ...(templateState.aiPromptConfig || {}), [key]: value } as any });
  };

  const updateUiLabel = (key: string, value: string) => {
    const currentLabels = templateState.aiPromptConfig?.customUiLabels || {};
    updateAiConfig('customUiLabels', { ...currentLabels, [key]: value });
  };

  const updateArrayItem = (key: string, idx: number, value: string) => {
    const currentArr = templateState.aiPromptConfig?.[key as keyof typeof templateState.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr];
    newArr[idx] = value;
    updateAiConfig(key, newArr);
  };

  const removeArrayItem = (key: string, idx: number) => {
    const currentArr = templateState.aiPromptConfig?.[key as keyof typeof templateState.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr];
    newArr.splice(idx, 1);
    updateAiConfig(key, newArr);
  };

  const addArrayItem = (key: string, defaultText: string) => {
    const currentArr = templateState.aiPromptConfig?.[key as keyof typeof templateState.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr, defaultText];
    updateAiConfig(key, newArr);
  };

  const parseAnalysisBlock = (blockStr: string) => {
    if (!blockStr) return { title: '', subs: '' };
    const colonIndex = blockStr.indexOf(':');
    if (colonIndex === -1) return { title: blockStr, subs: '' }; 
    return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
  };

  const updateAnalysisBlock = (idx: number, newTitle: string, newSubs: string) => {
    const cleanTitle = newTitle.trim();
    const cleanSubs = newSubs.trim();
    const combinedValue = cleanTitle || cleanSubs ? `${cleanTitle}${cleanSubs ? `: ${cleanSubs}` : ''}` : '';
    updateArrayItem('expectedAnalysisBlocks', idx, combinedValue);
  };

  const standardArrayConfigs = [
    { key: 'expectedMetrics', label: 'Metrik Grafik Radar (Penilaian Skor 0-100)', defaultItem: 'Metrik Baru', description: 'Sebutkan pilar performa atau aspek utama yang akan dikonversi menjadi grafik.' },
    { key: 'customReadinessTiers', label: 'Klaster Hasil Akhir (Tiers Level)', defaultItem: 'Tier Baru', description: 'Definisikan ambang batas tingkatan status subjek beserta rentang skornya.' },
    { key: 'expectedRecommendations', label: 'Target Rekomendasi Alur Tindak Lanjut', defaultItem: 'Area Rekomendasi', description: 'Tentukan koridor peta jalan tindakan yang wajib dirumuskan AI.' }
  ];

  // ==========================================
  // FUNGSI SIMPAN & CLONE TEMPLATE
  // ==========================================
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const isMasterAdminTemplate = !(templateData as any).isAssessorCustomized;
      
      // Jika ini template master admin, CLONE menjadi template milik Asesor
      const targetTemplateId = isMasterAdminTemplate 
        ? `${allocationId}_custom_template` 
        : templateData.id;

      const payload = {
        ...templateState,
        id: targetTemplateId,
        isAssessorCustomized: true,
        assessorEmail: assessorEmail,
        originalTemplateId: isMasterAdminTemplate ? templateData.id : (templateData as any).originalTemplateId,
        updatedAt: new Date().toISOString()
      };

      if (isMasterAdminTemplate) {
        // 1. Buat Dokumen Template Baru
        await setDoc(doc(db, 'form_templates', targetTemplateId), payload);
        // 2. Arahkan Kuota Token Asesor ke Template Baru ini
        await updateDoc(doc(db, 'corporate_tokens', allocationId), {
          allowedTemplates: [targetTemplateId]
        });
      } else {
        // Jika sudah berupa template custom asesor, cukup update saja
        await updateDoc(doc(db, 'form_templates', targetTemplateId), payload);
      }

      toast.success("Modul form berhasil dikustomisasi secara penuh!");
      onSaveSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan kustomisasi template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full h-full max-w-[1400px] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER MODUL */}
        <div className="bg-white px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-600" /> Kustomisasi Penuh Modul Asesor
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 hidden md:block">
              Ubah struktur form, label, hingga instruksi prompt AI. Modifikasi ini tidak akan merusak template milik Admin.
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" className="h-10 w-10 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* TAB NAVIGASI */}
        <div className="flex px-5 pt-3 bg-white border-b border-slate-200 shrink-0 gap-4 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('form')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'form' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <FormInput className="w-4 h-4"/> Struktur Form Builder
          </button>
          <button onClick={() => setActiveTab('ai')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'ai' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <BrainCircuit className="w-4 h-4"/> Otak AI & Prompting
          </button>
        </div>

        {/* AREA KERJA (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/50">
          <div className="max-w-5xl mx-auto">
            
            {/* ======================================================== */}
            {/* TAB 1: FORM BUILDER LENGKAP */}
            {/* ======================================================== */}
            {activeTab === 'form' && (
              <div className="space-y-6">
                <div className="space-y-1.5 mb-8 bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Judul Modul Anda</label>
                  <Input 
                    value={templateState.trackName} 
                    onChange={(e) => setTemplateState({...templateState, trackName: e.target.value})}
                    className="bg-slate-50 border-slate-200 font-black text-lg h-12"
                  />
                </div>

                {(!templateState.steps || templateState.steps.length === 0) ? (
                  <div className="text-center p-12 bg-white rounded-3xl ring-1 ring-slate-200 border border-dashed border-slate-300">
                    <p className="text-slate-400 font-bold text-sm">Belum ada langkah formulir.</p>
                  </div>
                ) : (
                  templateState.steps.map((step, sIdx) => {
                    const isExpanded = expandedSteps.includes(sIdx);
                    return (
                      <div key={`step-${sIdx}`} className="bg-white rounded-[2rem] ring-1 ring-slate-200/80 shadow-sm overflow-hidden transition-all duration-300 mb-6">
                        <div className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'hover:bg-slate-50/50'}`} onClick={() => toggleStepExpansion(sIdx)}>
                          <div className="flex items-center gap-4 flex-1">
                            <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black shrink-0 ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{step.stepNumber}</span>
                            {isExpanded ? (
                              <Input 
                                value={step.title} 
                                onChange={e => { const newSteps = [...templateState.steps]; newSteps[sIdx].title = e.target.value; setTemplateState({ ...templateState, steps: newSteps }); }} 
                                onClick={e => e.stopPropagation()} className="bg-slate-800 border-slate-700 text-white font-bold h-9 w-full max-w-xs text-sm rounded-xl" 
                              />
                            ) : (
                              <h3 className="font-bold text-slate-800 text-sm sm:text-base">{step.title} <span className="text-slate-400 text-xs font-medium ml-2">({step.fields?.length || 0} Pertanyaan)</span></h3>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isExpanded && <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setStepToDelete(sIdx); }} className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 px-2.5 rounded-xl text-xs font-bold mr-1 hidden sm:flex">Hapus Step</Button>}
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
                                    <div className="space-y-1 md:col-span-2">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deskripsi (Opsional)</label>
                                      <Input value={field.description || ''} onChange={e => updateField(sIdx, fIdx, 'description', e.target.value)} className="bg-white border-slate-200 h-9 rounded-lg font-medium text-slate-600 text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Input</label>
                                      <select value={field.type} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'type', e.target.value as FieldType)} className="w-full border border-slate-200 h-10 rounded-xl text-xs px-3 bg-white text-slate-800 font-medium">
                                        <option value="text">Teks Pendek</option>
                                        <option value="textarea">Teks Panjang</option>
                                        <option value="number">Angka / Nominal</option>
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
                                        <input type="checkbox" checked={field.required} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'required', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" /> Wajib Diisi
                                      </label>
                                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input type="checkbox" checked={field.gridSpan === 2} onChange={e => updateField(sIdx, fIdx, 'gridSpan', e.target.checked ? 2 : 1)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" /> Lebar Penuh (100%)
                                      </label>
                                    </div>

                                    {/* LOGIKA BERCABANG */}
                                    {!isPrimaryIdentity && (
                                      <div className="md:col-span-2 space-y-2 p-3.5 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                        <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-indigo-600"/> Logika Aliran Cabang Pertanyaan (Tampil Jika...)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                          <select value={field.showIf ? "conditional" : "always"} onChange={(e) => { if (e.target.value === "always") { updateField(sIdx, fIdx, 'showIf', undefined); } else { const avail = getAllAvailableFields(); updateField(sIdx, fIdx, 'showIf', { fieldId: avail[0]?.id || '', equals: '' }); } }} className="border border-slate-200 h-9 rounded-lg text-xs px-2 bg-white text-slate-700">
                                            <option value="always">Tampilkan Selalu</option>
                                            <option value="conditional">Tampilkan Kondisional...</option>
                                          </select>
                                          {field.showIf && (
                                            <>
                                              <select value={field.showIf.fieldId} onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, fieldId: e.target.value, equals: '' })} className="border border-slate-200 h-9 rounded-lg text-xs px-2 bg-white text-slate-700">
                                                {getAllAvailableFields().map(f => <option key={f.id} value={f.id}>{f.label} ({f.id})</option>)}
                                              </select>
                                              <Input placeholder="Nilai Pemicu (Cth: Ya)" value={String(field.showIf.equals || '')} onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, equals: e.target.value })} className="bg-white border-slate-200 h-9 text-xs rounded-lg" />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* SCORING MATRIX */}
                                    {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && !isPrimaryIdentity && (
                                      <div className="md:col-span-2 space-y-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opsi Jawaban & Matrix Bobot AI (0-100)</label>
                                        <div className="space-y-2">
                                          {(field.options || []).map((opt, optIdx) => {
                                            const isObj = typeof opt === 'object' && opt !== null;
                                            const optLabel = isObj ? opt.label : String(opt);
                                            const optWeight = isObj ? opt.weight : 0;
                                            return (
                                              <div key={optIdx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                                                <Input value={optLabel} onChange={e => { const newOpts = [...(field.options || [])]; newOpts[optIdx] = { label: e.target.value, weight: optWeight }; updateField(sIdx, fIdx, 'options', newOpts); }} className="h-8 text-xs bg-white flex-1" />
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <span className="text-[9px] font-bold text-indigo-500 uppercase">Bobot:</span>
                                                  <Input type="number" value={optWeight} min={0} max={100} onChange={e => { const newOpts = [...(field.options || [])]; newOpts[optIdx] = { label: optLabel, weight: parseInt(e.target.value) || 0 }; updateField(sIdx, fIdx, 'options', newOpts); }} className="w-14 h-8 text-center text-xs font-bold text-indigo-600 bg-indigo-50/40 border-indigo-100" />
                                                </div>
                                                <Button variant="ghost" onClick={() => { const newOpts = [...(field.options || [])]; newOpts.splice(optIdx, 1); updateField(sIdx, fIdx, 'options', newOpts); }} className="h-8 w-8 text-slate-400 hover:text-rose-500 p-0 rounded-md"><Trash2 className="w-3.5 h-3.5"/></Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => { const newOpts = [...(field.options || [])]; newOpts.push({ label: `Pilihan ${newOpts.length + 1}`, weight: 0 }); updateField(sIdx, fIdx, 'options', newOpts); }} className="w-full h-8 text-[11px] border-dashed font-bold text-slate-500"><Plus className="w-3.5 h-3.5 mr-1"/> Tambah Pilihan Berbobot</Button>
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
                            <Button variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 h-12 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50"><Plus className="h-4 w-4 mr-1.5" /> Tambah Pertanyaan di Langkah Ini</Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <Button onClick={addStep} className="w-full bg-slate-200 text-slate-700 hover:bg-slate-300 h-12 font-bold text-sm rounded-xl mt-4 border-dashed border-2 border-slate-300"><Plus className="h-4 w-4 mr-1.5" /> Tambah Seksi Baru</Button>

                {/* MODAL HAPUS STEP */}
                {stepToDelete !== null && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[1.5rem] p-6 w-full max-w-sm shadow-xl">
                      <h3 className="text-base font-black text-slate-900 text-center">Hapus Langkah Ini?</h3>
                      <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">Seluruh variabel kuesioner di dalamnya akan terhapus permanen.</p>
                      <div className="flex gap-2.5 mt-6">
                        <Button variant="outline" onClick={() => setStepToDelete(null)} className="w-full h-10 text-xs font-bold rounded-xl">Batal</Button>
                        <Button onClick={executeRemoveStep} className="w-full h-10 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Ya, Hapus</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: AI CONFIGURATOR (TANPA TOMBOL GENERATE AI) */}
            {/* ======================================================== */}
            {activeTab === 'ai' && (
              <div className="space-y-8 animate-in fade-in duration-300 pb-10">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                  <h4 className="font-black text-slate-900 flex items-center gap-2 text-md"><Settings className="w-5 h-5 text-indigo-600" /> Kustomisasi Label Visual Laporan</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                     {['score', 'swot', 'risk', 'roadmap', 'execution'].map((key) => (
                       <div key={key} className="space-y-1">
                         <span className="text-[10px] font-bold text-slate-400 capitalize">Label {key}</span>
                         <Input value={(templateState.aiPromptConfig?.customUiLabels as any)?.[`${key}Label`] || ''} onChange={e => updateUiLabel(`${key}Label`, e.target.value)} placeholder="Default..." className="h-9 text-xs bg-white rounded-lg" />
                       </div>
                     ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                  <div className="space-y-6">
                    <h4 className="font-black text-slate-900 border-l-4 border-indigo-600 pl-3">Karakter Dasar AI</h4>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Persona & Peran AI</label>
                      <Input value={templateState.aiPromptConfig?.aiPersona || ''} onChange={e => updateAiConfig('aiPersona', e.target.value)} placeholder="Contoh: Konselor Bisnis" className="rounded-xl h-11 bg-white font-medium border-slate-200 shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Fokus Analisis</label>
                      <Textarea value={templateState.aiPromptConfig?.assessmentGoal || ''} onChange={e => updateAiConfig('assessmentGoal', e.target.value)} className="rounded-xl bg-white border-slate-200 min-h-[100px] font-medium text-sm shadow-sm" />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <h4 className="font-black text-slate-900 border-l-4 border-emerald-600 pl-3">Sifat Penilaian</h4>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Keketatan Skor</label>
                      <select value={templateState.aiPromptConfig?.gradingStrictness || 'standard'} onChange={e => updateAiConfig('gradingStrictness', e.target.value)} className="w-full bg-white border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold shadow-sm focus:outline-none">
                        <option value="supportive">Suportif & Edukatif</option>
                        <option value="standard">Standar Objektif</option>
                        <option value="strict">Sangat Ketat (Audit)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gaya Bahasa</label>
                      <select value={templateState.aiPromptConfig?.reportTone || 'consultative'} onChange={e => updateAiConfig('reportTone', e.target.value)} className="w-full bg-white border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold shadow-sm focus:outline-none">
                        <option value="consultative">Konsultatif & Solutif</option>
                        <option value="investigative">Investigatif & Tajam</option>
                        <option value="academic">Akademis Formal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-black text-slate-900 border-l-4 border-blue-500 pl-3">Skala Kepadatan Output</h4>
                    <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl ring-1 ring-blue-100">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Target Metrik Radar</label>
                        <Input type="number" min={3} max={20} value={templateState.aiPromptConfig?.targetMetricCount || 8} onChange={e => updateAiConfig('targetMetricCount', parseInt(e.target.value))} className="bg-white border-blue-200 font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Target Blok Analisis</label>
                        <Input type="number" min={2} max={15} value={templateState.aiPromptConfig?.targetBlockCount || 6} onChange={e => updateAiConfig('targetBlockCount', parseInt(e.target.value))} className="bg-white border-blue-200 font-bold" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-slate-50/80 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                  <div className="mb-4">
                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Manajemen Blok Analisis</h4>
                  </div>
                  <div className="space-y-4">
                    {(templateState.aiPromptConfig?.expectedAnalysisBlocks || []).map((item, idx) => {
                      const { title, subs } = parseAnalysisBlock(item);
                      return (
                        <div key={idx} className="flex gap-4 items-start bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1 space-y-2">
                              <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Judul Blok</label>
                              <Input value={title} onChange={(e) => updateAnalysisBlock(idx, e.target.value, subs)} className="font-black text-slate-800 bg-slate-50" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Indikator Sub-Poin</label>
                              <Textarea value={subs} onChange={(e) => updateAnalysisBlock(idx, title, e.target.value)} className="text-sm font-medium min-h-[60px]" />
                            </div>
                          </div>
                          <Button type="button" variant="ghost" onClick={() => removeArrayItem('expectedAnalysisBlocks', idx)} className="text-slate-400 hover:text-rose-600 h-10 w-10 mt-6"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      )
                    })}
                    <Button type="button" variant="outline" onClick={() => addArrayItem('expectedAnalysisBlocks', 'Judul Blok Baru: Analisis sub poin')} className="w-full border-dashed border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-2xl h-12 shadow-sm"><Plus className="w-5 h-5 mr-2"/> Tambah Blok Manual</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {standardArrayConfigs.map(config => (
                    <div key={config.key} className="space-y-3 p-5 bg-white shadow-sm rounded-2xl border border-slate-200 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
                      <div>
                        <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">{config.label}</label>
                        <p className="text-xs text-slate-500 font-medium mb-3">{config.description}</p>
                        <div className="space-y-2.5">
                          {(templateState.aiPromptConfig?.[config.key as keyof typeof templateState.aiPromptConfig] as string[] || []).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 group/option">
                              <Textarea value={item} onChange={e => updateArrayItem(config.key, idx, e.target.value)} className="flex-1 py-2.5 bg-slate-50 border-slate-200 min-h-[65px] rounded-xl text-sm font-medium resize-y" />
                              <Button type="button" variant="ghost" onClick={() => removeArrayItem(config.key, idx)} className="h-10 w-10 mt-0.5 text-slate-400 hover:text-rose-600 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => addArrayItem(config.key, '')} className="w-full mt-3 border-dashed border-2 border-slate-300 text-slate-500 font-bold text-xs"><Plus className="h-4 w-4" /> Tambah</Button>
                    </div>
                  ))}
                  <div className="space-y-3 p-5 bg-white shadow-sm rounded-2xl border border-slate-200 md:col-span-2">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">Fokus Mitigasi Risiko</label>
                    <Textarea value={templateState.aiPromptConfig?.riskFramework || ''} onChange={e => updateAiConfig('riskFramework', e.target.value)} className="rounded-xl bg-slate-50 border-slate-200 min-h-[80px] text-sm font-medium" />
                  </div>
                </div>

                <div className="space-y-6 pt-8 border-t border-slate-200">
                  <h4 className="font-black text-slate-900 border-l-4 border-rose-500 pl-3 text-lg">Advanced Prompting</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 p-6 bg-amber-50/40 rounded-3xl border border-amber-100 md:col-span-2">
                      <label className="text-[12px] font-black text-amber-900 uppercase tracking-widest block mb-1">Custom Scoring Rubric</label>
                      <Textarea value={templateState.aiPromptConfig?.customScoringRubric || ''} onChange={e => updateAiConfig('customScoringRubric', e.target.value)} className="rounded-2xl bg-white border-amber-200 min-h-[100px] text-sm" />
                    </div>
                    <div className="space-y-2 p-6 bg-indigo-50/40 rounded-3xl border border-indigo-100 md:col-span-2">
                      <label className="text-[12px] font-black text-indigo-900 uppercase tracking-widest block mb-1">System Rules & If-Then</label>
                      <Textarea value={templateState.aiPromptConfig?.customSystemPrompt || ''} onChange={e => updateAiConfig('customSystemPrompt', e.target.value)} className="rounded-2xl bg-white border-indigo-200 min-h-[120px] text-sm" />
                    </div>
                    <div className="space-y-2 p-6 bg-rose-50/40 rounded-3xl border border-rose-100">
                      <label className="text-[12px] font-black text-rose-900 uppercase tracking-widest block mb-1">Negative Prompts</label>
                      <Textarea value={templateState.aiPromptConfig?.negativePrompts || ''} onChange={e => updateAiConfig('negativePrompts', e.target.value)} className="rounded-2xl bg-white border-rose-200 min-h-[100px] text-sm" />
                    </div>
                    <div className="space-y-2 p-6 bg-emerald-50/40 rounded-3xl border border-emerald-100">
                      <label className="text-[12px] font-black text-emerald-900 uppercase tracking-widest block mb-1">Format Teks Output</label>
                      <Textarea value={templateState.aiPromptConfig?.formatInstructions || ''} onChange={e => updateAiConfig('formatInstructions', e.target.value)} className="rounded-2xl bg-white border-emerald-200 min-h-[100px] text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-white px-5 sm:px-8 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="font-bold rounded-xl h-11 border-slate-200">Batal</Button>
          <Button onClick={handleSaveTemplate} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-8 shadow-sm">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Simpan & Terapkan
          </Button>
        </div>

      </div>
    </div>
  );
}