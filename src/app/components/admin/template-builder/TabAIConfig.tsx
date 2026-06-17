// src/app/components/admin/template-builder/TabAIConfig.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormTemplate } from '@/types/curation';
import { AIPromptPresets } from '@/data/aiPromptTemplates';
import { Sparkles, Plus, Trash2 } from 'lucide-react';

interface TabAIConfigProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabAIConfig({ template, onChange }: TabAIConfigProps) {
  
  const applyAIPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = AIPromptPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    if (confirm(`Apakah Anda yakin ingin menimpa konfigurasi AI saat ini dengan preset: "${preset.name}"?`)) {
      onChange({
        ...template,
        aiPromptConfig: {
          ...(template.aiPromptConfig || {}), 
          ...preset.config 
        }
      });
      alert('Berhasil menerapkan preset AI!');
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

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0"><Sparkles className="w-6 h-6"/></div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Arsitektur Audit AI</h3>
            <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              Atur persona, tingkat keketatan nilai, dan parameter khusus lainnya untuk mencapai standar <strong className="text-slate-700">Enterprise Due Diligence</strong>.
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Load dari Preset:</label>
          <select
            onChange={(e) => {
              applyAIPreset(e.target.value);
              e.target.value = ""; 
            }}
            className="w-full md:w-64 bg-indigo-50 border border-indigo-200 text-indigo-700 h-10 rounded-xl text-sm px-3 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
          >
            <option value="">-- Pilih Template Instan --</option>
            {AIPromptPresets?.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-indigo-600 pl-3">Instruksi Dasar</h4>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Persona & Peran AI</label>
            <Input value={template.aiPromptConfig?.aiPersona || ''} onChange={e => updateConfig('aiPersona', e.target.value)} className="rounded-xl h-11 bg-slate-50" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tujuan / Fokus Analisis</label>
            <Textarea value={template.aiPromptConfig?.assessmentGoal || ''} onChange={e => updateConfig('assessmentGoal', e.target.value)} className="rounded-xl bg-slate-50 min-h-[80px]" />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-black text-slate-900 border-l-4 border-emerald-600 pl-3">Perilaku Penilaian</h4>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ketatnya Skor (Strictness)</label>
            <select value={template.aiPromptConfig?.gradingStrictness || 'standard'} onChange={e => updateConfig('gradingStrictness', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="supportive">Suportif & Edukatif (Skor tinggi)</option>
              <option value="standard">Standar Industri (Objektif)</option>
              <option value="strict">Standar VC / Audit (Sangat Ketat)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gaya Bahasa (Tone)</label>
            <select value={template.aiPromptConfig?.reportTone || 'consultative'} onChange={e => updateConfig('reportTone', e.target.value)} className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl text-sm px-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="investigative">Investigatif & Analitis (Tajam)</option>
              <option value="consultative">Konsultatif & Mentor (Solutif)</option>
              <option value="academic">Akademis Formal (Data Driven)</option>
            </select>
          </div>
          
          {/* FITUR YANG TERLEWAT: ANALISIS MEDIA */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              Fokus Analisis Media <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] normal-case tracking-normal">Baru</span>
            </label>
            <select 
              value={template.aiPromptConfig?.mediaAnalysisFocus || ''} 
              onChange={e => updateConfig('mediaAnalysisFocus', e.target.value === '' ? undefined : e.target.value)} 
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
            {[
              { key: 'customReadinessTiers', label: 'Tiers Level Readiness', defaultItem: 'Tier Baru' },
              { key: 'expectedMetrics', label: 'Metrik Radar (Skor 0-100)', defaultItem: 'Metrik Baru' },
              { key: 'expectedAnalysisBlocks', label: 'Judul Blok Analisis', defaultItem: 'Blok Baru' },
              { key: 'expectedRecommendations', label: 'Target Area Rekomendasi AI', defaultItem: 'Area Rekomendasi' }
            ].map(config => (
              <div key={config.key} className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{config.label}</label>
                <div className="space-y-2.5">
                  {(template.aiPromptConfig?.[config.key as keyof typeof template.aiPromptConfig] as string[] || []).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 group/option">
                      <div className="flex-1 relative">
                        <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-slate-300 group-focus-within/option:bg-indigo-500 transition-colors"></div>
                        <Textarea value={item} onChange={e => updateArrayItem(config.key, idx, e.target.value)} className="pl-7 py-2.5 bg-white border-slate-200 min-h-[70px] rounded-xl text-sm focus-visible:ring-indigo-500 shadow-sm resize-y leading-relaxed" placeholder={`${config.defaultItem} ${idx + 1}...`} />
                      </div>
                      <Button type="button" variant="ghost" onClick={() => removeArrayItem(config.key, idx)} className="h-10 w-10 p-0 mt-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={() => addArrayItem(config.key, `${config.defaultItem} ${(template.aiPromptConfig?.[config.key as keyof typeof template.aiPromptConfig] as string[] || []).length + 1}`)} className="w-full mt-2 border-dashed border-2 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-xl h-10 font-bold shadow-sm gap-2 text-xs transition-colors"><Plus className="h-4 w-4" /> Tambah {config.defaultItem}</Button>
              </div>
            ))}

            <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Fokus Mitigasi Risiko Khusus</label>
              <Textarea value={template.aiPromptConfig?.riskFramework || ''} onChange={e => updateConfig('riskFramework', e.target.value)} placeholder="Misal: Fokus pada legalitas dan cashflow. Biarkan kosong jika tidak ada instruksi spesifik." className="rounded-xl bg-white border-slate-200 min-h-[120px] shadow-sm text-sm font-medium leading-relaxed" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}