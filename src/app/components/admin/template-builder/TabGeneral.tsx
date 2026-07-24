'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { Trash2, Plus, Sparkles, Loader2, Target, Image as ImageIcon, Copy, PenTool } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface TabGeneralProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabGeneral({ template, onChange }: TabGeneralProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAnchors, setIsGeneratingAnchors] = useState(false);
  
  // STATE UNTUK MARKETING KIT
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'instagram' | 'tiktok' | 'threads' | 'facebook'>('instagram');

  const parseExpectedOutput = (blockStr: string) => {
    if (!blockStr) return { title: '', subs: '' };
    const colonIndex = blockStr.indexOf(':');
    if (colonIndex === -1) return { title: blockStr, subs: '' };
    return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
  };

  const updateExpectedOutput = (idx: number, newTitle: string, newSubs: string) => {
    const cleanTitle = newTitle.trim();
    const cleanSubs = newSubs.trim();
    const combinedValue = cleanTitle || cleanSubs ? `${cleanTitle}${cleanSubs ? `: ${cleanSubs}` : ''}` : '';
    const currentArr = template.expectedOutputs || [];
    const newArr = [...currentArr];
    newArr[idx] = combinedValue;
    onChange({ ...template, expectedOutputs: newArr });
  };

  const removeExpectedOutput = (idx: number) => {
    const currentArr = template.expectedOutputs || [];
    const newArr = [...currentArr];
    newArr.splice(idx, 1);
    onChange({ ...template, expectedOutputs: newArr });
  };

  const addExpectedOutput = () => {
    const currentArr = template.expectedOutputs || [];
    const newArr = [...currentArr, 'Output Baru: Deskripsi singkat output ini'];
    onChange({ ...template, expectedOutputs: newArr });
  };

  const handleGenerateOutputs = async () => {
    if (!template.aiPromptConfig?.expectedRecommendations || template.aiPromptConfig.expectedRecommendations.length === 0) {
      toast.error("Konfigurasi Belum Lengkap", {
        description: "Harap isi 'Target Rekomendasi' di Tab Otak AI terlebih dahulu agar AI bisa merumuskan output."
      });
      return;
    }

    setIsGenerating(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateFn = httpsCallable(functions, 'generateTemplateSellingPoints');
      
      const payload = {
        trackName: template.trackName,
        trackDescription: template.trackDescription,
        aiPromptConfig: template.aiPromptConfig
      };
      
      const result = await generateFn(payload);
      const data = result.data as any;
      
      if (data.success && data.sellingPoints) {
         const formattedOutputs = data.sellingPoints.map((sp: any) => `${sp.title}: ${sp.description}`);
         onChange({ ...template, expectedOutputs: formattedOutputs });
         toast.success("Berhasil!", { description: "Copywriting benefit berhasil digenerate oleh AI." });
      }
    } catch(e: any) {
      console.error(e);
      toast.error("Gagal Generate", { description: e.message || "Terjadi kesalahan pada server AI." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAnchors = async () => {
    if (!template.trackName) {
      toast.error("Nama Program Kosong", { description: "Harap isi Nama Program/Kategori terlebih dahulu untuk acuan AI." });
      return;
    }

    setIsGeneratingAnchors(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateAnchorsFn = httpsCallable(functions, 'generatePromptAnchors');
      
      const payload = {
        trackName: template.trackName,
        trackDescription: template.trackDescription,
        targetAudience: template.aiPromptConfig?.targetAudience
      };
      
      const result = await generateAnchorsFn(payload);
      const data = result.data as any;
      
      if (data.success && data.anchors) {
        onChange({
          ...template,
          specificTargetContext: data.anchors.specificTargetContext,
          methodologyContext: data.anchors.methodologyContext
        });
        toast.success("Berhasil!", { description: "Konteks spesifik berhasil dirumuskan oleh AI." });
      }
    } catch(e: any) {
      console.error(e);
      toast.error("Gagal Generate Anchors", { description: e.message || "Terjadi kesalahan pada server AI." });
    } finally {
      setIsGeneratingAnchors(false);
    }
  };

  // --- FUNGSI 1: GENERATE COPYWRITING & IMAGE PROMPT (GEMINI) MULTI-PLATFORM ---
  const handleGenerateCopywriting = async () => {
    if (!template.trackName || !template.trackDescription) {
      toast.error("Data Belum Lengkap", { description: "Harap isi Nama dan Deskripsi Program terlebih dahulu." });
      return;
    }
    
    setIsGeneratingCopy(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateCopyFn = httpsCallable(functions, 'generateCopywriting');
              
      const payload = {
        trackName: template.trackName,
        trackDescription: template.trackDescription,
        expectedOutputs: template.expectedOutputs,
        targetAudience: template.aiPromptConfig?.targetAudience,
        targetPlatform: activePlatform // Mengirim platform yang sedang dipilih
      };
      
      const result = await generateCopyFn(payload);
      const data = result.data as any;
      
      if (data.success) {
        const currentAssets = (template.promoAssets as any) || {};
        const platformAssets = currentAssets[activePlatform] || { copywriting: '', imagePrompt: '', imageUrl: '', generatedAt: '' };
        
        onChange({ 
          ...template, 
          promoAssets: {
            ...currentAssets,
            [activePlatform]: {
              ...platformAssets,
              copywriting: data.copywriting,
              imagePrompt: data.imagePrompt,
              generatedAt: new Date().toISOString()
            }
          } 
        });
        toast.success("Copywriting Selesai!", { description: `Teks Caption & Prompt Gambar untuk ${activePlatform.toUpperCase()} berhasil dibuat.` });
      }
    } catch(e: any) {
      console.error(e);
      toast.error("Gagal Generate Teks", { description: e.message });
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // --- FUNGSI 2: RENDER GAMBAR DENGAN IMAGEN (VERTEX AI) MULTI-PLATFORM ---
  const handleRenderImage = async () => {
    const currentPrompt = (template.promoAssets as any)?.[activePlatform]?.imagePrompt;
    
    if (!currentPrompt) {
      toast.error("Prompt Kosong", { description: "Harap isi atau generate Image Prompt terlebih dahulu." });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateImageFn = httpsCallable(functions, 'generatePromoImage');
              
      const payload = {
        imagePrompt: currentPrompt
      };
      
      const result = await generateImageFn(payload);
      const data = result.data as any;
      
      if (data.success && data.imageUrl) {
        const currentAssets = (template.promoAssets as any) || {};
        
        onChange({ 
          ...template, 
          promoAssets: {
            ...currentAssets,
            [activePlatform]: {
              ...currentAssets[activePlatform],
              imageUrl: data.imageUrl,
              generatedAt: new Date().toISOString()
            }
          } 
        });
        toast.success("Render Selesai!", { description: `Gambar untuk ${activePlatform.toUpperCase()} berhasil dibuat.` });
      }
    } catch(e: any) {
      console.error(e);
      toast.error("Gagal Render Gambar", { description: e.message });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
             
      <div className="mb-2">
        <h3 className="text-xl font-black text-slate-900">Identitas Program</h3>
        <p className="text-sm text-slate-500 font-medium">Tampilan yang akan dilihat peserta di halaman depan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama Program/Kategori</label>
          <Input
            value={template.trackName}
            onChange={e => onChange({ ...template, trackName: e.target.value })}
            className="rounded-xl h-12 bg-slate-50 font-bold"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama Icon (Lucide)</label>
          <Input
            value={template.trackIcon}
            onChange={e => onChange({ ...template, trackIcon: e.target.value })}
            placeholder="Contoh: Rocket, Store, Briefcase"
            className="rounded-xl h-12 bg-slate-50 font-mono text-sm"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Deskripsi Singkat</label>
          <Textarea
            value={template.trackDescription}
            onChange={e => onChange({ ...template, trackDescription: e.target.value })}
            className="rounded-xl bg-slate-50 min-h-[100px]"
            placeholder="Jelaskan secara singkat apa tujuan dari form ini..."
          />
        </div>

        {/* --- BLOK KONTEKS SPESIFIK & PROMPT ANCHORS --- */}
        <div className="space-y-4 md:col-span-2 p-5 bg-amber-50/50 rounded-2xl ring-1 ring-amber-100 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-amber-600" />
              <label className="text-[11px] font-black text-amber-900 uppercase tracking-widest">
                Konteks Spesifik & Ketajaman AI (Prompt Anchors)
              </label>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAnchors}
              disabled={isGeneratingAnchors}
              className="h-8 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 rounded-lg shadow-sm shrink-0"
            >
              {isGeneratingAnchors ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Auto-Generate Anchor
            </Button>
          </div>
          
          <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed mb-4">
            Kunci pemahaman AI di sini agar tidak menerka-nerka. Semakin spesifik profil target dan metodologinya, semakin tajam dan relevan pertanyaan kuesioner yang akan digenerate.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Profil Spesifik Subjek</label>
              <Textarea 
                value={template.specificTargetContext || ''}
                onChange={e => onChange({ ...template, specificTargetContext: e.target.value })}
                placeholder="Cth: Karyawan level manajerial yang sedang mengalami burnout dan butuh intervensi psikologi..."
                className="rounded-xl bg-white border-amber-200 min-h-[80px] text-xs font-medium focus-visible:ring-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Metodologi / Referensi</label>
              <Textarea 
                value={template.methodologyContext || ''}
                onChange={e => onChange({ ...template, methodologyContext: e.target.value })}
                placeholder="Cth: Menggunakan pendekatan Cognitive Behavioral Therapy (CBT) / Skala Likert Psikometri / Standar ISO 9001..."
                className="rounded-xl bg-white border-amber-200 min-h-[80px] text-xs font-medium focus-visible:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* --- BLOK MODE EKSEKUSI --- */}
        <div className="space-y-2 md:col-span-2 bg-indigo-50/50 p-5 rounded-2xl ring-1 ring-indigo-100 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-indigo-600" />
            <label className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">
              Mode Eksekusi Formulir (Sistem AI)
            </label>
          </div>
          <p className="text-xs text-indigo-700/70 font-medium mb-3">
            Tentukan bagaimana AI merender kuesioner ini kepada responden secara *real-time*.
          </p>
          <select
            value={template.formMode || 'standard'}
            onChange={e => onChange({ ...template, formMode: e.target.value as 'standard' | 'adaptive' | 'hybrid' })}
            className="w-full h-12 rounded-xl border border-indigo-200 bg-white text-slate-900 font-bold px-4 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm cursor-pointer"
          >
            <option value="standard">Standard (Statis & Konsisten sesuai Template)</option>
            <option value="adaptive">Adaptive (Full AI Generate-on-the-fly dari Step 1)</option>
            <option value="hybrid">Hybrid (Statis di Awal, Expand Dinamis di Akhir)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 p-6 bg-slate-50/80 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Harapan Output / Benefit Peserta</h4>
            <p className="text-xs text-slate-500 font-medium mt-1">Poin-poin hasil akhir yang akan muncul di Katalog Landing Page.</p>
          </div>
          
          <Button
            type="button" 
            onClick={handleGenerateOutputs}
            disabled={isGenerating}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-10 shadow-sm"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Auto-Generate dengan AI
          </Button>
        </div>
        
        <div className="space-y-4">
          {(template.expectedOutputs || []).map((item, idx) => {
            const { title, subs } = parseExpectedOutput(item);
            return (
              <div key={idx} className="flex gap-4 items-start relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Judul Output</label>
                    <Input 
                      value={title} 
                      onChange={(e) => updateExpectedOutput(idx, e.target.value, subs)}
                      className="font-black text-slate-800 border-slate-200 bg-slate-50"
                      placeholder="Cth: Action Plan Harian"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Deskripsi Detail</label>
                    <Textarea 
                      value={subs} 
                      onChange={(e) => updateExpectedOutput(idx, title, e.target.value)}
                      className="text-sm font-medium border-slate-200 min-h-[60px]"
                      placeholder="Cth: Panduan langkah demi langkah berbasis AAP yang bisa langsung diterapkan..."
                    />
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => removeExpectedOutput(idx)} 
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 shrink-0 mt-6"
                  title="Hapus Blok Ini"
                >
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>
            )
          })}
          
          <Button 
            type="button"
            variant="outline"
            onClick={addExpectedOutput}
            className="w-full border-dashed border-2 border-slate-300 text-slate-500 hover:bg-slate-50 font-bold rounded-2xl h-12 shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2"/> Tambah Output / Benefit Baru
          </Button>
        </div>
      </div>

      {/* --- BLOK ASET PROMOSI (MULTI-PLATFORM) --- */}
      <div className="space-y-4 p-6 bg-fuchsia-50/50 rounded-3xl border border-fuchsia-200 shadow-sm relative overflow-hidden mt-6">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-fuchsia-500"></div>
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-2 pb-4 border-b border-fuchsia-200/50">
          <div>
            <h4 className="font-black text-fuchsia-900 text-lg uppercase tracking-tight">Marketing & Social Media Kit</h4>
            <p className="text-xs text-fuchsia-700/80 font-medium mt-1">Gunakan AI untuk meramu Caption promosi dan merender Visual per platform.</p>
          </div>
          
          {/* TAB PLATFORM SWITCHER */}
          <div className="flex flex-wrap bg-white p-1 rounded-xl ring-1 ring-fuchsia-200 shadow-sm">
            {['instagram', 'tiktok', 'threads', 'facebook'].map(platform => (
              <button
                key={platform}
                type="button"
                onClick={() => setActivePlatform(platform as any)}
                className={`px-4 py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${activePlatform === platform ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-fuchsia-500 hover:bg-fuchsia-50'}`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {/* TAMPILAN KONTEN BERDASARKAN PLATFORM AKTIF */}
        <div className="flex items-center justify-between mt-2">
           <span className="text-xs font-bold text-fuchsia-700 uppercase tracking-wider flex items-center gap-1.5">
             Modul Aktif: <span className="bg-fuchsia-100 text-fuchsia-800 px-2 py-0.5 rounded-md capitalize">{activePlatform}</span>
           </span>
           <Button
            type="button"
            onClick={handleGenerateCopywriting}
            disabled={isGeneratingCopy}
            className="shrink-0 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl h-9 text-xs shadow-sm"
          >
            {isGeneratingCopy ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <PenTool className="w-3.5 h-3.5 mr-2" />}
            1. Generate Copy {activePlatform}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Kolom Kiri: Copywriting */}
          <div className="space-y-2 flex flex-col h-full">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold text-fuchsia-600 uppercase tracking-widest">Copywriting / Caption</label>
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText((template.promoAssets as any)?.[activePlatform]?.copywriting || '');
                  toast.success("Tersalin ke Clipboard!");
                }} 
                className="text-[9px] font-bold text-fuchsia-500 hover:text-fuchsia-700 flex items-center gap-1"
              >
                <Copy size={12}/> Salin Teks
              </button>
            </div>
            <Textarea 
              value={(template.promoAssets as any)?.[activePlatform]?.copywriting || ''}
              onChange={e => {
                const currentAssets = (template.promoAssets as any) || {};
                onChange({ 
                  ...template, 
                  promoAssets: { 
                    ...currentAssets, 
                    [activePlatform]: { ...currentAssets[activePlatform], copywriting: e.target.value } 
                  } 
                });
              }}
              placeholder={`Teks promosi khusus ${activePlatform} akan muncul di sini...`}
              className="flex-1 min-h-[300px] h-full rounded-2xl bg-white border-fuchsia-200 text-sm font-medium focus-visible:ring-fuchsia-500 p-4 leading-relaxed"
            />
          </div>

          {/* Kolom Kanan: Visual Builder */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Sparkles size={12}/> Image Prompt (English)</label>
              <Textarea 
                value={(template.promoAssets as any)?.[activePlatform]?.imagePrompt || ''}
                onChange={e => {
                  const currentAssets = (template.promoAssets as any) || {};
                  onChange({ 
                    ...template, 
                    promoAssets: { 
                      ...currentAssets, 
                      [activePlatform]: { ...currentAssets[activePlatform], imagePrompt: e.target.value } 
                    } 
                  });
                }}
                placeholder="Instruksi gambar berbahasa Inggris akan digenerate otomatis..."
                className="h-[100px] rounded-xl bg-indigo-50/50 border-indigo-200 text-xs font-mono focus-visible:ring-indigo-500 p-3 leading-relaxed"
              />
              
              <Button
                type="button"
                onClick={handleRenderImage}
                disabled={isGeneratingImage || !(template.promoAssets as any)?.[activePlatform]?.imagePrompt}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 shadow-sm mt-2"
              >
                {isGeneratingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                2. Render Gambar ({activePlatform})
              </Button>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold text-fuchsia-600 uppercase tracking-widest">Hasil Render Gambar</label>
                {(template.promoAssets as any)?.[activePlatform]?.imageUrl && (
                  <a href={(template.promoAssets as any)[activePlatform].imageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-fuchsia-500 hover:underline">Buka Resolusi Penuh</a>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden border-2 border-fuchsia-200 bg-slate-50 aspect-square relative shadow-inner flex items-center justify-center">
                {(template.promoAssets as any)?.[activePlatform]?.imageUrl ? (
                  <img src={(template.promoAssets as any)[activePlatform].imageUrl} alt={`Promo ${activePlatform}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 opacity-40">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500">Belum Ada Gambar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-5 bg-indigo-50/50 rounded-2xl ring-1 ring-indigo-100">
        <input
          type="checkbox"
          checked={template.isActive}
          onChange={e => onChange({ ...template, isActive: e.target.checked })}
          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-200 cursor-pointer"
        />
        <div>
          <p className="font-bold text-indigo-900 text-sm">Aktifkan & Publikasikan</p>
          <p className="text-xs text-indigo-700/70 font-medium mt-0.5">Jika dicentang, peserta dapat melihat dan memilih kategori ini.</p>
        </div>
      </div>
    </div>
  );
}