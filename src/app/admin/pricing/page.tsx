// src/app/admin/pricing/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, query, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { 
  Save, LayoutGrid, Loader2, Store, Eye, EyeOff, Tag, Users, Flame, ListChecks, Search, KeyRound, Copy, Check
} from 'lucide-react';
import { FormTemplate } from '@/types/curation';

type PricingFormState = {
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
  const [searchTerm, setSearchTerm] = useState('');

  // State untuk menyimpan token yang di-generate agar tampil di UI
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

    setFormStates(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: value } 
    }));
  };

  const handleToggle = (id: string, field: 'isDisplayedOnLanding' | 'isPaid' | 'isBestSeller') => {
    setFormStates(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: !prev[id][field] } 
    }));
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

  const handleSaveItem = async (id: string) => {
    const state = formStates[id];
    setIsSaving(id);
    
    try {
      const payload: any = {
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
      };

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
          const state = formStates[t.id];
          const payload: any = {
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
          };
          return updateDoc(doc(db, 'form_templates', t.id), payload);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      
      setTemplates(prev => prev.map(t => {
        if (checkIsChanged(t.id, t)) {
          const state = formStates[t.id];
          const payload: any = {
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
          };
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
      
      await setDoc(b2cRef, {
        corporateName: "Penjualan B2C (Mandiri)",
        modelType: "flash", 
        totalTokens: increment(1),
        tokens: {
          [tokenCode]: {
            isUsed: false,
            usedAt: null,
            usedByNamaUsaha: null,
            allowedTemplates: [templateId] 
          }
        }
      }, { merge: true });

      const fullToken = `B2C-${tokenCode}`;
      
      setGeneratedTokens(prev => ({ ...prev, [templateId]: fullToken }));
      
      navigator.clipboard.writeText(fullToken);
      setCopiedTokens(prev => ({ ...prev, [templateId]: true }));
      setTimeout(() => {
        setCopiedTokens(prev => ({ ...prev, [templateId]: false }));
      }, 3000);
      
      toast.success(`Token berhasil dibuat!`, {
        description: `Kode: ${fullToken} (Akses Modul: ${templateName})`
      });
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
    setTimeout(() => {
      setCopiedTokens(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const formatRupiah = (angka: number | string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(angka));
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const query = searchTerm.toLowerCase();
      
      if (query) {
        return (
          template.trackName.toLowerCase().includes(query) ||
          (template.trackDescription && template.trackDescription.toLowerCase().includes(query))
        );
      }
      return template.isDisplayedOnLanding === true;
    });
  }, [templates, searchTerm]);

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
        <Button 
          onClick={handleSaveAll} 
          disabled={isSaving === 'all'}
          className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white h-12 px-8 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
        >
          {isSaving === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Semua Perubahan
        </Button>
      </div>

      {/* Filter Search Bar */}
      <div className="flex flex-col gap-2 w-full md:w-[450px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Ketik untuk mencari modul yang tersembunyi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-white rounded-xl border-slate-200 focus-visible:ring-indigo-500 shadow-sm w-full font-medium text-sm"
          />
        </div>
        {!searchTerm && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            Menampilkan {filteredTemplates.length} modul yang tayang di publik
          </p>
        )}
      </div>

      {/* Konten Utama - Menggunakan Flex/Grid Layout daripada Tabel */}
      <div className="w-full">
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium bg-white rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> Memuat Etalase...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-medium bg-white rounded-3xl shadow-sm ring-1 ring-slate-200">
            {searchTerm 
              ? "Tidak ada modul asesmen yang cocok dengan pencarian." 
              : "Belum ada modul yang tayang. Gunakan pencarian di atas untuk memunculkan modul tersembunyi."}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredTemplates.map(template => {
              const state = formStates[template.id];
              if (!state) return null;
              
              const isChanged = checkIsChanged(template.id, template);
              const originalPrice = parseInt(state.price || '0', 10);
              const discountPerc = parseInt(state.discountPercentage || '0', 10);
              const finalPrice = originalPrice - (originalPrice * (discountPerc / 100));

              // Penanda visual jika tayang di katalog (Lebih responsif berbasis Border Card)
              const highlightCardClass = state.isDisplayedOnLanding 
                ? 'border-l-[4px] border-l-emerald-500 border-t border-r border-b border-slate-200 bg-emerald-50/20 hover:bg-emerald-50/40 shadow-sm' 
                : 'border border-slate-200 bg-white/70 hover:bg-white opacity-80 hover:opacity-100 shadow-sm';

              return (
                <div key={template.id} className={`flex flex-col lg:flex-row gap-5 lg:gap-8 p-5 md:p-6 rounded-2xl transition-all duration-200 ${highlightCardClass}`}>
                  
                  {/* KOLOM 1: Info Modul & Social Proof */}
                  <div className="flex-1 lg:max-w-[320px] space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shrink-0 ring-1 ring-slate-200 shadow-sm">
                        <LayoutGrid size={18}/>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[15px] leading-snug">{template.trackName}</p>
                        <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-1" title={template.trackDescription}>
                          {template.trackDescription || "Deskripsi singkat."}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleToggle(template.id, 'isDisplayedOnLanding')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all border ${
                          state.isDisplayedOnLanding ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {state.isDisplayedOnLanding ? <Eye size={12} /> : <EyeOff size={12} />}
                        {state.isDisplayedOnLanding ? 'Tampil di Katalog' : 'Status: Tersembunyi'}
                      </button>
                      
                      <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50 space-y-3">
                        <SwitchToggle checked={state.isBestSeller} onChange={() => handleToggle(template.id, 'isBestSeller')} label="🔥 Tandai Best Seller" />
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
                  <div className="flex-1 lg:max-w-[280px] space-y-4">
                    <SwitchToggle checked={state.isPaid} onChange={() => handleToggle(template.id, 'isPaid')} label="Berbayar" />
                    
                    <div className="relative w-full">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${!state.isPaid ? 'text-slate-300' : 'text-slate-400'}`}>Rp</span>
                      <Input 
                        type="text" value={state.price}
                        onChange={(e) => handleInputChange(template.id, 'price', e.target.value)}
                        disabled={!state.isPaid}
                        className={`pl-9 h-10 font-bold text-sm rounded-xl transition-all ${!state.isPaid ? 'bg-slate-50 opacity-50 border-slate-200 text-slate-400' : 'bg-white border-slate-200 shadow-sm'}`}
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
                              className="pl-8 pr-7 h-9 font-bold text-sm bg-white border-rose-200 text-rose-700"
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
                  <div className="flex-1 lg:max-w-[280px] space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-emerald-500"/> Keunggulan Tambahan (Opsional)
                    </label>
                    <Textarea 
                      placeholder="Sesi Konsultasi Eksklusif 30 Menit&#10;Prioritas Validasi Dokumen"
                      value={state.customUSPs}
                      onChange={(e) => handleInputChange(template.id, 'customUSPs', e.target.value)}
                      className="text-xs bg-white resize-y min-h-[120px] shadow-sm border-slate-200"
                    />
                    <p className="text-[9px] text-slate-400 font-medium">Tekan Enter untuk memisahkan setiap poin.</p>
                  </div>

                  {/* Garis Pemisah Mobile */}
                  <div className="w-full h-px bg-slate-200/60 lg:hidden"></div>

                  {/* KOLOM 4: Aksi Simpan & Generate Token */}
                  <div className="flex flex-col justify-end gap-3 w-full lg:max-w-[180px]">
                    <Button 
                      onClick={() => handleSaveItem(template.id)} 
                      disabled={!isChanged || isSaving === template.id}
                      variant="outline"
                      className={`w-full h-10 rounded-xl font-bold transition-all text-xs ${
                        isChanged ? 'bg-indigo-600 border-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      {isSaving === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Perubahan'}
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

                    {/* KOTAK PENAMPIL TOKEN HASIL GENERATE */}
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
        )}
      </div>
    </div>
  );
}