// src/app/admin/templates/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { FormTemplate } from '@/types/curation';
import { TemplateExportPDFButton } from '@/app/components/admin/TemplateExportPDFButton'; 
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, Save, Trash2, Settings2, LayoutGrid, CheckCircle2, AlertCircle,
  Copy, Download, Sparkles, Upload, BrainCircuit, FileEdit, ChevronLeft, Calendar, Eye
} from 'lucide-react';

// IMPORT KOMPONEN MODULAR
import { TabGeneral } from '@/app/components/admin/template-builder/TabGeneral';
import { TabAIConfig } from '@/app/components/admin/template-builder/TabAIConfig';
import { TabFormBuilder } from '@/app/components/admin/template-builder/TabFormBuilder';
import { AdminTemplatePreview } from '@/app/components/admin/AdminTemplatePreview';

function TemplateBuilderContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // UX State: Mode Tampilan
  const [activeView, setActiveView] = useState<'list' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'builder' | 'preview'>('general');

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'form_templates'));
      const loadedTemplates: FormTemplate[] = [];
      querySnapshot.forEach((doc) => {
        loadedTemplates.push(doc.data() as FormTemplate);
      });
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

  // FITUR: IMPORT TEMPLATE
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
        alert('Template diimpor! Klik "Simpan" untuk menyimpan ke database.');
      } catch (error) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // FITUR: EXPORT TEMPLATE
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

  // FITUR: BUAT BARU (Memperbaiki error aiPromptConfig)
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
  };

  // FITUR: DUPLIKAT TEMPLATE
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

  // FITUR: SIMPAN TEMPLATE
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

  // FITUR: HAPUS TEMPLATE
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
            <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-sm font-bold cursor-pointer shadow-sm">
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
                }}
                className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-indigo-300 transition-all cursor-pointer group flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors">
                      <LayoutGrid size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                      {template.isActive ? (
                        <span className="flex items-center h-8 gap-1 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-2.5 rounded-md ring-1 ring-emerald-200">
                          <CheckCircle2 size={12}/> Aktif
                        </span>
                      ) : (
                        <span className="flex items-center h-8 gap-1 bg-amber-50 text-amber-700 font-black text-[10px] uppercase tracking-widest px-2.5 rounded-md ring-1 ring-amber-200">
                          <AlertCircle size={12}/> Draft
                        </span>
                      )}
                      <TemplateExportPDFButton template={template} />
                    </div>
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
        
        {/* Grup Tombol Aksi */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
          <Button variant="outline" onClick={exportTemplate} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 px-3">
            <Download className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Export JSON</span>
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
          { id: 'builder', label: 'Editor Formulir', icon: LayoutGrid },
          { id: 'preview', label: 'Preview Mode', icon: Eye }
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
        {activeTab === 'general' && <TabGeneral template={activeTemplate} onChange={setActiveTemplate} />}
        {activeTab === 'ai' && <TabAIConfig template={activeTemplate} onChange={setActiveTemplate} />}
        {activeTab === 'builder' && <TabFormBuilder template={activeTemplate} onChange={setActiveTemplate} />}
        {activeTab === 'preview' && <AdminTemplatePreview template={activeTemplate} />}
      </div>
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