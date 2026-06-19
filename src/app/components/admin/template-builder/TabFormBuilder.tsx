// src/app/components/admin/template-builder/TabFormBuilder.tsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';
import { ChevronUp, ChevronDown, Trash2, Sparkles, ArrowUp, ArrowDown, Plus, Bot, Loader2, GitBranch } from 'lucide-react';
import { FORM_ARCHETYPES } from '@/data/templateform';

import { getFunctions, httpsCallable } from 'firebase/functions'; 

interface TabFormBuilderProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabFormBuilder({ template, onChange }: TabFormBuilderProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [stepToDelete, setStepToDelete] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>(FORM_ARCHETYPES[0].id);

  // Helper untuk mendapatkan semua field yang sudah ada di template (untuk target showIf)
  const getAllAvailableFields = () => {
    const fields: { id: string; label: string; options?: any[] }[] = [];
    template.steps.forEach(step => {
      step.fields.forEach(f => {
        if (f.id !== 'namaUsaha') {
          fields.push({ id: f.id, label: f.label, options: f.options });
        }
      });
    });
    return fields;
  };

  const handleGenerateFormByAI = async () => {
    if (!template.aiPromptConfig || !template.aiPromptConfig.assessmentGoal) {
      alert("Mohon isi 'Tujuan Asesmen Utama' di Tab AI Config terlebih dahulu agar AI memahami konteks form yang harus dibuat.");
      return;
    }

    if (template.steps.length > 0) {
      const confirmOverwrite = confirm("PERINGATAN: Membuat form dengan AI akan MENGHAPUS dan MENIMPA semua langkah formulir Anda saat ini. Lanjutkan?");
      if (!confirmOverwrite) return;
    }

    setIsGenerating(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2'); 
      const generateFormFn = httpsCallable(functions, 'generateFormTemplateFromAI', {
        timeout: 300000 
      });
      
      const archetypeConfig = FORM_ARCHETYPES.find(a => a.id === selectedArchetypeId);

      const result = await generateFormFn({
        trackName: template.trackName || "Evaluasi Umum",
        aiPromptConfig: template.aiPromptConfig, 
        archetypeInstruction: archetypeConfig?.aiInstruction || ''
      });

      const generatedSteps = result.data as FormStep[];

      if (generatedSteps && generatedSteps.length > 0) {
        onChange({ ...template, steps: generatedSteps });
        setExpandedSteps([0]); 
        alert("Formulir berstandar Enterprise berhasil dibuat oleh AI sesuai dengan gaya yang dipilih!");
      } else {
        throw new Error("Hasil dari AI kosong.");
      }
    } catch (error: any) {
      console.error("Gagal men-generate form dengan AI:", error);
      alert(`Terjadi kesalahan saat menghubungi AI: ${error.message || 'Silakan coba lagi.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleStepExpansion = (stepIndex: number) => {
    setExpandedSteps(prev => prev.includes(stepIndex) ? prev.filter(idx => idx !== stepIndex) : [...prev, stepIndex]);
  };

  const addStep = () => {
    const newIdx = template.steps.length;
    const newStep: FormStep = { stepNumber: newIdx + 1, title: `Langkah ${newIdx + 1}`, fields: [] };
    onChange({ ...template, steps: [...template.steps, newStep] });
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
    const newField: FormField = { id: `field_${Date.now().toString().slice(-4)}`, label: "Pertanyaan Baru", type: "text", required: false, gridSpan: 2 };
    const newSteps = [...template.steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], fields: [...newSteps[stepIndex].fields, newField] };
    onChange({ ...template, steps: newSteps });
  };

  const updateField = (stepIndex: number, fieldIndex: number, key: keyof FormField, value: any) => {
    const newSteps = [...template.steps];
    const newFields = [...newSteps[stepIndex].fields];
    newFields[fieldIndex] = { ...newFields[fieldIndex], [key]: value };
    newSteps[stepIndex] = { ...newSteps[stepIndex], fields: newFields };
    onChange({ ...template, steps: newSteps });
  };

  const generateAutoIdFromLabel = (stepIndex: number, fieldIndex: number) => {
    const label = template.steps[stepIndex].fields[fieldIndex].label;
    const cleanedId = label.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    updateField(stepIndex, fieldIndex, 'id', cleanedId || `field_${Date.now().toString().slice(-3)}`);
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    const newSteps = [...template.steps];
    const newFields = [...newSteps[stepIndex].fields];
    newFields.splice(fieldIndex, 1);
    newSteps[stepIndex] = { ...newSteps[stepIndex], fields: newFields };
    onChange({ ...template, steps: newSteps });
  };

  const moveField = (stepIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    const newSteps = [...template.steps];
    const newFields = [...newSteps[stepIndex].fields];
    if (direction === 'up' && fieldIndex > 0) {
      [newFields[fieldIndex - 1], newFields[fieldIndex]] = [newFields[fieldIndex], newFields[fieldIndex - 1]];
    } else if (direction === 'down' && fieldIndex < newFields.length - 1) {
      [newFields[fieldIndex], newFields[fieldIndex + 1]] = [newFields[fieldIndex + 1], newFields[fieldIndex]];
    }
    newSteps[stepIndex] = { ...newSteps[stepIndex], fields: newFields };
    onChange({ ...template, steps: newSteps });
  };

  return (
    <div className="space-y-4">
      {/* UI BANNER AI FORM BUILDER */}
      <div className="flex flex-col p-5 bg-indigo-50/70 rounded-3xl ring-1 ring-indigo-100 border border-indigo-200/50 mb-6 gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        <div className="pl-2">
          <h4 className="font-black text-indigo-900 flex items-center gap-2 text-lg">
            <Bot className="w-6 h-6 text-indigo-600" />
            AI Form Builder Enterprise
          </h4>
          <p className="text-sm text-indigo-700/80 font-medium mt-1.5 max-w-2xl leading-relaxed">
            AI akan menyusun pertanyaan, matriks skor rahasia, serta logika bersyarat <i>(conditional branch)</i> secara otomatis berbasis kebutuhan industri.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pl-2 items-end">
          <div className="w-full md:w-2/3 space-y-2">
            <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Pilih Gaya Formulir (Archetype):</label>
            <select 
              value={selectedArchetypeId} 
              onChange={(e) => setSelectedArchetypeId(e.target.value)}
              className="w-full h-12 rounded-xl border-indigo-200 bg-white text-indigo-950 font-medium px-4 focus:ring-indigo-500 shadow-sm text-sm"
            >
              {FORM_ARCHETYPES.map((arch) => (
                <option key={arch.id} value={arch.id}>{arch.name} - {arch.description}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleGenerateFormByAI}
            disabled={isGenerating}
            className={`w-full md:w-1/3 font-bold h-12 px-6 rounded-xl shadow-sm transition-all duration-300 ${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md hover:-translate-y-0.5'}`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Menganalisis...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Generate Otomatis
              </span>
            )}
          </Button>
        </div>
      </div>

      {template.steps.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-3xl ring-1 ring-slate-200">
          <p className="text-slate-500 font-medium">Belum ada langkah formulir.</p>
        </div>
      ) : (
        template.steps.map((step, sIdx) => {
          const isExpanded = expandedSteps.includes(sIdx);
          return (
            <div key={`step-${sIdx}`} className="bg-white rounded-[2rem] ring-1 ring-slate-200 shadow-sm overflow-hidden transition-all duration-300">
              <div 
                className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                onClick={() => toggleStepExpansion(sIdx)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shrink-0 ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {step.stepNumber}
                  </span>
                  {isExpanded ? (
                    <Input 
                      value={step.title} 
                      onChange={e => {
                        const newSteps = [...template.steps];
                        newSteps[sIdx] = { ...newSteps[sIdx], title: e.target.value };
                        onChange({ ...template, steps: newSteps });
                      }} 
                      onClick={e => e.stopPropagation()}
                      className="bg-slate-800 border-slate-700 text-white font-bold h-9 w-full max-w-sm focus-visible:ring-indigo-500" 
                    />
                  ) : (
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg">{step.title} <span className="text-slate-400 text-sm font-medium ml-2 hidden sm:inline">({step.fields.length} Pertanyaan)</span></h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isExpanded && (
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setStepToDelete(sIdx); }} className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 px-3 rounded-xl text-xs font-bold mr-2 hidden sm:flex">
                      Hapus Step
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-8 bg-slate-50/50 space-y-6 border-t border-slate-100 relative z-0">
                  {step.fields.map((field, fIdx) => {
                    const isPrimaryIdentity = field.id === 'namaUsaha' || field.id === 'namaPengisi' || field.id === 'emailAktif' || field.id === 'nomorTelepon';
                    return (
                      <div key={`field-${sIdx}-${fIdx}`} className={`p-5 sm:p-6 rounded-2xl ring-1 shadow-sm flex flex-col md:flex-row gap-6 relative group transition-all ${isPrimaryIdentity ? 'bg-indigo-50/30 ring-indigo-200/60' : 'bg-white ring-slate-200 hover:ring-indigo-200 hover:shadow-md'}`}>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">Label Pertanyaan</label>
                            <Input value={field.label} onChange={e => updateField(sIdx, fIdx, 'label', e.target.value)} className="bg-white border-slate-200 h-11 rounded-xl font-bold text-slate-900" />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                             <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Keterangan Tambahan</label>
                             <Input value={field.description || ''} onChange={e => updateField(sIdx, fIdx, 'description', e.target.value)} className="bg-white border-slate-200 h-10 rounded-xl text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tipe Input</label>
                            <select value={field.type} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'type', e.target.value as FieldType)} className="w-full border border-slate-200 h-10 rounded-xl text-sm px-3 bg-white">
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
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                              <span>Key Data (ID Database)</span>
                              {!isPrimaryIdentity && <button type="button" onClick={() => generateAutoIdFromLabel(sIdx, fIdx)} className="text-indigo-600 text-[10px] font-black flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md"><Sparkles className="w-3 h-3"/> Auto-Gen</button>}
                            </label>
                            <Input value={field.id} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'id', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="bg-white border-slate-200 text-indigo-700 h-10 rounded-xl text-sm font-mono" />
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={field.required} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'required', e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                              Wajib Diisi {isPrimaryIdentity && <span className="text-[10px] text-slate-400 font-normal ml-1">(Sistem Kuncian)</span>}
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={field.gridSpan === 2} onChange={e => updateField(sIdx, fIdx, 'gridSpan', e.target.checked ? 2 : 1)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                              Lebar Penuh (100%)
                            </label>
                          </div>

                          {/* ================================================================= */}
                          {/* FITUR BARU: UI CONFIG LOGIKA BERCABANG (CONDITIONAL LOGIC) */}
                          {/* ================================================================= */}
                          {!isPrimaryIdentity && (
                            <div className="md:col-span-2 space-y-3 mt-2 p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/80">
                              <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-indigo-600"/> Logika Bercabang (Conditional Visibility)
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                  className="border border-slate-200 h-10 rounded-xl text-xs px-3 bg-white"
                                >
                                  <option value="always">Selalu Tampilkan Pertanyaan Ini</option>
                                  <option value="conditional">Tampilkan Hanya Jika...</option>
                                </select>

                                {field.showIf && (
                                  <>
                                    <select
                                      value={field.showIf.fieldId}
                                      onChange={(e) => {
                                        const found = getAllAvailableFields().find(f => f.id === e.target.value);
                                        updateField(sIdx, fIdx, 'showIf', { ...field.showIf, fieldId: e.target.value, equals: '' });
                                      }}
                                      className="border border-slate-200 h-10 rounded-xl text-xs px-3 bg-white"
                                    >
                                      {getAllAvailableFields().map(f => (
                                        <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                                      ))}
                                    </select>

                                    <Input
                                      placeholder="Nilai jawaban yang memicu (Cth: Ya)"
                                      value={String(field.showIf.equals || '')}
                                      onChange={(e) => updateField(sIdx, fIdx, 'showIf', { ...field.showIf, equals: e.target.value })}
                                      className="bg-white border-slate-200 h-10 rounded-xl text-xs"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {field.type === 'file' && !isPrimaryIdentity && (
                            <div className="md:col-span-2 space-y-1.5 mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Format Dokumen Spesifik (Opsional)</label>
                              <div className="flex flex-wrap gap-x-6 gap-y-3">
                                {[
                                  { label: 'PDF (.pdf)', value: '.pdf' },
                                  { label: 'Gambar (JPG, PNG)', value: 'image/*' },
                                  { label: 'Word (.doc, .docx)', value: '.doc,.docx' },
                                  { label: 'Excel (.xls, .xlsx)', value: '.xls,.xlsx' },
                                  { label: 'Presentasi (.ppt)', value: '.ppt,.pptx' },
                                  { label: 'Arsip (.zip, .rar)', value: '.zip,.rar' }
                                ].map(ext => {
                                  const currentAccepts = field.fileAccept ? field.fileAccept.split(',') : [];
                                  const extValues = ext.value.split(',');
                                  const isChecked = extValues.every(val => currentAccepts.includes(val));
                                  return (
                                    <label key={ext.label} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                      <input type="checkbox" checked={isChecked} onChange={(e) => {
                                        let newAccepts = [...currentAccepts];
                                        if (e.target.checked) {
                                          extValues.forEach(val => { if (!newAccepts.includes(val)) newAccepts.push(val); });
                                        } else {
                                          newAccepts = newAccepts.filter(val => !extValues.includes(val));
                                        }
                                        updateField(sIdx, fIdx, 'fileAccept', newAccepts.join(','));
                                      }} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"/>
                                      {ext.label}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* ================================================================= */}
                          {/* ADJUSTMENT UTAMA: OPSI PILIHAN DENGAN MATRIKS SKOR RAHASIA (WEIGHT) */}
                          {/* ================================================================= */}
                          {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && !isPrimaryIdentity && (
                            <div className="md:col-span-2 space-y-3 mt-2 p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Daftar Opsi Jawaban & Bobot Nilai</label>
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Scoring Matrix Enabled</span>
                              </div>
                              <div className="space-y-2.5">
                                {(field.options || []).map((opt, optIdx) => {
                                  // Parser: Antisipasi jika format data bertipe string lama atau objek baru
                                  const isObj = typeof opt === 'object' && opt !== null;
                                  const optLabel = isObj ? opt.label : String(opt);
                                  const optWeight = isObj ? opt.weight : 0;

                                  return (
                                    <div key={optIdx} className="flex items-center gap-3 bg-white p-2 border border-slate-200/60 rounded-xl shadow-sm">
                                      <div className="flex-1 space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Label Opsi</span>
                                        <Input 
                                          value={optLabel} 
                                          onChange={e => {
                                            const newOpts = [...(field.options || [])];
                                            newOpts[optIdx] = { label: e.target.value, weight: optWeight };
                                            updateField(sIdx, fIdx, 'options', newOpts);
                                          }} 
                                          className="bg-white border-slate-200 h-9" 
                                        />
                                      </div>
                                      
                                      <div className="w-24 space-y-1 shrink-0">
                                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider pl-1">Bobot (0-100)</span>
                                        <Input 
                                          type="number" 
                                          value={optWeight} 
                                          min={0} max={100}
                                          onChange={e => {
                                            const newOpts = [...(field.options || [])];
                                            newOpts[optIdx] = { label: optLabel, weight: parseInt(e.target.value) || 0 };
                                            updateField(sIdx, fIdx, 'options', newOpts);
                                          }} 
                                          className="bg-indigo-50/30 border-indigo-100 h-9 text-center text-indigo-600 font-bold" 
                                        />
                                      </div>

                                      <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                          const newOpts = [...(field.options || [])];
                                          newOpts.splice(optIdx, 1);
                                          updateField(sIdx, fIdx, 'options', newOpts);
                                        }} 
                                        className="text-slate-400 hover:text-rose-600 self-end h-9 mt-4"
                                      >
                                        <Trash2 className="h-4 w-4"/>
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  const newOpts = [...(field.options || [])];
                                  newOpts.push({ label: `Pilihan ${newOpts.length + 1}`, weight: 0 });
                                  updateField(sIdx, fIdx, 'options', newOpts);
                                }} 
                                className="w-full mt-2 border-dashed h-10 text-xs font-bold"
                              >
                                <Plus className="h-4 w-4 mr-2"/> Tambah Opsi Berbobot
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex md:flex-col gap-2 items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                          <button type="button" onClick={() => moveField(sIdx, fIdx, 'up')} disabled={fIdx === 0} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => moveField(sIdx, fIdx, 'down')} disabled={fIdx === step.fields.length - 1} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeField(sIdx, fIdx)} disabled={isPrimaryIdentity} className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 h-14 font-bold text-slate-500 rounded-2xl hover:bg-indigo-50"><Plus className="h-5 w-5 mr-2" /> Tambah Pertanyaan</Button>
                </div>
              )}
            </div>
          );
        })
      )}
      <Button onClick={addStep} className="w-full bg-slate-900 text-white hover:bg-slate-800 h-14 font-black rounded-2xl shadow-lg mt-6"><Plus className="h-5 w-5 mr-2" /> Buat Langkah Baru</Button>

      {stepToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Hapus Langkah Ini?</h3>
            <p className="text-sm text-slate-500 text-center font-medium mb-8">Anda akan menghapus langkah ini beserta seluruh pertanyaannya.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStepToDelete(null)} className="w-full h-12 font-bold">Batal</Button>
              <Button onClick={executeRemoveStep} className="w-full h-12 font-bold bg-rose-600 hover:bg-rose-700 text-white">Ya, Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}