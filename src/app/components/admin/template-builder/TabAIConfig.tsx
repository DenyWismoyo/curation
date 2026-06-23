// src/app/components/admin/template-builder/TabAIConfig.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate, FormDomainPurpose } from '@/types/curation';
import { AIPromptPresets } from '@/data/aiPromptTemplates';
import { DomainPresets } from '@/data/domainPresets'; // <--- TAMBAHKAN IMPORT INI
import { Sparkles, Plus, Trash2, Lightbulb, ChevronDown, Bot, Loader2, Search, Settings, Layout } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

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

interface TabAIConfigProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabAIConfig({ template, onChange }: TabAIConfigProps) {
  const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [presetSearchTerm, setPresetSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const updateUiLabel = (key: string, value: string) => {
    const currentLabels = template.aiPromptConfig?.customUiLabels || {};
    updateConfig('customUiLabels', { ...currentLabels, [key]: value });
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
      label: 'Metrik Grafik Radar (Penilaian Skor Kuantitatif 0-100)', 
      defaultItem: 'Metrik Baru',
      description: 'Sebutkan pilar performa atau aspek utama yang akan dikonversi menjadi data grafik Radar.',
      placeholder: 'Contoh: Kematangan Produk, Rasio Keuangan, Stabilitas Emosional'
    },
    { 
      key: 'customReadinessTiers', 
      label: 'Klaster Hasil Akhir (Tiers Level)', 
      defaultItem: 'Tier Baru',
      description: 'Definisikan ambang batas tingkatan status subjek beserta rentang skornya.',
      placeholder: 'Contoh: Kategori Optimal (Skor 81-100): Kondisi subjek sangat stabil...'
    },
    { 
      key: 'expectedRecommendations', 
      label: 'Target Rekomendasi Alur Tindak Lanjut', 
      defaultItem: 'Area Rekomendasi',
      description: 'Tentukan koridor peta jalan tindakan yang wajib dirumuskan oleh kecerdasan buatan.',
      placeholder: 'Contoh: Intervensi Jangka Pendek (0-1 Bulan)'
    }
  ];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0"><Sparkles className="w-6 h-6"/></div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Arsitektur Engine AI & Kustomisasi Fungsi</h3>
            <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              Atur personifikasi mesin pengolah data, tujuan fungsional formulir, serta ubah nama komponen visual keluaran.
            </p>
          </div>
        </div>

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

