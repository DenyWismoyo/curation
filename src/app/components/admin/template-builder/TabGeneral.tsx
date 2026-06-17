import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormTemplate } from '@/types/curation';

interface TabGeneralProps {
  template: FormTemplate;
  onChange: (updatedTemplate: FormTemplate) => void;
}

export function TabGeneral({ template, onChange }: TabGeneralProps) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-6">
      <div className="mb-6">
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
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-4 p-5 bg-indigo-50/50 rounded-2xl ring-1 ring-indigo-100">
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
    </div>
  );
}