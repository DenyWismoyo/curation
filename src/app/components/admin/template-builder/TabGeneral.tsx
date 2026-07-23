'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { Trash2, Plus, Sparkles, Loader2, Target } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface TabGeneralProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabGeneral({ template, onChange }: TabGeneralProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAnchors, setIsGeneratingAnchors] = useState(false);

  // FUNGSI UNTUK MEMISAHKAN "JUDUL" DAN "SUB-POIN"
  const parseExpectedOutput = (blockStr: string) => {
    if (!blockStr) return { title: '', subs: '' };
    const colonIndex = blockStr.indexOf(':');
    if (colonIndex === -1) return { title: blockStr, subs: '' };
    return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
  };

  // FUNGSI UNTUK MENYIMPAN PERUBAHAN INPUT
  const updateExpectedOutput = (idx: number, newTitle: string, newSubs: string) => {
    const cleanTitle = newTitle.trim();
    const cleanSubs = newSubs.trim();
    const combinedValue = cleanTitle || cleanSubs ? `${cleanTitle}${cleanSubs ? `: ${cleanSubs}` : ''}` : '';
    
    const currentArr = template.expectedOutputs || [];
    const newArr = [...currentArr];
    newArr[idx] = combinedValue;
    onChange({ ...template, expectedOutputs: newArr });
  };

  // FUNGSI UNTUK MENGHAPUS BLOK
  const removeExpectedOutput = (idx: number) => {
    const currentArr = template.expectedOutputs || [];
    const newArr = [...currentArr];
    newArr.splice(idx, 1);
    onChange({ ...template, expectedOutputs: newArr });
  };

  // FUNGSI UNTUK MENAMBAH BLOK BARU MANUAL
  const addExpectedOutput = () => {
    const currentArr = template.expectedOutputs || [];
    const newArr = [...currentArr, 'Output Baru: Deskripsi singkat output ini'];
    onChange({ ...template, expectedOutputs: newArr });
  };

  // FUNGSI UNTUK GENERATE OUTPUT BERBASIS AI (Eksisting)
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

  // FUNGSI BARU UNTUK GENERATE PROMPT ANCHORS BERBASIS AI
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

        {/* --- BLOK KONTEKS SPESIFIK & PROMPT ANCHORS (DENGAN TOMBOL AUTO-GENERATE) --- */}
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
        {/* --- AKHIR BLOK KONTEKS SPESIFIK --- */}

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
            onClick={handleGenerateOutputs} 
            disabled={isGenerating}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 shadow-md shadow-indigo-200"
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