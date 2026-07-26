// src/app/admin/pricing/page.tsx
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, query, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { 
  Save, LayoutGrid, Loader2, Store, Tag, Users, Flame, 
  ListChecks, Search, KeyRound, Copy, Check, Share2, Folder, Filter, Wand2, ArrowUpDown, CheckSquare 
} from 'lucide-react';
import { FormTemplate } from '@/types/curation';

type PricingFormState = {
  category: string;
  isActive: boolean; 
  isDisplayedOnLanding: boolean;
  isPaid: boolean;
  trialQuota: string;
  price: string;
  discountPercentage: string;
  discountExpiry: string;
  isBestSeller: boolean;
  userCount: string;
  customUSPs: string;
};

export default function PricingManagerPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<string | null>(null);

  // STATE BATCH MODE
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isBatchOptimizing, setIsBatchOptimizing] = useState(false);

  // STATE FILTER & SORTING
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [activeStatusTab, setActiveStatusTab] = useState<'Aktif' | 'Draft'>('Aktif');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const [generatedTokens, setGeneratedTokens] = useState<Record<string, string>>({});
  const [copiedTokens, setCopiedTokens] = useState<Record<string, boolean>>({});
  const [formStates, setFormStates] = useState<Record<string, PricingFormState>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'form_templates'));
      const snap = await getDocs(q);
      const data: FormTemplate[] = [];
      const initialStates: Record<string, PricingFormState> = {};

      snap.forEach((docSnap) => {
        const tpl = docSnap.data() as FormTemplate;
        data.push({ ...tpl, id: docSnap.id });
        
        let formattedDate = '';
        if (tpl.discountExpiry) {
          const d = new Date(tpl.discountExpiry);
          if (!isNaN(d.getTime())) {
             formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
        }

        initialStates[docSnap.id] = {
          category: tpl.category || 'Belum Dikategorikan',
          isActive: tpl.isActive || false, 
          isDisplayedOnLanding: tpl.isDisplayedOnLanding || false,
          isPaid: tpl.isPaid || false,
          trialQuota: tpl.trialQuota ? tpl.trialQuota.toString() : '0',
          price: tpl.price ? tpl.price.toString() : '0',
          discountPercentage: tpl.discountPercentage ? tpl.discountPercentage.toString() : '0',
          discountExpiry: formattedDate,
          isBestSeller: tpl.isBestSeller || false,
          userCount: tpl.userCount ? tpl.userCount.toString() : '0',
          customUSPs: tpl.customUSPs ? tpl.customUSPs.join('\n') : '',
        };
      });

      setTemplates(data);
      setFormStates(initialStates);
    } catch (error) {
      console.error("Gagal memuat template:", error);
      toast.error("Gagal memuat data template.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: keyof PricingFormState, value: string) => {
    if (field === 'price' || field === 'trialQuota' || field === 'userCount') {
      value = value.replace(/[^0-9]/g, ''); 
    }
    if (field === 'discountPercentage') {
      let num = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (isNaN(num)) num = 0;
      if (num > 100) num = 100;
      value = num.toString();
    }
    setFormStates(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleToggle = (id: string, field: 'isDisplayedOnLanding' | 'isPaid' | 'isBestSeller' | 'isActive') => {
    setFormStates(prev => ({ ...prev, [id]: { ...prev[id], [field]: !prev[id][field] } }));
  };

  const checkIsChanged = (id: string, tpl: FormTemplate) => {
    const state = formStates[id];
    if (!state) return false;
    
    let originalDate = '';
    if (tpl.discountExpiry) {
        const d = new Date(tpl.discountExpiry);
        if (!isNaN(d.getTime())) originalDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    return (
      state.category !== (tpl.category || 'Belum Dikategorikan') ||
      state.isActive !== (tpl.isActive || false) || 
      state.isDisplayedOnLanding !== (tpl.isDisplayedOnLanding || false) ||
      state.isPaid !== (tpl.isPaid || false) ||
      state.trialQuota !== (tpl.trialQuota?.toString() || '0') ||
      state.price !== (tpl.price?.toString() || '0') ||
      state.discountPercentage !== (tpl.discountPercentage?.toString() || '0') ||
      state.discountExpiry !== originalDate ||
      state.isBestSeller !== (tpl.isBestSeller || false) ||
      state.userCount !== (tpl.userCount?.toString() || '0') ||
      state.customUSPs !== (tpl.customUSPs ? tpl.customUSPs.join('\n') : '')
    );
  };

  const toggleSelectTemplate = (id: string) => {
    setSelectedTemplates(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    if (selectedTemplates.length === displayedTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(displayedTemplates.map(t => t.id));
    }
  };

  // --- FUNGSI AI MONETIZE (SINGLE) --- //
  const handleAIOptimize = async (template: FormTemplate) => {
    setIsOptimizing(template.id);
    toast.info("AI sedang menganalisa dan meracik strategi monetisasi...", { id: 'ai-pricing' });

    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const batchPricingFn = httpsCallable(functions, 'batchGenerateSmartPricing');
      
      const payload = {
        templates: [{
          id: template.id,
          trackName: template.trackName,
          trackDescription: template.trackDescription,
          expectedOutputs: template.expectedOutputs
        }]
      };

      const result = await batchPricingFn(payload);
      const data = result.data as any;

      if (data.success && data.results && data.results.length > 0) {
        const res = data.results[0];
        setFormStates(prev => ({
          ...prev,
          [template.id]: {
            ...prev[template.id],
            category: res.category,
            price: res.price.toString(),
            discountPercentage: res.discountPercentage.toString(),
            isPaid: true
          }
        }));

        toast.success("Strategi Harga & Kategori Diterapkan!", {
          id: 'ai-pricing',
          description: `Insight AI: ${res.aiReasoning}`
        });
      }
    } catch (error: any) {
       toast.error("Gagal melakukan optimasi: " + error.message, { id: 'ai-pricing' });
    } finally {
      setIsOptimizing(null);
    }
  };

  // --- FUNGSI AI MONETIZE (BATCH MASSAL) --- //
  const handleBatchAIOptimize = async () => {
    if (selectedTemplates.length === 0) return;
    setIsBatchOptimizing(true);
    toast.info(`AI sedang meracik strategi untuk ${selectedTemplates.length} modul...`, { id: 'ai-batch' });

    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const batchPricingFn = httpsCallable(functions, 'batchGenerateSmartPricing');

      const templatesPayload = selectedTemplates.map(id => {
        const t = templates.find(x => x.id === id);
        return {
          id,
          trackName: t?.trackName,
          trackDescription: t?.trackDescription,
          expectedOutputs: t?.expectedOutputs
        };
      });

      const result = await batchPricingFn({ templates: templatesPayload });
      const data = result.data as any;

      if (data.success && data.results) {
        setFormStates(prev => {
          const newStates = { ...prev };
          data.results.forEach((res: any) => {
            if (newStates[res.templateId]) {
              newStates[res.templateId] = {
                ...newStates[res.templateId],
                category: res.category,
                price: res.price.toString(),
                discountPercentage: res.discountPercentage.toString(),
                isPaid: true
              };
            }
          });
          return newStates;
        });

        toast.success("Strategi Massal Diterapkan!", {
          id: 'ai-batch',
          description: "Harga, kategori baku, dan diskon telah disesuaikan AI."
        });
        
        // Bersihkan pilihan setelah sukses
        setSelectedTemplates([]);
        setIsEditMode(false);
      }
    } catch (error: any) {
      toast.error("Gagal melakukan optimasi massal: " + error.message, { id: 'ai-batch' });
    } finally {
      setIsBatchOptimizing(false);
    }
  };

  const getPayload = (state: PricingFormState) => ({
    category: state.category,
    isActive: state.isActive,
    isDisplayedOnLanding: state.isDisplayedOnLanding,
    isPaid: state.isPaid,
    trialQuota: parseInt(state.trialQuota || '0', 10),
    price: parseInt(state.price || '0', 10),
    discountPercentage: parseInt(state.discountPercentage || '0', 10),
    discountExpiry: state.discountExpiry ? new Date(state.discountExpiry).toISOString() : null,
    isBestSeller: state.isBestSeller,
    userCount: parseInt(state.userCount || '0', 10),
    customUSPs: state.customUSPs.split('\n').map(s => s.trim()).filter(s => s !== ''),
    lastUpdated: new Date().toISOString()
  });

  const handleSaveItem = async (id: string) => {
    const state = formStates[id];
    setIsSaving(id);
    try {
      const payload = getPayload(state);
      await updateDoc(doc(db, 'form_templates', id), payload);
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...payload } as FormTemplate : t));
      toast.success("Pengaturan komersial diperbarui!");
    } catch (error) {
      console.error("Gagal update data:", error);
      toast.error("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving('all');
    try {
      const promises = templates.map(t => {
        if (checkIsChanged(t.id, t)) {
          const payload = getPayload(formStates[t.id]);
          return updateDoc(doc(db, 'form_templates', t.id), payload);
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      
      setTemplates(prev => prev.map(t => {
        if (checkIsChanged(t.id, t)) {
          const payload = getPayload(formStates[t.id]);
          return { ...t, ...payload } as FormTemplate;
        }
        return t;
      }));
      toast.success("Semua perubahan berhasil disimpan!");
    } catch (error) {
      console.error("Gagal update massal:", error);
      toast.error("Terjadi kesalahan saat menyimpan massal.");
    } finally {
      setIsSaving(null);
    }
  };

  const handleGenerateB2CToken = async (templateId: string, templateName: string) => {
    setIsGeneratingToken(templateId);
    try {
      const b2cRef = doc(db, 'corporate_tokens', 'B2C');
      const tokenCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const fullToken = `B2C-${tokenCode}`;
      
      await setDoc(b2cRef, {
        corporateName: "Penjualan B2C (Mandiri)",
        modelType: "flash", 
        totalTokens: increment(1),
        createdAt: new Date().toISOString(), 
        tokens: {
          [fullToken]: {
            isUsed: false,
            usedAt: null,
            usedByNamaUsaha: null,
            allowedTemplates: [templateId] 
          }
        }
      }, { merge: true });

      setGeneratedTokens(prev => ({ ...prev, [templateId]: fullToken }));
      navigator.clipboard.writeText(fullToken);
      setCopiedTokens(prev => ({ ...prev, [templateId]: true }));
      setTimeout(() => setCopiedTokens(prev => ({ ...prev, [templateId]: false })), 3000);
      
      toast.success(`Token berhasil dibuat!`, { description: `Kode: ${fullToken} (Akses Modul: ${templateName})` });
    } catch (error) {
      console.error("Gagal generate token B2C:", error);
      toast.error("Gagal membuat token akses.");
    } finally {
      setIsGeneratingToken(null);
    }
  };

  const handleCopyManual = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokens(prev => ({ ...prev, [id]: true }));
    toast.success("Kode token disalin ke clipboard!");
    setTimeout(() => setCopiedTokens(prev => ({ ...prev, [id]: false })), 2000);
  };

  const handleCopyShareLink = (templateId: string) => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/katalog?buy=${templateId}`;
      navigator.clipboard.writeText(link);
      toast.success("Link Beli berhasil disalin!", {
        description: "Bagikan link ini agar pelanggan langsung diarahkan ke modul ini."
      });
    }
  };

  const formatRupiah = (angka: number | string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(angka));
  };

  // --- LOGIC PENGELOMPOKAN, FILTER & SORTING --- //
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => {
      if (t.category) cats.add(t.category.trim());
      else cats.add('Umum');
    });
    return ['Semua', ...Array.from(cats).sort()];
  }, [templates]);

  const displayedTemplates = useMemo(() => {
    let filtered = templates.filter(template => {
      const state = formStates[template.id];
      if (!state) return false;

      // 1. Filter Status Aktif vs Draft
      const isAct = state.isActive;
      if (activeStatusTab === 'Aktif' && !isAct) return false;
      if (activeStatusTab === 'Draft' && isAct) return false;

      // 2. Filter Search Term
      const query = searchTerm.toLowerCase();
      if (query) {
        return (
          template.trackName.toLowerCase().includes(query) ||
          (template.trackDescription && template.trackDescription.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // 3. Filter Kategori
    if (activeCategory !== 'Semua') {
      filtered = filtered.filter(t => {
        const cat = formStates[t.id]?.category?.trim() || 'Umum';
        return cat === activeCategory;
      });
    }

    // 4. Sorting
    filtered.sort((a, b) => {
      const stateA = formStates[a.id];
      const stateB = formStates[b.id];
      const priceA = stateA ? parseInt(stateA.price || '0', 10) : 0;
      const priceB = stateB ? parseInt(stateB.price || '0', 10) : 0;
      const dateA = new Date(a.lastUpdated || 0).getTime();
      const dateB = new Date(b.lastUpdated || 0).getTime();

      switch (sortBy) {
        case 'name_asc': return a.trackName.localeCompare(b.trackName);
        case 'name_desc': return b.trackName.localeCompare(a.trackName);
        case 'price_asc': return priceA - priceB;
        case 'price_desc': return priceB - priceA;
        case 'date_asc': return dateA - dateB;
        case 'date_desc': default: return dateB - dateA;
      }
    });

    return filtered;
  }, [templates, searchTerm, activeCategory, activeStatusTab, sortBy, formStates]);

  const groupedData = useMemo(() => {
    const groups: Record<string, FormTemplate[]> = {};
    displayedTemplates.forEach(t => {
       const cat = formStates[t.id]?.category?.trim() || 'Umum';
       if (!groups[cat]) groups[cat] = [];
       groups[cat].push(t);
    });
    return groups;
  }, [displayedTemplates, formStates]);

  const SwitchToggle = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
      <span className={`text-xs font-bold transition-colors ${checked ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
    </label>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {/* FLOATING ACTION BAR UNTUK BATCH AI MONETIZE */}
      {selectedTemplates.length > 0 && isEditMode && (
        <div className="flex items-center gap-3 animate-in slide-in-from-bottom-4 fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-indigo-950 p-2.5 rounded-2xl shadow-2xl ring-1 ring-indigo-800">
           <span className="text-sm font-black text-white px-3">{selectedTemplates.length} Modul Dipilih</span>
           <Button onClick={handleBatchAIOptimize} disabled={isBatchOptimizing} className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl shadow-md h-10 px-5">
              {isBatchOptimizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />} 
              AI Monetize Massal
           </Button>
           <Button onClick={() => setSelectedTemplates([])} variant="ghost" className="text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-xl h-10">Batal</Button>
        </div>
      )}

      <datalist id="category-suggestions">
        {uniqueCategories.filter(c => c !== 'Semua').map(cat => (
          <option key={cat} value={cat} />
        ))}
      </datalist>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Store className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" /> Landing Page & Monetisasi
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-2 font-medium max-w-2xl text-balance">
            Atur etalase modul asesmen. Generate token akses cepat untuk pesanan mandiri (B2C).
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* TOMBOL TOGGLE EDIT MASSAL */}
          <Button 
            variant={isEditMode ? "default" : "outline"}
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (isEditMode) setSelectedTemplates([]);
            }}
            className={`h-12 px-6 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${isEditMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <CheckSquare className="w-4 h-4" />
            {isEditMode ? "Selesai Memilih" : "Pilih Massal"}
          </Button>

          <Button 
            onClick={handleSaveAll} 
            disabled={isSaving === 'all'}
            className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white h-12 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {isSaving === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Semua
          </Button>
        </div>
      </div>

      {/* Area Filter & Organisasi: Tabs + Search + Sort + Category */}
      <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm sticky top-0 md:relative z-40">
        
        {/* Row 1: Status Tabs, Search, and Sort */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-xl w-full lg:w-fit shrink-0">
            <button 
              onClick={() => setActiveStatusTab('Aktif')} 
              className={`flex-1 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeStatusTab === 'Aktif' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Modul Aktif
            </button>
            <button 
              onClick={() => setActiveStatusTab('Draft')} 
              className={`flex-1 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeStatusTab === 'Draft' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Belum Aktif (Draft)
            </button>
          </div>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Cari nama modul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 bg-slate-50 rounded-xl border-slate-200 focus-visible:ring-indigo-500 w-full font-medium text-sm"
            />
          </div>

          <div className="relative shrink-0 w-full lg:w-48">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              <option value="date_desc">Terbaru Diubah</option>
              <option value="date_asc">Terlama Diubah</option>
              <option value="price_desc">Harga (Tertinggi)</option>
              <option value="price_asc">Harga (Terendah)</option>
              <option value="name_asc">Nama (A - Z)</option>
              <option value="name_desc">Nama (Z - A)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 shrink-0 pr-2">
            <Filter size={14} /> Kategori:
          </span>
          {isEditMode && (
            <button 
              onClick={selectAllFiltered}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shrink-0"
            >
              Pilih Semua di Bawah
            </button>
          )}
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                activeCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {!searchTerm && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
            Menampilkan {displayedTemplates.length} modul {activeStatusTab}
          </p>
        )}
      </div>

      {/* Konten Utama - Render Berdasarkan Kategori */}
      <div className="w-full mt-6">
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium bg-white rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> Memuat Etalase...
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-medium bg-white rounded-3xl shadow-sm ring-1 ring-slate-200">
            {searchTerm 
              ? "Tidak ada modul asesmen yang cocok dengan pencarian dan filter Anda." 
              : `Belum ada modul dengan status ${activeStatusTab} di kategori ini.`}
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(groupedData).sort(([a], [b]) => a.localeCompare(b)).map(([categoryName, items]) => (
              <div key={categoryName} className="space-y-4 animate-in fade-in duration-300">
                
                <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-3 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Folder className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{categoryName}</h2>
                  <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-md ml-2">
                    {items.length} Modul
                  </span>
                </div>

                {/* List Modul di Dalam Kategori */}
                <div className="flex flex-col gap-5">
                  {items.map(template => {
                    const state = formStates[template.id];
                    if (!state) return null;
                    
                    const isChanged = checkIsChanged(template.id, template);
                    const originalPrice = parseInt(state.price || '0', 10);
                    const discountPerc = parseInt(state.discountPercentage || '0', 10);
                    const finalPrice = originalPrice - (originalPrice * (discountPerc / 100));
                    
                    const isSelected = selectedTemplates.includes(template.id);
                    
                    // HIGHLIGHT CARD JIKA SEDANG DIPILIH (BATCH MODE)
                    const highlightCardClass = isSelected 
                        ? 'border-l-[4px] border-l-indigo-600 border-t border-r border-b border-indigo-200 bg-indigo-50/40 shadow-md ring-1 ring-indigo-500' 
                        : state.isDisplayedOnLanding && state.isActive
                        ? 'border-l-[4px] border-l-emerald-500 border-t border-r border-b border-slate-200 bg-emerald-50/10 hover:bg-emerald-50/30 shadow-sm' 
                        : 'border border-slate-200 bg-white/70 hover:bg-white opacity-80 hover:opacity-100 shadow-sm';

                    return (
                      <div 
                        key={template.id} 
                        onClick={() => isEditMode ? toggleSelectTemplate(template.id) : undefined}
                        className={`relative flex flex-col lg:flex-row gap-5 lg:gap-8 p-5 md:p-6 rounded-2xl transition-all duration-200 ${highlightCardClass} ${isEditMode ? 'cursor-pointer' : ''}`}
                      >
                        
                        {/* OVERLAY CHECKBOX SAAT EDIT MODE */}
                        {isEditMode && (
                          <div className="absolute top-4 right-4 z-20">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all shadow-sm ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'}`}>
                              <CheckSquare className="w-4 h-4" />
                            </div>
                          </div>
                        )}

                        {/* KOLOM 1: Info Modul & Aktivasi */}
                        <div className={`flex-1 lg:max-w-[320px] space-y-4 ${isEditMode ? 'pointer-events-none' : ''}`}>
                          <div className="flex items-start gap-4">
                            <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 shadow-sm ${state.isActive ? 'bg-indigo-50 text-indigo-600 ring-indigo-200' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}>
                              <LayoutGrid size={18}/>
                            </div>
                            <div className={isEditMode ? 'pr-8' : ''}>
                              <p className="font-black text-slate-900 text-[15px] leading-snug">{template.trackName}</p>
                              <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-1" title={template.trackDescription}>
                                {template.trackDescription || "Deskripsi singkat."}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-3 pt-2">
                            {/* Panel Aktivasi & Katalog (Lebih rapi) */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-3">
                               <SwitchToggle checked={state.isActive} onChange={() => handleToggle(template.id, 'isActive')} label="Aktifkan Modul Ini" />
                               <SwitchToggle checked={state.isDisplayedOnLanding} onChange={() => handleToggle(template.id, 'isDisplayedOnLanding')} label="Tampilkan di Etalase Katalog" />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">Kategori Modul</label>
                              <Input 
                                type="text" 
                                list="category-suggestions"
                                placeholder="Misal: Zona Gen Z & Karir" 
                                value={state.category}
                                onChange={(e) => handleInputChange(template.id, 'category', e.target.value)}
                                className="h-9 text-xs font-bold bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
                              />
                            </div>
                            
                            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50 space-y-3 mt-2">
                              <SwitchToggle checked={state.isBestSeller} onChange={() => handleToggle(template.id, 'isBestSeller')} label="Tandai Best Seller" />
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-orange-400" />
                                <Input 
                                  type="text" placeholder="Jml Pengguna" value={state.userCount}
                                  onChange={(e) => handleInputChange(template.id, 'userCount', e.target.value)}
                                  className="h-8 w-24 text-xs font-bold bg-white"
                                />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Pengguna</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Garis Pemisah Mobile */}
                        <div className="w-full h-px bg-slate-200/60 lg:hidden"></div>

                        {/* KOLOM 2: Harga & FOMO */}
                        <div className={`flex-1 lg:max-w-[280px] space-y-4 ${isEditMode ? 'pointer-events-none' : ''}`}>
                          <SwitchToggle checked={state.isPaid} onChange={() => handleToggle(template.id, 'isPaid')} label="Berbayar" />
                          
                          <div className="relative w-full">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${!state.isPaid ? 'text-slate-300' : 'text-slate-400'}`}>Rp</span>
                            <Input 
                              type="text" value={state.price}
                              onChange={(e) => handleInputChange(template.id, 'price', e.target.value)}
                              disabled={!state.isPaid}
                              className={`pl-9 h-10 font-bold text-sm rounded-xl transition-all ${!state.isPaid ? 'bg-slate-50 opacity-50 border-slate-200 text-slate-400' : 'bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500'}`}
                            />
                          </div>

                          {state.isPaid && (
                            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between gap-2">
                                <div className="relative w-[110px] shrink-0">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400"><Tag className="w-3.5 h-3.5" /></span>
                                  <Input 
                                    type="text" value={state.discountPercentage}
                                    onChange={(e) => handleInputChange(template.id, 'discountPercentage', e.target.value)}
                                    className="pl-8 pr-7 h-9 font-bold text-sm bg-white border-rose-200 text-rose-700 focus-visible:ring-rose-500"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-rose-500">%</span>
                                </div>
                                {discountPerc > 0 && <div className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-1 rounded-md text-right leading-tight">Final:<br/>{formatRupiah(finalPrice)}</div>}
                              </div>
                              
                              {discountPerc > 0 && (
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500"/> Batas Waktu Diskon (Opsional)</label>
                                  <Input 
                                    type="datetime-local" value={state.discountExpiry}
                                    onChange={(e) => handleInputChange(template.id, 'discountExpiry', e.target.value)}
                                    className="h-9 text-xs font-bold text-slate-600 bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Garis Pemisah Mobile */}
                        <div className="w-full h-px bg-slate-200/60 lg:hidden"></div>

                        {/* KOLOM 3: Custom USP */}
                        <div className={`flex-1 lg:max-w-[280px] space-y-2 ${isEditMode ? 'pointer-events-none' : ''}`}>
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                            <ListChecks className="w-3.5 h-3.5 text-emerald-500"/> Keunggulan Tambahan (Opsional)
                          </label>
                          <Textarea 
                            placeholder="Sesi Konsultasi Eksklusif 30 Menit&#10;Prioritas Validasi Dokumen"
                            value={state.customUSPs}
                            onChange={(e) => handleInputChange(template.id, 'customUSPs', e.target.value)}
                            className="text-xs bg-white resize-y min-h-[120px] shadow-sm border-slate-200 focus-visible:ring-indigo-500"
                          />
                          <p className="text-[9px] text-slate-400 font-medium">Tekan Enter untuk memisahkan setiap poin.</p>
                        </div>

                        {/* Garis Pemisah Mobile */}
                        <div className="w-full h-px bg-slate-200/60 lg:hidden"></div>

                        {/* KOLOM 4: Aksi Simpan & Generate Token */}
                        <div className={`flex flex-col justify-end gap-3 w-full lg:max-w-[180px] ${isEditMode ? 'pointer-events-none opacity-50' : ''}`}>
                          <Button
                            onClick={() => handleAIOptimize(template)}
                            disabled={isOptimizing === template.id}
                            variant="outline"
                            className="w-full h-10 rounded-xl font-black border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            title="Gunakan AI untuk mengatur Harga dan Kategori secara cerdas"
                          >
                            {isOptimizing === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            AI Smart Monetize
                          </Button>

                          <Button 
                            onClick={() => handleSaveItem(template.id)} 
                            disabled={!isChanged || isSaving === template.id}
                            variant="outline"
                            className={`w-full h-10 rounded-xl font-bold transition-all text-xs ${
                              isChanged ? 'bg-slate-900 border-slate-900 text-white shadow-md hover:bg-indigo-600 hover:border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            {isSaving === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Perubahan'}
                          </Button>
                          
                          <Button
                            onClick={() => handleCopyShareLink(template.id)}
                            variant="outline"
                            className="w-full h-10 rounded-xl font-bold border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            title="Salin link direct untuk dikirim ke customer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Copy Link Share
                          </Button>

                          <Button
                            onClick={() => handleGenerateB2CToken(template.id, template.trackName)}
                            disabled={isGeneratingToken === template.id}
                            variant="outline"
                            className="w-full h-10 rounded-xl font-bold border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            title="Buat token eceran sekali pakai untuk pelanggan"
                          >
                            {isGeneratingToken === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                            Generate Token B2C
                          </Button>

                          {generatedTokens[template.id] && (
                            <div className="w-full flex items-center justify-between p-2.5 bg-emerald-100/50 rounded-xl border border-emerald-300 mt-1 animate-in zoom-in-95 duration-200 shadow-sm">
                              <span className="font-mono text-[12px] font-black text-emerald-900 tracking-tight truncate">
                                {generatedTokens[template.id]}
                              </span>
                              <button 
                                onClick={() => handleCopyManual(template.id, generatedTokens[template.id])}
                                className="shrink-0 ml-2 p-2 bg-white rounded-lg hover:bg-emerald-50 transition-colors shadow-sm ring-1 ring-emerald-200/50"
                                title="Salin Ulang Token"
                              >
                                {copiedTokens[template.id] ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-emerald-600" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}