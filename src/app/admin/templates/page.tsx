// src/app/admin/templates/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Save, Trash2, ArrowLeft, GripVertical, 
  Settings2, LayoutGrid, CheckCircle2, AlertCircle,
  Copy, ArrowUp, ArrowDown, Eye, Edit3, Sparkles,
  Upload, Download
} from 'lucide-react';
import Link from 'next/link';

export default function TemplateBuilderPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewStepIdx, setPreviewStepIdx] = useState(0);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'form_templates'));
      const loadedTemplates: FormTemplate[] = [];
      querySnapshot.forEach((doc) => {
        loadedTemplates.push(doc.data() as FormTemplate);
      });
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error("Gagal memuat template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (!importedData.steps || !Array.isArray(importedData.steps)) {
          alert('Format file JSON tidak valid. Pastikan file ini adalah hasil export template.');
          return;
        }

        const newTemplate: FormTemplate = {
          ...importedData,
          id: `track_imported_${Date.now()}`,
          trackName: `${importedData.trackName || 'Imported'} (Imported)`,
          isActive: false, 
          lastUpdated: new Date().toISOString(),
        };

        setActiveTemplate(newTemplate);
        setIsPreviewMode(false);
        alert('Template berhasil diimpor ke workspace editor! Klik tombol "Simpan" untuk mengabadikannya ke database.');
      } catch (error) {
        alert('Gagal membaca file JSON. Pastikan file tidak korup atau memiliki format yang benar.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportTemplate = () => {
    if (!activeTemplate) return;
    
    const dataStr = JSON.stringify(activeTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const safeName = activeTemplate.trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'template';
    const exportFileDefaultName = `${safeName}_export.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const createNewTemplate = () => {
    const newId = `track_${Date.now()}`;
    const newTemplate: FormTemplate = {
      id: newId,
      trackName: "Kategori Baru",
      trackDescription: "Deskripsi singkat kategori ini.",
      trackIcon: "LayoutGrid",
      isActive: false,
      version: 1,
      lastUpdated: new Date().toISOString(),
      aiPromptConfig: {
        aiPersona: "Dewan Juri Krenova & Pakar Inovasi Daerah",
        assessmentGoal: "Mengevaluasi orisinalitas ide, potensi implementasi, dan dampak sosial yang terukur.",
        expectedMetrics: ["Inovasi Produk", "Potensi Pasar", "Keberlanjutan"],
        expectedRecommendations: ["Strategi Pengembangan", "Roadmap Implementasi"]
      },
      steps: [
        {
          stepNumber: 1,
          title: "Informasi Dasar",
          fields: []
        }
      ]
    };
    setActiveTemplate(newTemplate);
    setIsPreviewMode(false);
  };

  const duplicateTemplate = () => {
    if (!activeTemplate) return;
    const newId = `track_copy_${Date.now()}`;
    const clonedTemplate: FormTemplate = {
      ...activeTemplate,
      id: newId,
      trackName: `${activeTemplate.trackName} (Salinan)`,
      isActive: false,
      lastUpdated: new Date().toISOString(),
    };
    setActiveTemplate(clonedTemplate);
    setIsPreviewMode(false);
    alert('Kategori berhasil digandakan ke workspace editor! Klik tombol "Simpan" untuk mengabadikannya ke database.');
  };

  const saveTemplate = async () => {
    if (!activeTemplate) return;
    setIsSaving(true);
    try {
      const templateToSave = { ...activeTemplate, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'form_templates', templateToSave.id), templateToSave);
      
      setTemplates(prev => {
        const exists = prev.find(t => t.id === templateToSave.id);
        if (exists) return prev.map(t => t.id === templateToSave.id ? templateToSave : t);
        return [...prev, templateToSave];
      });
      alert('Template berhasil disimpan!');
    } catch (error) {
      console.error("Gagal menyimpan template:", error);
      alert('Gagal menyimpan template.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Yakin ingin menghapus template ini permanen?')) return;
    try {
      await deleteDoc(doc(db, 'form_templates', id));
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (activeTemplate?.id === id) setActiveTemplate(null);
    } catch (error) {
      console.error("Gagal menghapus:", error);
    }
  };

  const addStep = () => {
    if (!activeTemplate) return;
    const newStep: FormStep = {
      stepNumber: activeTemplate.steps.length + 1,
      title: `Langkah ${activeTemplate.steps.length + 1}`,
      fields: []
    };
    setActiveTemplate({ ...activeTemplate, steps: [...activeTemplate.steps, newStep] });
  };

  const removeStep = (stepIndex: number) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    newSteps.splice(stepIndex, 1);
    newSteps.forEach((step, idx) => step.stepNumber = idx + 1);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
    if (previewStepIdx >= newSteps.length && newSteps.length > 0) {
      setPreviewStepIdx(newSteps.length - 1);
    }
  };

  const addField = (stepIndex: number) => {
    if (!activeTemplate) return;
    const newField: FormField = {
      id: `field_${Date.now().toString().slice(-4)}`,
      label: "Pertanyaan Baru",
      type: "text",
      required: false,
      gridSpan: 2
    };
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields.push(newField);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const duplicateField = (stepIndex: number, fieldIndex: number) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    const fieldToCopy = newSteps[stepIndex].fields[fieldIndex];
    
    const newField: FormField = {
      ...fieldToCopy,
      id: `${fieldToCopy.id}_copy_${Date.now().toString().slice(-3)}`,
      label: `${fieldToCopy.label} (Salinan)`
    };
    
    newSteps[stepIndex].fields.splice(fieldIndex + 1, 0, newField);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const updateField = (stepIndex: number, fieldIndex: number, key: keyof FormField, value: any) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields[fieldIndex] = { ...newSteps[stepIndex].fields[fieldIndex], [key]: value };
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const generateAutoIdFromLabel = (stepIndex: number, fieldIndex: number) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    const label = newSteps[stepIndex].fields[fieldIndex].label;
    
    const cleanedId = label
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
      
    newSteps[stepIndex].fields[fieldIndex].id = cleanedId || `field_${Date.now().toString().slice(-3)}`;
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields.splice(fieldIndex, 1);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const moveField = (stepIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    const fields = newSteps[stepIndex].fields;

    if (direction === 'up' && fieldIndex > 0) {
      [fields[fieldIndex - 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex - 1]];
    } else if (direction === 'down' && fieldIndex < fields.length - 1) {
      [fields[fieldIndex], fields[fieldIndex + 1]] = [fields[fieldIndex + 1], fields[fieldIndex]];
    }
    
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-lg">Form Builder</h2>
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <p className="text-center text-sm text-slate-500 mt-10">Memuat data...</p>
          ) : templates.map(template => (
            <div 
              key={template.id} 
              onClick={() => {
                setActiveTemplate(template);
                setPreviewStepIdx(0);
              }}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${activeTemplate?.id === template.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm text-slate-900">{template.trackName}</h3>
                {template.isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
              </div>
              <p className="text-xs text-slate-500 truncate">{template.steps.length} Langkah</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <label className="flex items-center justify-center w-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl gap-2 h-10 px-4 text-sm font-bold cursor-pointer transition-colors active:scale-95">
            <Upload className="h-4 w-4" /> Import JSON
            <input type="file" accept=".json" onChange={importTemplate} className="hidden" />
          </label>
          <Button onClick={createNewTemplate} className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Template Baru
          </Button>
        </div>
      </div>

      <div className="flex-1 h-screen overflow-y-auto bg-slate-50 custom-scrollbar p-6 lg:p-10">
        {!activeTemplate ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <LayoutGrid className="h-16 w-16 mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-500">Pilih atau Buat Template</h2>
            <p className="text-sm mt-2">Kustomisasi form dinamis dari panel kiri atau import JSON.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Settings2 className="text-indigo-600" /> Konfigurasi Utama Kategori
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Kelola data dasar serta fungsionalitas visual formulir.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <Button 
                    type="button" 
                    variant={isPreviewMode ? "default" : "outline"} 
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={`rounded-xl gap-2 text-xs h-9 ${isPreviewMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                  >
                    {isPreviewMode ? (
                      <> <Edit3 className="h-3.5 w-3.5" /> Mode Editor </>
                    ) : (
                      <> <Eye className="h-3.5 w-3.5" /> Pratinjau Form </>
                    )}
                  </Button>
                  
                  <Button variant="outline" onClick={exportTemplate} className="text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl gap-2 text-xs h-9">
                    <Download className="h-3.5 w-3.5" /> Export JSON
                  </Button>
                  
                  <Button variant="outline" onClick={duplicateTemplate} className="text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl gap-2 text-xs h-9">
                    <Copy className="h-3.5 w-3.5" /> Duplikat
                  </Button>
                  
                  <Button variant="outline" onClick={() => deleteTemplate(activeTemplate.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl h-9">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <Button onClick={saveTemplate} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 h-9 ml-auto lg:ml-0">
                    <Save className="h-4 w-4" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </div>

              {!isPreviewMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nama Kategori (Track)</label>
                    <Input value={activeTemplate.trackName} onChange={e => setActiveTemplate({...activeTemplate, trackName: e.target.value})} className="rounded-xl h-12 bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nama Icon (Lucide)</label>
                    <Input value={activeTemplate.trackIcon} onChange={e => setActiveTemplate({...activeTemplate, trackIcon: e.target.value})} placeholder="Contoh: Rocket, Store, Briefcase" className="rounded-xl h-12 bg-slate-50" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Deskripsi Singkat</label>
                    <Textarea value={activeTemplate.trackDescription} onChange={e => setActiveTemplate({...activeTemplate, trackDescription: e.target.value})} className="rounded-xl bg-slate-50" />
                  </div>

                  <div className="md:col-span-2 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-5 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      <div>
                        <h3 className="font-bold text-indigo-900">Konfigurasi Prompt AI (Dinamis)</h3>
                        <p className="text-xs text-indigo-700/70 mt-1">
                          Atur persona dan metrik spesifik yang harus dievaluasi AI. Fitur ini memungkinkan form digunakan untuk Startup, UMKM, Riset Kampus, hingga Lomba.
                        </p>
                      </div>
                    </div>
<div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex justify-between items-center">
                          <span>Judul & Indikator Blok Analisis (Custom Blocks)</span>
                        </label>
                        <p className="text-[10px] text-slate-500 mb-1">
                          Ketik judul blok dan indikator yang ingin dianalisis. Pisahkan dengan Enter. <br/>
                          Format Bebas. Contoh: <strong>Kesehatan Finansial (Fokus: Burn Rate, Model Pendapatan)</strong>
                        </p>
                        <Textarea 
                          value={activeTemplate.aiPromptConfig?.expectedAnalysisBlocks?.join('\n') || ''} 
                          onChange={e => {
                            const val = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                            setActiveTemplate({
                              ...activeTemplate,
                              aiPromptConfig: { ...activeTemplate.aiPromptConfig, expectedAnalysisBlocks: val } as any
                            });
                          }} 
                          placeholder="Cth:&#10;Market Positioning (Fokus: Niche Pasar, Unfair Advantage)&#10;Kapasitas Tim (Fokus: Founder Fit, Skill Gaps)&#10;Kesiapan Investasi (Fokus: Funding Stage, Daya Tarik)" 
                          className="rounded-xl bg-white min-h-[120px] resize-y" 
                        />
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Persona & Peran AI (Opsional)</label>
                        <Input 
                          value={activeTemplate.aiPromptConfig?.aiPersona || ''} 
                          onChange={e => setActiveTemplate({
                            ...activeTemplate,
                            aiPromptConfig: { ...activeTemplate.aiPromptConfig, aiPersona: e.target.value } as any
                          })} 
                          placeholder="Cth: Anda adalah Dewan Juri Krenova yang sangat objektif..." 
                          className="rounded-xl h-12 bg-white" 
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tujuan / Fokus Asesmen (Opsional)</label>
                        <Textarea 
                          value={activeTemplate.aiPromptConfig?.assessmentGoal || ''} 
                          onChange={e => setActiveTemplate({
                            ...activeTemplate,
                            aiPromptConfig: { ...activeTemplate.aiPromptConfig, assessmentGoal: e.target.value } as any
                          })} 
                          placeholder="Cth: Fokus analisis untuk mengevaluasi dampak inovasi dan orisinalitas ide dalam Krenova 2026." 
                          className="rounded-xl bg-white min-h-[80px] resize-y" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Metrik Radar (Expected Metrics)</label>
                        <Textarea 
                          value={activeTemplate.aiPromptConfig?.expectedMetrics?.join('\n') || ''} 
                          onChange={e => {
                            const val = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                            setActiveTemplate({
                              ...activeTemplate,
                              aiPromptConfig: { ...activeTemplate.aiPromptConfig, expectedMetrics: val } as any
                            });
                          }} 
                          placeholder="Cth:&#10;Inovasi Produk&#10;Potensi Pasar&#10;Kesehatan Finansial" 
                          className="rounded-xl bg-white min-h-[140px] resize-y" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Judul Rekomendasi (Expected Sections)</label>
                        <Textarea 
                          value={activeTemplate.aiPromptConfig?.expectedRecommendations?.join('\n') || ''} 
                          onChange={e => {
                            const val = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                            setActiveTemplate({
                              ...activeTemplate,
                              aiPromptConfig: { ...activeTemplate.aiPromptConfig, expectedRecommendations: val } as any
                            });
                          }} 
                          placeholder="Cth:&#10;Strategi Go-To-Market&#10;Roadmap Pengembangan&#10;Mitigasi Risiko" 
                          className="rounded-xl bg-white min-h-[140px] resize-y" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                    <input type="checkbox" checked={activeTemplate.isActive} onChange={e => setActiveTemplate({...activeTemplate, isActive: e.target.checked})} className="w-5 h-5 rounded accent-indigo-600" />
                    <div>
                      <p className="font-bold text-slate-900">Publikasikan Kategori Ini</p>
                      <p className="text-xs text-slate-500">Jika dicentang, kategori form akan langsung muncul di halaman depan aplikasi.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isPreviewMode ? (
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Simulasi UI Pengguna</span>
                    <h3 className="text-xl font-bold text-slate-900">{activeTemplate.trackName}</h3>
                  </div>
                  <span className="text-xs bg-slate-100 px-3 py-1 text-slate-600 font-semibold rounded-full">
                    Total: {activeTemplate.steps.length} Langkah
                  </span>
                </div>

                {activeTemplate.steps.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">Belum ada langkah yang dikonfigurasi.</p>
                ) : (
                  <div>
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-100">
                      {activeTemplate.steps.map((st, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPreviewStepIdx(idx)}
                          className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${previewStepIdx === idx ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                          {st.stepNumber}. {st.title || `Langkah ${st.stepNumber}`}
                        </button>
                      ))}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
                      <h4 className="text-md font-bold text-slate-900 mb-4">
                        {activeTemplate.steps[previewStepIdx]?.title}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeTemplate.steps[previewStepIdx]?.fields.map((fld) => (
                          <div key={fld.id} className={`space-y-1.5 ${fld.gridSpan === 2 ? 'md:col-span-2' : ''}`}>
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                              {fld.label || "Untitled Field"}
                              {fld.required && <span className="text-rose-500">*</span>}
                            </label>
                            
                            {fld.type === 'text' && (
                              <Input disabled placeholder={fld.placeholder || "Input teks pendek..."} className="bg-white border-slate-200" />
                            )}
                            
                            {fld.type === 'textarea' && (
                              <Textarea disabled placeholder={fld.placeholder || "Input teks panjang..."} className="bg-white border-slate-200 min-h-[80px]" />
                            )}
                            
                            {fld.type === 'number' && (
                              <Input type="number" disabled placeholder="0" className="bg-white border-slate-200" />
                            )}

                            {fld.type === 'file' && (
                              <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl text-center text-xs text-slate-400 bg-white">
                                Drag & drop berkas Anda di sini atau <span className="text-indigo-600 font-bold">Cari file</span> {fld.fileAccept && `(${fld.fileAccept})`}
                              </div>
                            )}

                            {fld.type === 'radio' && (
                              <div className="space-y-2 pt-1">
                                {fld.options && fld.options.length > 0 ? fld.options.map((opt, oIdx) => (
                                  <label key={oIdx} className="flex items-center gap-2 text-sm text-slate-600 cursor-not-allowed opacity-70">
                                    <input type="radio" disabled className="w-4 h-4 accent-indigo-600" /> {opt}
                                  </label>
                                )) : <p className="text-xs text-amber-500 italic">Belum ada opsi pilihan</p>}
                              </div>
                            )}

                            {fld.type === 'checkbox' && (
                              <div className="space-y-2 pt-1">
                                {fld.options && fld.options.length > 0 ? fld.options.map((opt, oIdx) => (
                                  <label key={oIdx} className="flex items-center gap-2 text-sm text-slate-600 cursor-not-allowed opacity-70">
                                    <input type="checkbox" disabled className="w-4 h-4 rounded accent-indigo-600" /> {opt}
                                  </label>
                                )) : <p className="text-xs text-amber-500 italic">Belum ada opsi pilihan</p>}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {activeTemplate.steps[previewStepIdx]?.fields.length === 0 && (
                          <p className="text-xs text-slate-400 italic py-4 col-span-2 text-center">Belum ada pertanyaan pada langkah ini.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 ml-2">Langkah & Pertanyaan Form</h3>
                
                {activeTemplate.steps.map((step, sIdx) => (
                  <div key={`step-${sIdx}`} className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
                    
                    <div className="bg-slate-900 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-md">Langkah {step.stepNumber}</span>
                          <Input value={step.title} onChange={e => {
                            const newSteps = [...activeTemplate.steps];
                            newSteps[sIdx].title = e.target.value;
                            setActiveTemplate({...activeTemplate, steps: newSteps});
                          }} className="bg-slate-800 border-none text-white font-bold h-9 w-full max-w-xs focus-visible:ring-indigo-500" />
                        </div>
                      </div>
                      <Button variant="ghost" onClick={() => removeStep(sIdx)} className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 px-2 rounded-lg text-xs">
                        Hapus Langkah
                      </Button>
                    </div>

                    <div className="p-4 md:p-6 space-y-4 bg-slate-50/50">
                      {step.fields.map((field, fIdx) => (
                        <div key={`field-${sIdx}-${fIdx}`} className="bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm flex flex-col md:flex-row gap-6 relative group transition-all hover:ring-slate-300">
                          
                          <div className="hidden md:flex flex-col items-center justify-center text-slate-300">
                            <GripVertical className="h-5 w-5 opacity-40" />
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label Pertanyaan</label>
                              <Input value={field.label} onChange={e => updateField(sIdx, fIdx, 'label', e.target.value)} className="bg-slate-50 h-9 rounded-lg text-sm font-semibold" />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                <span>ID Data (JSON Key)</span>
                                <button
                                  type="button"
                                  onClick={() => generateAutoIdFromLabel(sIdx, fIdx)}
                                  className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5 normal-case tracking-normal"
                                  title="Konversi otomatis dari label pertanyaan"
                                >
                                  <Sparkles className="h-3 w-3" /> Auto-Gen
                                </button>
                              </label>
                              <Input value={field.id} onChange={e => updateField(sIdx, fIdx, 'id', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="bg-slate-50 h-9 rounded-lg text-sm font-mono text-indigo-700" placeholder="cth: nama_pemilik" />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Input</label>
                              <select 
                                value={field.type} 
                                onChange={e => updateField(sIdx, fIdx, 'type', e.target.value as FieldType)}
                                className="w-full bg-slate-50 border border-slate-200 h-9 rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="text">Teks Pendek</option>
                                <option value="textarea">Teks Panjang (Area)</option>
                                <option value="number">Angka</option>
                                <option value="radio">Pilihan Tunggal (Radio)</option>
                                <option value="checkbox">Pilihan Ganda (Checkbox)</option>
                                <option value="file">Upload File</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-4 pt-5">
                              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={field.required} onChange={e => updateField(sIdx, fIdx, 'required', e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                Wajib Diisi
                              </label>
                              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={field.gridSpan === 2} onChange={e => updateField(sIdx, fIdx, 'gridSpan', e.target.checked ? 2 : 1)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                Lebar Penuh
                              </label>
                            </div>

                            {(field.type === 'radio' || field.type === 'checkbox') && (
                              <div className="md:col-span-2 space-y-1 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Opsi Pilihan (Tulis 1 pilihan per baris / tekan Enter)
                                </label>
                                <Textarea 
                                  value={field.options?.join('\n') || ''} 
                                  onChange={e => updateField(sIdx, fIdx, 'options', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} 
                                  placeholder="Contoh:&#10;Opsi A&#10;Opsi B&#10;Opsi C" 
                                  className="bg-white rounded-lg text-sm min-h-[90px] resize-y font-medium focus-visible:ring-indigo-500" 
                                />
                              </div>
                            )}
                          </div>

                          <div className="absolute top-4 right-4 md:static md:mt-5 flex md:flex-col gap-2 items-center justify-center border-l md:border-l-0 md:border-t border-slate-100 pl-2 md:pl-0 md:pt-2">
                            <button 
                              type="button"
                              onClick={() => moveField(sIdx, fIdx, 'up')} 
                              disabled={fIdx === 0}
                              className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors p-1"
                              title="Geser ke Atas"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            
                            <button 
                              type="button"
                              onClick={() => moveField(sIdx, fIdx, 'down')} 
                              disabled={fIdx === step.fields.length - 1}
                              className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors p-1"
                              title="Geser ke Bawah"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>

                            <button 
                              type="button"
                              onClick={() => duplicateField(sIdx, fIdx)} 
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                              title="Duplikat Pertanyaan"
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            <button 
                              type="button"
                              onClick={() => removeField(sIdx, fIdx)} 
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Hapus Pertanyaan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <Button variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 rounded-xl h-12 gap-2 mt-4">
                        <Plus className="h-4 w-4" /> Tambah Pertanyaan
                      </Button>
                    </div>
                  </div>
                ))}

                <Button onClick={addStep} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-2xl h-14 font-bold text-base shadow-sm gap-2">
                  <Plus className="h-5 w-5" /> Tambah Langkah Baru
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}