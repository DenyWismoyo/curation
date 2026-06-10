// src/app/admin/templates/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Plus, Save, Trash2, GripVertical, 
  Settings2, LayoutGrid, CheckCircle2, AlertCircle,
  Copy, ArrowUp, ArrowDown, Sparkles, Upload, Download,
  BrainCircuit, FileEdit, ChevronDown, ChevronUp, Lock,
  AlertTriangle, ChevronLeft, Calendar
} from 'lucide-react';

function TemplateBuilderContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // UX State: Mode Tampilan ('list' = Daftar Template, 'edit' = Editor Form)
  const [activeView, setActiveView] = useState<'list' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'builder'>('general');
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [stepToDelete, setStepToDelete] = useState<number | null>(null); 

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'form_templates'));
      const loadedTemplates: FormTemplate[] = [];
      querySnapshot.forEach((doc) => {
        loadedTemplates.push(doc.data() as FormTemplate);
      });
      // Sort by last updated
      loadedTemplates.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
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

  const toggleStepExpansion = (stepIndex: number) => {
    setExpandedSteps(prev => 
      prev.includes(stepIndex) ? prev.filter(idx => idx !== stepIndex) : [...prev, stepIndex]
    );
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (!importedData.steps || !Array.isArray(importedData.steps)) {
          alert('Format file JSON tidak valid.'); return;
        }
        const newTemplate: FormTemplate = {
          ...importedData,
          id: `track_imported_${Date.now()}`,
          trackName: `${importedData.trackName || 'Imported'} (Imported)`,
          isActive: false, 
          lastUpdated: new Date().toISOString(),
        };
        setActiveTemplate(newTemplate);
        setActiveView('edit');
        setActiveTab('general');
        setExpandedSteps([0]);
        alert('Template diimpor! Klik "Simpan" untuk menyimpan ke database.');
      } catch (error) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportTemplate = () => {
    if (!activeTemplate) return;
    const dataStr = JSON.stringify(activeTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${activeTemplate.trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'template'}_export.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const createNewTemplate = () => {
    const newTemplate: FormTemplate = {
      id: `track_${Date.now()}`,
      trackName: "Kategori Baru",
      trackDescription: "Deskripsi singkat kategori ini.",
      trackIcon: "LayoutGrid",
      isActive: false,
      version: 1,
      lastUpdated: new Date().toISOString(),
      aiPromptConfig: {
        aiPersona: "Pakar Bisnis & Investor",
        assessmentGoal: "Evaluasi model bisnis dan kelayakan investasi.",
        expectedMetrics: ["Potensi Pasar", "Keuangan"],
        expectedAnalysisBlocks: ["Posisi Pasar", "Kesehatan Finansial"],
        // PERBAIKAN: Menambahkan array expectedRecommendations yang terlewat
        expectedRecommendations: ["Strategi Bisnis", "Rencana Pendanaan"], 
        gradingStrictness: 'standard',
        customReadinessTiers: ["Pra-Inkubasi", "Siap Inkubasi", "Akselerasi"],
        reportTone: 'consultative'
      },
      steps: [{ 
        stepNumber: 1, 
        title: "Informasi Dasar", 
        fields: [
          {
            id: 'namaUsaha',
            label: 'Nama Entitas / Usaha / Tim',
            type: 'text',
            required: true,
            gridSpan: 2,
            description: 'Nama ini akan menjadi identitas utama di seluruh sistem (Wajib ada).'
          }
        ] 
      }]
    };
    setActiveTemplate(newTemplate);
    setActiveView('edit');
    setActiveTab('general');
    setExpandedSteps([0]);
  };

  const duplicateTemplate = () => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      id: `track_copy_${Date.now()}`,
      trackName: `${activeTemplate.trackName} (Salinan)`,
      isActive: false,
      lastUpdated: new Date().toISOString(),
    });
    alert('Kategori digandakan! Klik "Simpan" untuk menyimpan ke database.');
  };

  const saveTemplate = async () => {
    if (!activeTemplate) return;
    
    const hasNamaUsaha = activeTemplate.steps.some(step => 
      step.fields.some(f => f.id === 'namaUsaha')
    );

    if (!hasNamaUsaha) {
      alert('GAGAL MENYIMPAN: Form ini kehilangan kolom Identitas Utama.\n\nSilakan pastikan ada minimal 1 pertanyaan dengan Key Data (ID Database) bernama "namaUsaha".');
      setActiveTab('builder');
      return;
    }

    setIsSaving(true);
    try {
      const templateToSave = { ...activeTemplate, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'form_templates', templateToSave.id), templateToSave);
      setTemplates(prev => {
        const exists = prev.find(t => t.id === templateToSave.id);
        if (exists) return prev.map(t => t.id === templateToSave.id ? templateToSave : t);
        return [templateToSave, ...prev]; 
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
    if (!confirm('Yakin ingin menghapus template ini permanen? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await deleteDoc(doc(db, 'form_templates', id));
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (activeTemplate?.id === id) {
        setActiveTemplate(null);
        setActiveView('list');
      }
    } catch (error) {
      console.error("Gagal menghapus:", error);
    }
  };

  // Helper Form Builder
  const addStep = () => {
    if (!activeTemplate) return;
    const newIdx = activeTemplate.steps.length;
    const newStep: FormStep = { stepNumber: newIdx + 1, title: `Langkah ${newIdx + 1}`, fields: [] };
    setActiveTemplate({ ...activeTemplate, steps: [...activeTemplate.steps, newStep] });
    setExpandedSteps([newIdx]);
  };
  const executeRemoveStep = () => {
    if (!activeTemplate || stepToDelete === null) return;
    const newSteps = [...activeTemplate.steps];
    newSteps.splice(stepToDelete, 1);
    newSteps.forEach((step, idx) => step.stepNumber = idx + 1);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
    setStepToDelete(null); 
  };
  const addField = (stepIndex: number) => {
    if (!activeTemplate) return;
    const newField: FormField = { id: `field_${Date.now().toString().slice(-4)}`, label: "Pertanyaan Baru", type: "text", required: false, gridSpan: 2 };
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields.push(newField);
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
    const cleanedId = label.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
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

  // ==========================================
  // VIEW 1: DAFTAR TEMPLATE (GRID)
  // ==========================================
  if (activeView === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/admin')}
                className="w-10 h-10 p-0 rounded-full bg-white hover:bg-slate-200 text-slate-600 shrink-0 ring-1 ring-slate-200 shadow-sm"
                title="Kembali ke Dasbor Utama"
              >
                <ChevronLeft size={20} />
              </Button>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Template Form Builder</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-balance">
              Rancang arsitektur form pendaftaran, instruksi otak AI, dan matriks penilaian secara terpadu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-sm font-bold cursor-pointer transition-colors shadow-sm">
              <Upload className="h-4 w-4" /> Import JSON
              <input type="file" accept=".json" onChange={importTemplate} className="hidden" />
            </label>
            <Button onClick={createNewTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 gap-2 h-10 px-5 font-bold">
              <Plus className="h-4 w-4" /> Buat Baru
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="font-bold tracking-widest text-xs uppercase">Memuat Template...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center p-16 bg-white rounded-[2rem] border border-dashed border-slate-300">
            <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-700">Belum Ada Template</h3>
            <p className="text-slate-500 text-sm mt-2 mb-6">Mulai buat arsitektur form pertama Anda atau impor dari file JSON.</p>
            <Button onClick={createNewTemplate} className="bg-indigo-600 text-white rounded-xl font-bold px-6 shadow-md shadow-indigo-200">
              Buat Template Form Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {templates.map(template => (
              <Card 
                key={template.id} 
                onClick={() => {
                  setActiveTemplate(template);
                  setActiveView('edit');
                  setActiveTab('general');
                  setExpandedSteps([0]);
                }}
                className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-indigo-300 transition-all cursor-pointer group flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors">
                      <LayoutGrid size={24} />
                    </div>
                    {template.isActive ? (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md ring-1 ring-emerald-200 transition-colors">
                        <CheckCircle2 size={12}/> Aktif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md ring-1 ring-amber-200 transition-colors">
                        <AlertCircle size={12}/> Draft
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {template.trackName}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 line-clamp-2 mb-6">
                    {template.trackDescription || "Tidak ada deskripsi."}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center mt-auto">
                  <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Panjang Form</p>
                    <p className="text-sm font-black text-slate-700 flex items-center gap-1"><FileEdit size={14} className="text-indigo-400"/> {template.steps.length} Step</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diperbarui</p>
                    <p className="text-sm font-black text-slate-700 flex items-center gap-1"><Calendar size={14} className="text-indigo-400"/> {new Date(template.lastUpdated).toLocaleDateString('id-ID', {month: 'short', day: 'numeric'})}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: EDITOR FORM (FULL WIDTH)
  // ==========================================
  if (!activeTemplate) return null;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
      
      {/* STICKY HEADER DENGAN FLEX-WRAP DINAMIS */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl ring-1 ring-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4 sticky top-0 md:top-4 z-40 w-full mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
          <Button 
            variant="ghost" 
            onClick={() => { setActiveView('list'); setActiveTemplate(null); }} 
            className="h-10 w-10 p-0 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-600 shrink-0 ring-1 ring-slate-200"
            title="Kembali ke Daftar Template"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 hidden sm:block">
            <FileEdit className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-slate-900 leading-tight truncate">{activeTemplate.trackName}</h2>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 truncate">Status: {activeTemplate.isActive ? 'Publik' : 'Draft'}</p>
          </div>
        </div>
        
        {/* Grup Tombol yang fleksibel memanfaatkan ruang sisa */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
          <Button variant="outline" onClick={exportTemplate} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 px-3">
            <Download className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" onClick={duplicateTemplate} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 px-3">
            <Copy className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Duplikat</span>
          </Button>
          <Button variant="outline" onClick={() => deleteTemplate(activeTemplate.id)} className="border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl h-10 w-10 p-0 shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button onClick={saveTemplate} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold shadow-sm shadow-indigo-200 whitespace-nowrap">
            <Save className="w-4 h-4 sm:mr-2 shrink-0" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto hide-scrollbar mb-8">
        {[
          { id: 'general', label: 'Pengaturan Dasar', icon: Settings2 },
          { id: 'ai', label: 'Otak AI & Enterprise', icon: BrainCircuit },
          { id: 'builder', label: 'Editor Formulir', icon: LayoutGrid }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* TAB 1: PENGATURAN DASAR */}
        {activeTab === 'general' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-6">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900">Identitas Program</h3>
              <p className="text-sm text-slate-500 font-medium">Tampilan yang akan dilihat peserta di halaman depan.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama Program/Kategori</label>
                <Input value={activeTemplate.trackName} onChange={e => setActiveTemplate({...activeTemplate, trackName: e.target.value})} className="rounded-xl h-12 bg-slate-50 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama Icon (Lucide)</label>
                <Input value={activeTemplate.trackIcon} onChange={e => setActiveTemplate({...activeTemplate, trackIcon: e.target.value})} placeholder="Contoh: Rocket, Store, Briefcase" className="rounded-xl h-12 bg-slate-50 font-mono text-sm" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Deskripsi Singkat</label>
                <Textarea value={activeTemplate.trackDescription} onChange={e => setActiveTemplate({...activeTemplate, trackDescription: e.target.value})} className="rounded-xl bg-slate-50 min-h-[100px]" />
              </div>
              <div className="md:col-span-2 flex items-center gap-4 p-5 bg-indigo-50/50 rounded-2xl ring-1 ring-indigo-100">
                <input type="checkbox" checked={activeTemplate.isActive} onChange={e => setActiveTemplate({...activeTemplate, isActive: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-200 cursor-pointer" />
                <div>
                  <p className="font-bold text-indigo-900 text-sm">Aktifkan & Publikasikan</p>
                  <p className="text-xs text-indigo-700/70 font-medium mt-0.5">Jika dicentang, peserta dapat melihat dan memilih kategori ini.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KONFIGURASI AI */}
        {activeTab === 'ai' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
            <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0"><Sparkles className="w-6 h-6"/></div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Arsitektur Audit AI</h3>
                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
                  Atur persona, tingkat keketatan nilai, dan parameter khusus lainnya untuk mencapai standar <strong className="text-slate-700">Enterprise Due Diligence</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="font-black text-slate-900 border-l-4 border-indigo-600 pl-3">Instruksi Dasar</h4>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Persona & Peran AI</label>
                  <Input value={activeTemplate.aiPromptConfig?.aiPersona || ''} onChange={e => setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), aiPersona: e.target.value } as any})} className="rounded-xl h-11 bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tujuan / Fokus Analisis</label>
                  <Textarea value={activeTemplate.aiPromptConfig?.assessmentGoal || ''} onChange={e => setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), assessmentGoal: e.target.value } as any})} className="rounded-xl bg-slate-50 min-h-[80px]" />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-black text-slate-900 border-l-4 border-emerald-600 pl-3">Perilaku Penilaian</h4>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ketatnya Skor (Strictness)</label>
                  <select 
                    value={activeTemplate.aiPromptConfig?.gradingStrictness || 'standard'} 
                    onChange={e => setActiveTemplate({
                      ...activeTemplate, 
                      aiPromptConfig: { 
                        ...(activeTemplate.aiPromptConfig || {}), 
                        gradingStrictness: e.target.value as any 
                      }
                    } as FormTemplate)} 
                    className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="supportive">Suportif & Edukatif (Skor tinggi)</option>
                    <option value="standard">Standar Industri (Objektif)</option>
                    <option value="strict">Standar VC / Audit (Sangat Ketat)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gaya Bahasa (Tone)</label>
                  <select 
                    value={activeTemplate.aiPromptConfig?.reportTone || 'consultative'} 
                    onChange={e => setActiveTemplate({
                      ...activeTemplate, 
                      aiPromptConfig: { 
                        ...(activeTemplate.aiPromptConfig || {}), 
                        reportTone: e.target.value as any 
                      }
                    } as FormTemplate)} 
                    className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="investigative">Investigatif & Analitis (Tajam)</option>
                    <option value="consultative">Konsultatif & Mentor (Solutif)</option>
                    <option value="academic">Akademis Formal (Data Driven)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    Fokus Analisis Media <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] normal-case tracking-normal">Baru</span>
                  </label>
                  <select 
                    value={activeTemplate.aiPromptConfig?.mediaAnalysisFocus || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setActiveTemplate({
                        ...activeTemplate, 
                        aiPromptConfig: { 
                          ...(activeTemplate.aiPromptConfig || {}), 
                          mediaAnalysisFocus: val === '' ? undefined : val as any 
                        }
                      } as FormTemplate);
                    }} 
                    className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Analisis Media Standar --</option>
                    <option value="pitch-delivery">Pitch Delivery (Komunikasi & Persuasi)</option>
                    <option value="ui-ux-design">UI/UX Design (Visual & Prototipe)</option>
                    <option value="product-demo">Product Demo (Fungsionalitas)</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100">
                <h4 className="font-black text-slate-900 border-l-4 border-amber-500 pl-3">Manajemen Parameter & Indikator AI</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* 1. Tiers Level Readiness (Array) */}
                  <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                      Tiers Level Readiness
                    </label>
                    <div className="space-y-2.5">
                      {(activeTemplate.aiPromptConfig?.customReadinessTiers || []).map((tier, idx) => (
                        <div key={idx} className="flex items-start gap-2 group/option">
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within/option:bg-indigo-500 transition-colors"></div>
                            <Textarea 
                              value={tier}
                              onChange={e => {
                                const newArr = [...(activeTemplate.aiPromptConfig?.customReadinessTiers || [])];
                                newArr[idx] = e.target.value;
                                setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), customReadinessTiers: newArr } as any});
                              }}
                              className="pl-7 py-2.5 bg-white border-slate-200 min-h-[70px] rounded-xl text-sm focus-visible:ring-indigo-500 shadow-sm resize-y leading-relaxed"
                              placeholder={`Tier ${idx + 1}...`}
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                              const newArr = [...(activeTemplate.aiPromptConfig?.customReadinessTiers || [])];
                              newArr.splice(idx, 1);
                              setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), customReadinessTiers: newArr } as any});
                            }} 
                            className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const newArr = [...(activeTemplate.aiPromptConfig?.customReadinessTiers || [])];
                        newArr.push(`Tier Baru ${newArr.length + 1}`);
                        setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), customReadinessTiers: newArr } as any});
                      }} 
                      className="w-full mt-2 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl h-10 font-bold shadow-sm gap-2 text-xs transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Tambah Tier Baru
                    </Button>
                  </div>

                  {/* 2. Metrik Radar (Array) */}
                  <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center mb-2">
                      Metrik Radar <span className="normal-case tracking-normal text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">Skor 0-100</span>
                    </label>
                    <div className="space-y-2.5">
                      {(activeTemplate.aiPromptConfig?.expectedMetrics || []).map((metric, idx) => (
                        <div key={idx} className="flex items-start gap-2 group/option">
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within/option:bg-indigo-500 transition-colors"></div>
                            <Textarea 
                              value={metric}
                              onChange={e => {
                                const newArr = [...(activeTemplate.aiPromptConfig?.expectedMetrics || [])];
                                newArr[idx] = e.target.value;
                                setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), expectedMetrics: newArr } as any});
                              }}
                              className="pl-7 py-2.5 bg-white border-slate-200 min-h-[70px] rounded-xl text-sm focus-visible:ring-indigo-500 shadow-sm resize-y leading-relaxed"
                              placeholder={`Metrik ${idx + 1}...`}
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                              const newArr = [...(activeTemplate.aiPromptConfig?.expectedMetrics || [])];
                              newArr.splice(idx, 1);
                              setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), expectedMetrics: newArr } as any});
                            }} 
                            className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const newArr = [...(activeTemplate.aiPromptConfig?.expectedMetrics || [])];
                        newArr.push(`Metrik Baru ${newArr.length + 1}`);
                        setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), expectedMetrics: newArr } as any});
                      }} 
                      className="w-full mt-2 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl h-10 font-bold shadow-sm gap-2 text-xs transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Tambah Metrik Baru
                    </Button>
                  </div>

                  {/* 3. Judul Blok Analisis (Array) */}
                  <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2 lg:col-span-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                      Judul Blok Analisis (Custom Blocks)
                    </label>
                    <div className="space-y-2.5">
                      {(activeTemplate.aiPromptConfig?.expectedAnalysisBlocks || []).map((block, idx) => (
                        <div key={idx} className="flex items-start gap-2 group/option">
                          <div className="flex-1 relative">
                            <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within/option:bg-indigo-500 transition-colors"></div>
                            <Textarea 
                              value={block}
                              onChange={e => {
                                const newArr = [...(activeTemplate.aiPromptConfig?.expectedAnalysisBlocks || [])];
                                newArr[idx] = e.target.value;
                                setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), expectedAnalysisBlocks: newArr } as any});
                              }}
                              className="pl-7 py-2.5 bg-white border-slate-200 min-h-[70px] rounded-xl text-sm focus-visible:ring-indigo-500 shadow-sm resize-y leading-relaxed"
                              placeholder={`Blok Analisis ${idx + 1}...`}
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                              const newArr = [...(activeTemplate.aiPromptConfig?.expectedAnalysisBlocks || [])];
                              newArr.splice(idx, 1);
                              setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), expectedAnalysisBlocks: newArr } as any});
                            }} 
                            className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const newArr = [...(activeTemplate.aiPromptConfig?.expectedAnalysisBlocks || [])];
                        newArr.push(`Blok Baru ${newArr.length + 1}`);
                        setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), expectedAnalysisBlocks: newArr } as any});
                      }} 
                      className="w-full mt-2 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl h-10 font-bold shadow-sm gap-2 text-xs transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Tambah Blok Analisis
                    </Button>
                  </div>

                  {/* 4. Fokus Mitigasi Risiko (Textarea karena String Prompt) */}
                  <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2 lg:col-span-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                      Fokus Mitigasi Risiko
                    </label>
                    <Textarea 
                      value={activeTemplate.aiPromptConfig?.riskFramework || ''} 
                      onChange={e => setActiveTemplate({...activeTemplate, aiPromptConfig: { ...(activeTemplate.aiPromptConfig || {}), riskFramework: e.target.value } as any})} 
                      placeholder="Misal: Fokus pada legalitas dan cashflow." 
                      className="rounded-xl bg-white border-slate-200 min-h-[120px] shadow-sm text-sm font-medium leading-relaxed" 
                    />
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EDITOR FORMULIR (DENGAN ACCORDION) */}
        {activeTab === 'builder' && (
          <div className="space-y-4">
            {activeTemplate.steps.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-3xl ring-1 ring-slate-200">
                <p className="text-slate-500 font-medium">Belum ada langkah formulir.</p>
              </div>
            ) : (
              activeTemplate.steps.map((step, sIdx) => {
                const isExpanded = expandedSteps.includes(sIdx);
                return (
                  <div key={`step-${sIdx}`} className="bg-white rounded-[2rem] ring-1 ring-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                    
                    {/* ACCORDION HEADER */}
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
                              const newSteps = [...activeTemplate.steps];
                              newSteps[sIdx].title = e.target.value;
                              setActiveTemplate({...activeTemplate, steps: newSteps});
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

                    {/* ACCORDION BODY (FIELDS) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-8 bg-slate-50/50 space-y-6 border-t border-slate-100 relative z-0">
                        {step.fields.map((field, fIdx) => {
                          const isPrimaryIdentity = field.id === 'namaUsaha';

                          return (
                            <div key={`field-${sIdx}-${fIdx}`} className={`p-5 sm:p-6 rounded-2xl ring-1 shadow-sm flex flex-col md:flex-row gap-6 relative group transition-all ${isPrimaryIdentity ? 'bg-indigo-50/30 ring-indigo-200/60' : 'bg-white ring-slate-200 hover:ring-indigo-200 hover:shadow-md'}`}>
                              
                              <div className="hidden md:flex flex-col items-center justify-center text-slate-300">
                                <GripVertical className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab" />
                              </div>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5 md:col-span-2">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    Label Pertanyaan
                                    {isPrimaryIdentity && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold normal-case tracking-normal">Diizinkan untuk diubah sesuai konteks</span>}
                                  </label>
                                  <Input value={field.label} onChange={e => updateField(sIdx, fIdx, 'label', e.target.value)} className="bg-white border-slate-200 h-11 rounded-xl font-bold text-slate-900" placeholder="Ketik pertanyaan di sini..." />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Keterangan / Teks Bantuan (Opsional)</label>
                                  <Input value={field.description || ''} onChange={e => updateField(sIdx, fIdx, 'description', e.target.value)} className="bg-white border-slate-200 h-10 rounded-xl text-sm" placeholder="Instruksi tambahan untuk peserta..." />
                                </div>
                                
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tipe Input</label>
                                  <select 
                                    value={field.type} 
                                    disabled={isPrimaryIdentity}
                                    onChange={e => updateField(sIdx, fIdx, 'type', e.target.value as FieldType)}
                                    className={`w-full border border-slate-200 h-10 rounded-xl text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${isPrimaryIdentity ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70' : 'bg-white text-slate-700'}`}
                                  >
                                    <option value="text">Teks Pendek</option>
                                    <option value="textarea">Teks Panjang (Paragraf)</option>
                                    <option value="number">Angka / Nominal</option>
                                    <option value="date">Tanggal (Date Picker)</option>
                                    <option value="select">Dropdown (Select)</option>
                                    <option value="radio">Pilihan Tunggal (Radio)</option>
                                    <option value="checkbox">Pilihan Ganda (Checkbox)</option>
                                    <option value="file">Upload Dokumen</option>
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                                    <span>Key Data (ID Database)</span>
                                    {isPrimaryIdentity ? (
                                      <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 normal-case tracking-normal"><Lock className="w-3 h-3"/> Terkunci (Sistem)</span>
                                    ) : (
                                      <button type="button" onClick={() => generateAutoIdFromLabel(sIdx, fIdx)} className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md normal-case tracking-normal"><Sparkles className="h-3 w-3"/> Auto-Gen</button>
                                    )}
                                  </label>
                                  <Input 
                                    value={field.id} 
                                    disabled={isPrimaryIdentity}
                                    onChange={e => updateField(sIdx, fIdx, 'id', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} 
                                    className={`h-10 rounded-xl text-sm font-mono ${isPrimaryIdentity ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-70' : 'bg-white border-slate-200 text-indigo-700'}`} 
                                    placeholder="cth: revenue_tahun_ini" 
                                  />
                                </div>

                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 md:col-span-2">
                                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                                    <input type="checkbox" checked={field.required} disabled={isPrimaryIdentity} onChange={e => updateField(sIdx, fIdx, 'required', e.target.checked)} className={`w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 ${isPrimaryIdentity ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                    Wajib Diisi {isPrimaryIdentity && <span className="text-[10px] text-slate-400 font-normal ml-1">(Pasti Wajib)</span>}
                                  </label>
                                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                                    <input type="checkbox" checked={field.gridSpan === 2} onChange={e => updateField(sIdx, fIdx, 'gridSpan', e.target.checked ? 2 : 1)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                    Lebar Penuh (100%)
                                  </label>
                                </div>

                                {/* Pemilihan Format File */}
                                {field.type === 'file' && !isPrimaryIdentity && (
                                  <div className="md:col-span-2 space-y-1.5 mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                                      Format Dokumen Spesifik (Opsional)
                                    </label>
                                    <p className="text-[10px] text-slate-400 mb-3 -mt-1 font-medium">Pilih format spesifik yang diizinkan. Jika tidak ada yang dicentang, form akan menerima semua tipe file.</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                                      {[
                                        { label: 'PDF (.pdf)', value: '.pdf' },
                                        { label: 'Gambar (JPG, PNG)', value: 'image/*' },
                                        { label: 'Word (.doc, .docx)', value: '.doc,.docx' },
                                        { label: 'Excel (.xls, .xlsx)', value: '.xls,.xlsx' },
                                        { label: 'Presentasi (.ppt, .pptx)', value: '.ppt,.pptx' },
                                        { label: 'Arsip (.zip, .rar)', value: '.zip,.rar' }
                                      ].map(ext => {
                                        const currentAccepts = field.fileAccept ? field.fileAccept.split(',') : [];
                                        const extValues = ext.value.split(',');
                                        const isChecked = extValues.every(val => currentAccepts.includes(val));

                                        return (
                                          <label key={ext.label} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                let newAccepts = [...currentAccepts];
                                                if (e.target.checked) {
                                                  extValues.forEach(val => {
                                                    if (!newAccepts.includes(val)) newAccepts.push(val);
                                                  });
                                                } else {
                                                  newAccepts = newAccepts.filter(val => !extValues.includes(val));
                                                }
                                                updateField(sIdx, fIdx, 'fileAccept', newAccepts.join(','));
                                              }}
                                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            {ext.label}
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* PEMBARUAN UX: MODEL LIST ITEM DINAMIS UNTUK RADIO, CHECKBOX, SELECT */}
                                {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && !isPrimaryIdentity && (
                                  <div className="md:col-span-2 space-y-3 mt-2 p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                                      Daftar Pilihan (Opsi)
                                    </label>
                                    
                                    {/* Mapping Item Opsi */}
                                    <div className="space-y-2.5">
                                      {(field.options || []).map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-start gap-2 group/option">
                                          <div className="flex-1 relative">
                                            <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within/option:bg-indigo-500 transition-colors"></div>
                                            <Textarea 
                                              value={opt}
                                              onChange={(e) => {
                                                const newOptions = [...(field.options || [])];
                                                newOptions[optIdx] = e.target.value;
                                                updateField(sIdx, fIdx, 'options', newOptions);
                                              }}
                                              className="pl-7 py-2.5 bg-white border-slate-200 min-h-[70px] rounded-xl text-sm focus-visible:ring-indigo-500 shadow-sm resize-y leading-relaxed"
                                              placeholder={`Ketik pilihan ${optIdx + 1}...`}
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                              const newOptions = [...(field.options || [])];
                                              newOptions.splice(optIdx, 1);
                                              updateField(sIdx, fIdx, 'options', newOptions);
                                            }}
                                            className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl transition-colors"
                                            title="Hapus Pilihan"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}

                                      {(!field.options || field.options.length === 0) && (
                                        <div className="text-center py-3 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                                          <p className="text-xs text-slate-400 font-medium italic">Belum ada pilihan yang ditambahkan.</p>
                                        </div>
                                      )}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const newOptions = [...(field.options || [])];
                                        newOptions.push(`Pilihan ${newOptions.length + 1}`);
                                        updateField(sIdx, fIdx, 'options', newOptions);
                                      }}
                                      className="w-full mt-2 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl h-10 font-bold shadow-sm gap-2 text-xs transition-colors"
                                    >
                                      <Plus className="h-4 w-4" /> Tambah Pilihan Baru
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="absolute top-4 right-4 md:static md:mt-0 flex md:flex-col gap-2 items-center justify-center border-l md:border-l-0 md:border-t border-slate-100 pl-2 md:pl-0 md:pt-0 shrink-0">
                                <button type="button" onClick={() => moveField(sIdx, fIdx, 'up')} disabled={fIdx === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg"><ArrowUp className="h-4 w-4" /></button>
                                <button type="button" onClick={() => moveField(sIdx, fIdx, 'down')} disabled={fIdx === step.fields.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg"><ArrowDown className="h-4 w-4" /></button>
                                <div className="w-px h-4 md:w-4 md:h-px bg-slate-200 my-1 hidden md:block"></div>
                                
                                <button 
                                  type="button" 
                                  onClick={() => removeField(sIdx, fIdx)} 
                                  disabled={isPrimaryIdentity}
                                  className={`transition-colors p-1.5 rounded-lg ${isPrimaryIdentity ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50'}`}
                                  title={isPrimaryIdentity ? "Identitas utama tidak dapat dihapus" : "Hapus Pertanyaan"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        
                        <Button variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-2xl h-14 font-bold shadow-sm gap-2">
                          <Plus className="h-5 w-5" /> Tambah Pertanyaan
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <Button onClick={addStep} className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-2xl h-14 font-black shadow-lg gap-2 mt-6">
              <Plus className="h-5 w-5" /> Buat Langkah (Step) Baru
            </Button>
          </div>
        )}
      </div>

      {/* MODAL KONFIRMASI KUSTOM UNTUK HAPUS STEP */}
      {stepToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={28} />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Hapus Langkah Ini?</h3>
            <p className="text-sm text-slate-500 text-center font-medium mb-8 leading-relaxed">
              Anda akan menghapus langkah ini beserta <strong>seluruh pertanyaan</strong> di dalamnya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStepToDelete(null)}
                className="w-full rounded-xl h-12 font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                Batal
              </Button>
              <Button 
                onClick={executeRemoveStep}
                className="w-full rounded-xl h-12 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// BUNGKUS KOMPONEN DENGAN SUSPENSE
export default function TemplateBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="font-bold tracking-widest text-xs uppercase">Menyiapkan Workspace...</p>
        </div>
      </div>
    }>
      <TemplateBuilderContent />
    </Suspense>
  );
}