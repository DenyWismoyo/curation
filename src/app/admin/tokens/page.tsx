// src/app/admin/tokens/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { KeyRound, Download, Plus, Building2, Users, Sparkles, Zap, Eye, X, Copy, Check, Search, ShieldCheck } from 'lucide-react';
import { AdminTokenExportPDF } from '@/components/admin/AdminTokenExportPDF';
import Link from 'next/link';

interface CorporateBatch {
  id: string;
  corporateName: string;
  modelType: 'flash' | 'pro';
  totalTokens: number;
  usedCount: number;
  createdAt: string;
  tokens: Record<string, { isUsed: boolean; usedAt: string | null; usedByNamaUsaha: string | null }>;
}

export default function TokenManagerPage() {
  const [batches, setBatches] = useState<CorporateBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form Generate
  const [qty, setQty] = useState(50);
  const [corporateName, setCorporateName] = useState('');
  const [corpId, setCorpId] = useState(''); 
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash'); 

  // Modal Detail State
  const [selectedBatch, setSelectedBatch] = useState<CorporateBatch | null>(null);
  const [searchToken, setSearchToken] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'corporate_tokens'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CorporateBatch));
      setBatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const generateCorporateBatch = async () => {
    const cleanCorpId = corpId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCorpId || cleanCorpId.length < 3) return alert("ID Korporat (Prefix) minimal 3 karakter huruf/angka.");
    if (qty < 1 || qty > 5000) return alert("Jumlah token maksimal 5000 per batch.");
    if (!corporateName) return alert("Nama korporat wajib diisi.");

    setIsGenerating(true);

    try {
      const newTokens: Record<string, any> = {};
      
      for (let i = 0; i < qty; i++) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        newTokens[randomStr] = {
          isUsed: false,
          usedAt: null,
          usedByNamaUsaha: null
        };
      }

      const batchData = {
        corporateName,
        modelType,
        totalTokens: qty,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        tokens: newTokens
      };

      await setDoc(doc(db, 'corporate_tokens', cleanCorpId), batchData);
      
      setBatches([{ id: cleanCorpId, ...batchData }, ...batches]);
      alert(`Berhasil! 1 Batch dengan ${qty} Token (${modelType.toUpperCase()}) untuk ${corporateName} dibuat.`);
      
      setCorporateName('');
      setCorpId('');
    } catch (error) {
      console.error("Gagal generate token:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsGenerating(false);
    }
  };

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
    link.setAttribute('download', `Token_${batchData.modelType.toUpperCase()}_${batchId}_${batchData.corporateName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToken = (tokenStr: string) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Helper untuk filter token di dalam modal
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
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="text-indigo-600" /> Manajemen Akses B2B
            </h1>
            <p className="text-slate-500 text-sm mt-1">Generate kuota kurasi massal dengan opsi AI Flash & AI Pro.</p>
          </div>
          <Link href="/admin"><Button variant="outline" className="rounded-xl font-bold">Kembali ke Dasbor</Button></Link>
        </div>

        {/* Panel Generate Batch */}
        <Card className="p-6 sm:p-8 bg-white rounded-3xl shadow-sm border-indigo-100 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row items-end gap-5">
            <div className="space-y-2 flex-1 w-full">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Entitas/Program</label>
              <Input value={corporateName} onChange={e => setCorporateName(e.target.value)} placeholder="Contoh: KemenkopUKM Batch 1" className="h-11 rounded-xl bg-slate-50" />
            </div>
            <div className="space-y-2 w-full md:w-40">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Prefix (Unik)</label>
              <Input value={corpId} onChange={e => setCorpId(e.target.value)} maxLength={10} placeholder="KUKM1" className="h-11 rounded-xl bg-slate-50 uppercase font-mono" />
            </div>
            <div className="space-y-2 w-full md:w-32">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jumlah Token</label>
              <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1} max={5000} className="h-11 rounded-xl bg-slate-50" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-2 border-t border-slate-100">
            <div className="space-y-2 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pilih Mesin AI (Model)</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => setModelType('flash')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${modelType === 'flash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}
                >
                  <Zap className="w-4 h-4" /> AI Flash (Standar)
                </button>
                <button 
                  onClick={() => setModelType('pro')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${modelType === 'pro' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300'}`}
                >
                  <Sparkles className="w-4 h-4" /> AI Pro (Premium)
                </button>
              </div>
            </div>

            <Button onClick={generateCorporateBatch} disabled={isGenerating} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 h-11 px-8 rounded-xl font-bold shadow-lg shadow-indigo-200">
              <Plus className="w-4 h-4 mr-2" /> {isGenerating ? 'Memproses JSON...' : 'Buat Batch Baru'}
            </Button>
          </div>
        </Card>

        {/* Tabel Data Batch Corporate */}
        <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none">
          {loading ? (
            <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium">
               <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
               Memuat Data Korporat...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">Nama Program / Entitas</th>
                    <th className="px-6 py-5">Tipe & Prefix</th>
                    <th className="px-6 py-5 text-center">Penggunaan</th>
                    <th className="px-6 py-5 text-center">Aksi / Ekspor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {batches.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-medium">Belum ada batch korporat yang dibuat.</td></tr>
                  ) : batches.map(batch => (
                    <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><Building2 size={18}/></div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{batch.corporateName}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{new Date(batch.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 ${batch.modelType === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                            {batch.modelType === 'pro' ? <Sparkles className="w-3 h-3"/> : <Zap className="w-3 h-3"/>}
                            AI {batch.modelType}
                          </span>
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md ring-1 ring-indigo-100">{batch.id}-******</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5 font-black text-slate-700 text-lg">
                            <Users className="w-4 h-4 text-slate-400"/>
                            {batch.usedCount || 0} <span className="text-slate-300 text-sm font-medium">/ {batch.totalTokens}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full" style={{width: `${((batch.usedCount || 0)/batch.totalTokens)*100}%`}}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            onClick={() => setSelectedBatch(batch)}
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl h-9 px-3 shadow-sm bg-white"
                          >
                            <Eye className="w-4 h-4 sm:mr-1.5" /> 
                            <span className="hidden sm:inline">Daftar Token</span>
                          </Button>
                          <Button 
                            onClick={() => exportTokensToCSV(batch.id, batch)} 
                            variant="outline" 
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl h-9 px-3 shadow-sm bg-white"
                          >
                            <Download className="w-4 h-4" /> 
                          </Button>
                          <AdminTokenExportPDF batch={batch} />
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

      {/* MODAL DAFTAR TOKEN */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" /> Detail Batch: {selectedBatch.corporateName}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
                  Prefix: {selectedBatch.id} • Total: {selectedBatch.totalTokens} Token
                </p>
              </div>
              <button 
                onClick={() => { setSelectedBatch(null); setSearchToken(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder="Cari Token atau Nama Usaha pengguna..." 
                  className="pl-9 bg-slate-50 border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* List Token */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 space-y-3 custom-scrollbar">
              {getFilteredTokens().length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">
                  Tidak ada token yang cocok dengan pencarian Anda.
                </div>
              ) : (
                getFilteredTokens().map(([code, data]) => {
                  const fullToken = `${selectedBatch.id}-${code}`;
                  return (
                    <div key={code} className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:ring-indigo-200 transition-all">
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <code className="text-base font-black text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {fullToken}
                          </code>
                          {data.isUsed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              <ShieldCheck className="w-3 h-3" /> Terpakai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              <Check className="w-3 h-3" /> Tersedia
                            </span>
                          )}
                        </div>
                        
                        {/* Info Pengguna Jika Terpakai */}
                        {data.isUsed && data.usedByNamaUsaha && (
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Diklaim oleh <strong className="text-slate-700">{data.usedByNamaUsaha}</strong> 
                            <span className="text-slate-400 mx-1">•</span> 
                            {new Date(data.usedAt!).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>

                      {/* Tombol Copy (Hanya jika belum terpakai) */}
                      {!data.isUsed ? (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleCopyToken(fullToken)}
                          className={`shrink-0 rounded-xl font-bold h-9 transition-all ${copiedToken === fullToken ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                        >
                          {copiedToken === fullToken ? (
                            <><Check className="w-4 h-4 mr-1.5" /> Tersalin!</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-1.5" /> Copy Kode</>
                          )}
                        </Button>
                      ) : (
                        <div className="shrink-0 h-9 px-3 flex items-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl ring-1 ring-slate-100 cursor-not-allowed">
                          Token Tidak Berlaku
                        </div>
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
