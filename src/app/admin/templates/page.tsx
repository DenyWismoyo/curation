// src/app/admin/templates/page.tsx
'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormTemplate } from '@/types/curation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from "sonner"; 
import { 
  Plus, Save, Trash2, Settings2, LayoutGrid, CheckCircle2,
  Copy, Download, Upload, BrainCircuit, FileEdit, ChevronLeft, Calendar, Eye,
  Folder, FolderOpen, List as ListIcon, GripVertical, 
  Search, CheckSquare, Edit3, MoveRight, X,
  Terminal
} from 'lucide-react';

// IMPORT KOMPONEN MODULAR
import { TabGeneral } from '@/app/components/admin/template-builder/TabGeneral';
import { TabAIConfig } from '@/app/components/admin/template-builder/TabAIConfig';
import { TabFormBuilder } from '@/app/components/admin/template-builder/TabFormBuilder';
import { AdminTemplatePreview } from '@/app/components/admin/AdminTemplatePreview';
import { TabLogs } from '@/app/components/admin/template-builder/TabLogs';

// DEFINISI DEFAULT CONFIG UNTUK FALLBACK TEMPLATE LAMA (DIPERBARUI)
const DEFAULT_AI_CONFIG = {
  aiPersona: "",
  assessmentGoal: "",
  expectedMetrics: [],
  expectedAnalysisBlocks: [],
  expectedRecommendations: [],
  riskFramework: "",
  customScoringRubric: "",
  customSystemPrompt: "",
  negativePrompts: "",
  formatInstructions: "",
  reportTone: "consultative" as const,
  gradingStrictness: "standard" as const,
  // PENAMBAHAN PROPERTI MULTIPURPOSE
  formPurpose: "assessment" as any,
  customUiLabels: {
    scoreLabel: "AI Readiness Score",
    swotLabel: "Capability Matrix (SWOT)",
    riskLabel: "Critical Risks & Mitigation Map",
    roadmapLabel: "Rekomendasi Strategis",
    executionLabel: "Action Plan Timeline"
  }
};

function TemplateBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // MENGAMBIL STATE NAVIGASI LANGSUNG DARI URL QUERY PARAMETERS
  const activeFolder = searchParams.get('folder') || 'Semua';
  const editId = searchParams.get('edit');
  const tabParam = searchParams.get('tab') || 'general';
  
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [activeView, setActiveView] = useState<'list' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'builder' | 'preview' | 'logs'>('general');

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isEditMode, setIsEditMode] = useState(false); 
  const [dbFolders, setDbFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  // SINKRONISASI URL PARAMETER DENGAN RENDER VIEW & TAB DATA
  useEffect(() => {
    if (editId) {
      if (activeTemplate && activeTemplate.id === editId) {
        setActiveView('edit');
        setActiveTab(tabParam as any);
      } else {
        const found = templates.find(t => t.id === editId);
        if (found) {
          setActiveTemplate(found);
          setActiveView('edit');
          setActiveTab(tabParam as any);
        }
      }
    } else {
      setActiveView('list');
      setActiveTemplate(null);
    }
  }, [editId, tabParam, templates, activeTemplate?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const templateSnap = await getDocs(collection(db, 'form_templates'));
      const loadedTemplates: FormTemplate[] = [];
      templateSnap.forEach((docSnap) => {
        const data = docSnap.data() as FormTemplate;
        if (!data.aiPromptConfig) {
          data.aiPromptConfig = { ...DEFAULT_AI_CONFIG };
        }
        loadedTemplates.push(data);
      });
      loadedTemplates.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      setTemplates(loadedTemplates);

      const folderSnap = await getDocs(collection(db, 'template_folders'));
      const loadedFolders: string[] = [];
      folderSnap.forEach((doc) => {
        loadedFolders.push(doc.id);
      });
      setDbFolders(loadedFolders);
    } catch (error) {
      console.error("Gagal memuat data:", error);
      toast.error("Gagal memuat data template.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const folders = useMemo(() => {
    const uniqueFolders = new Set([
      ...templates.map(t => t.folder).filter(Boolean),
      ...dbFolders
    ]);
    return ['Semua', ...Array.from(uniqueFolders), 'Uncategorized'];
  }, [templates, dbFolders]);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (activeFolder !== 'Semua') {
      if (activeFolder === 'Uncategorized') result = result.filter(t => !t.folder);
      else result = result.filter(t => t.folder === activeFolder);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
         t.trackName.toLowerCase().includes(query) || 
         (t.trackDescription && t.trackDescription.toLowerCase().includes(query))
      );
    }
    return result;
  }, [templates, activeFolder, searchQuery]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folderName = newFolderName.trim();
    if (folders.includes(folderName)) {
      toast.warning('Nama folder ini sudah ada.');
      return;
    }
    
    try {
      await setDoc(doc(db, 'template_folders', folderName), { 
        name: folderName, 
        createdAt: new Date().toISOString() 
      });
      setDbFolders(prev => [...prev, folderName]);
      setNewFolderName('');
      setIsCreatingFolder(false);
      toast.success(`Folder ${folderName} berhasil dibuat!`);
      router.push(`?folder=${encodeURIComponent(folderName)}`);
    } catch (error) {
      console.error("Gagal membuat folder:", error);
      toast.error('Gagal membuat folder.');
    }
  };

  const handleRenameFolder = async (oldName: string) => {
    if (!editFolderName.trim() || oldName === editFolderName) {
      setEditingFolder(null);
      return;
    }
    const newName = editFolderName.trim();
    const templatesToUpdate = templates.filter(t => t.folder === oldName);

    setTemplates(prev => prev.map(t => t.folder === oldName ? { ...t, folder: newName } : t));
    setDbFolders(prev => prev.map(f => f === oldName ? newName : f));
    if (activeFolder === oldName) router.push(`?folder=${encodeURIComponent(newName)}`);
    setEditingFolder(null);

    try {
      await setDoc(doc(db, 'template_folders', newName), { name: newName, updatedAt: new Date().toISOString() });
      await deleteDoc(doc(db, 'template_folders', oldName));
      await Promise.all(templatesToUpdate.map(t => updateDoc(doc(db, 'form_templates', t.id), { folder: newName })));
      toast.success("Nama folder berhasil diubah.");
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengubah nama folder.");
      fetchData(); 
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if(!confirm(`Hapus folder "${folderName}"? Template di dalamnya TIDAK akan dihapus, tetapi akan berpindah ke Uncategorized.`)) return;

    const templatesToUpdate = templates.filter(t => t.folder === folderName);
    setTemplates(prev => prev.map(t => t.folder === folderName ? { ...t, folder: undefined } : t));
    setDbFolders(prev => prev.filter(f => f !== folderName));
    if (activeFolder === folderName) router.push('?folder=Semua');

    try {
      await deleteDoc(doc(db, 'template_folders', folderName));
      await Promise.all(templatesToUpdate.map(t => updateDoc(doc(db, 'form_templates', t.id), { folder: null })));
      toast.success("Folder berhasil dihapus.");
    } catch (e) { 
      console.error(e); 
      toast.error("Gagal menghapus folder.");
      fetchData();
    }
  };

  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    if (!isEditMode) return;
    setDraggedTemplateId(templateId);
    e.dataTransfer.setData('text/plain', templateId);
  };

  const handleDragOver = (e: React.DragEvent) => { 
    if (!isEditMode) return;
    e.preventDefault(); 
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    const templateId = e.dataTransfer.getData('text/plain') || draggedTemplateId;
    setDraggedTemplateId(null);
    if (!templateId || targetFolder === 'Semua') return;

    const finalFolderValue = targetFolder === 'Uncategorized' ? null : targetFolder;
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, folder: finalFolderValue || undefined } : t));

    try {
      await updateDoc(doc(db, 'form_templates', templateId), { folder: finalFolderValue });
      toast.success("Template berhasil dipindahkan.");
    } catch (error) {
      console.error("Gagal move template", error);
      toast.error("Gagal memindahkan template.");
    }
  };

  const toggleSelectTemplate = (id: string) => {
    if (!isEditMode) return;
    setSelectedTemplates(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    if (!isEditMode) return;
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(filteredTemplates.map(t => t.id));
    }
  };

  const handleBulkMove = async (targetFolder: string) => {
    if(selectedTemplates.length === 0 || !targetFolder) return;
    const finalFolderValue = targetFolder === 'Uncategorized' ? null : targetFolder;

    setTemplates(prev => prev.map(t => selectedTemplates.includes(t.id) ? { ...t, folder: finalFolderValue || undefined } : t));

    try {
      await Promise.all(selectedTemplates.map(id => updateDoc(doc(db, 'form_templates', id), { folder: finalFolderValue })));
      setSelectedTemplates([]); 
      toast.success(`${selectedTemplates.length} Template dipindahkan ke ${targetFolder}.`);
    } catch(e) {
       console.error("Bulk Move error", e);
       toast.error("Gagal memindahkan beberapa template.");
    }
  };

  const handleBulkDelete = async () => {
    if(!confirm(`PERINGATAN! Anda akan menghapus permanen ${selectedTemplates.length} template terpilih. Lanjutkan?`)) return;
    setTemplates(prev => prev.filter(t => !selectedTemplates.includes(t.id)));
    try {
      await Promise.all(selectedTemplates.map(id => deleteDoc(doc(db, 'form_templates', id))));
      toast.success(`${selectedTemplates.length} Template berhasil dihapus.`);
      setSelectedTemplates([]);
    } catch(e) {
      console.error("Bulk Delete error", e);
      toast.error("Gagal menghapus beberapa template.");
    }
  };

  // FUNGSI IMPORT DI DASHBOARD LIST (Membuat Template Baru)
  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (!importedData || !importedData.trackName || !Array.isArray(importedData.steps)) {
          toast.error("Format Invalid", { description: "File JSON bukan format export Template Form Builder yang sah." });
          return;
        }

        const newTemplate: FormTemplate = {
          ...importedData, id: `track_imported_${Date.now()}`, trackName: `${importedData.trackName || 'Imported'}`,
          isActive: false, lastUpdated: new Date().toISOString(), folder: activeFolder !== 'Semua' ? activeFolder : undefined
        };
        
        if (!newTemplate.aiPromptConfig) {
          newTemplate.aiPromptConfig = { ...DEFAULT_AI_CONFIG };
        }

        setActiveTemplate(newTemplate);
        toast.success("Berhasil Import", { description: "Template baru berhasil dimuat dari file JSON." });
        router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${newTemplate.id}&tab=general`);
      } catch (error) { 
        toast.error("Gagal Membaca File", { description: "Terjadi kesalahan saat memparsing file JSON." }); 
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // FUNGSI IMPORT SAAT BERADA DI DALAM TEMPLATE EDITOR (Menimpa Template Aktif)
  const importToCurrentTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("PERINGATAN: Mengimpor JSON ini akan menimpa (overwrite) seluruh konfigurasi Form & AI pada template yang sedang aktif ini. Lanjutkan?")) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Validasi Struktur Data Form Builder
        if (!importedData || typeof importedData !== 'object') {
          toast.error("Format File Invalid", { description: "File yang diunggah bukan format JSON objek." });
          return;
        }
        if (!importedData.trackName || !Array.isArray(importedData.steps)) {
          toast.error("Struktur Tidak Dikenali", { description: "Properti 'trackName' atau array 'steps' tidak ditemukan di dalam JSON. Ini bukan file template Curation." });
          return;
        }

        // Pertahankan ID & Folder template yang sedang diedit (Overwrite data isinya saja)
        const updatedTemplate: FormTemplate = {
          ...importedData,
          id: activeTemplate!.id,
          folder: activeTemplate!.folder,
          lastUpdated: new Date().toISOString(),
        };

        if (!updatedTemplate.aiPromptConfig) {
          updatedTemplate.aiPromptConfig = { ...DEFAULT_AI_CONFIG };
        }

        setActiveTemplate(updatedTemplate);
        toast.success("Template Berhasil Ditimpa (Overwrite)!", {
          description: "Data dari JSON berhasil masuk. Klik 'Simpan' untuk menyimpannya permanen ke database."
        });
      } catch (error) {
        toast.error("Gagal Membaca File JSON", { description: "Pastikan file tidak korup atau memiliki format JSON yang benar." });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportTemplate = () => {
    if (!activeTemplate) return;
    const dataStr = JSON.stringify(activeTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${activeTemplate.trackName}_export.json`);
    linkElement.click();
    toast.info("File JSON sedang diunduh.");
  };

  // DIPERBARUI: Fungsi createNewTemplate agar mendefinisikan label UI secara otomatis
  const createNewTemplate = () => {
    const newTemplate: FormTemplate = {
      id: `track_${Date.now()}`, 
      trackName: "Kategori Baru", 
      trackDescription: "Deskripsi singkat.", 
      trackIcon: "LayoutGrid",
      isActive: false, 
      version: 1, 
      lastUpdated: new Date().toISOString(),
      folder: activeFolder !== 'Semua' && activeFolder !== 'Uncategorized' ? activeFolder : undefined,
      aiPromptConfig: {
        aiPersona: "Asesor Ahli",
        assessmentGoal: "Melakukan penilaian menyeluruh terhadap entitas.",
        reportTone: "consultative",
        gradingStrictness: "standard",
        expectedMetrics: [],
        expectedAnalysisBlocks: [],
        expectedRecommendations: [],
        riskFramework: "",
        customScoringRubric: "",
        customSystemPrompt: "",
        negativePrompts: "",
        formatInstructions: "",
        // MENGINISIALISASI FIELD BARU SAAT MEMBUAT BARU
        formPurpose: "assessment" as any,
        customUiLabels: {
          scoreLabel: "AI Readiness Score",
          swotLabel: "Capability Matrix (SWOT)",
          riskLabel: "Critical Risks & Mitigation Map",
          roadmapLabel: "Rekomendasi Strategis",
          executionLabel: "Action Plan Timeline"
        }
      },
      steps: [{ stepNumber: 1, title: "Langkah 1", fields: [{ id: 'namaUsaha', label: 'Nama Entitas/Usaha', type: 'text', required: true, gridSpan: 2 }] }]
    };
    setActiveTemplate(newTemplate);
    router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${newTemplate.id}&tab=general`);
  };

  const duplicateTemplate = () => {
    if (!activeTemplate) return;
    const duplicatedId = `track_copy_${Date.now()}`;
    const duplicatedTemplate = { 
      ...activeTemplate, 
      id: duplicatedId, 
      trackName: `${activeTemplate.trackName} (Salinan)`, 
      isActive: false, 
      lastUpdated: new Date().toISOString() 
    };
    setActiveTemplate(duplicatedTemplate);
    router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${duplicatedId}&tab=general`);
    toast.success('Kategori berhasil digandakan!', { description: 'Klik "Simpan" untuk merekam permanen ke database.' });
  };

  const saveTemplate = async (overrideTemplate?: FormTemplate) => {
    const templateToSave = overrideTemplate || activeTemplate; 
    if (!templateToSave) return;
    
    const hasNamaUsaha = templateToSave.steps?.some(step => step.fields?.some(f => f.id === 'namaUsaha'));
    if (!hasNamaUsaha) { 
      toast.error('GAGAL MENYIMPAN: Form kehilangan kolom "namaUsaha" (Identitas Utama).', { description: 'Kolom pertama pada langkah 1 harus memiliki id: "namaUsaha" agar database bisa melacak entitas.'}); 
      return; 
    }
    
    setIsSaving(true);
    try {
      const templateFinal = { ...templateToSave, lastUpdated: new Date().toISOString() };
      const firestoreSafePayload = JSON.parse(JSON.stringify(templateFinal)); 
      
      await setDoc(doc(db, 'form_templates', firestoreSafePayload.id), firestoreSafePayload);
      
      setTemplates(prev => {
        const exists = prev.find(t => t.id === firestoreSafePayload.id);
        if (exists) return prev.map(t => t.id === firestoreSafePayload.id ? firestoreSafePayload : t);
        return [firestoreSafePayload, ...prev]; 
      });

      if (!overrideTemplate) {
        toast.success('Template Form Berhasil Tersimpan!', { description: 'Perubahan Anda telah direkam ke database.'});
      }
    } catch (error) { 
      console.error(error); 
      toast.error('Gagal menyimpan ke database.', { description: 'Periksa koneksi internet atau konsol log Anda.'});
    } finally { 
      setIsSaving(false); 
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Hapus permanen template ini? Data tidak bisa dikembalikan.')) return;
    try {
      await deleteDoc(doc(db, 'form_templates', id));
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template berhasil dihapus permanen.");
      if (editId === id) { 
        router.push(`?folder=${encodeURIComponent(activeFolder)}`); 
      }
    } catch (error) { 
      console.error(error); 
      toast.error("Gagal menghapus template.");
    }
  };

  // ==========================================
  // TAMPILAN VIEW 1 (DASHBOARD FOLDER)
  // ==========================================
  if (activeView === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full min-w-0">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" onClick={() => router.push('/admin')} className="w-10 h-10 p-0 rounded-full bg-white hover:bg-slate-200 text-slate-600 shrink-0 ring-1 ring-slate-200 shadow-sm">
                <ChevronLeft size={20} />
              </Button>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Template Form Builder</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-balance">
              Organisasikan formulir Anda dengan mudah. Klik <strong>Atur Organisasi</strong> untuk merubah posisi dan folder template form.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button 
              variant={isEditMode ? "default" : "outline"}
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) setSelectedTemplates([]); 
              }}
              className={`rounded-xl h-10 px-4 font-bold transition-all shadow-sm flex items-center gap-2 ${
                isEditMode ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {isEditMode ? <CheckCircle2 className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
              {isEditMode ? "Selesai Mengatur" : "Atur Organisasi"}
            </Button>

            <div className="flex bg-slate-200/60 p-1 rounded-xl ring-1 ring-slate-200 hidden sm:flex">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><ListIcon size={18}/></button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><LayoutGrid size={18}/></button>
            </div>
            <label className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-sm font-bold cursor-pointer shadow-sm transition-all">
              <Upload className="h-4 w-4" /> Import JSON
              <input type="file" accept=".json" onChange={importTemplate} className="hidden" />
            </label>
            <Button onClick={createNewTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 gap-2 h-10 px-5 font-bold">
              <Plus className="h-4 w-4" /> Buat Baru
            </Button>
          </div>
        </div>

        {/* HORIZONTAL FOLDER DIRECTORY BAR */}
        <div className="w-full bg-white p-2.5 rounded-2xl ring-1 ring-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 overflow-x-auto hide-scrollbar z-20">
          
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-1 shrink-0">
              <Folder size={12}/> DIREKTORI:
            </span>
            
            {folders.map(folderName => {
              const name = folderName as string;
              const isCurrentActive = activeFolder === name;
              const count = name === 'Semua' ? templates.length : name === 'Uncategorized' ? templates.filter(t => !t.folder).length : templates.filter(t => t.folder === name).length;
              const isSystemFolder = name === 'Semua' || name === 'Uncategorized';

              return (
                <div
                  key={name} onClick={() => router.push(`?folder=${encodeURIComponent(name)}`)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, name)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all border shrink-0 relative ${
                    isCurrentActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  {editingFolder !== name ? (
                    <>
                      {isCurrentActive ? <FolderOpen size={16} className="text-indigo-600 shrink-0"/> : <Folder size={16} className="text-slate-400 shrink-0"/>}
                      <span className={`text-sm ${isCurrentActive ? 'font-bold' : 'font-medium'}`}>{name}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${isCurrentActive ? 'bg-indigo-200/50 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                      
                      {!isSystemFolder && isEditMode && (
                        <div className="hidden group-hover:flex items-center gap-1 bg-white p-0.5 rounded-md shadow-sm border border-slate-200 absolute -top-8 left-1/2 -translate-x-1/2 z-30 animate-in zoom-in-95">
                          <button onClick={(e) => { e.stopPropagation(); setEditFolderName(name); setEditingFolder(name); }} className="p-1 hover:text-indigo-600 text-slate-500" title="Ubah Nama"><Edit3 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(name); }} className="p-1 hover:text-rose-600 text-slate-500" title="Hapus"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input 
                        autoFocus value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder(name)}
                        className="w-24 bg-white border border-indigo-300 rounded h-7 text-xs px-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleRenameFolder(name); }} className="text-emerald-600 bg-emerald-50 p-1 rounded hover:bg-emerald-100"><CheckCircle2 size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingFolder(null); }} className="text-slate-400 bg-slate-100 p-1 rounded hover:bg-slate-200"><X size={14}/></button>
                    </div>
                  )}
                </div>
              );
            })}

            {isEditMode && (
              <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-200 shrink-0">
                {!isCreatingFolder ? (
                  <button onClick={() => setIsCreatingFolder(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors border border-dashed border-indigo-300 bg-indigo-50/30">
                    <Plus size={14}/> Tambah Baru
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-1.5 py-1 rounded-xl border border-indigo-200">
                    <input 
                      autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      placeholder="Nama folder..." className="w-28 bg-white border border-slate-200 rounded h-7 text-xs px-2 focus:outline-none focus:border-indigo-400"
                    />
                    <button onClick={handleCreateFolder} className="bg-indigo-600 text-white p-1 rounded-md"><CheckCircle2 size={14}/></button>
                    <button onClick={() => setIsCreatingFolder(false)} className="bg-slate-200 text-slate-600 p-1 rounded-md"><X size={14}/></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KONTEN UTAMA LIST TEMPLATE */}
        <div className="w-full flex flex-col gap-4">
          
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-2xl ring-1 ring-slate-200 shadow-sm z-10 w-full">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder={`Cari di folder ${activeFolder}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl h-10 pl-9 pr-4 text-sm font-medium outline-none transition-all"
              />
            </div>

            {selectedTemplates.length > 0 && isEditMode && (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300 w-full sm:w-auto bg-indigo-50 ring-1 ring-indigo-200 p-1.5 rounded-xl overflow-x-auto hide-scrollbar">
                <span className="text-xs font-black text-indigo-700 px-3 truncate shrink-0">{selectedTemplates.length} Terpilih</span>
                
                <div className="relative shrink-0">
                  <select 
                    onChange={(e) => handleBulkMove(e.target.value)} value=""
                    className="appearance-none bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-lg h-8 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>Pindah ke...</option>
                    {folders.filter(f => f !== 'Semua').map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <MoveRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />
                </div>

                <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="h-8 px-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 shrink-0" title="Hapus Massal">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTemplates([])} className="h-8 px-2 text-slate-500 hover:bg-slate-200 shrink-0">Batal</Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-[2rem] border border-dashed border-slate-300 ring-1 ring-slate-100 shadow-sm">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-700">{searchQuery ? 'Pencarian Tidak Ditemukan' : 'Folder Kosong'}</h3>
              <p className="text-slate-500 text-sm mt-1">{searchQuery ? `Tidak ada form yang cocok dengan "${searchQuery}".` : 'Tarik form dari folder lain dan lepas di folder ini.'}</p>
            </div>
          ) : viewMode === 'list' ? (
            
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300 w-full border border-slate-200">
              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100 whitespace-nowrap">
                    <tr>
                      {isEditMode && (
                        <th className="px-4 py-4 w-10 text-center animate-in fade-in">
                          <button onClick={selectAllFiltered} className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'}`}>
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                        </th>
                      )}
                      {isEditMode && (
                        <th className="px-2 py-4 w-8 text-center animate-in fade-in" title="Drag to move">Grip</th>
                      )}
                      <th className="px-5 py-4 w-full min-w-[200px]">Identitas Template</th>
                      <th className="px-5 py-4 whitespace-nowrap">Status Publikasi</th>
                      <th className="px-5 py-4 text-center whitespace-nowrap">Isi Form</th>
                      <th className="px-5 py-4 text-right whitespace-nowrap">Update Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredTemplates.map(template => {
                      const isSelected = selectedTemplates.includes(template.id);
                      return (
                        <tr
                          key={template.id} draggable={isEditMode} onDragStart={(e) => handleDragStart(e, template.id)}
                          className={`group transition-all duration-200 border-l-[3px] ${
                            draggedTemplateId === template.id 
                              ? 'opacity-40 bg-slate-100 border-l-slate-300' 
                              : isSelected && isEditMode 
                              ? 'bg-indigo-50/50 border-l-indigo-500' 
                              : template.isActive 
                              ? 'bg-white hover:bg-emerald-50/20 border-l-emerald-400' 
                              : 'bg-slate-50 hover:bg-slate-100/60 border-l-transparent opacity-90 hover:opacity-100'
                          }`}
                        >
                          {isEditMode && (
                            <td className="px-4 py-3 text-center align-middle animate-in fade-in">
                              <button onClick={() => toggleSelectTemplate(template.id)} className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'}`}>
                                <CheckSquare className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                          {isEditMode && (
                            <td className="px-2 py-3 text-center align-middle cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 animate-in fade-in whitespace-nowrap">
                              <GripVertical size={16} className="mx-auto" />
                            </td>
                          )}
                          <td className="px-5 py-3 cursor-pointer align-middle" onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`)}>
                            <div className={`font-black transition-colors ${template.isActive ? 'text-slate-900 group-hover:text-emerald-600' : 'text-slate-500 group-hover:text-slate-800'}`}>
                              {template.trackName}
                            </div>
                            <div className={`text-[11px] font-medium line-clamp-1 mt-0.5 max-w-sm md:max-w-lg ${template.isActive ? 'text-slate-400' : 'text-slate-400/80'}`} title={template.trackDescription}>
                              {template.trackDescription || "Tanpa deskripsi"}
                            </div>
                          </td>
                          <td className="px-5 py-3 align-middle cursor-pointer whitespace-nowrap" onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`)}>
                            {template.isActive ? <span className="inline-flex text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md ring-1 ring-emerald-100">Aktif</span> : <span className="inline-flex text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md ring-1 ring-amber-100 opacity-80">Draft</span>}
                          </td>
                          <td className="px-5 py-3 text-center text-xs font-bold align-middle whitespace-nowrap text-slate-600" onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`)}>
                            {template.steps?.length || 0} Langkah
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-medium align-middle whitespace-nowrap text-slate-500" onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`)}>
                            {new Date(template.lastUpdated).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-in fade-in duration-300 w-full">
              {filteredTemplates.map(template => {
                const isSelected = selectedTemplates.includes(template.id);
                return (
                  <Card 
                    key={template.id} draggable={isEditMode} onDragStart={(e) => handleDragStart(e, template.id)}
                    className={`relative p-6 rounded-3xl border-none ring-2 shadow-sm transition-all flex flex-col justify-between h-full cursor-pointer group ${
                      draggedTemplateId === template.id 
                        ? 'opacity-40 scale-95 ring-slate-200' 
                        : isSelected && isEditMode 
                        ? 'bg-indigo-50/40 ring-indigo-500' 
                        : template.isActive 
                        ? 'bg-white ring-slate-100 hover:ring-emerald-300 hover:shadow-xl' 
                        : 'bg-slate-50/80 ring-slate-200 hover:ring-slate-300 hover:shadow-md opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isEditMode && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSelectTemplate(template.id); }} 
                        className={`absolute top-4 right-4 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-colors border-2 shadow-sm animate-in fade-in ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-transparent hover:border-indigo-400 group-hover:text-slate-200'}`}
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    )}

                    <div onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`)} className="flex-1 cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                          isEditMode 
                            ? 'bg-indigo-50 text-indigo-600 cursor-grab active:cursor-grabbing' 
                            : template.isActive 
                            ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' 
                            : 'bg-slate-200/60 text-slate-500 group-hover:bg-slate-600 group-hover:text-white'
                        }`}>
                          {isEditMode ? <GripVertical size={22} /> : <LayoutGrid size={22} />}
                        </div>
                      </div>
                      <h3 className={`text-lg font-black leading-snug mb-1 line-clamp-2 transition-colors ${template.isActive ? 'text-slate-900 group-hover:text-emerald-600' : 'text-slate-600 group-hover:text-slate-900'}`}>
                        {template.trackName}
                      </h3>
                      <p className={`text-xs font-medium line-clamp-2 mb-4 ${template.isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                        {template.trackDescription || "Tidak ada deskripsi."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center mt-auto" onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`)}>
                      <div className={`rounded-xl p-2.5 flex flex-col items-center justify-center ${template.isActive ? 'bg-slate-50' : 'bg-white/60'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                        {template.isActive ? <span className="text-xs font-black text-emerald-600">AKTIF</span> : <span className="text-xs font-black text-amber-600 opacity-80">DRAFT</span>}
                      </div>
                      <div className={`rounded-xl p-2.5 flex flex-col items-center justify-center ${template.isActive ? 'bg-slate-50' : 'bg-white/60'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diperbarui</p>
                        <p className={`text-xs font-black flex items-center gap-1 ${template.isActive ? 'text-slate-700' : 'text-slate-500'}`}>
                          <Calendar size={12} className={template.isActive ? 'text-emerald-400' : 'text-slate-300'}/> {new Date(template.lastUpdated).toLocaleDateString('id-ID', {month: 'short', day: 'numeric'})}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL WIDTH TEMPLATE EDITOR INTERFACE
  // ==========================================
  if (!activeTemplate) return null;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20 relative w-full min-w-0">
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl ring-1 ring-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4 sticky top-0 md:top-4 z-40 w-full mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="ghost" onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}`)} className="h-10 w-10 p-0 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-600 shrink-0 ring-1 ring-slate-200"><ChevronLeft size={20} /></Button>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 hidden sm:block"><FileEdit className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg font-black text-slate-900 leading-tight truncate">{activeTemplate.trackName}</h2>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 truncate">Status: {activeTemplate.isActive ? 'Publik' : 'Draft'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          <label className="hidden sm:flex items-center gap-2 px-3 h-10 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium cursor-pointer transition-all">
            <Upload className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Import JSON</span>
            <input type="file" accept=".json" onChange={importToCurrentTemplate} className="hidden" />
          </label>

          <Button variant="outline" onClick={exportTemplate} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 px-3 hidden sm:flex"><Download className="w-4 h-4 sm:mr-2 shrink-0" /> <span>Export JSON</span></Button>
          <Button variant="outline" onClick={duplicateTemplate} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 px-3 hidden sm:flex"><Copy className="w-4 h-4 sm:mr-2 shrink-0" /> <span>Duplikat</span></Button>
          <Button variant="outline" onClick={() => deleteTemplate(activeTemplate.id)} className="border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl h-10 w-10 p-0 shrink-0"><Trash2 className="w-4 h-4" /></Button>
          <Button onClick={() => saveTemplate()} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold shadow-sm shadow-indigo-200 whitespace-nowrap"><Save className="w-4 h-4 sm:mr-2 shrink-0" /> {isSaving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full overflow-x-auto hide-scrollbar mb-8">
        {[{ id: 'general', label: 'Pengaturan Dasar', icon: Settings2 }, 
          { id: 'ai', label: 'Otak AI & Enterprise', icon: BrainCircuit },
          { id: 'builder', label: 'Editor Formulir', icon: LayoutGrid }, 
          { id: 'preview', label: 'Preview Mode', icon: Eye },
          { id: 'logs', label: 'Console Logs', icon: Terminal }
        ].map(tab => (
          <button key={tab.id} onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${activeTemplate.id}&tab=${tab.id}`)} className={`flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
            <tab.icon className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 w-full min-w-0">
        {activeTab === 'general' && <TabGeneral template={activeTemplate} onChange={setActiveTemplate} />}
        {activeTab === 'ai' && <TabAIConfig template={activeTemplate} onChange={setActiveTemplate} />}
        
        {activeTab === 'builder' && (
          <TabFormBuilder template={activeTemplate} onChange={setActiveTemplate} onAutoSave={saveTemplate} />
        )}
        
        {activeTab === 'preview' && <AdminTemplatePreview template={activeTemplate} />}
        {activeTab === 'logs' && <TabLogs template={activeTemplate} />}
      </div>
    </div>
  );
}

export default function TemplateBuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="flex flex-col items-center gap-3 text-slate-400"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div><p className="font-bold tracking-widest text-xs uppercase">Menyiapkan Workspace...</p></div></div>}>
      <TemplateBuilderContent />
    </Suspense>
  );
}