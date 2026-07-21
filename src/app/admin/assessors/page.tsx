// src/app/admin/assessors/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, Plus, Trash2, Mail, ShieldAlert, Loader2, 
  FolderOpen, Edit3, X, User
} from 'lucide-react';

// === INTERFACES ===
interface CorporateBatch {
  id: string; // Prefix Token
  corporateName: string; // Program Name
  totalTokens: number;
  usedCount: number;
  allowedTemplates: string[];
}

interface AssessorData {
  id: string; // Menggunakan Email sebagai Document ID
  assessorName: string;
  assessorEmail: string;
  programName: string;
  createdAt: string;
}

interface FormTemplateLight {
  id: string;
  trackName: string;
  isActive: boolean;
}

export default function AdminAssessorManagerPage() {
  const [assessors, setAssessors] = useState<AssessorData[]>([]);
  const [programs, setPrograms] = useState<CorporateBatch[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<FormTemplateLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === FORM CREATE STATE ===
  const [assessorName, setAssessorName] = useState('');
  const [assessorEmail, setAssessorEmail] = useState('');
  const [programName, setProgramName] = useState(''); 

  // === FORM EDIT STATE ===
  const [editingAssessor, setEditingAssessor] = useState<AssessorData | null>(null);
  const [editName, setEditName] = useState('');
  const [editProgram, setEditProgram] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Semua Template Form (Untuk menerjemahkan ID Modul ke Nama Modul)
      const snapTemplates = await getDocs(query(collection(db, 'form_templates')));
      const activeTpls = snapTemplates.docs
        .map(d => ({ id: d.id, trackName: d.data().trackName, isActive: d.data().isActive } as FormTemplateLight))
        .filter(t => t.isActive);
      setAvailableTemplates(activeTpls);

      // 2. Ambil Semua Program Kemitraan (Dari Token Page)
      const snapTokens = await getDocs(query(collection(db, 'corporate_tokens'), orderBy('createdAt', 'desc')));
      const progs: CorporateBatch[] = [];
      snapTokens.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.isAssessorControlled) { // Hanya ambil batch reguler
          progs.push({
            id: docSnap.id,
            corporateName: data.corporateName,
            totalTokens: data.totalTokens || 0,
            usedCount: data.usedCount || 0,
            allowedTemplates: data.allowedTemplates || [],
          });
        }
      });
      setPrograms(progs);

      // 3. Ambil Daftar Asesor
      const snapAssessors = await getDocs(query(collection(db, 'assessors'), orderBy('createdAt', 'desc')));
      const assData: AssessorData[] = [];
      snapAssessors.forEach(docSnap => {
         assData.push({ id: docSnap.id, ...docSnap.data() } as AssessorData);
      });
      setAssessors(assData);

    } catch (error) {
      console.error(error);
      toast.error("Gagal menyinkronkan data dari server.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLER CREATE: REGISTER ASESOR BARU
  // ==========================================
  const handleRegisterAssessor = async () => {
    const cleanEmail = assessorEmail.trim().toLowerCase();

    if (!programName.trim()) return toast.warning("Program Kemitraan (dari Token Page) wajib dipilih.");
    if (!assessorName.trim()) return toast.warning("Nama Asesor / Instansi wajib diisi.");
    if (!cleanEmail) return toast.warning("Email akun Google Asesor wajib diisi.");
    
    // Cek apakah email sudah didaftarkan
    if (assessors.find(a => a.id === cleanEmail)) {
      return toast.error("Email ini sudah terdaftar sebagai Asesor.");
    }

    setIsSubmitting(true);
    try {
      const assessorData = {
        assessorName: assessorName.trim(),
        assessorEmail: cleanEmail,
        programName: programName.trim(), 
        createdAt: new Date().toISOString()
      };

      // 1. Simpan Data Asesor ke Collection Baru
      await setDoc(doc(db, 'assessors', cleanEmail), assessorData);
      
      // 2. Daftarkan/Otorisasi Akun Google di Collection Users
      await setDoc(doc(db, 'users', cleanEmail), {
        email: cleanEmail,
        role: 'assessor',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success(`Akun Asesor ${cleanEmail} berhasil didaftarkan!`);
      
      // Reset Form input
      setAssessorName('');
      setAssessorEmail('');
      setProgramName('');
      
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan pendaftaran asesor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLER UPDATE: EDIT PROFIL ASESOR
  // ==========================================
  const handleUpdateAssessor = async () => {
    if (!editingAssessor) return;
    
    if (!editProgram.trim()) return toast.warning("Program Kemitraan wajib dipilih.");
    if (!editName.trim()) return toast.warning("Nama Asesor wajib diisi.");

    setIsUpdating(true);
    try {
      const ref = doc(db, 'assessors', editingAssessor.id);
      
      await updateDoc(ref, {
        assessorName: editName.trim(),
        programName: editProgram.trim()
      });

      setAssessors(prev => prev.map(a => a.id === editingAssessor.id ? {
        ...a,
        assessorName: editName.trim(),
        programName: editProgram.trim()
      } : a));

      toast.success("Profil Asesor berhasil diperbarui!");
      setEditingAssessor(null);
    } catch (error) {
      console.error("Gagal update asesor:", error);
      toast.error("Terjadi kesalahan saat memperbarui data asesor.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ==========================================
  // HANDLER DELETE: CABUT HAK ASESOR
  // ==========================================
  const handleRevokeAssessor = async (id: string, email: string) => {
    if (!confirm(`Cabut seluruh hak akses Asesor (${email})? Mereka tidak akan bisa masuk ke dashboard asesor lagi.`)) return;
    
    try {
      await deleteDoc(doc(db, 'assessors', id));
      
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

  // Trigger Open Edit Modal
  const openEditModal = (item: AssessorData) => {
    setEditingAssessor(item);
    setEditName(item.assessorName);
    setEditProgram(item.programName || '');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-indigo-600" /> Kemitraan &amp; Manajemen Asesor
        </h1>
        <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
          Daftarkan email asesor eksternal, alokasikan kuota form penilaian secara eksklusif, dan sinkronkan dengan program pada Token Page.
        </p>
      </div>

      {/* ========================================== */}
      {/* FORM REGISTRASI CREATE BARU */}
      {/* ========================================== */}
      <Card className="p-6 sm:p-8 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex flex-col gap-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600"/> Pembuatan Akun & Alokasi Asesor Baru
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <FolderOpen className="w-3 h-3"/> Program Kemitraan (Dari Token)
            </label>
            <select 
              value={programName} 
              onChange={e => setProgramName(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <option value="" disabled>-- Pilih Program Kemitraan --</option>
              {programs.length === 0 && <option value="" disabled>Belum ada program di Token Page</option>}
              {programs.map(p => (
                <option key={p.id} value={p.corporateName}>{p.corporateName}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> Nama Asesor / Instansi</label>
            <Input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="Cth: Dr. Budi Santoso" className="h-12 rounded-xl bg-slate-50 font-semibold" />
          </div>
          
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Mail className="w-3 h-3"/> Akun Google Asesor (Wajib)</label>
            <Input type="email" value={assessorEmail} onChange={e => setAssessorEmail(e.target.value)} placeholder="budi@gmail.com" className="h-12 rounded-xl bg-slate-50 font-mono font-bold" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={handleRegisterAssessor} disabled={isSubmitting} className="w-full sm:w-auto bg-slate-900 hover:bg-indigo-600 text-white font-bold h-12 px-8 rounded-xl shadow-md transition-all">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <UserCheck className="w-4 h-4 mr-2"/>}
            Daftarkan Akun &amp; Alokasikan
          </Button>
        </div>
      </Card>

      {/* ========================================== */}
      {/* TABEL PEMANTAUAN DATA ASESOR */}
      {/* ========================================== */}
      <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Daftar Aktif Mitra Asesor</h3>
          <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600">{assessors.length} Asesor Terdaftar</span>
        </div>
        
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-medium flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600"/> Memuat basis data mitra...
          </div>
        ) : assessors.length === 0 ? (
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
                  <th className="px-6 py-4">Program Kemitraan</th>
                  <th className="px-6 py-4">Modul Terkunci & Token</th>
                  <th className="px-6 py-4 text-center">Kuota Program Terpakai</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {assessors.map(item => {
                  const matchedProgram = programs.find(p => p.corporateName === item.programName);
                  
                  // Menerjemahkan ID Template menjadi Nama Track
                  const templateNames = matchedProgram?.allowedTemplates?.map(id => {
                    return availableTemplates.find(t => t.id === id)?.trackName || 'Modul Dihapus';
                  }).join(', ') || 'Semua Modul (Akses Penuh)';
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-base">{item.assessorName}</p>
                        <p className="text-[10px] font-mono text-slate-500 font-medium flex items-center gap-1.5 mt-0.5"><Mail size={10} />{item.assessorEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100">
                          {item.programName || 'Tanpa Program'}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate">
                        <span className="block font-medium text-slate-700 text-xs mb-1 truncate" title={templateNames}>
                          {matchedProgram ? templateNames : <span className="text-rose-500">Program Tidak Ditemukan</span>}
                        </span>
                        {matchedProgram && (
                          <span className="font-mono font-black text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] mt-1 inline-block">Prefix: {matchedProgram.id}-***</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {matchedProgram ? (
                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-800 text-base">{matchedProgram.usedCount} <span className="text-slate-300 text-xs">/ {matchedProgram.totalTokens}</span></span>
                            <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden relative">
                              <div className="absolute h-full bg-emerald-500" style={{ width: `${Math.min(((matchedProgram.usedCount || 0) / matchedProgram.totalTokens) * 100, 100)}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 font-medium text-xs">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            onClick={() => openEditModal(item)}
                            variant="ghost" 
                            className="text-amber-600 bg-amber-50 hover:bg-amber-100 h-9 px-3 rounded-xl font-bold flex items-center gap-1.5"
                            title="Edit Data Asesor"
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleRevokeAssessor(item.id, item.assessorEmail)}
                            variant="ghost" 
                            className="text-rose-500 bg-rose-50 hover:bg-rose-100 h-9 w-9 p-0 rounded-xl"
                            title="Cabut Hak Asesor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================== */}
      {/* MODAL UPDATE / EDIT ASESOR */}
      {/* ========================================== */}
      <AnimatePresence>
        {editingAssessor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl flex flex-col ring-1 ring-slate-200 overflow-hidden relative"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-amber-500" /> Edit Data Asesor
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Akun Terkait: <span className="text-indigo-600">{editingAssessor.assessorEmail}</span></p>
                </div>
                <button onClick={() => setEditingAssessor(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nama Asesor / Instansi</label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 bg-white rounded-xl focus-visible:ring-indigo-500" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Pindah Program Kemitraan</label>
                    <select 
                      value={editProgram} 
                      onChange={e => setEditProgram(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                    >
                      {programs.map(p => (
                        <option key={p.id} value={p.corporateName}>{p.corporateName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
                  <div className="shrink-0 mt-0.5"><ShieldAlert className="w-5 h-5 text-amber-500" /></div>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Pengaturan modul, prefix, dan sisa kuota sepenuhnya bergantung pada Program Kemitraan yang dipilih di atas. Anda dapat mengubah kuota melalui menu <b>Akses & Kuota Token</b>.
                  </p>
                </div>

              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" onClick={() => setEditingAssessor(null)} className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100">Batal</Button>
                <Button
                  onClick={handleUpdateAssessor}
                  disabled={isUpdating}
                  className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                >
                  {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}