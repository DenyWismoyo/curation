// src/app/assessor/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from "sonner";
import { 
  Users, KeyRound, Search, CheckCircle2, Copy, Plus, 
  Loader2, ShieldCheck, Edit3, Briefcase, FileSignature, Settings2, Eye
} from 'lucide-react';

import { AssessorManualEditor } from '@/app/components/assessor/AssessorManualEditor';
import { AssessorTemplateBuilder } from '@/app/components/assessor/AssessorTemplateBuilder';
// IMPORT KOMPONEN PREVIEW YANG BARU
import { AssessorTemplatePreview } from '@/app/components/assessor/AssessorTemplatePreview';

interface AssessorAllocation {
  id: string; 
  corporateName: string;
  totalTokens: number;
  usedCount: number;
  allowedTemplates: string[];
  tokens: Record<string, { isUsed: boolean; usedAt: string | null; usedByNamaUsaha: string | null }>;
}

export default function AssessorDashboardPage() {
  const { user } = useAuth();
  const [allocation, setAllocation] = useState<AssessorAllocation | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  
  const [generateQty, setGenerateQty] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  
  const [isCustomizingTemplate, setIsCustomizingTemplate] = useState(false); 
  // STATE BARU UNTUK PREVIEW
  const [isPreviewingTemplate, setIsPreviewingTemplate] = useState(false);

  useEffect(() => {
    if (user?.email) {
      fetchAssessorData();
    }
  }, [user]);

  const fetchAssessorData = async () => {
    setLoading(true);
    try {
      const qTokens = query(
        collection(db, 'corporate_tokens'), 
        where('assessorEmail', '==', user?.email),
        where('isAssessorControlled', '==', true)
      );
      const snapTokens = await getDocs(qTokens);
      
      if (!snapTokens.empty) {
        const docData = snapTokens.docs[0];
        const allocationData = { id: docData.id, ...docData.data() } as AssessorAllocation;
        setAllocation(allocationData);

        if (allocationData.allowedTemplates && allocationData.allowedTemplates.length > 0) {
          const templateRef = doc(db, 'form_templates', allocationData.allowedTemplates[0]);
          const templateSnap = await getDoc(templateRef);
          if (templateSnap.exists()) {
            setActiveTemplate({ id: templateSnap.id, ...templateSnap.data() });
          }
        }

        const qAssessments = query(
          collection(db, 'assessments'),
          where('corporateEntity', '==', allocationData.corporateName)
        );

        const unsubscribe = onSnapshot(qAssessments, (snapshot) => {
          const data: any[] = [];
          snapshot.forEach((docSnap) => {
            data.push({ id: docSnap.id, ...docSnap.data() });
          });
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAssessments(data);
        });

        setLoading(false);
        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal menarik data dari server.");
      setLoading(false);
    }
  };

  const handleGenerateTokens = async () => {
    if (!allocation) return;
    
    const currentGenerated = Object.keys(allocation.tokens || {}).length;
    const remainingQuota = allocation.totalTokens - currentGenerated;

    if (generateQty < 1) return toast.warning("Jumlah minimal pembuatan adalah 1 token.");
    if (generateQty > remainingQuota) {
      return toast.warning(`Sisa kuota pembuatan token Anda hanya tinggal ${remainingQuota}.`);
    }

    setIsGenerating(true);
    try {
      const newTokens = { ...(allocation.tokens || {}) };
      for (let i = 0; i < generateQty; i++) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        newTokens[randomStr] = { isUsed: false, usedAt: null, usedByNamaUsaha: null };
      }

      await updateDoc(doc(db, 'corporate_tokens', allocation.id), {
        tokens: newTokens
      });

      setAllocation({ ...allocation, tokens: newTokens });
      toast.success(`${generateQty} Token Kode Akses berhasil dibuat!`);
      setGenerateQty(1);
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat token.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToken = (fullToken: string) => {
    navigator.clipboard.writeText(fullToken);
    setCopiedToken(fullToken);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Kode akses berhasil disalin.");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600" />
        <p className="font-bold tracking-widest text-xs uppercase">Menyiapkan Ruang Kerja...</p>
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 opacity-30 text-slate-400" />
        <h2 className="text-xl font-black text-slate-700">Akses Belum Dialokasikan</h2>
        <p className="font-medium text-sm max-w-md">
          Email Anda ({user?.email}) belum memiliki hak alokasi kuota sebagai Asesor. Silakan hubungi Administrator sistem untuk mendaftarkan akun Anda.
        </p>
      </div>
    );
  }

  const generatedTokensArray = Object.entries(allocation.tokens || {}).reverse();
  const currentGeneratedCount = generatedTokensArray.length;
  
  const filteredAssessments = assessments.filter(a => 
    a.namaUsaha?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER INFO */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ruang Kerja Asesor</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{allocation.corporateName}</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
            Kelola tata usaha penilaian, distribusikan token ke peserta, dan koreksi hasil evaluasi secara manual.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* TOMBOL KONTROL MODUL AI */}
          {activeTemplate && (
             <div className="flex gap-2">
               <Button 
                 onClick={() => setIsPreviewingTemplate(true)}
                 variant="outline"
                 className="h-auto py-3 px-5 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold flex flex-col items-center gap-1 shadow-sm"
               >
                 <Eye className="w-5 h-5"/>
                 <span className="text-[10px] uppercase tracking-widest">Preview Form</span>
               </Button>
               <Button 
                 onClick={() => setIsCustomizingTemplate(true)}
                 variant="outline"
                 className="h-auto py-3 px-5 rounded-2xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold flex flex-col items-center gap-1 shadow-sm"
               >
                 <Settings2 className="w-5 h-5"/>
                 <span className="text-[10px] uppercase tracking-widest">Sesuaikan Modul</span>
               </Button>
             </div>
          )}
          
          <div className="bg-white p-3 px-5 rounded-2xl ring-1 ring-slate-200 shadow-sm text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sisa Kuota</p>
            <p className="text-xl font-black text-emerald-600">{allocation.totalTokens - currentGeneratedCount} <span className="text-sm text-slate-500">Lembar</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: GENERATOR TOKEN */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" /> Distribusi Token Baru
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-5">
              Cetak token dan bagikan kode ini kepada peserta Anda agar mereka bisa mengakses form evaluasi.
            </p>
            
            <div className="flex gap-3 mb-2">
              <Input 
                type="number" 
                value={generateQty} 
                onChange={e => setGenerateQty(Number(e.target.value))} 
                min={1} 
                max={allocation.totalTokens - currentGeneratedCount}
                className="h-11 bg-slate-50 font-bold" 
              />
              <Button 
                onClick={handleGenerateTokens} 
                disabled={isGenerating || (allocation.totalTokens - currentGeneratedCount) <= 0}
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Buat Token
              </Button>
            </div>
          </Card>

          <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Daftar Kode Akses</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {generatedTokensArray.map(([code, data]) => {
                const fullToken = `${allocation.id}-${code}`;
                return (
                  <div key={code} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-black text-slate-800 font-mono tracking-wide">{fullToken}</code>
                      {!data.isUsed ? (
                        <button onClick={() => handleCopyToken(fullToken)} className="text-slate-400 hover:text-emerald-600"><Copy className="w-4 h-4" /></button>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Terpakai</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* KOLOM KANAN: DAFTAR PESERTA */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
             <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" /> Hasil Pengisian Pendaftar
                </h3>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari..." className="pl-9 bg-slate-50" />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto w-full custom-scrollbar">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Identitas Peserta</th>
                    <th className="px-6 py-4 text-center">Skor Akhir</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAssessments.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 text-base">{item.namaUsaha}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{item.email}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-sm ring-1 bg-slate-100">{item.curatorAssessment?.verifiedScore || item.score || 0}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button onClick={() => setSelectedAssessment(item)} variant="outline" className="h-9 px-4 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs">
                          Edit Manual &amp; Cetak
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL EDITOR MANUAL PESERTA */}
      {selectedAssessment && (
        <AssessorManualEditor 
          data={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onSaveSuccess={() => setSelectedAssessment(null)}
        />
      )}

      {/* MODAL BUILDER TEMPLATE ASESOR */}
      {isCustomizingTemplate && activeTemplate && (
        <AssessorTemplateBuilder
          templateData={activeTemplate}
          allocationId={allocation.id}
          assessorEmail={user?.email || ''}
          onClose={() => setIsCustomizingTemplate(false)}
          onSaveSuccess={() => {
            setIsCustomizingTemplate(false);
            fetchAssessorData();
          }}
        />
      )}

      {/* MODAL PREVIEW FORM ASESOR (BARU DITAMBAHKAN) */}
      {isPreviewingTemplate && activeTemplate && (
        <AssessorTemplatePreview
          template={activeTemplate}
          onClose={() => setIsPreviewingTemplate(false)}
        />
      )}
    </div>
  );
}