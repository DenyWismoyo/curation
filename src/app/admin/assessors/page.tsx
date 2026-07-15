// src/app/admin/assessors/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from "sonner";
import { 
  UserCheck, Plus, Trash2, Mail, ShieldAlert, Loader2, FormInput, 
  Layers, KeyRound, CheckCircle2, User
} from 'lucide-react';

interface AssessorAllocation {
  id: string; // Prefix ID Kemitraan
  corporateName: string; // Nama Instansi/Asesor
  assessorEmail: string; // Kunci Identitas Asesor
  modelType: 'flash' | 'pro';
  totalTokens: number; // Jumlah total Kuota Form
  usedCount: number;
  createdAt: string;
  allowedTemplates: string[]; // Form yang diizinkan untuk dikelola
  isAssessorControlled: boolean; // Flag pembeda dari corporate token biasa
}

interface FormTemplateLight {
  id: string;
  trackName: string;
  isActive: boolean;
}

export default function AdminAssessorManagerPage() {
  const [allocations, setAllocations] = useState<AssessorAllocation[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<FormTemplateLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [assessorName, setAssessorName] = useState('');
  const [assessorEmail, setAssessorEmail] = useState('');
  const [prefixId, setPrefixId] = useState('');
  const [quota, setQuota] = useState<number>(20);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Ambil template form yang aktif saja
      const snapTemplates = await getDocs(query(collection(db, 'form_templates')));
      const activeTpls = snapTemplates.docs
        .map(d => ({ id: d.id, trackName: d.data().trackName, isActive: d.data().isActive } as FormTemplateLight))
        .filter(t => t.isActive);
      setAvailableTemplates(activeTpls);

      // 2. Ambil token korporasi yang bertipe kontrol Asesor
      const snapAllocations = await getDocs(query(collection(db, 'corporate_tokens'), orderBy('createdAt', 'desc')));
      const filteredAllocations: AssessorAllocation[] = [];
      
      snapAllocations.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isAssessorControlled) {
          filteredAllocations.push({ id: docSnap.id, ...data } as AssessorAllocation);
        }
      });
      
      setAllocations(filteredAllocations);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyinkronkan data dari server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAssessor = async () => {
    const cleanPrefix = prefixId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanEmail = assessorEmail.trim().toLowerCase();

    if (!assessorName.trim()) return toast.warning("Nama Asesor / Instansi wajib diisi.");
    if (!cleanEmail) return toast.warning("Email akun Google Asesor wajib diisi.");
    if (cleanPrefix.length < 3) return toast.warning("Prefix minimal harus 3 karakter (contoh: ASR01).");
    if (!selectedTemplate) return toast.warning("Pilih salah satu modul form untuk dialokasikan.");
    if (quota < 1) return toast.warning("Kuota pengisian minimal bernilai 1.");

    // Cek apakah prefix sudah digunakan
    if (allocations.find(a => a.id === cleanPrefix)) {
      return toast.error("Prefix unik ini sudah terpakai. Gunakan variasi lain.");
    }

    setIsSubmitting(true);
    try {
      const allocationData = {
        corporateName: assessorName.trim(),
        assessorEmail: cleanEmail,
        modelType,
        totalTokens: Number(quota),
        usedCount: 0,
        createdAt: new Date().toISOString(),
        allowedTemplates: [selectedTemplate],
        isAssessorControlled: true, // Marker krusial untuk filter di dashboard asesor
        tokens: {} // Token detail akan di-generate mandiri oleh asesor di fasenya
      };

      // Simpan alokasi hak ke basis data
      await setDoc(doc(db, 'corporate_tokens', cleanPrefix), allocationData);
      
      // Update role pengguna di database secara otomatis jika diperlukan (opsional berbasis preferensi sistem Anda)
      await setDoc(doc(db, 'users', cleanEmail), {
        email: cleanEmail,
        role: 'assessor',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success(`Sukses memberikan kuota form ke Asesor ${cleanEmail}!`);
      
      // Reset Form input
      setAssessorName('');
      setAssessorEmail('');
      setPrefixId('');
      setSelectedTemplate('');
      setQuota(20);
      
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan alokasi kemitraan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAssessor = async (id: string, email: string) => {
    if (!confirm(`Cabut seluruh hak akses & sisa kuota untuk Asesor (${email})? Tindakan ini menghapus registrasi token terkait.`)) return;

    try {
      await deleteDoc(doc(db, 'corporate_tokens', id));
      
      // Kembalikan role user menjadi user biasa
      await setDoc(doc(db, 'users', email), {
        role: 'user',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success("Hak kemitraan asesor berhasil dicabut.");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Gagal mencabut hak akses.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-indigo-600" /> Kemitraan &amp; Manajemen Asesor
        </h1>
        <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
          Daftarkan email asesor eksternal, alokasikan kuota form penilaian secara eksklusif, dan tentukan engine komputasi AI yang digunakan.
        </p>
      </div>

      {/* Form Registrasi Baru */}
      <Card className="p-6 sm:p-8 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex flex-col gap-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600"/> Alokasi Hak Akses Asesor Baru
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> Nama Lengkap Asesor / Instansi</label>
            <Input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="Misal: Dr. Budi Santoso (Solo Techno Park)" className="h-12 rounded-xl bg-slate-50 font-semibold" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Mail className="w-3 h-3"/> Email Akun Google Asesor (Wajib Valid)</label>
            <Input type="email" value={assessorEmail} onChange={e => setAssessorEmail(e.target.value)} placeholder="budisantoso@gmail.com" className="h-12 rounded-xl bg-slate-50 font-mono font-bold" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><FormInput className="w-3 h-3"/> Pilih Modul Form Penilaian</label>
            <select 
              value={selectedTemplate} 
              onChange={e => setSelectedTemplate(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <option value="" disabled>-- Pilih Modul Form Aktif --</option>
              {availableTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.trackName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><KeyRound className="w-3 h-3"/> Prefix Kode (Unik)</label>
              <Input value={prefixId} onChange={e => setPrefixId(e.target.value)} maxLength={8} placeholder="SOLO01" className="h-12 rounded-xl bg-slate-50 uppercase font-mono font-black tracking-wider" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Layers className="w-3 h-3"/> Total Kuota Form</label>
              <Input type="number" value={quota} onChange={e => setQuota(Number(e.target.value))} min={1} max={1000} className="h-12 rounded-xl bg-slate-50 font-bold" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-4 border-t border-slate-100">
          <div className="space-y-2 w-full md:w-auto">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tingkat Ketajaman Intelijen (Engine AI)</label>
            <div className="flex gap-3">
              <button onClick={() => setModelType('flash')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all h-10 ${modelType === 'flash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>AI Flash (Standard)</button>
              <button onClick={() => setModelType('pro')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all h-10 ${modelType === 'pro' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'}`}>AI Pro (Premium)</button>
            </div>
          </div>
          
          <Button onClick={handleRegisterAssessor} disabled={isSubmitting} className="w-full sm:w-auto bg-slate-900 hover:bg-indigo-600 text-white font-bold h-12 px-8 rounded-xl shadow-md transition-all">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <UserCheck className="w-4 h-4 mr-2"/>}
            Daftarkan Asesor &amp; Alokasikan
          </Button>
        </div>
      </Card>

      {/* Tabel Pemantauan Kemitraan */}
      <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Daftar Aktif Mitra Asesor</h3>
          <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600">{allocations.length} Asesor Terdaftar</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 font-medium flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600"/> Memuat basis data mitra...
          </div>
        ) : allocations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium space-y-2">
            <ShieldAlert className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">Belum ada Mitra Asesor terdaftar.</p>
            <p className="text-xs text-slate-400">Gunakan formulir di atas untuk mendaftarkan mitra pertama Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Asesor &amp; Instansi</th>
                  <th className="px-6 py-4">Email Akun</th>
                  <th className="px-6 py-4">Prefix Token</th>
                  <th className="px-6 py-4">Modul Form Terkunci</th>
                  <th className="px-6 py-4 text-center">Kuota Terpakai</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {allocations.map(item => {
                  const targetFormName = availableTemplates.find(t => t.id === item.allowedTemplates?.[0])?.trackName || 'Modul Khusus / Telah Dihapus';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-base">{item.corporateName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Dialokasikan: {new Date(item.createdAt).toLocaleDateString('id-ID')}</p>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-600">{item.assessorEmail}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">{item.id}-******</span>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                          {targetFormName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-slate-800 text-base">{item.usedCount} <span className="text-slate-300 text-xs">/ {item.totalTokens}</span></span>
                          <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden relative">
                            <div className="absolute h-full bg-indigo-600" style={{ width: `${Math.min(((item.usedCount || 0) / item.totalTokens) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button 
                          onClick={() => handleRevokeAssessor(item.id, item.assessorEmail)}
                          variant="ghost" 
                          className="text-rose-500 hover:bg-rose-50 h-9 w-9 p-0 rounded-xl"
                          title="Cabut Hak Asesor"
                        >
                          <Trash2 className="w-4 h-4" />
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