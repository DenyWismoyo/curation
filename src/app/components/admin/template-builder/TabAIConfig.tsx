// src/app/components/admin/template-builder/TabAIConfig.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { AIPromptPresets } from '@/data/aiPromptTemplates';
import { Sparkles, Plus, Trash2, Lightbulb, ChevronDown, Bot, Loader2, Search } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ========================================================
// KOMPONEN PEMBANTU: PANEL PANDUAN TUTORIAL AI
// ========================================================
const GuidePanel = ({ title, colorTheme, children }: { title: string, colorTheme: 'amber' | 'indigo' | 'rose' | 'emerald' | 'slate', children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const themes = {
    amber: 'bg-amber-100/50 text-amber-800 border-amber-200',
    indigo: 'bg-indigo-100/50 text-indigo-800 border-indigo-200',
    rose: 'bg-rose-100/50 text-rose-800 border-rose-200',
    emerald: 'bg-emerald-100/50 text-emerald-800 border-emerald-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  };
  
  const themeClass = themes[colorTheme];

  return (
    <div className={`mt-3 rounded-xl border transition-all duration-300 ${themeClass}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-xs font-bold hover:opacity-80 transition-opacity"
      >
        <span className="flex items-center gap-2"><Lightbulb className="w-4 h-4" /> {title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={`p-4 pt-0 text-[11px] leading-relaxed space-y-2 border-t border-black/5 mt-1`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ========================================================
// KOMPONEN UTAMA
// ========================================================
interface TabAIConfigProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabAIConfig({ template, onChange }: TabAIConfigProps) {
  const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);
  const [customTopic, setCustomTopic] = useState('');

  // STATE UNTUK SEARCHABLE DROPDOWN TEMPLATE INSTAN
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [presetSearchTerm, setPresetSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fungsi untuk menutup dropdown jika area di luar dropdown diklik
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter 110+ Template berdasarkan pencarian (nama atau deskripsi)
  const filteredPresets = AIPromptPresets?.filter(preset => 
    preset.name.toLowerCase().includes(presetSearchTerm.toLowerCase()) || 
    preset.description.toLowerCase().includes(presetSearchTerm.toLowerCase())
  ) || [];

  const handleAutoResearchConfig = async () => {
    if (!template.trackName && !customTopic) {
      alert("Mohon ketikkan Standar/Konteks Referensi di kolom hijau terlebih dahulu.");
      return;
    }
    
    if (confirm("AI akan meriset standar industri dan MENYEMPURNAKAN konfigurasi saat ini secara otomatis. Lanjutkan?")) {
      setIsGeneratingConfig(true);
      try {
        const functions = getFunctions(undefined, 'asia-southeast2');
        const generateAIConfigFn = httpsCallable(functions, 'generateAIConfigResearch', { timeout: 120000 });
        
        const result = await generateAIConfigFn({
          templateId: template.id, 
          trackName: template.trackName,
          customTopic: customTopic,
          currentConfig: template.aiPromptConfig 
        });

        const data = result.data as any;
        if (data.success && data.aiPromptConfig) {
          onChange({
            ...template,
            aiPromptConfig: data.aiPromptConfig 
          });
          alert("Penyusunan Indikator berstandar pakar berhasil dilakukan & direkam ke Vector Database!");
          setCustomTopic(''); 
        } else {
          throw new Error("Format balikan tidak sesuai.");
        }
      } catch (error: any) {
        console.error(error);
        alert(`Gagal menyempurnakan Config AI: ${error.message}`);
      } finally {
        setIsGeneratingConfig(false);
      }
    }
  };
  
  const applyAIPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = AIPromptPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    if (confirm(`Apakah Anda yakin ingin menimpa konfigurasi AI saat ini dengan preset:\n"${preset.name}"?`)) {
      onChange({
        ...template,
        aiPromptConfig: {
          ...(template.aiPromptConfig || {}), 
          ...preset.config 
        }
      });
      alert('Berhasil menerapkan preset AI! Anda bisa menambahkan standar khusus lalu klik "Sempurnakan AI" di bawah.');
    }
  };

  const updateConfig = (key: string, value: any) => {
    onChange({
      ...template,
      aiPromptConfig: { ...(template.aiPromptConfig || {}), [key]: value } as any
    });
  };

  const updateArrayItem = (key: string, idx: number, value: string) => {
    const currentArr = template.aiPromptConfig?.[key as keyof typeof template.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr];
    newArr[idx] = value;
    updateConfig(key, newArr);
  };

  const removeArrayItem = (key: string, idx: number) => {
    const currentArr = template.aiPromptConfig?.[key as keyof typeof template.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr];
    newArr.splice(idx, 1);
    updateConfig(key, newArr);
  };

  const addArrayItem = (key: string, defaultText: string) => {
    const currentArr = template.aiPromptConfig?.[key as keyof typeof template.aiPromptConfig] as string[] || [];
    const newArr = [...currentArr, defaultText];
    updateConfig(key, newArr);
  };

  const parseAnalysisBlock = (blockStr: string) => {
    if (!blockStr) return { title: '', subs: '' };
    const colonIndex = blockStr.indexOf(':');
    if (colonIndex === -1) return { title: blockStr, subs: '' }; 
    return {
      title: blockStr.slice(0, colonIndex).trim(),
      subs: blockStr.slice(colonIndex + 1).trim()
    };
  };

  const updateAnalysisBlock = (idx: number, newTitle: string, newSubs: string) => {
    const cleanTitle = newTitle.trim();
    const cleanSubs = newSubs.trim();
    const combinedValue = cleanTitle || cleanSubs ? `${cleanTitle}${cleanSubs ? `: ${cleanSubs}` : ''}` : '';
    updateArrayItem('expectedAnalysisBlocks', idx, combinedValue);
  };

  const standardArrayConfigs = [
    { 
      key: 'expectedMetrics', 
      label: 'Metrik Radar (Penilaian Skor Kuantitatif 0-100)', 
      defaultItem: 'Metrik Baru',
      description: 'Sebutkan pilar performa yang akan dikonversi menjadi data grafik Radar. AI otomatis melakukan kalkulasi numerik.',
      placeholder: 'Contoh: Ekuilibrium Startup Triangle (Rasio Kapasitas Hustler, Hipster, Hacker)'
    },
    { 
      key: 'customReadinessTiers', 
      label: 'Tiers Level Readiness (Klaster Hasil Akhir)', 
      defaultItem: 'Tier Baru',
      description: 'Definisikan ambang batas status kesiapan entitas beserta rentang skornya.',
      placeholder: 'Contoh: Fase Wirausaha Pemula (Skor 26-65): Bisnis tervalidasi tapi rentan...'
    },
    { 
      key: 'expectedRecommendations', 
      label: 'Target Area Rekomendasi AI (Peta Jalan Tindak Lanjut)', 
      defaultItem: 'Area Rekomendasi',
      description: 'Tentukan koridor rencana aksi yang wajib dirumuskan AI berdasarkan timeframe spesifik.',
      placeholder: 'Contoh: Roadmap Taktis Jangka Pendek (0-3 Bulan) - Validation & Survival'
    }
  ];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0"><Sparkles className="w-6 h-6"/></div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Arsitektur Audit AI Engine</h3>
            <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              Atur personifikasi mesin evaluasi, metrik kuantitatif, dan injeksi *raw prompt* LLM tingkat lanjut.
            </p>
          </div>
        </div>

        {/* SEARCHABLE DROPDOWN PRESET */}
        <div className="shrink-0 w-full md:w-80 relative z-[60]" ref={dropdownRef}>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cari & Load Preset Instan:</label>
          
          <div 
            onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
            className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 h-10 rounded-xl text-sm px-3 flex items-center justify-between font-bold cursor-pointer hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <span className="truncate flex-1 text-left opacity-90">
              {isPresetDropdownOpen ? "Mencari Template..." : "-- Pilih dari 110+ Template --"}
            </span>
            <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform duration-300 ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* KOTAK DROPDOWN DENGAN OVERFLOW-HIDDEN AGAR TIDAK BOCOR */}
          {isPresetDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 flex flex-col z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Kolom Input Pencarian */}
              <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Ketik kata kunci (Misal: Retail, IT)..." 
                    value={presetSearchTerm}
                    onChange={(e) => setPresetSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg h-9 pl-9 pr-3 text-[13px] font-medium focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              {/* FIX MUTLAK: Kunci tinggi list dengan Inline Style */}
              <div 
                className="overflow-y-auto overscroll-contain block p-1 bg-white" 
                style={{ height: '240px', maxHeight: '240px' }} 
              >
                {filteredPresets.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center text-slate-400">
                    <Search className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-xs font-bold text-slate-500">Template tidak ditemukan.</span>
                    <span className="text-[10px] mt-1">Coba kata kunci lain.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {filteredPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          applyAIPreset(preset.id);
                          setIsPresetDropdownOpen(false);
                          setPresetSearchTerm('');
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-50 focus:bg-indigo-50 outline-none transition-colors flex flex-col gap-0.5 group shrink-0"
                      >
                        <span className="text-xs font-black text-slate-700 group-hover:text-indigo-700 line-clamp-1">{preset.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium line-clamp-1">{preset.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-sm relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex-1 space-y-1">
          <h4 className="font-black text-emerald-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" /> Sempurnakan dengan AI Researcher
          </h4>
          <p className="text-xs text-emerald-700/80 font-medium leading-relaxed">
            Pilih <b>Template Instan</b> di atas, lalu ketik referensi standar (misal: <i className="font-bold text-emerald-800">"Sempurnakan dengan standar ISO 9001"</i>). AI akan otomatis menganalisis dan melakukan upgrade pada konfigurasi di bawah tanpa merusak konteks aslinya.
          </p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Input 
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Referensi Industri/Standar Pakar..."
            className="h-10 bg-white border-emerald-200 text-sm w-full md:w-56"
          />
          <Button 
            onClick={handleAutoResearchConfig} 
            disabled={isGeneratingConfig}
            className={`h-10 px-4 font-bold rounded-xl shadow-sm transition-all duration-300 whitespace-nowrap ${isGeneratingConfig ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02]'}`}
          >
            {isGeneratingConfig ? (
               <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Menganalisis...</span>
            ) : (
               <span className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Sempurnakan AI</span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 z-0 relative">
        
        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-indigo-600 pl-3">Instruksi Dasar & Karakter AI</h4>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              Persona & Peran AI
            </label>
            <Input 
              value={template.aiPromptConfig?.aiPersona || ''} 
              onChange={e => updateConfig('aiPersona', e.target.value)} 
              placeholder="Contoh: Lead Assessor Kewirausahaan Nasional"
              className="rounded-xl h-11 bg-slate-50 font-medium border-slate-200" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              Tujuan / Fokus Analisis Utama
            </label>
            <Textarea 
              value={template.aiPromptConfig?.assessmentGoal || ''} 
              onChange={e => updateConfig('assessmentGoal', e.target.value)} 
              placeholder="Contoh: Mengaudit kelayakan operasional 360-derajat dan mendeteksi celah model bisnis..."
              className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px] font-medium text-sm leading-relaxed" 
            />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-emerald-600 pl-3">Sifat & Perilaku Penilaian</h4>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Keketatan Skor (Grading Strictness)</label>
            <select value={template.aiPromptConfig?.gradingStrictness || 'standard'} onChange={e => updateConfig('gradingStrictness', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="supportive">Suportif & Edukatif (Skor Cenderung Tinggi)</option>
              <option value="standard">Standar Industri (Objektif / Berimbang)</option>
              <option value="strict">Standar Audit Eksternal (Sangat Ketat & Mencari Celah)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gaya Bahasa Laporan (Tone)</label>
            <select value={template.aiPromptConfig?.reportTone || 'consultative'} onChange={e => updateConfig('reportTone', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="consultative">Konsultatif & Mentor (Solutif & Memberi Opsi)</option>
              <option value="investigative">Investigatif & Analitis (Tajam & Mendeteksi Red Flags)</option>
              <option value="academic">Akademis Formal (Kaku & Berbasis Terminologi Ilmiah)</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              Fokus Analisis Media <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] normal-case tracking-normal font-black">Multimodal</span>
            </label>
            <select 
              value={template.aiPromptConfig?.mediaAnalysisFocus || ''} 
              onChange={e => updateConfig('mediaAnalysisFocus', e.target.value === '' ? undefined : e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">-- Analisis Berkas Teks (Default) --</option>
              <option value="pitch-delivery">Pitch Delivery (Intonasi & Teknik Komunikasi)</option>
              <option value="ui-ux-design">UI/UX Design (Harmoni Visual & Prototipe)</option>
              <option value="product-demo">Product Demo (Fungsionalitas & Stabilitas Alat)</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2 mt-4 space-y-4 p-6 bg-slate-50/80 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
          
          <div className="mb-4">
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Manajemen Blok Analisis Laporan</h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Setiap blok yang Anda buat di sini akan menjadi kartu analisis di halaman hasil (contoh: "Organizational Design").
            </p>
          </div>

          <div className="space-y-4">
            {(template.aiPromptConfig?.expectedAnalysisBlocks || []).map((item, idx) => {
              const { title, subs } = parseAnalysisBlock(item);
              return (
                <div key={idx} className="flex gap-4 items-start relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Judul Blok Utama</label>
                      <Input value={title} onChange={(e) => updateAnalysisBlock(idx, e.target.value, subs)} className="font-black text-slate-800 border-slate-200 bg-slate-50" placeholder="Cth: KESEHATAN FINANSIAL" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Target Sub-Poin (Instruksi ke AI)</label>
                      <Textarea value={subs} onChange={(e) => updateAnalysisBlock(idx, title, e.target.value)} className="text-sm font-medium border-slate-200 min-h-[60px]" placeholder="Cth: Analisis cashflow, pemisahan rekening, dan rasio hutang..." />
                    </div>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => removeArrayItem('expectedAnalysisBlocks', idx)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 shrink-0 mt-6"><Trash2 className="w-4 h-4"/></Button>
                </div>
              )
            })}
            
            <Button type="button" variant="outline" onClick={() => addArrayItem('expectedAnalysisBlocks', 'Judul Blok Baru: Target poin pertama, Target poin kedua')} className="w-full border-dashed border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 font-bold rounded-2xl h-12 shadow-sm">
              <Plus className="w-5 h-5 mr-2"/> Tambah Kartu Blok Analisis
            </Button>

            <GuidePanel title="Panduan Membuat Blok Analisis yang Benar" colorTheme="slate">
              <p><strong>Judul Blok:</strong> Tulis singkat dengan huruf kapital (cth: KESEHATAN FINANSIAL). Ini akan menjadi judul pada kartu laporan.</p>
              <p><strong>Target Sub-Poin:</strong> JANGAN menulis perintah panjang (seperti "Tolong buatkan analisis tentang..."). Cukup tuliskan kata kunci variabel yang ingin dibahas (cth: Analisis cashflow, pemisahan rekening, toleransi risiko).</p>
            </GuidePanel>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {standardArrayConfigs.map(config => (
              <div key={config.key} className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">{config.label}</label>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">{config.description}</p>
                  
                  <div className="space-y-2.5">
                    {(template.aiPromptConfig?.[config.key as keyof typeof template.aiPromptConfig] as string[] || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 group/option">
                        <div className="flex-1 relative">
                          <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within/option:bg-indigo-500 transition-colors"></div>
                          <Textarea value={item} onChange={e => updateArrayItem(config.key, idx, e.target.value)} className="pl-7 py-2.5 bg-white border-slate-200 min-h-[65px] rounded-xl text-sm font-medium focus-visible:ring-indigo-500 shadow-sm resize-y leading-relaxed" placeholder={config.placeholder} />
                        </div>
                        <Button type="button" variant="ghost" onClick={() => removeArrayItem(config.key, idx)} className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => addArrayItem(config.key, '')} className="w-full mt-3 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-slate-100 rounded-xl h-10 font-bold shadow-sm gap-2 text-xs">
                  <Plus className="h-4 w-4" /> Tambah {config.defaultItem}
                </Button>
              </div>
            ))}

            <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">Fokus Kerangka Mitigasi Risiko (Risk Framework)</label>
              <Textarea 
                value={template.aiPromptConfig?.riskFramework || ''} 
                onChange={e => updateConfig('riskFramework', e.target.value)} 
                placeholder="Misal: Fokus deteksi potensi kegagalan sistemik (Red Flags): 1. Risiko Mortality Rate awal akibat kegagalan validasi pasar..." 
                className="rounded-xl bg-white border-slate-200 min-h-[100px] shadow-sm text-sm font-medium leading-relaxed" 
              />
              <GuidePanel title="Panduan Menulis Risk Framework" colorTheme="slate">
                <p>Kolom ini menugaskan AI bertindak sebagai auditor pencari celah. Tuliskan kriteria kegagalan mutlak yang harus diperhatikan AI.</p>
                <p><strong>Contoh:</strong> "Fokus identifikasi skenario terburuk jika Founder kehabisan kas operasional. Deteksi inkonsistensi antara ambisi valuasi dengan kondisi keuangan mereka saat ini."</p>
              </GuidePanel>
            </div>
        </div>

        <div className="md:col-span-2 space-y-6 pt-8 border-t border-slate-100">
          <div className="flex flex-col mb-4">
            <h4 className="font-black text-slate-900 border-l-4 border-rose-500 pl-3 text-lg">Advanced Prompting (Ultra-Kustomisasi)</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2 pl-4">
              Kolom ini menyuntikkan instruksi <i>raw</i> (mentahan) langsung ke inti otak AI. Sangat cocok bagi Anda untuk menyusun rubrik eksak atau menahan halusinasi AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* RUBRIK SKORING */}
            <div className="space-y-2 p-6 bg-amber-50/40 rounded-3xl border border-amber-100 shadow-sm md:col-span-2">
              <label className="text-[12px] font-black text-amber-900 uppercase tracking-widest block mb-1">Custom Scoring Rubric (Rubrik Penilaian Matematis)</label>
              <Textarea 
                value={template.aiPromptConfig?.customScoringRubric || ''} 
                onChange={e => updateConfig('customScoringRubric', e.target.value)} 
                placeholder="Contoh: Skor 0-30: Fatal, operasional macet. Skor 31-70: Berjalan tapi bocor. Skor 71-100: Siap scale-up." 
                className="rounded-2xl bg-white border-amber-200 min-h-[100px] shadow-sm text-sm font-medium leading-relaxed" 
              />
              <GuidePanel title="Cara Menulis Rubrik Skor yang Presisi" colorTheme="amber">
                <p>AI membutuhkan batas angka pasti agar tidak menebak-nebak (halusinasi) rentang nilai.</p>
                <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                  <li><strong>Gunakan Format:</strong> Skor [X]-[Y]: [Definisi]</li>
                  <li><strong>Contoh:</strong> Skor 0-40: Entitas berisiko tinggi. DNA founder tidak konsisten.</li>
                  <li><strong>Contoh:</strong> Skor 80-100: Sangat siap untuk diakselerasi dan menerima pendanaan eksternal.</li>
                </ul>
                <p className="mt-1 text-rose-600 font-bold">* Pastikan tidak ada celah angka (misal melompat dari 40 langsung ke 50).</p>
              </GuidePanel>
            </div>

            {/* SYSTEM RULES */}
            <div className="space-y-2 p-6 bg-indigo-50/40 rounded-3xl border border-indigo-100 shadow-sm md:col-span-2">
              <label className="text-[12px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Custom System Rules & Logika Kondisional</label>
              <Textarea 
                value={template.aiPromptConfig?.customSystemPrompt || ''} 
                onChange={e => updateConfig('customSystemPrompt', e.target.value)} 
                placeholder="Contoh: JIKA peserta memilih status legalitas 'Belum Memiliki', MAKA paksa AI untuk memberikan peringatan keras..." 
                className="rounded-2xl bg-white border-indigo-200 min-h-[120px] shadow-sm text-sm font-medium leading-relaxed" 
              />
              <GuidePanel title="Trik Menggunakan Logika If-Then & Tag Dinamis" colorTheme="indigo">
                <p><strong>Tag Dinamis:</strong> Panggil data peserta dengan tag. Contoh: <i>"Sapa entitas secara personal menggunakan nama <b>{`{{namaUsaha}}`}</b> di awal ringkasan."</i></p>
                <div className="mt-2">
                  <p><strong>Logika Bersyarat (If-Then):</strong> Berikan aturan mutlak untuk skenario tertentu.</p>
                  <p className="mt-1 p-2 bg-white rounded border border-indigo-100 font-mono text-[10px]">Contoh: "JIKA peserta menjawab fase usahanya masih 'Ide', MAKA DILARANG memberikan saran ekspansi. Fokuskan saran hanya pada riset pasar."</p>
                </div>
              </GuidePanel>
            </div>

            {/* NEGATIVE PROMPTS */}
            <div className="space-y-2 p-6 bg-rose-50/40 rounded-3xl border border-rose-100 shadow-sm">
              <label className="text-[12px] font-black text-rose-900 uppercase tracking-widest block mb-1">Negative Prompts (Pantangan AI)</label>
              <Textarea 
                value={template.aiPromptConfig?.negativePrompts || ''} 
                onChange={e => updateConfig('negativePrompts', e.target.value)} 
                placeholder="Contoh: DILARANG menggunakan kata-kata bersayap. JANGAN sarankan pembuatan akun sosial media (terlalu basi)..." 
                className="rounded-2xl bg-white border-rose-200 min-h-[100px] shadow-sm text-sm font-medium leading-relaxed" 
              />
              <GuidePanel title="Cara Ampuh Mengunci Halusinasi" colorTheme="rose">
                <p>LLM sering memberikan saran klise atau "sok bijak". Kunci perilaku ini di sini.</p>
                <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                  <li>"DILARANG merekomendasikan pinjaman online."</li>
                  <li>"DILARANG menggunakan kata-kata motivasi klise seperti 'di era digital ini' atau 'semangat terus'."</li>
                  <li>"JANGAN memberikan pujian palsu jika skor di bawah 50."</li>
                </ul>
              </GuidePanel>
            </div>

            {/* FORMAT INSTRUCTIONS */}
            <div className="space-y-2 p-6 bg-emerald-50/40 rounded-3xl border border-emerald-100 shadow-sm">
              <label className="text-[12px] font-black text-emerald-900 uppercase tracking-widest block mb-1">Format Teks & Markdown Output</label>
              <Textarea 
                value={template.aiPromptConfig?.formatInstructions || ''} 
                onChange={e => updateConfig('formatInstructions', e.target.value)} 
                placeholder="Contoh: Gunakan penanda BOLD ganda pada setiap nama instrumen hukum..." 
                className="rounded-2xl bg-white border-emerald-200 min-h-[100px] shadow-sm text-sm font-medium leading-relaxed" 
              />
              <GuidePanel title="Rahasia Output Estetik (Penting!)" colorTheme="emerald">
                <p>Sistem frontend dan PDF kita mendukung pembacaan <b>Markdown</b> dasar.</p>
                <ul className="list-disc list-inside mt-1 ml-1 space-y-1 text-[10px]">
                  <li><strong>Teks Tebal:</strong> "Gunakan tanda bintang ganda (**kata**) untuk menebalkan istilah penting."</li>
                  <li><strong className="text-rose-600">DILARANG</strong> menyuruh AI membuat Tabel.</li>
                  <li><strong className="text-rose-600">DILARANG</strong> menyuruh AI mencetak Bullet Point (seperti -, *, •). <br/><em>Alasan: Sistem frontend kita akan mengubah baris baru otomatis menjadi bullet. Jika AI mencetak bullet sendiri, tampilannya akan dobel/rusak.</em></li>
                </ul>
              </GuidePanel>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}