          {isPresetDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 flex flex-col z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Ketik kata kunci..." 
                    value={presetSearchTerm}
                    onChange={(e) => setPresetSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg h-9 pl-9 pr-3 text-[13px] font-medium focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>
              
              <div className="overflow-y-auto overscroll-contain block p-1 bg-white" style={{ height: '240px', maxHeight: '240px' }} >
                {filteredPresets.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center text-slate-400">
                    <Search className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-xs font-bold text-slate-500">Template tidak ditemukan.</span>
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

{/* DYNAMIC PURPOSE ENGINE CONFIGURATION */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-slate-900 flex items-center gap-2 text-md">
            <Settings className="w-5 h-5 text-indigo-600" /> Pengaturan Modul & Interaktif Dashboard
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fungsi & Domain Aplikasi Formulir:</label>
            <select 
              value={template.aiPromptConfig?.formPurpose || 'assessment'} 
              onChange={(e) => {
                const selectedId = e.target.value;
                const preset = DomainPresets.find(p => p.id === selectedId);
                
                // Jika memilih preset dari file data, terapkan formPurpose DAN set labelnya secara otomatis 1 paket
                if (preset) {
                  onChange({
                    ...template,
                    aiPromptConfig: {
                      ...(template.aiPromptConfig || {}),
                      formPurpose: preset.formPurpose,
                      customUiLabels: preset.customUiLabels
                    } as any
                  });
                } else if (selectedId === 'custom') {
                  updateConfig('formPurpose', 'custom');
                }
              }}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold px-3 focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
            >
              {/* Looping data dari domainPresets.ts */}
              {DomainPresets.map((domain) => (
                <option key={domain.id} value={domain.id}>{domain.name}</option>
              ))}
              <option value="custom">Kustomisasi Penuh Mandiri (Manual)</option>
            </select>
          </div>
          
          <div className="text-xs text-slate-500 flex items-center bg-white p-3.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
            Saat Anda mengubah fungsi domain di samping, seluruh nama kartu (SWOT, Risiko, Timeline, dll) di bawah ini akan otomatis diatur ulang 1 paket sesuai standar modul tersebut.
          </div>
        </div>

        {/* CUSTOM UI LABELS CONFIGURATOR */}
        <div className="pt-4 border-t border-slate-200/60 space-y-3 animate-in fade-in">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Kustomisasi Label Komponen Visual Dashboard (Output):</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Label Skor Utama</span>
              <Input value={template.aiPromptConfig?.customUiLabels?.scoreLabel || ''} onChange={e => updateUiLabel('scoreLabel', e.target.value)} placeholder="Default: Index Skor" className="h-9 text-xs bg-white rounded-lg" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Label Blok SWOT</span>
              <Input value={template.aiPromptConfig?.customUiLabels?.swotLabel || ''} onChange={e => updateUiLabel('swotLabel', e.target.value)} placeholder="Default: SWOT Matrix" className="h-9 text-xs bg-white rounded-lg" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Label Blok Risiko</span>
              <Input value={template.aiPromptConfig?.customUiLabels?.riskLabel || ''} onChange={e => updateUiLabel('riskLabel', e.target.value)} placeholder="Default: Peta Risiko" className="h-9 text-xs bg-white rounded-lg" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Label Rekomendasi</span>
              <Input value={template.aiPromptConfig?.customUiLabels?.roadmapLabel || ''} onChange={e => updateUiLabel('roadmapLabel', e.target.value)} placeholder="Default: Rekomendasi" className="h-9 text-xs bg-white rounded-lg" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Label Timeline</span>
              <Input value={template.aiPromptConfig?.customUiLabels?.executionLabel || ''} onChange={e => updateUiLabel('executionLabel', e.target.value)} placeholder="Default: Action Plan" className="h-9 text-xs bg-white rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-sm relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex-1 space-y-1">
          <h4 className="font-black text-emerald-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" /> Sempurnakan dengan AI Researcher
          </h4>
          <p className="text-xs text-emerald-700/80 font-medium leading-relaxed">
            Ketik referensi standar (misal: <i className="font-bold text-emerald-800">"Gunakan kerangka psikologi klinis bimbingan konseling remaja"</i>). AI akan meriset standar industri secara otomatis.
          </p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Input 
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Referensi Industri / Standar..."
            className="h-10 bg-white border-emerald-200 text-sm w-full md:w-56"
          />
          <Button 
            onClick={handleAutoResearchConfig} 
            disabled={isGeneratingConfig}
            className={`h-10 px-4 font-bold rounded-xl shadow-sm transition-all duration-300 whitespace-nowrap ${isGeneratingConfig ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
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
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Persona & Peran AI</label>
            <Input 
              value={template.aiPromptConfig?.aiPersona || ''} 
              onChange={e => updateConfig('aiPersona', e.target.value)} 
              placeholder="Contoh: Konselor Psikologi atau Auditor Mutu Internal"
              className="rounded-xl h-11 bg-slate-50 font-medium border-slate-200" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tujuan / Fokus Analisis Utama</label>
            <Textarea 
              value={template.aiPromptConfig?.assessmentGoal || ''} 
              onChange={e => updateConfig('assessmentGoal', e.target.value)} 
              placeholder="Jelaskan secara mendalam fokus utama pengolahan data oleh AI..."
              className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px] font-medium text-sm leading-relaxed" 
            />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-emerald-600 pl-3">Sifat & Perilaku Penilaian</h4>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Keketatan Skor (Grading Strictness)</label>
            <select value={template.aiPromptConfig?.gradingStrictness || 'standard'} onChange={e => updateConfig('gradingStrictness', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none">
              <option value="supportive">Suportif & Edukatif (Skor Cenderung Tinggi)</option>
              <option value="standard">Standar Industri (Objektif / Berimbang)</option>
              <option value="strict">Standar Audit Eksternal (Sangat Ketat & Mencari Celah)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gaya Bahasa Laporan (Tone)</label>
            <select value={template.aiPromptConfig?.reportTone || 'consultative'} onChange={e => updateConfig('reportTone', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none">
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
              className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none"
            >
              <option value="">-- Analisis Berkas Teks / PDF (Default) --</option>
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
              Setiap blok yang Anda buat di sini akan menjadi kartu analisis spesifik terstruktur di halaman hasil dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {(template.aiPromptConfig?.expectedAnalysisBlocks || []).map((item, idx) => {
              const { title, subs } = parseAnalysisBlock(item);
              return (
                <div key={idx} className="flex gap-4 items-start relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Judul Blok Utama</label>
                      <Input value={title} onChange={(e) => updateAnalysisBlock(idx, e.target.value, subs)} className="font-black text-slate-800 border-slate-200 bg-slate-50" placeholder="Cth: KESEHATAN FINANSIAL" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Target Sub-Poin (Instruksi ke AI)</label>
                      <Textarea value={subs} onChange={(e) => updateAnalysisBlock(idx, title, e.target.value)} className="text-sm font-medium border-slate-200 min-h-[60px]" placeholder="Cth: Deskripsikan indikator yang perlu dibedah..." />
                    </div>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => removeArrayItem('expectedAnalysisBlocks', idx)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 shrink-0 mt-6"><Trash2 className="w-4 h-4"/></Button>
                </div>
              )
            })}
            
            <Button type="button" variant="outline" onClick={() => addArrayItem('expectedAnalysisBlocks', 'Judul Blok Baru: Analisis sub poin pertama')} className="w-full border-dashed border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-2xl h-12 shadow-sm">
              <Plus className="w-5 h-5 mr-2"/> Tambah Kartu Blok Analisis
            </Button>
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
                          <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 transition-colors"></div>
                          <Textarea value={item} onChange={e => updateArrayItem(config.key, idx, e.target.value)} className="pl-7 py-2.5 bg-white border-slate-200 min-h-[65px] rounded-xl text-sm font-medium resize-y" placeholder={config.placeholder} />
                        </div>
                        <Button type="button" variant="ghost" onClick={() => removeArrayItem(config.key, idx)} className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => addArrayItem(config.key, '')} className="w-full mt-3 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-slate-100 rounded-xl h-10 font-bold text-xs">
                  <Plus className="h-4 w-4" /> Tambah {config.defaultItem}
                </Button>
              </div>
            ))}

            <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest block mb-1">Fokus Kerangka Mitigasi Risiko / Kerentanan Sistematik</label>
              <Textarea 
                value={template.aiPromptConfig?.riskFramework || ''} 
                onChange={e => updateConfig('riskFramework', e.target.value)} 
                placeholder="Petunjuk khusus penanganan red flags atau kelemahan kritis subjek..." 
                className="rounded-xl bg-white border-slate-200 min-h-[100px] text-sm font-medium" 
              />
            </div>
        </div>

        <div className="md:col-span-2 space-y-6 pt-8 border-t border-slate-100">
          <div className="flex flex-col mb-4">
            <h4 className="font-black text-slate-900 border-l-4 border-rose-500 pl-3 text-lg">Advanced Prompting (Ultra-Kustomisasi Aturan)</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 p-6 bg-amber-50/40 rounded-3xl border border-amber-100 shadow-sm md:col-span-2">
              <label className="text-[12px] font-black text-amber-900 uppercase tracking-widest block mb-1">Custom Scoring Rubric (Panduan Kuantifikasi Angka)</label>
              <Textarea 
                value={template.aiPromptConfig?.customScoringRubric || ''} 
                onChange={e => updateConfig('customScoringRubric', e.target.value)} 
                placeholder="Definisikan kriteria pemberian nilai matematis dari 0 sampai 100..." 
                className="rounded-2xl bg-white border-amber-200 min-h-[100px] text-sm font-medium" 
              />
            </div>

            <div className="space-y-2 p-6 bg-indigo-50/40 rounded-3xl border border-indigo-100 shadow-sm md:col-span-2">
              <label className="text-[12px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Custom System Rules & Aturan If-Then</label>
              <Textarea 
                value={template.aiPromptConfig?.customSystemPrompt || ''} 
                onChange={e => updateConfig('customSystemPrompt', e.target.value)} 
                placeholder="Gunakan {{namaUsaha}} untuk memanggil variabel dinamis secara reaktif..." 
                className="rounded-2xl bg-white border-indigo-200 min-h-[120px] text-sm font-medium" 
              />
            </div>

            <div className="space-y-2 p-6 bg-rose-50/40 rounded-3xl border border-rose-100 shadow-sm">
              <label className="text-[12px] font-black text-rose-900 uppercase tracking-widest block mb-1">Negative Prompts (Pantangan Mutlak AI)</label>
              <Textarea 
                value={template.aiPromptConfig?.negativePrompts || ''} 
                onChange={e => updateConfig('negativePrompts', e.target.value)} 
                placeholder="Sebutkan hal-hal yang dilarang keras dikeluarkan dalam kalimat narasi AI..." 
                className="rounded-2xl bg-white border-rose-200 min-h-[100px] text-sm font-medium" 
              />
            </div>

            <div className="space-y-2 p-6 bg-emerald-50/40 rounded-3xl border border-emerald-100 shadow-sm">
              <label className="text-[12px] font-black text-emerald-900 uppercase tracking-widest block mb-1">Format Teks & Markdown Output Instructions</label>
              <Textarea 
                value={template.aiPromptConfig?.formatInstructions || ''} 
                onChange={e => updateConfig('formatInstructions', e.target.value)} 
                placeholder="Aturan cetak huruf tebal atau penataan paragraf..." 
                className="rounded-2xl bg-white border-emerald-200 min-h-[100px] text-sm font-medium" 
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}