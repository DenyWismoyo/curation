'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { 
  Loader2, Store, Eye, EyeOff, Info, LayoutGrid
} from 'lucide-react';
import { FormTemplate } from '@/types/curation';

type PricingFormState = {
  isDisplayedOnLanding: boolean;
  isPaid: boolean;
  trialQuota: string;
  price: string;
};

export default function PricingManagerPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

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
        
        // PERBAIKAN GARIS MERAH: ...tpl diletakkan di depan sebelum id
        data.push({ ...tpl, id: docSnap.id });
        
        initialStates[docSnap.id] = {
          isDisplayedOnLanding: tpl.isDisplayedOnLanding || false,
          isPaid: tpl.isPaid || false,
          trialQuota: tpl.trialQuota ? tpl.trialQuota.toString() : '0',
          price: tpl.price ? tpl.price.toString() : '0',
        };
      });

      // Urutkan berdasarkan nama
      data.sort((a, b) => a.trackName.localeCompare(b.trackName));

      setTemplates(data);
      setFormStates(initialStates);
    } catch (error) {
      console.error("Gagal memuat template:", error);
      toast.error("Gagal memuat data template.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: 'price' | 'trialQuota', value: string) => {
    const numericValue = value.replace(/[^0-9]/g, ''); // Hanya angka
    setFormStates(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: numericValue } 
    }));
  };

  const handleToggle = (id: string, field: 'isDisplayedOnLanding' | 'isPaid') => {
    setFormStates(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: !prev[id][field] } 
    }));
  };

  const checkIsChanged = (id: string, tpl: FormTemplate) => {
    const state = formStates[id];
    if (!state) return false;
    return (
      state.isDisplayedOnLanding !== (tpl.isDisplayedOnLanding || false) ||
      state.isPaid !== (tpl.isPaid || false) ||
      state.trialQuota !== (tpl.trialQuota?.toString() || '0') ||
      state.price !== (tpl.price?.toString() || '0')
    );
  };

  const handleSaveItem = async (id: string) => {
    const state = formStates[id];
    setIsSaving(id);
    
    try {
      const payload = {
        isDisplayedOnLanding: state.isDisplayedOnLanding,
        isPaid: state.isPaid,
        trialQuota: parseInt(state.trialQuota || '0', 10),
        price: parseInt(state.price || '0', 10),
        lastUpdated: new Date().toISOString()
      };

      await updateDoc(doc(db, 'form_templates', id), payload);
      
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t));
      toast.success("Pengaturan komersial diperbarui!");
    } catch (error) {
      console.error("Gagal update data:", error);
      toast.error("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(null);
    }
  };

  // PERBAIKAN TOMBOL: Penambahan tag <input type="checkbox"> agar bisa diklik
  const SwitchToggle = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
      <span className={`text-xs font-bold transition-colors ${checked ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
    </label>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Store className="w-8 h-8 text-indigo-600" /> Landing Page & Monetisasi
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
            Atur etalase modul asesmen. Modul yang disembunyikan di sini tetap bisa diakses oleh klien B2B menggunakan Token.
          </p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl ring-1 ring-indigo-200/50 flex items-center gap-2 font-medium text-xs">
          <Info className="w-4 h-4 shrink-0" />
          <p>Pengaturan di halaman ini tidak memengaruhi status Aktif/Draft sistem inti.</p>
        </div>
      </div>

      <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none">
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> Memuat Etalase...
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-medium">
            Belum ada template form yang dibuat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                {templates.map(template => {
                  const state = formStates[template.id];
                  if (!state) return null;
                  
                  const isChanged = checkIsChanged(template.id, template);

                  return (
                    <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* 1. INFO MODUL */}
                      <td className="px-6 py-5 min-w-[300px]">
                        <div className="flex items-start gap-4">
                          <div className="mt-0.5 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 ring-1 ring-slate-200/60">
                            <LayoutGrid size={18}/>
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-[15px] leading-snug">{template.trackName}</p>
                            <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-1" title={template.trackDescription}>
                              {template.trackDescription || "Deskripsi singkat."}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. VISIBILITY TOGGLE */}
                      <td className="px-4 py-5 whitespace-nowrap">
                        <button 
                          onClick={() => handleToggle(template.id, 'isDisplayedOnLanding')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            state.isDisplayedOnLanding 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {state.isDisplayedOnLanding ? <Eye size={14} /> : <EyeOff size={14} />}
                          {state.isDisplayedOnLanding ? 'Publik (Tampil)' : 'Draft (Sembunyi)'}
                        </button>
                      </td>

                      {/* 3. PAID TOGGLE */}
                      <td className="px-4 py-5">
                        <SwitchToggle 
                          checked={state.isPaid} 
                          onChange={() => handleToggle(template.id, 'isPaid')} 
                          label="Berbayar" 
                        />
                      </td>

                      {/* 4. TRIAL QUOTA INPUT */}
                      <td className="px-4 py-5 text-center">
                        <div className="flex flex-col items-center">
                          <Input 
                            type="text" 
                            value={state.trialQuota}
                            onChange={(e) => handleInputChange(template.id, 'trialQuota', e.target.value)}
                            className="w-16 h-10 text-center font-bold text-sm bg-white rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                          />
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {state.trialQuota === '0' || state.trialQuota === '' ? 'Tanpa Trial' : 'Trial Kuota'}
                          </p>
                        </div>
                      </td>

                      {/* 5. PRICE INPUT */}
                      <td className="px-4 py-5">
                        <div className="relative w-[150px]">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${!state.isPaid ? 'text-slate-300' : 'text-slate-400'}`}>Rp</span>
                          <Input 
                            type="text" 
                            value={state.price}
                            onChange={(e) => handleInputChange(template.id, 'price', e.target.value)}
                            disabled={!state.isPaid}
                            className={`pl-9 h-10 font-bold text-sm rounded-xl transition-all ${
                              !state.isPaid 
                                ? 'bg-slate-50 opacity-50 border-slate-200 text-slate-400' 
                                : isChanged ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>
                      </td>

                      {/* 6. SAVE BUTTON */}
                      <td className="px-6 py-5 text-right">
                        <Button 
                          onClick={() => handleSaveItem(template.id)} 
                          disabled={!isChanged || isSaving === template.id}
                          variant="outline"
                          className={`h-9 px-4 rounded-xl font-bold transition-all text-xs ${
                            isChanged 
                              ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                              : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          {isSaving === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tersimpan'}
                        </Button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}