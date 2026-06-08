// src/app/admin/tokens/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { KeyRound, Download, Plus, Building2, Users, Sparkles, Zap } from 'lucide-react';
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
  const [corpId, setCorpId] = useState(''); // Prefix
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash'); // State Tipe AI

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
      
      // Generate object JSON berisi ribuan token di memori klien
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
        modelType, // Simpan tipe AI (flash / pro) ke database
        totalTokens: qty,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        tokens: newTokens
      };

      // Simpan seluruh batch dalam 1x Write ke Firestore
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
        `${batchId}-${code}`, // Format Token Gabungan
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
          <Link href="/admin"><Button variant="outline" className="rounded-xl">Kembali ke Dasbor</Button></Link>
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
            <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3">
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
                    <th className="px-6 py-5 text-center">Aksi (Ekspor)</th>
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
                            <p className="text-[11px] text-slate-400 mt-0.5">{new Date(batch.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
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
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{width: `${((batch.usedCount || 0)/batch.totalTokens)*100}%`}}></div>
                          </div>
                        </div>
                      </td>
<td className="px-6 py-5 text-center">
  <div className="flex items-center justify-center gap-2">
    <Button 
      onClick={() => exportTokensToCSV(batch.id, batch)} 
      variant="outline" 
      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl h-9 px-3 shadow-sm"
    >
      <Download className="w-4 h-4 sm:mr-1.5" /> 
      <span className="hidden sm:inline">CSV Data</span>
    </Button>
    
    {/* INJEKSI KOMPONEN EXPORT PDF DISINI */}
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
    </div>
  );
}