'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { Trash2, Plus, Sparkles, Loader2, Target, Image as ImageIcon, Copy, PenTool, RefreshCw, Wand2, DownloadCloud } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface TabGeneralProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabGeneral({ template, onChange }: TabGeneralProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAnchors, setIsGeneratingAnchors] = useState(false);
  const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false); // STATE BARU UNTUK IDENTITAS

  // STATE MARKETING KIT
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'instagram' | 'tiktok' | 'threads' | 'facebook'>('instagram');

  // STATE REVISI (CAPTION & SLIDES)
  const [copyRevisionText, setCopyRevisionText] = useState("");
  const [isRevisingCopy, setIsRevisingCopy] = useState(false);
  const [slideRevisionTexts, setSlideRevisionTexts] = useState<Record<number, string>>({});
  const [isRevisingSlidePrompt, setIsRevisingSlidePrompt] = useState<Record<number, boolean>>({});
  const [isRenderingSingleSlide, setIsRenderingSingleSlide] = useState<Record<number, boolean>>({});
  const [isDownloading, setIsDownloading] = useState<Record<number, boolean>>({});

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

  // --- GENERATE IDENTITAS PROGRAM (JUDUL, DESKRIPSI, IKON) ---
  const handleGenerateIdentity = async () => {
    if (!template.trackName) {
      toast.error("Nama program kosong", { description: "Isi draf nama program dasar terlebih dahulu agar AI punya referensi." });
      return;
    }
    
    setIsGeneratingIdentity(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateIdentityFn = httpsCallable(functions, 'generateProgramIdentity');
      const result = await generateIdentityFn({ 
        trackName: template.trackName, 
        trackDescription: template.trackDescription,
        targetAudience: template.aiPromptConfig?.targetAudience 
      });
      const data = result.data as any;
      
      if (data.success) {
         onChange({ 
           ...template, 
           trackName: data.trackName,
           trackDescription: data.trackDescription,
           trackIcon: data.trackIcon
         });
         toast.success("Identitas program berhasil dipercantik!");
      }
    } catch(e: any) { 
      toast.error("Gagal Enhance Identitas", { description: e.message }); 
    } finally { 
      setIsGeneratingIdentity(false); 
    }
  };

  const handleGenerateOutputs = async () => {
    if (!template.aiPromptConfig?.expectedRecommendations || template.aiPromptConfig.expectedRecommendations.length === 0) {
      toast.error("Konfigurasi Belum Lengkap", { description: "Harap isi 'Target Rekomendasi' di Tab Otak AI terlebih dahulu." });
      return;
    }
    setIsGenerating(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateFn = httpsCallable(functions, 'generateTemplateSellingPoints');
      const result = await generateFn({ trackName: template.trackName, trackDescription: template.trackDescription, aiPromptConfig: template.aiPromptConfig });
      const data = result.data as any;
      if (data.success && data.sellingPoints) {
         onChange({ ...template, expectedOutputs: data.sellingPoints.map((sp: any) => `${sp.title}: ${sp.description}`) });
         toast.success("Berhasil Generate Output.");
      }
    } catch(e: any) { toast.error("Gagal Generate", { description: e.message }); } finally { setIsGenerating(false); }
  };

  const handleGenerateAnchors = async () => {
    setIsGeneratingAnchors(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateAnchorsFn = httpsCallable(functions, 'generatePromptAnchors');
      const result = await generateAnchorsFn({ trackName: template.trackName, trackDescription: template.trackDescription, targetAudience: template.aiPromptConfig?.targetAudience });
      const data = result.data as any;
      if (data.success && data.anchors) {
        onChange({ ...template, specificTargetContext: data.anchors.specificTargetContext, methodologyContext: data.anchors.methodologyContext });
        toast.success("Berhasil Generate Anchor.");
      }
    } catch(e: any) { toast.error("Gagal Generate Anchors", { description: e.message }); } finally { setIsGeneratingAnchors(false); }
  };

  // --- GENERATE COPYWRITING & PERTAHANKAN GAMBAR ---
  const handleGenerateCopywriting = async () => {
    setIsGeneratingCopy(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateCopyFn = httpsCallable(functions, 'generateCopywriting');
      const result = await generateCopyFn({
        trackName: template.trackName, trackDescription: template.trackDescription,
        expectedOutputs: template.expectedOutputs, targetAudience: template.aiPromptConfig?.targetAudience,
        targetPlatform: activePlatform, formSteps: template.steps
      });
      
      const data = result.data as any;
      
      if (data.success) {
        const currentAssets = (template.promoAssets as any) || {};
        const existingSlides = currentAssets[activePlatform]?.carouselSlides || [];
        
        const preservedSlides = data.carouselSlides.map((newSlide: any, index: number) => {
          const existingImage = existingSlides[index]?.imageUrl;
          return existingImage ? { ...newSlide, imageUrl: existingImage } : newSlide;
        });

        onChange({ 
           ...template, 
           promoAssets: {
             ...currentAssets,
             [activePlatform]: {
               ...currentAssets[activePlatform],
               copywriting: data.copywriting,
               carouselSlides: preservedSlides,
               generatedAt: new Date().toISOString()
             }
           } 
         });
        toast.success("Konsep Diperbarui (Gambar Anda tetap aman!)");
      }
    } catch(e: any) { toast.error("Gagal Generate", { description: e.message }); } finally { setIsGeneratingCopy(false); }
  };

  // --- REVISI CAPTION ---
  const handleReviseCopywriting = async () => {
    if (!copyRevisionText.trim()) return;
    setIsRevisingCopy(true);
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const reviseCopyFn = httpsCallable(functions, 'reviseCopywriting');
      const currentCaption = (template.promoAssets as any)?.[activePlatform]?.copywriting;
      
      const result = await reviseCopyFn({ originalText: currentCaption, instruction: copyRevisionText, platform: activePlatform });
      const data = result.data as any;
      
      if (data.success && data.revisedText) {
        const currentAssets = (template.promoAssets as any) || {};
        onChange({ ...template, promoAssets: { ...currentAssets, [activePlatform]: { ...currentAssets[activePlatform], copywriting: data.revisedText } } });
        setCopyRevisionText(""); 
        toast.success("Revisi Caption Selesai!");
      }
    } catch(e: any) { toast.error("Gagal Revisi Teks", { description: e.message }); } finally { setIsRevisingCopy(false); }
  };

  // --- REVISI PROMPT SLIDE ---
  const handleReviseSlidePrompt = async (index: number) => {
    const instruction = slideRevisionTexts[index];
    if (!instruction?.trim()) return;
    setIsRevisingSlidePrompt(prev => ({ ...prev, [index]: true }));
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const revisePromptFn = httpsCallable(functions, 'reviseSlidePrompt');
      const currentSlides = [...(template.promoAssets as any)?.[activePlatform]?.carouselSlides];
      const targetSlide = currentSlides[index];
      
      const result = await revisePromptFn({ originalPrompt: targetSlide.imagePrompt, instruction });
      const data = result.data as any;
      
      if (data.success && data.revisedPrompt) {
        currentSlides[index] = { ...targetSlide, imagePrompt: data.revisedPrompt };
        const currentAssets = (template.promoAssets as any) || {};
        onChange({ ...template, promoAssets: { ...currentAssets, [activePlatform]: { ...currentAssets[activePlatform], carouselSlides: currentSlides } } });
        setSlideRevisionTexts(prev => ({ ...prev, [index]: "" }));
        toast.success(`Prompt Slide ${targetSlide.slideNumber} Direvisi!`);
      }
    } catch(e: any) { toast.error("Gagal Revisi Prompt", { description: e.message }); } finally { setIsRevisingSlidePrompt(prev => ({ ...prev, [index]: false })); }
  };

  // --- RENDER 1 SLIDE SECARA MANUAL ---
  const handleRenderSingleSlide = async (index: number) => {
    setIsRenderingSingleSlide(prev => ({ ...prev, [index]: true }));
    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const renderSingleFn = httpsCallable(functions, 'renderSingleSlide');
      const currentSlides = [...(template.promoAssets as any)?.[activePlatform]?.carouselSlides];
      const targetSlide = currentSlides[index];
      
      const result = await renderSingleFn({ slide: targetSlide, trackName: template.trackName });
      const data = result.data as any;
      
      if (data.success && data.updatedSlide) {
        currentSlides[index] = data.updatedSlide;
        const currentAssets = (template.promoAssets as any) || {};
        onChange({ ...template, promoAssets: { ...currentAssets, [activePlatform]: { ...currentAssets[activePlatform], carouselSlides: currentSlides } } });
        toast.success(`Render Slide ${targetSlide.slideNumber} Selesai!`);
      }
    } catch(e: any) { toast.error("Gagal Merender Slide", { description: e.message }); } finally { setIsRenderingSingleSlide(prev => ({ ...prev, [index]: false })); }
  };

  // --- FUNGSI DOWNLOAD GAMBAR ---
  const handleDownloadImage = async (url: string, slideNumber: number) => {
    setIsDownloading(prev => ({ ...prev, [slideNumber]: true }));
    try {
      toast.info(`Menyiapkan unduhan Slide ${slideNumber}...`);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${template.trackName.replace(/[^a-zA-Z0-9]/g, '_')}_${activePlatform}_Slide_${slideNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengunduh gambar.");
    } finally {
      setIsDownloading(prev => ({ ...prev, [slideNumber]: false }));
    }
  };

  const activeAssets = (template.promoAssets as any)?.[activePlatform];
  const activeCarouselSlides = activeAssets?.carouselSlides || [];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-900">Identitas Program</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Tampilan yang akan dilihat peserta di halaman depan katalog.</p>
        </div>
        <Button 
          type="button" 
          onClick={handleGenerateIdentity} 
          disabled={isGeneratingIdentity}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-5 shadow-sm shrink-0 transition-all"
        >
          {isGeneratingIdentity ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />} 
          AI Auto-Enhance
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama Program</label>
          <Input value={template.trackName} onChange={e => onChange({ ...template, trackName: e.target.value })} className="rounded-xl h-12 bg-slate-50 font-bold border-slate-200" />
        </div>
        
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Icon (Lucide)</label>
          <Input value={template.trackIcon} onChange={e => onChange({ ...template, trackIcon: e.target.value })} placeholder="Contoh: Rocket, Target, Brain" className="rounded-xl h-12 bg-slate-50 font-mono text-sm border-slate-200" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Deskripsi Singkat</label>
          <Textarea value={template.trackDescription} onChange={e => onChange({ ...template, trackDescription: e.target.value })} className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px] leading-relaxed font-medium" placeholder="Jelaskan secara singkat tujuan form ini..." />
        </div>

        {/* --- BLOK KONTEKS SPESIFIK & PROMPT ANCHORS --- */}
        <div className="space-y-4 md:col-span-2 p-5 bg-amber-50/50 rounded-2xl ring-1 ring-amber-100 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-amber-600" />
              <label className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Konteks Spesifik & Ketajaman AI</label>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleGenerateAnchors} disabled={isGeneratingAnchors} className="h-8 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 rounded-lg shadow-sm shrink-0">
              {isGeneratingAnchors ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Auto-Generate Anchor
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Profil Subjek</label>
              <Textarea value={template.specificTargetContext || ''} onChange={e => onChange({ ...template, specificTargetContext: e.target.value })} className="rounded-xl bg-white border-amber-200 min-h-[80px] text-xs font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Metodologi</label>
              <Textarea value={template.methodologyContext || ''} onChange={e => onChange({ ...template, methodologyContext: e.target.value })} className="rounded-xl bg-white border-amber-200 min-h-[80px] text-xs font-medium" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 bg-slate-50/80 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden mt-8">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Harapan Output / Benefit Peserta</h4>
          </div>
          <Button type="button" onClick={handleGenerateOutputs} disabled={isGenerating} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-10 shadow-sm">
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Auto-Generate
          </Button>
        </div>
        
        <div className="space-y-4">
          {(template.expectedOutputs || []).map((item, idx) => {
            const { title, subs } = parseExpectedOutput(item);
            return (
              <div key={idx} className="flex gap-4 items-start relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Judul</label>
                    <Input value={title} onChange={(e) => updateExpectedOutput(idx, e.target.value, subs)} className="font-black text-slate-800 border-slate-200 bg-slate-50" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Detail</label>
                    <Textarea value={subs} onChange={(e) => updateExpectedOutput(idx, title, e.target.value)} className="text-sm font-medium border-slate-200 min-h-[60px]" />
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeExpectedOutput(idx)} className="text-slate-400 hover:text-rose-600 h-10 w-10 mt-6"><Trash2 className="w-4 h-4"/></Button>
              </div>
            )
          })}
          <Button type="button" variant="outline" onClick={addExpectedOutput} className="w-full border-dashed border-2 border-slate-300 text-slate-500 font-bold rounded-2xl h-12 shadow-sm"><Plus className="w-5 h-5 mr-2"/> Tambah Baru</Button>
        </div>
      </div>

      {/* --- MARKETING KIT --- */}
      <div className="space-y-4 p-6 bg-fuchsia-50/50 rounded-3xl border border-fuchsia-200 shadow-sm relative overflow-hidden mt-6">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-fuchsia-500"></div>
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-2 pb-4 border-b border-fuchsia-200/50">
          <div>
            <h4 className="font-black text-fuchsia-900 text-lg uppercase tracking-tight">Marketing & Social Media Kit</h4>
            <p className="text-xs text-fuchsia-700/80 font-medium mt-1">Gunakan AI untuk meramu Caption promosi dan merender Visual Carousel per slide.</p>
          </div>
          
          <div className="flex flex-wrap bg-white p-1 rounded-xl ring-1 ring-fuchsia-200 shadow-sm">
            {['instagram', 'tiktok', 'threads', 'facebook'].map(platform => (
              <button key={platform} type="button" onClick={() => setActivePlatform(platform as any)} className={`px-4 py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${activePlatform === platform ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-fuchsia-500 hover:bg-fuchsia-50'}`}>
                {platform}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
           <span className="text-xs font-bold text-fuchsia-700 uppercase tracking-wider flex items-center gap-1.5">
             Modul Aktif: <span className="bg-fuchsia-100 text-fuchsia-800 px-2 py-0.5 rounded-md capitalize">{activePlatform}</span>
           </span>
           <Button type="button" onClick={handleGenerateCopywriting} disabled={isGeneratingCopy} className="shrink-0 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl h-9 text-xs shadow-sm">
            {isGeneratingCopy ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <PenTool className="w-3.5 h-3.5 mr-2" />} Generate Ulang Konsep
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          
          {/* KOLOM KIRI: CAPTION & REVISI CAPTION */}
          <div className="space-y-3 flex flex-col h-full lg:col-span-1">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold text-fuchsia-600 uppercase tracking-widest">Copywriting / Caption</label>
              <button type="button" onClick={() => { navigator.clipboard.writeText(activeAssets?.copywriting || ''); toast.success("Tersalin!"); }} className="text-[9px] font-bold text-fuchsia-500 hover:text-fuchsia-700 flex items-center gap-1"><Copy size={12}/> Salin Teks</button>
            </div>
            
            <Textarea 
              value={activeAssets?.copywriting || ''}
              onChange={e => {
                const currentAssets = (template.promoAssets as any) || {};
                onChange({ ...template, promoAssets: { ...currentAssets, [activePlatform]: { ...currentAssets[activePlatform], copywriting: e.target.value } } });
              }}
              placeholder={`Teks promosi khusus ${activePlatform}...`}
              className="flex-1 min-h-[250px] rounded-2xl bg-white border-fuchsia-200 text-sm font-medium focus-visible:ring-fuchsia-500 p-4 leading-relaxed"
            />
            
            {/* AREA REVISI CAPTION */}
            {activeAssets?.copywriting && (
              <div className="bg-white p-2 rounded-xl ring-1 ring-fuchsia-200 shadow-sm flex flex-col gap-2">
                <Input 
                  value={copyRevisionText}
                  onChange={(e) => setCopyRevisionText(e.target.value)}
                  placeholder="Ketik instruksi revisi (Contoh: 'Buat lebih santai')" 
                  className="text-xs h-8 border-fuchsia-100 bg-fuchsia-50/30"
                />
                <Button type="button" onClick={handleReviseCopywriting} disabled={isRevisingCopy || !copyRevisionText.trim()} variant="outline" className="h-8 text-xs font-bold text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 w-full">
                  {isRevisingCopy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />} Revisi dengan AI
                </Button>
              </div>
            )}
          </div>

          {/* KOLOM KANAN: GAMBAR & REVISI GAMBAR */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Sparkles size={12}/> AI Image Prompts (Carousel)</label>
                <p className="text-[11px] text-fuchsia-700/70 font-medium mt-1">Render gambar dilakukan satu per satu untuk memastikan kualitas optimal.</p>
              </div>
            </div>

            {activeCarouselSlides.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCarouselSlides.map((slide: any, index: number) => (
                  <div key={index} className="p-4 bg-white/70 border border-fuchsia-200 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-md">Slide {slide.slideNumber}</span>
                      
                      {/* TOMBOL RENDER MANUAL PER SLIDE */}
                      <Button 
                        type="button" 
                        onClick={() => handleRenderSingleSlide(index)}
                        disabled={isRenderingSingleSlide[index]}
                        className={`h-7 px-3 text-[10px] font-bold rounded-md transition-all ${slide.imageUrl ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
                      >
                        {isRenderingSingleSlide[index] ? <Loader2 className="w-3 h-3 animate-spin mr-1.5"/> : (slide.imageUrl ? <RefreshCw className="w-3 h-3 mr-1.5"/> : <ImageIcon className="w-3 h-3 mr-1.5"/>)} 
                        {slide.imageUrl ? 'Render Ulang' : 'Render Gambar'}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Teks Tipografi di Gambar</label>
                      <Input 
                        value={slide.textOnImage || ''} 
                        onChange={(e) => {
                          const currentAssets = (template.promoAssets as any) || {};
                          const updatedSlides = [...activeCarouselSlides];
                          updatedSlides[index] = { ...updatedSlides[index], textOnImage: e.target.value };
                          onChange({ ...template, promoAssets: { ...currentAssets, [activePlatform]: { ...currentAssets[activePlatform], carouselSlides: updatedSlides } } });
                        }}
                        className="h-8 text-[11px] bg-white border-fuchsia-100 font-bold" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Instruksi Visual (Prompt AI)</label>
                      <Textarea 
                        value={slide.imagePrompt || ''}
                        onChange={(e) => {
                          const currentAssets = (template.promoAssets as any) || {};
                          const updatedSlides = [...activeCarouselSlides];
                          updatedSlides[index] = { ...updatedSlides[index], imagePrompt: e.target.value };
                          onChange({ ...template, promoAssets: { ...currentAssets, [activePlatform]: { ...currentAssets[activePlatform], carouselSlides: updatedSlides } } });
                        }}
                        className="h-[60px] text-[10px] font-mono bg-white border-fuchsia-200 resize-none p-2"
                      />
                    </div>
                    
                    {/* AREA REVISI PROMPT SLIDE */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <Input 
                        value={slideRevisionTexts[index] || ''}
                        onChange={(e) => setSlideRevisionTexts(prev => ({ ...prev, [index]: e.target.value }))}
                        placeholder="Revisi prompt AI (misal: 'Ganti elemen')"
                        className="h-7 text-[10px] flex-1 bg-indigo-50/40 border-indigo-100"
                      />
                      <Button 
                        type="button" 
                        onClick={() => handleReviseSlidePrompt(index)}
                        disabled={isRevisingSlidePrompt[index] || !slideRevisionTexts[index]?.trim()}
                        className="h-7 px-2 text-[9px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shrink-0"
                      >
                         {isRevisingSlidePrompt[index] ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                      </Button>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-fuchsia-200 bg-slate-100 aspect-[3/4] relative shadow-inner flex items-center justify-center mt-1 group">
                      {slide.imageUrl ? (
                        <>
                          <img src={slide.imageUrl} alt={`Slide ${slide.slideNumber}`} className="w-full h-full object-cover" />
                          
                          {/* TOMBOL OVERLAY: BUKA & DOWNLOAD */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <Button
                               type="button"
                               onClick={() => handleDownloadImage(slide.imageUrl, slide.slideNumber)}
                               disabled={isDownloading[slide.slideNumber]}
                               className="h-8 px-3 text-[10px] font-bold bg-white text-slate-900 hover:bg-slate-200 rounded-lg"
                             >
                               {isDownloading[slide.slideNumber] ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1"/> : <DownloadCloud className="w-3.5 h-3.5 mr-1"/>}
                               Download
                             </Button>
                             
                             <a href={slide.imageUrl} target="_blank" rel="noreferrer" className="h-8 px-3 text-[10px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 rounded-lg flex items-center">
                               <ImageIcon className="w-3.5 h-3.5 mr-1"/> Buka
                             </a>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 opacity-40">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p className="text-[10px] font-bold text-slate-500">Belum Dirender</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-10 bg-fuchsia-50/50 border border-dashed border-fuchsia-200 rounded-2xl opacity-60">
                 <ImageIcon className="w-10 h-10 mx-auto mb-3 text-fuchsia-300" />
                 <p className="text-xs font-bold text-fuchsia-900">Belum ada slide visual.</p>
                 <p className="text-[10px] text-fuchsia-700 mt-1">Tekan "Generate Ulang Konsep" di atas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}