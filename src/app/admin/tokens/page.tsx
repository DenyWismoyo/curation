// src/app/admin/tokens/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  KeyRound, Download, Plus, Building2, Users, Sparkles, Zap, 
  Eye, X, Copy, Check, Search, ShieldCheck, UserCheck, Trash2, Edit3, FileText,
  Settings2
} from 'lucide-react';

import { AdminTokenExportPDF } from '@/app/components/admin/AdminTokenExportPDF';
import { TokenExportPDFButton } from '@/components/shared'; 
import { DocumentPresets } from '@/data/documentPromptTemplates';

// === INTERFACES ===
interface CorporateBatch {
  id: string;
  corporateName: string;
  modelType: 'flash' | 'pro';
  totalTokens: number;
  usedCount: number;
  createdAt: string;
  allowedTemplates?: string[]; 
  allowedDocumentTemplates?: string[]; 
  tokens: Record<string, { isUsed: boolean; usedAt: string | null; usedByNamaUsaha: string | null }>;
}

interface CuratorToken {
  id: string; 
  programName: string;
  createdAt: string;
  role: string;
}

interface FormTemplateLight {
  id: string;
  trackName: string;
  isActive: boolean;
}

export default function TokenManagerPage() {
  const [activeTab, setActiveTab] = useState<'peserta' | 'kurator'>('peserta');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // State Form Templates & Document Templates (Untuk Filter)
  const [availableTemplates, setAvailableTemplates] = useState<FormTemplateLight[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedDocTemplates, setSelectedDocTemplates] = useState<string[]>([]);

  // State Edit Allowed Templates di Table
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingAllowedTemplates, setEditingAllowedTemplates] = useState<string[]>([]);
  const [editingDocTemplates, setEditingDocTemplates] = useState<string[]>([]);
  const [isUpdatingTemplates, setIsUpdatingTemplates] = useState(false);

  // State Token Peserta (Batch)
  const [batches, setBatches] = useState<CorporateBatch[]>([]);
  const [qty, setQty] = useState(50);
  const [corporateName, setCorporateName] = useState('');
  const [corpId, setCorpId] = useState(''); 
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash'); 

  // State Token Kurator
  const [curatorTokens, setCuratorTokens] = useState<CuratorToken[]>([]);
  const [curatorProgram, setCuratorProgram] = useState('');
  const [curatorCode, setCuratorCode] = useState('');

  // Modal Detail & Edit Quota State
  const [selectedBatch, setSelectedBatch] = useState<CorporateBatch | null>(null);
  const [searchToken, setSearchToken] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // === STATE BARU: EDIT KUOTA TOKEN ===
  const [editingQuotaBatch, setEditingQuotaBatch] = useState<CorporateBatch | null>(null);
  const [newQuotaAmount, setNewQuotaAmount] = useState<number>(0);
  const [isUpdatingQuota, setIsUpdatingQuota] = useState(false);

  // === FETCH DATA ===
  const fetchData = async () => {
    setLoading(true);
    try {
      const qTemplates = query(collection(db, 'form_templates'));
      const snapTemplates = await getDocs(qTemplates);
      const dataTemplates = snapTemplates.docs
        .map(d => ({ id: d.id, trackName: d.data().trackName, isActive: d.data().isActive } as FormTemplateLight))
        .filter(t => t.isActive); 
      setAvailableTemplates(dataTemplates);

      const qBatch = query(collection(db, 'corporate_tokens'), orderBy('createdAt', 'desc'));
      const snapBatch = await getDocs(qBatch);
      const dataBatch = snapBatch.docs.map(d => ({ id: d.id, ...d.data() } as CorporateBatch));
      setBatches(dataBatch);

      const qCurator = query(collection(db, 'curator_tokens'), orderBy('createdAt', 'desc'));
      const snapCurator = await getDocs(qCurator);
      const dataCurator = snapCurator.docs.map(d => ({ id: d.id, ...d.data() } as CuratorToken));
      setCuratorTokens(dataCurator);
    } catch (e) {
      console.error(e);
      toast.error("Gagal menarik data dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const uniquePrograms = Array.from(new Set(batches.map(b => b.corporateName)));

  // === HANDLER TOKEN PESERTA ===
  const generateCorporateBatch = async () => {
    const cleanCorpId = corpId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCorpId || cleanCorpId.length < 3) return toast.warning("ID Korporat (Prefix) minimal 3 karakter huruf/angka.");
    if (qty < 1 || qty > 5000) return toast.warning("Jumlah token maksimal 5000 per batch.");
    if (!corporateName) return toast.warning("Nama korporat wajib diisi.");

    setIsGenerating(true);
    try {
      const newTokens: Record<string, any> = {};
      for (let i = 0; i < qty; i++) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        newTokens[randomStr] = { isUsed: false, usedAt: null, usedByNamaUsaha: null };
      }

      const batchData = {
        corporateName,
        modelType,
        totalTokens: qty,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        allowedTemplates: selectedTemplates, 
        allowedDocumentTemplates: selectedDocTemplates,
        tokens: newTokens
      };

      await setDoc(doc(db, 'corporate_tokens', cleanCorpId), batchData);
      setBatches([{ id: cleanCorpId, ...batchData } as CorporateBatch, ...batches]);
      toast.success(`Berhasil! Batch untuk ${corporateName} dibuat.`);
      
      setCorporateName('');
      setCorpId('');
      setSelectedTemplates([]); 
      setSelectedDocTemplates([]); 
    } catch (error) {
      console.error("Gagal generate token:", error);
      toast.error("Terjadi kesalahan sistem saat membuat token.");
    } finally {
      setIsGenerating(false);
    }
  };

  // === HANDLER EDIT KUOTA TOKEN ===
  const handleSaveQuota = async () => {
    if (!editingQuotaBatch) return;

    if (newQuotaAmount < editingQuotaBatch.usedCount) {
      return toast.error(`Kuota tidak bisa lebih kecil dari token yang sudah terpakai (${editingQuotaBatch.usedCount}).`);
    }

    setIsUpdatingQuota(true);
    try {
      const batchRef = doc(db, 'corporate_tokens', editingQuotaBatch.id);
      const currentTokens = { ...editingQuotaBatch.tokens };
      const diff = newQuotaAmount - editingQuotaBatch.totalTokens;

      if (diff > 0) {
        // MENAMBAH TOKEN BARU
        for (let i = 0; i < diff; i++) {
          let randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
          while (currentTokens[randomStr]) {
            randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
          }
          currentTokens[randomStr] = { isUsed: false, usedAt: null, usedByNamaUsaha: null };
        }
      } else if (diff < 0) {
        // MENGHAPUS TOKEN YANG BELUM TERPAKAI
        const numToRemove = Math.abs(diff);
        const unusedKeys = Object.keys(currentTokens).filter(k => !currentTokens[k].isUsed);

        if (unusedKeys.length < numToRemove) {
          toast.error("Tidak cukup token yang belum terpakai untuk dihapus.");
          setIsUpdatingQuota(false);
          return;
        }

        for (let i = 0; i < numToRemove; i++) {
          delete currentTokens[unusedKeys[i]];
        }
      }

      await updateDoc(batchRef, {
        totalTokens: newQuotaAmount,
        tokens: currentTokens
      });

      setBatches(prev => prev.map(b => b.id === editingQuotaBatch.id ? { 
        ...b, 
        totalTokens: newQuotaAmount,
        tokens: currentTokens
      } : b));

      toast.success("Kuota token berhasil diperbarui!");
      setEditingQuotaBatch(null);
    } catch (error) {
      console.error("Gagal update kuota:", error);
      toast.error("Terjadi kesalahan sistem saat memperbarui kuota.");
    } finally {
      setIsUpdatingQuota(false);
    }
  };

  // === HANDLER UPDATE TEMPLATES BATCH ===
  const updateBatchTemplates = async (batchId: string) => {
    setIsUpdatingTemplates(true);
    try {
      await updateDoc(doc(db, 'corporate_tokens', batchId), {
        allowedTemplates: editingAllowedTemplates,
        allowedDocumentTemplates: editingDocTemplates 
      });
      setBatches(prev => prev.map(b => b.id === batchId ? { 
        ...b, 
        allowedTemplates: editingAllowedTemplates,
        allowedDocumentTemplates: editingDocTemplates 
      } : b));
      setEditingBatchId(null);
      toast.success('Hak akses form & dokumen berhasil diperbarui!');
    } catch (error) {
      console.error("Gagal update templates:", error);
      toast.error("Terjadi kesalahan saat memperbarui akses.");
    } finally {
      setIsUpdatingTemplates(false);
    }
  };

  // === HANDLER TOKEN KURATOR ===
  const generateCuratorToken = async () => {
    const code = curatorCode.trim().toUpperCase().replace(/\s/g, '-');
    const program = curatorProgram.trim();

    if (!code || code.length < 5) return toast.warning("Kode Kurator minimal 5 karakter.");
    if (!program) return toast.warning("Silakan pilih Nama Program/Entitas terlebih dahulu.");
    
    if (curatorTokens.find(t => t.id === code)) {
      return toast.warning("Kode Token ini sudah ada. Silakan gunakan kode lain.");
    }

    setIsGenerating(true);
    try {
      const tokenData: CuratorToken = {
        id: code,
        programName: program,
        role: 'curator',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'curator_tokens', code), tokenData);
      setCuratorTokens([tokenData, ...curatorTokens]);
      toast.success(`Akses Kurator untuk program ${program} berhasil dibuat.`);
      
      setCuratorCode('');
      setCuratorProgram('');
    } catch (error) {
      console.error("Gagal generate token kurator:", error);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteCuratorToken = async (tokenId: string) => {
    if (!confirm(`Apakah Anda yakin ingin mencabut token kurator "${tokenId}"? Kurator tidak akan bisa login lagi dengan kode ini.`)) return;
    
    try {
      await deleteDoc(doc(db, 'curator_tokens', tokenId));
      setCuratorTokens(curatorTokens.filter(t => t.id !== tokenId));
      toast.success("Token kurator berhasil dicabut.");
    } catch (error) {
      console.error("Gagal hapus token:", error);
      toast.error("Gagal mencabut token.");
    }
  };

  // === UTILITY FUNCTIONS ===
  const exportTokensToCSV = (batchId: string, batchData: CorporateBatch) => {
    const tokensArr = Object.entries(batchData.tokens);
    const csvContent = [
      ['Kode Akses Penuh (Berikan ke User)', 'Status', 'Dipakai Oleh', 'Waktu Pakai'].join(','),
      ...tokensArr.map(([code, data]) => [
        `${batchId}-${code}`, 
        data.isUsed ? 'Terpakai' : 'Belum Terpakai',
        `"${data.usedByNamaUsaha || '-'}"`,
        data.usedAt ? new Date(data.usedAt).toLocaleString('id-ID') : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Token_${batchData.modelType.toUpperCase()}_${batchId}_${batchData.corporateName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToken = (tokenStr: string) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getFilteredTokens = () => {
    if (!selectedBatch) return [];
    const entries = Object.entries(selectedBatch.tokens);
    if (!searchToken) return entries;
    
    const lowerSearch = searchToken.toLowerCase();
    return entries.filter(([code, data]) => {
      const fullToken = `${selectedBatch.id}-${code}`.toLowerCase();
      const userName = (data.usedByNamaUsaha || '').toLowerCase();
      return fullToken.includes(lowerSearch) || userName.includes(lowerSearch);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Akses &amp; Kuota Token</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
            Kelola kuota kurasi untuk peserta (batch) dan berikan akses untuk para kurator secara terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl ring-1 ring-slate-200 shadow-sm shrink-0">
          <button onClick={() => setActiveTab('peserta')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'peserta' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Users className="w-4 h-4"/> Peserta</button>
          <button onClick={() => setActiveTab('kurator')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'kurator' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><UserCheck className="w-4 h-4"/> Kurator</button>
        </div>
      </div>

      {activeTab === 'peserta' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <Card className="p-6 sm:p-8 bg-white rounded-3xl shadow-sm border-none ring-1 ring-slate-200 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row items-end gap-5">
              <div className="space-y-2 flex-1 w-full">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nama Entitas/Program</label>
                <Input value={corporateName} onChange={e => setCorporateName(e.target.value)} placeholder="Contoh: KemenkopUKM Batch 1" className="h-12 rounded-xl bg-slate-50 font-bold" />
              </div>
              <div className="space-y-2 w-full md:w-40">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">ID Prefix (Unik)</label>
                <Input value={corpId} onChange={e => setCorpId(e.target.value)} maxLength={10} placeholder="KUKM1" className="h-12 rounded-xl bg-slate-50 uppercase font-mono font-bold" />
              </div>
              <div className="space-y-2 w-full md:w-32">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Jumlah Token</label>
                <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1} max={5000} className="h-12 rounded-xl bg-slate-50 font-bold" />
              </div>
            </div>

            {/* FILTER 1: AKSES MODUL ASESMEN */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>1. Akses Form Modul Asesmen</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableTemplates.map(tpl => (
                  <label key={tpl.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedTemplates.includes(tpl.id) ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" checked={selectedTemplates.includes(tpl.id)} onChange={(e) => { if (e.target.checked) setSelectedTemplates([...selectedTemplates, tpl.id]); else setSelectedTemplates(selectedTemplates.filter(id => id !== tpl.id)); }} />
                    <span className={`text-sm font-bold ${selectedTemplates.includes(tpl.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{tpl.trackName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* FILTER 2: AKSES TEMPLATE DOKUMEN (WORD) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>2. Akses Template Dokumen AI (Word)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DocumentPresets.map(docTpl => (
                  <label key={docTpl.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedDocTemplates.includes(docTpl.id) ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                    <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" checked={selectedDocTemplates.includes(docTpl.id)} onChange={(e) => { if (e.target.checked) setSelectedDocTemplates([...selectedDocTemplates, docTpl.id]); else setSelectedDocTemplates(selectedDocTemplates.filter(id => id !== docTpl.id)); }} />
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${selectedDocTemplates.includes(docTpl.id) ? 'text-emerald-900' : 'text-slate-700'}`}>{docTpl.name}</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Jika tidak dicentang sama sekali, peserta program ini bisa mengakses <strong>Semua Dokumen</strong>. Centang untuk membatasi tipe dokumen yang bisa dibuat oleh peserta.</p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-4 border-t border-slate-100">
              <div className="space-y-2 w-full md:w-auto">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Pilih Mesin AI (Model)</label>
                <div className="flex gap-3">
                  <button onClick={() => setModelType('flash')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${modelType === 'flash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}><Zap className="w-4 h-4" /> AI Flash (Standar)</button>
                  <button onClick={() => setModelType('pro')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${modelType === 'pro' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300'}`}><Sparkles className="w-4 h-4" /> AI Pro (Premium)</button>
                </div>
              </div>
              
              <Button onClick={generateCorporateBatch} disabled={isGenerating} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-indigo-200">
                <Plus className="w-4 h-4 mr-2" /> {isGenerating ? 'Memproses...' : 'Buat Batch Baru'}
              </Button>
            </div>
          </Card>

          <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none">
            {loading ? (
              <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium">Memuat Data...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-5">Nama Program</th>
                      <th className="px-6 py-5">Tipe &amp; Prefix</th>
                      <th className="px-6 py-5">Akses Modul & Dokumen</th>
                      <th className="px-6 py-5 text-center">Penggunaan</th>
                      <th className="px-6 py-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {batches.map(batch => (
                      <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><Building2 size={18}/></div>
                            <div>
                              <p className="font-bold text-slate-900 text-base">{batch.corporateName}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{new Date(batch.createdAt).toLocaleDateString('id-ID')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 ${batch.modelType === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>AI {batch.modelType}</span>
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">{batch.id}-******</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top max-w-[280px]">
                          {editingBatchId === batch.id ? (
                            <div className="space-y-4 bg-white p-4 rounded-xl ring-1 ring-slate-200 shadow-sm relative z-10 w-[300px]">
                              {/* EDIT MODUL ASESMEN */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">1. Akses Form Asesmen:</p>
                                <div className="max-h-[100px] overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                                  {availableTemplates.map(tpl => (
                                    <label key={tpl.id} className="flex items-start gap-2 cursor-pointer group">
                                      <input type="checkbox" className="mt-0.5 rounded text-indigo-600" checked={editingAllowedTemplates.includes(tpl.id)} onChange={(e) => { if (e.target.checked) setEditingAllowedTemplates([...editingAllowedTemplates, tpl.id]); else setEditingAllowedTemplates(editingAllowedTemplates.filter(id => id !== tpl.id)); }} />
                                      <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">{tpl.trackName}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* EDIT DOKUMEN WORD */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-t border-slate-100 pt-3">2. Akses Dokumen Word:</p>
                                <div className="max-h-[100px] overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                                  {DocumentPresets.map(docTpl => (
                                    <label key={docTpl.id} className="flex items-start gap-2 cursor-pointer group">
                                      <input type="checkbox" className="mt-0.5 rounded text-emerald-600" checked={editingDocTemplates.includes(docTpl.id)} onChange={(e) => { if (e.target.checked) setEditingDocTemplates([...editingDocTemplates, docTpl.id]); else setEditingDocTemplates(editingDocTemplates.filter(id => id !== docTpl.id)); }} />
                                      <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-600">{docTpl.name}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2 border-t border-slate-100">
                                <Button size="sm" className="h-8 text-xs px-3 bg-indigo-600 flex-1" onClick={() => updateBatchTemplates(batch.id)} disabled={isUpdatingTemplates}>Simpan</Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs px-3 text-slate-500 flex-1" onClick={() => setEditingBatchId(null)}>Batal</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-3">
                              {/* VIEW MODUL ASESMEN */}
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Modul Form:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(!batch.allowedTemplates || batch.allowedTemplates.length === 0) ? (
                                    <span className="inline-flex bg-slate-100 text-slate-500 font-bold text-[10px] px-2 py-1 rounded border border-slate-200">Semua Modul</span>
                                  ) : batch.allowedTemplates.map(id => {
                                    const tName = availableTemplates.find(t => t.id === id)?.trackName || 'Form Dihapus';
                                    return <span key={id} className="inline-flex bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2 py-1 rounded border border-indigo-200 truncate max-w-[150px]">{tName}</span>
                                  })}
                                </div>
                              </div>

                              {/* VIEW DOKUMEN WORD */}
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dokumen Word:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(!batch.allowedDocumentTemplates || batch.allowedDocumentTemplates.length === 0) ? (
                                    <span className="inline-flex bg-slate-100 text-slate-500 font-bold text-[10px] px-2 py-1 rounded border border-slate-200">Semua Dokumen</span>
                                  ) : batch.allowedDocumentTemplates.map(id => {
                                    const dName = DocumentPresets.find(d => d.id === id)?.name || 'Dokumen Dihapus';
                                    return <span key={id} className="inline-flex bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-1 rounded border border-emerald-200 truncate max-w-[150px]"><FileText size={10} className="mr-1 inline" />{dName}</span>
                                  })}
                                </div>
                              </div>

                              <button onClick={() => { setEditingBatchId(batch.id); setEditingAllowedTemplates(batch.allowedTemplates || []); setEditingDocTemplates(batch.allowedDocumentTemplates || []); }} className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded mt-1">
                                <Edit3 size={10} /> Ubah Akses
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-center">
                            <div className="font-black text-slate-700 text-lg">{batch.usedCount || 0} <span className="text-slate-300 text-sm">/ {batch.totalTokens}</span></div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden relative"><div className="absolute h-full bg-emerald-500" style={{width: `${((batch.usedCount || 0)/batch.totalTokens)*100}%`}}></div></div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex justify-center gap-2">
                            <Button 
                              onClick={() => {
                                setEditingQuotaBatch(batch);
                                setNewQuotaAmount(batch.totalTokens);
                              }} 
                              variant="outline" 
                              className="border-amber-200 bg-amber-50 shadow-sm w-10 h-10 p-0 hover:bg-amber-100 transition-colors" 
                              title="Atur Ulang Kuota Token"
                            >
                              <Settings2 className="w-4 h-4 text-amber-600" />
                            </Button>

                            <Button onClick={() => setSelectedBatch(batch)} variant="outline" className="border-slate-200 bg-white shadow-sm w-10 h-10 p-0" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <Button onClick={() => exportTokensToCSV(batch.id, batch)} variant="outline" className="border-indigo-200 bg-white shadow-sm w-10 h-10 p-0" title="Unduh CSV">
                              <Download className="w-4 h-4 text-indigo-600" />
                            </Button>

                            {/* === TOMBOL PDF BARU BESERTA DATA TERUSAN === */}
                            <TokenExportPDFButton batch={batch} availableTemplates={availableTemplates} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ... (TAB 2 DAN MODAL TETAP SAMA) */}
      {/* ========================================= */}
      {/* TAB 2: MANAJEMEN AKSES KURATOR            */}
      {/* ========================================= */}
      {activeTab === 'kurator' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="p-6 sm:p-8 bg-white rounded-3xl shadow-sm border-none ring-1 ring-slate-200 flex flex-col md:flex-row items-end gap-5">
            <div className="space-y-2 flex-1 w-full">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5"/> Nama Program / Entitas Tugas
              </label>
              <select 
                value={curatorProgram} 
                onChange={e => setCuratorProgram(e.target.value)} 
                className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="" disabled>-- Pilih Program / Entitas --</option>
                {uniquePrograms.map((prog, idx) => (
                  <option key={idx} value={prog}>{prog}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium pt-1">Pilih dari entitas yang sudah didaftarkan pada tab Token Peserta.</p>
            </div>
            
            <div className="space-y-2 w-full md:w-64">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5"/> Kode Login Kurator
              </label>
              <Input 
                value={curatorCode} 
                onChange={e => setCuratorCode(e.target.value.toUpperCase().replace(/\s/g, '-'))} 
                placeholder="CUR-SOLO-2026" 
                className="h-12 rounded-xl bg-slate-50 uppercase font-mono font-bold"
              />
            </div>
            
            <Button 
              onClick={generateCuratorToken} 
              disabled={isGenerating} 
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-emerald-200"
            >
              <Plus className="w-4 h-4 mr-2" /> Buat Akses
            </Button>
          </Card>

          <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none">
            {loading ? (
              <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium">
                Memuat Data Kurator...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-5">Kode Login (Token)</th>
                      <th className="px-6 py-5">Ditugaskan Untuk Program</th>
                      <th className="px-6 py-5 text-center">Tanggal Dibuat</th>
                      <th className="px-6 py-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {curatorTokens.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-medium">Belum ada akses kurator yang dibuat.</td></tr>
                    ) : curatorTokens.map(token => (
                      <tr key={token.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleCopyToken(token.id)}
                              className="h-8 px-2 border-slate-200"
                            >
                              {copiedToken === token.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            </Button>
                            <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg ring-1 ring-emerald-100/50">
                              {token.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-bold text-slate-800 text-base">{token.programName}</span>
                        </td>
                        <td className="px-6 py-5 text-center text-slate-500 font-medium">
                          {new Date(token.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <Button 
                            onClick={() => deleteCuratorToken(token.id)}
                            variant="ghost" 
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-10 w-10 p-0 rounded-xl transition-colors"
                            title="Cabut Akses"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL EDIT KUOTA TOKEN */}
      {editingQuotaBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Atur Ulang Kuota Token</h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{editingQuotaBatch.corporateName}</p>
              </div>
              <button onClick={() => setEditingQuotaBatch(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100">
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Awal</p>
                    <p className="text-2xl font-black text-slate-800">{editingQuotaBatch.totalTokens}</p>
                 </div>
                 <div className="w-px h-10 bg-slate-200"></div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Terpakai</p>
                    <p className="text-2xl font-black text-amber-600">{editingQuotaBatch.usedCount}</p>
                 </div>
                 <div className="w-px h-10 bg-slate-200"></div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sisa Aktif</p>
                    <p className="text-2xl font-black text-emerald-600">{editingQuotaBatch.totalTokens - editingQuotaBatch.usedCount}</p>
                 </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tentukan Total Kuota Baru</label>
                <Input
                  type="number"
                  min={editingQuotaBatch.usedCount}
                  max={5000}
                  value={newQuotaAmount}
                  onChange={(e) => setNewQuotaAmount(Number(e.target.value))}
                  className="h-14 text-xl font-black bg-white rounded-xl focus-visible:ring-indigo-500 text-center"
                />
                <p className="text-[11px] text-slate-500 font-medium text-center">
                  {newQuotaAmount > editingQuotaBatch.totalTokens ? (
                     <span className="text-emerald-600 font-bold">Sistem akan men-generate {newQuotaAmount - editingQuotaBatch.totalTokens} token baru secara acak.</span>
                  ) : newQuotaAmount < editingQuotaBatch.totalTokens ? (
                     <span className="text-rose-600 font-bold">Sistem akan menghapus {editingQuotaBatch.totalTokens - newQuotaAmount} token yang belum terpakai secara acak.</span>
                  ) : (
                     <span>Tidak ada perubahan pada jumlah token.</span>
                  )}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
               <Button variant="outline" onClick={() => setEditingQuotaBatch(null)} className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100">Batal</Button>
               <Button
                  onClick={handleSaveQuota}
                  disabled={isUpdatingQuota || newQuotaAmount === editingQuotaBatch.totalTokens || newQuotaAmount < editingQuotaBatch.usedCount}
                  className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
               >
                 {isUpdatingQuota ? 'Menyimpan...' : 'Simpan Perubahan Kuota'}
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DAFTAR TOKEN (HANYA UNTUK TAB PESERTA) */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" /> Detail Batch: {selectedBatch.corporateName}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
                  Prefix: {selectedBatch.id} | Total: {selectedBatch.totalTokens} Token
                </p>
              </div>
              <button onClick={() => { setSelectedBatch(null); setSearchToken(''); setEditingBatchId(null); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={searchToken} onChange={(e) => setSearchToken(e.target.value)} placeholder="Cari Token atau Nama Usaha pengguna..." className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl font-medium" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 space-y-3 custom-scrollbar">
              {getFilteredTokens().length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">Tidak ada token yang cocok.</div>
              ) : (
                getFilteredTokens().map(([code, data]) => {
                  const fullToken = `${selectedBatch.id}-${code}`;
                  return (
                    <div key={code} className="bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:ring-indigo-200 transition-all">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <code className="text-base font-black text-slate-900 font-mono bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{fullToken}</code>
                          {data.isUsed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md"><ShieldCheck className="w-3 h-3" /> Terpakai</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md"><Check className="w-3 h-3" /> Tersedia</span>
                          )}
                        </div>
                        {data.isUsed && data.usedByNamaUsaha && (
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> Diklaim oleh <strong className="text-slate-700">{data.usedByNamaUsaha}</strong>
                          </div>
                        )}
                      </div>
                      
                      {!data.isUsed ? (
                        <Button variant="secondary" size="sm" onClick={() => handleCopyToken(fullToken)} className={`shrink-0 rounded-xl font-bold h-10 px-4 ${copiedToken === fullToken ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                          {copiedToken === fullToken ? <><Check className="w-4 h-4 mr-1.5" /> Tersalin!</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy Kode</>}
                        </Button>
                      ) : (
                        <div className="shrink-0 h-10 px-4 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl ring-1 ring-slate-100 cursor-not-allowed">Token Tidak Berlaku</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}