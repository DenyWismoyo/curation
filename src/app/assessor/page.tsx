// src/app/assessor/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from "sonner";
import { 
  KeyRound, Search, CheckCircle2, Copy, Plus, 
  Loader2, ShieldCheck, Edit3, Briefcase, Settings2, Eye, LayoutGrid 
} from 'lucide-react';

import { AssessorAssessmentDetail } from '@/app/components/assessor/AssessorAssessmentDetail';
import { AssessorTemplateBuilder } from '@/app/components/assessor/AssessorTemplateBuilder';
import { AssessorTemplatePreview } from '@/app/components/assessor/AssessorTemplatePreview';

// IMPORT CUSTOM HOOK MOBILE BACK
import { useMobileBack } from '@/hooks/useMobileBack';

export default function AssessorDashboardPage() {
  const { user } = useAuth();
  const [allocation, setAllocation] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [scopeOrganizations, setScopeOrganizations] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('__all__');
  const [workspaceMode, setWorkspaceMode] = useState<'standard' | 'b2b'>('standard');
  
  // STATE BARU: Menyimpan semua modul yang diizinkan & modul yang sedang aktif
  const [allowedModules, setAllowedModules] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null); 
  
  const [loading, setLoading] = useState(true);
  
  const [generateQty, setGenerateQty] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [isCustomizingTemplate, setIsCustomizingTemplate] = useState(false); 
  const [isPreviewingTemplate, setIsPreviewingTemplate] = useState(false);
  const assessmentsUnsubscribeRef = useRef<(() => void) | null>(null);

  // ==========================================
  // MOBILE BACK HANDLERS (SWIPE)
  // ==========================================
  useMobileBack(!!selectedAssessment, () => setSelectedAssessment(null));
  useMobileBack(isCustomizingTemplate, () => setIsCustomizingTemplate(false));
  useMobileBack(isPreviewingTemplate, () => setIsPreviewingTemplate(false));

  useEffect(() => {
    if (user?.email) {
      fetchAssessorData();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (assessmentsUnsubscribeRef.current) {
        assessmentsUnsubscribeRef.current();
      }
    };
  }, []);

  const fetchAssessorData = async () => {
    setLoading(true);
    try {
      if (!user?.email) return;

      if (assessmentsUnsubscribeRef.current) {
        assessmentsUnsubscribeRef.current();
        assessmentsUnsubscribeRef.current = null;
      }

      // 1. Ambil Data Profil Asesor
      const assessorRef = doc(db, 'assessors', user.email);
      const assessorSnap = await getDoc(assessorRef);

      // 2. Ambil Data Scope B2B dari users (uid / email doc)
      const userDocByUid = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
      const userDocByEmail = await getDoc(doc(db, 'users', user.email)).catch(() => null);
      const userProfile = userDocByUid?.data() || userDocByEmail?.data() || {};

      const toStringArray = (raw: unknown): string[] => {
        if (!Array.isArray(raw)) {
          return [];
        }

        return raw.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
      };

      const mergedScopes = Array.from(new Set([
        ...toStringArray(userProfile.allowedOrganizations),
        ...toStringArray(userProfile.organizationScopes),
        ...toStringArray(userProfile.accessibleOrganizations),
      ]));

      if (!assessorSnap.exists()) {
        if (mergedScopes.length === 0) {
          setAllocation(null);
          setScopeOrganizations([]);
          setAssessments([]);
          setWorkspaceMode('standard');
          setLoading(false);
          return;
        }

        setAllocation(null);
        setScopeOrganizations(mergedScopes);
        setWorkspaceMode('b2b');

        const effectiveScopes = mergedScopes.length > 10 ? mergedScopes.slice(0, 10) : mergedScopes;
        const qAssessments = effectiveScopes.length === 1
          ? query(collection(db, 'assessments'), where('corporateEntity', '==', effectiveScopes[0]))
          : query(collection(db, 'assessments'), where('corporateEntity', 'in', effectiveScopes));

        assessmentsUnsubscribeRef.current = onSnapshot(qAssessments, (snapshot) => {
          const data: any[] = [];
          snapshot.forEach((docSnap) => {
            data.push({ id: docSnap.id, ...docSnap.data() });
          });
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAssessments(data);
        });

        if (mergedScopes.length > 10) {
          toast.warning('Scope B2B lebih dari 10 organisasi. Tampilan assessor memuat 10 organisasi pertama.');
        }

        setLoading(false);
        return;
      }

      const assessorProfile = assessorSnap.data();
      const linkedProgramName = typeof assessorProfile.programName === 'string' ? assessorProfile.programName.trim() : '';

      const effectiveScopes = Array.from(new Set([
        ...mergedScopes,
        ...(linkedProgramName ? [linkedProgramName] : []),
      ])).filter(Boolean);

      setScopeOrganizations(effectiveScopes);
      setWorkspaceMode(effectiveScopes.length > 1 || mergedScopes.length > 0 ? 'b2b' : 'standard');

      if (effectiveScopes.length > 0) {
        const limitedScopes = effectiveScopes.length > 10 ? effectiveScopes.slice(0, 10) : effectiveScopes;
        const qAssessments = limitedScopes.length === 1
          ? query(collection(db, 'assessments'), where('corporateEntity', '==', limitedScopes[0]))
          : query(collection(db, 'assessments'), where('corporateEntity', 'in', limitedScopes));

        assessmentsUnsubscribeRef.current = onSnapshot(qAssessments, (snapshot) => {
          const data: any[] = [];
          snapshot.forEach((docSnap) => {
            data.push({ id: docSnap.id, ...docSnap.data() });
          });
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAssessments(data);
        });

        if (effectiveScopes.length > 10) {
          toast.warning('Scope B2B lebih dari 10 organisasi. Tampilan assessor memuat 10 organisasi pertama.');
        }
      }

      // 3. Ambil Token berdasarkan Program Kemitraan Asesor (mode klasik)
      const qTokens = query(
        collection(db, 'corporate_tokens'), 
        where('corporateName', '==', linkedProgramName)
      );
      const snapTokens = await getDocs(qTokens);
      
      if (!snapTokens.empty) {
        const docData = snapTokens.docs[0];
        const allocationData = { id: docData.id, ...docData.data(), assessorName: assessorProfile.assessorName } as any;
        setAllocation(allocationData);

        // 3. Ambil SELURUH Modul yang diizinkan untuk Program ini
        if (allocationData.allowedTemplates && allocationData.allowedTemplates.length > 0) {
          // Memecah array ID menjadi chunk isi 10 untuk query 'in' Firestore
          const chunks = [];
          for (let i = 0; i < allocationData.allowedTemplates.length; i += 10) {
            chunks.push(allocationData.allowedTemplates.slice(i, i + 10));
          }

          let fetchedModules: any[] = [];
          for (const chunk of chunks) {
            const qTpls = query(collection(db, 'form_templates'), where('__name__', 'in', chunk));
            const snapTpls = await getDocs(qTpls);
            snapTpls.forEach(t => fetchedModules.push({ id: t.id, ...t.data() }));
          }

          setAllowedModules(fetchedModules);
          // Set template pertama sebagai yang aktif secara default
          if (fetchedModules.length > 0) {
            setActiveTemplate(fetchedModules[0]);
          }
        }

        setLoading(false);
        return;
      } else {
        setAllocation(null);
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
        let randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        while(newTokens[randomStr]) {
            randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
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

  if (!allocation && scopeOrganizations.length === 0) {
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

  const generatedTokensArray = Object.entries(allocation?.tokens || {}).reverse();
  const currentGeneratedCount = generatedTokensArray.length;

  const scopedAssessments = selectedOrganization === '__all__'
    ? assessments
    : assessments.filter((item) => (item.corporateEntity || '') === selectedOrganization);

  const filteredAssessments = scopedAssessments.filter(a => 
    a.namaUsaha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER INFO */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Asesor: {allocation.assessorName}
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{allocation.corporateName}</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
            Kelola tata usaha penilaian, distribusikan token ke peserta, dan koreksi hasil evaluasi secara manual.
          </p>
          {workspaceMode === 'b2b' && (
            <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest ring-1 ring-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" /> Workspace B2B Mode
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          
          {/* DROPDOWN PEMILIH MODUL (Hanya muncul jika lebih dari 1 modul) */}
          {allowedModules.length > 0 && (
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutGrid size={12} /> Pilih Modul Aktif
              </label>
              <select 
                value={activeTemplate?.id || ''}
                onChange={(e) => setActiveTemplate(allowedModules.find(m => m.id === e.target.value))}
                className="h-[50px] w-full sm:w-[220px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {allowedModules.map((mod: any) => (
                  <option key={mod.id} value={mod.id}>{mod.trackName}</option>
                ))}
              </select>
            </div>
          )}

          {/* TOMBOL KONTROL MODUL AI */}
          {activeTemplate && (
             <div className="flex gap-2">
               <Button 
                 onClick={() => setIsPreviewingTemplate(true)}
                 variant="outline"
                 className="h-[50px] px-5 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold flex items-center gap-2 shadow-sm"
               >
                 <Eye className="w-4 h-4"/>
                 <span className="text-[10px] uppercase tracking-widest mt-0.5">Preview Form</span>
               </Button>
               <Button 
                 onClick={() => setIsCustomizingTemplate(true)}
                 variant="outline"
                 className="h-[50px] px-5 rounded-2xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-2 shadow-sm"
               >
                 <Settings2 className="w-4 h-4"/>
                 <span className="text-[10px] uppercase tracking-widest mt-0.5">Sesuaikan Modul</span>
               </Button>
             </div>
          )}
          
          <div className="bg-white px-5 py-2 rounded-2xl ring-1 ring-slate-200 shadow-sm flex flex-col justify-center items-center h-[50px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sisa Kuota</p>
            <p className="text-base font-black text-emerald-600 leading-tight">{allocation.totalTokens - currentGeneratedCount} <span className="text-xs text-slate-500 font-bold">Lembar</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: GENERATOR TOKEN */}
        <div className="lg:col-span-1 space-y-6">
          {allocation ? (
            <>
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
                  {generatedTokensArray.map(([code, data]: any) => {
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
            </>
          ) : (
            <Card className="p-6 bg-indigo-50/70 rounded-3xl border-none ring-1 ring-indigo-200 shadow-sm">
              <h3 className="text-sm font-black text-indigo-800 mb-2">Mode Penilaian B2B Aktif</h3>
              <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                Akun Anda tidak memakai kuota token assessor klasik, tetapi tetap dapat menilai member B2B berdasarkan organization scopes yang diberikan admin.
              </p>
            </Card>
          )}
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
              <div className="flex w-full sm:w-auto gap-2">
                {scopeOrganizations.length > 1 && (
                  <select
                    value={selectedOrganization}
                    onChange={(e) => setSelectedOrganization(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
                  >
                    <option value="__all__">Semua Organisasi</option>
                    {scopeOrganizations.map((org) => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                )}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari..." className="pl-9 bg-slate-50" />
                </div>
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
                  {filteredAssessments.map(item => {
                    const isFinalized = item.status === 'Curator_Validated';
                    const isDraft = item.status === 'Curator_Draft' || (!isFinalized && item.curatorAssessment !== undefined);
                    const skorAkhir = item.aiResult?.totalScore || item.score || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-900 text-base mb-0.5">{item.namaUsaha}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.email}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-sm ring-1 ${isFinalized ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                            {item.curatorAssessment?.verifiedScore || skorAkhir}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button 
                            onClick={() => setSelectedAssessment(item)} 
                            variant={isFinalized ? "outline" : "default"} 
                            className={`h-9 px-4 rounded-xl font-bold text-xs shadow-sm ${isFinalized ? 'border-slate-200 text-slate-700' : isDraft ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                          >
                            {isFinalized ? <><Eye className="w-3.5 h-3.5 mr-1.5" /> Lihat Hasil</> : <><Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit & Cetak</>}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL EDITOR MANUAL PESERTA (MENGGUNAKAN UNIVERSAL VIEW BARU) */}
      {selectedAssessment && (
        <AssessorAssessmentDetail 
          data={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onSaveSuccess={() => {
            setSelectedAssessment(null);
            fetchAssessorData();
          }}
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

      {/* MODAL PREVIEW FORM ASESOR */}
      {isPreviewingTemplate && activeTemplate && (
        <AssessorTemplatePreview
          template={activeTemplate}
          onClose={() => setIsPreviewingTemplate(false)}
        />
      )}
    </div>
  );
}