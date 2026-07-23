'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';
import { ChevronUp, ChevronDown, Trash2, Sparkles, ArrowUp, ArrowDown, Plus, GitBranch, Save, Loader2, Bot } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase'; 
import { toast } from 'sonner';

interface TabFormBuilderProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
  onAutoSave?: (templateToSave?: FormTemplate) => Promise<void>;
}

export function TabFormBuilder({ template, onChange, onAutoSave }: TabFormBuilderProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [stepToDelete, setStepToDelete] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhancingStepIndex, setEnhancingStepIndex] = useState<number | null>(null);

  const templateRef = useRef<FormTemplate>(template);
  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  const isWaitingForAI = useRef(false);

  useEffect(() => {
    if (!template.id) return;
    
    const unsubscribe = onSnapshot(doc(db, "form_templates", template.id), (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        const status = docData.aiGenerationStatus;

        if (status) {
          const isProcessing = ['RESEARCHING', 'BUILDING_FORM'].includes(status.phase);
          
          if (isProcessing) {
            setIsGenerating(true);
            isWaitingForAI.current = true;
          } else if (status.phase === 'COMPLETED' || status.phase === 'FAILED') {
            setIsGenerating(false);
            
            if (status.phase === 'COMPLETED' && isWaitingForAI.current && docData.steps) {
              onChange({ ...templateRef.current, steps: docData.steps });
              isWaitingForAI.current = false;
            }
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

  // PERBAIKAN: Mencegah Form Submit bawaan & Mengunci Status AI
  const handleManualSave = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onAutoSave) {
      await onAutoSave(template);
    } else {
      try {
        await updateDoc(doc(db, "form_templates", template.id), {
          steps: template.steps,
          lastUpdated: new Date().toISOString(),
          // Paksa AI untuk standby agar tidak ada trigger tak terduga
          "aiGenerationStatus.phase": "COMPLETED",
          "aiGenerationStatus.message": "Formulir disimpan secara manual oleh Admin."
        });
        toast.success("Formulir berhasil disimpan secara permanen!");
      } catch (e: any) {
        toast.error("Gagal menyimpan perubahan: " + e.message);
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

  const handleEnhanceStep = async (stepIndex: number, stepData: FormStep) => {
    if (!stepData.fields || stepData.fields.length === 0) {
      toast.warning("Seksi ini masih kosong.", { description: "Harap buat minimal 1 pertanyaan mentah terlebih dahulu." });
      return;
    }

    setEnhancingStepIndex(stepIndex);
    
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const enhanceStepFn = httpsCallable(functions, 'enhanceStepLogic');
      
      const response = await enhanceStepFn({
        trackName: template.trackName,
        templateId: template.id,
        stepTitle: stepData.title,
        stepFields: stepData.fields,
        aiPromptConfig: template.aiPromptConfig
      });

      const data = response.data as { success: boolean, fields: FormField[] };
      
      if (data.success && data.fields && data.fields.length > 0) {
        const newSteps = [...template.steps];
        newSteps[stepIndex].fields = data.fields;
        onChange({ ...template, steps: newSteps });
        toast.success("Berhasil!", { description: `Seksi "${stepData.title}" berhasil disempurnakan secara massal oleh AI.` });
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyempurnakan seksi: " + error.message);
    } finally {
      setEnhancingStepIndex(null);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-indigo-50/50 border border-dashed border-indigo-200 rounded-[2rem] text-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <h3 className="font-black text-xl text-indigo-900">Sistem AI Sedang Meracik Formulir...</h3>
        <p className="text-sm font-medium text-indigo-600/70">Silakan pantau progress di tab System Logs atau tab Otak AI.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl ring-1 ring-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Bot className="w-5 h-5"/></div>
          <div>
            <h4 className="font-black text-slate-800 text-sm">Visual Editor Formulir</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hasil Generasi Otak AI</p>
          </div>
        </div>
        {/* PERBAIKAN: Menambahkan type="button" untuk mencegah form parent ter-submit */}
        <Button type="button" onClick={handleManualSave} variant="outline" className="bg-slate-900 text-white hover:bg-slate-800 font-bold hidden sm:flex gap-2 rounded-xl h-10 shadow-sm">
          <Save className="w-4 h-4" /> Simpan Form
        </Button>
      </div>

      {(!template.steps || template.steps.length === 0) ? (
        <div className="text-center p-12 bg-white rounded-3xl ring-1 ring-slate-200 border border-dashed border-slate-300">
          <p className="text-slate-400 font-bold text-sm">Belum ada langkah formulir yang dibuat. Silakan kembali ke tab <b className="text-slate-700">Otak AI</b> dan tekan tombol <b>Generate</b>.</p>
        </div>
      ) : (
        template.steps.map((step, sIdx) => {
          const isExpanded = expandedSteps.includes(sIdx);
          const isStepBeingEnhanced = enhancingStepIndex === sIdx;
          
          return (
            <div key={`step-${sIdx}`} className={`bg-white rounded-[2rem] ring-1 ring-slate-200/80 shadow-sm overflow-hidden transition-all duration-300 ${isStepBeingEnhanced ? 'opacity-70 pointer-events-none' : ''}`}>
              
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
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); handleEnhanceStep(sIdx, step); }} 
                      disabled={isStepBeingEnhanced}
                      className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 hover:text-indigo-300 h-8 px-3 rounded-xl text-[10px] font-black mr-1 hidden sm:flex items-center gap-1.5 transition-all"
                    >
                      {isStepBeingEnhanced ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isStepBeingEnhanced ? 'Meracik...' : 'AI Enhance Seksi'}
                    </Button>
                  )}
                  
                  {isExpanded && (
                    <Button type="button" variant="ghost" onClick={(e) => { e.stopPropagation(); setStepToDelete(sIdx); }} className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 px-2.5 rounded-xl text-xs font-bold mr-1 hidden sm:flex">
                      Hapus Step
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-6 bg-slate-50/40 space-y-6 border-t border-slate-100">
                  {step.fields?.map((field, fIdx) => {
                    const isPrimaryIdentity = ['namaUsaha', 'namaPengisi'].includes(field.id);
                    
                    return (
                      <div key={`field-${sIdx}-${fIdx}`} className={`p-4 sm:p-5 rounded-2xl ring-1 shadow-sm flex flex-col md:flex-row gap-5 relative transition-all ${isPrimaryIdentity ? 'bg-indigo-50/20 ring-indigo-100/60' : 'bg-white ring-slate-200/70 hover:ring-indigo-200'}`}>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          <div className="space-y-1 md:col-span-2 relative">
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

                          {/* --- LOGIKA BERCABANG (SHOW-IF) --- */}
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
                                      <option value="" disabled>Pilih Pertanyaan Pemicu...</option>
                                      {getAllAvailableFields().map(f => (
                                        <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                                      ))}
                                    </select>
                                    
                                    {/* BLOK PINTAR: Merubah input menjadi Dropdown jika pertanyaan pemicu memiliki opsi */}
                                    {(() => {
                                      const targetField = getAllAvailableFields().find(f => f.id === field.showIf?.fieldId);
                                      
                                      if (targetField && targetField.options && targetField.options.length > 0) {
                                        return (
                                          <select 
                                            value={String(field.showIf?.equals || '')} 
                                            onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, equals: e.target.value })}
                                            className="border border-slate-200 h-9 rounded-lg text-xs px-2 bg-white text-slate-700 font-bold"
                                          >
                                            <option value="" disabled>Pilih Jawaban Pemicu...</option>
                                            {targetField.options.map((opt: any, i: number) => {
                                              const optLabel = typeof opt === 'object' ? opt.label : opt;
                                              return <option key={i} value={optLabel}>{optLabel}</option>;
                                            })}
                                          </select>
                                        );
                                      }
                                      
                                      // Fallback jika pertanyaan pemicu bertipe Text biasa
                                      return (
                                        <Input 
                                          placeholder="Ketik Nilai Pemicu (Cth: Ya)" 
                                          value={String(field.showIf?.equals || '')} 
                                          onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, equals: e.target.value })}
                                          className="bg-white border-slate-200 h-9 text-xs rounded-lg"
                                        />
                                      );
                                    })()}
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
                                      <Button type="button" variant="ghost" onClick={() => {
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
                              <Button type="button" variant="outline" size="sm" onClick={() => {
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
                  <Button type="button" variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 h-12 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50"><Plus className="h-4 w-4 mr-1.5" /> Tambah Kuesioner Pertanyaan</Button>
                </div>
              )}
            </div>
          );
        })
      )}

      <Button type="button" onClick={addStep} className="w-full bg-slate-200 text-slate-700 hover:bg-slate-300 h-12 font-bold text-sm rounded-xl mt-4 border-dashed border-2 border-slate-300"><Plus className="h-4 w-4 mr-1.5" /> Tambah Seksi Langkah Baru (Manual)</Button>

      {/* DIALOG MODAL CONFIRM DELETE STEP */}
      {stepToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[1.5rem] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-black text-slate-900 text-center">Hapus Langkah Formulir Ini?</h3>
            <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">Seluruh susunan variabel kuesioner di dalam seksi langkah ini akan terhapus secara permanen.</p>
            <div className="flex gap-2.5 mt-6">
              <Button type="button" variant="outline" onClick={() => setStepToDelete(null)} className="w-full h-10 text-xs font-bold rounded-xl">Batal</Button>
              <Button type="button" onClick={executeRemoveStep} className="w-full h-10 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Ya, Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}