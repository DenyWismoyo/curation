// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, Users, Activity, Target, FolderOpen,
  ArrowRight, CheckCircle2, Clock, Edit3, Building2, ChevronLeft, Briefcase
} from 'lucide-react';
import { AdminAssessmentDetail } from '@/app/components/admin/AdminAssessmentDetail';

export interface AssessmentDoc {
  id: string;
  trackType: string;
  namaUsaha: string;
  email: string;
  whatsapp: string;
  score: number;
  readinessLevel: string;
  formData: any;
  aiResult: any;
  createdAt: string;
  status?: string;
  corporateEntity?: string;
  curatorAssessment?: any;
}

// ==========================================
// KONTEN UTAMA DASHBOARD
// ==========================================
function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Membaca status folder aktif langsung dari URL (Browser History)
  const activeProgramFolder = searchParams.get('folder');

  const [assessments, setAssessments] = useState<AssessmentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<AssessmentDoc | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'assessments'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: AssessmentDoc[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        let dateStr = new Date().toISOString();
        if (item.createdAt && typeof item.createdAt.toDate === 'function') {
          dateStr = item.createdAt.toDate().toISOString();
        } else if (item.createdAt) {
          dateStr = new Date(item.createdAt).toISOString();
        }
        data.push({ id: doc.id, ...item, createdAt: dateStr } as AssessmentDoc);
      });
      setAssessments(data);
      setLoading(false);
    }, (error) => {
      console.error("Gagal menarik data admin:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- LOGIC GROUPING FOLDER ---
  const groupedPrograms = useMemo(() => {
    const groups: Record<string, AssessmentDoc[]> = {};
    
    assessments.forEach(item => {
      const programName = item.corporateEntity || 'Program Umum (Publik)';
      if (!groups[programName]) {
        groups[programName] = [];
      }
      groups[programName].push(item);
    });
    
    return groups;
  }, [assessments]);

  // Data untuk tabel di dalam Folder Aktif
  const filteredTableData = useMemo(() => {
    if (!activeProgramFolder) return [];
    const programData = groupedPrograms[activeProgramFolder] || [];
    
    return programData.filter(item => 
      item.namaUsaha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trackType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeProgramFolder, groupedPrograms, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="font-bold tracking-widest text-xs uppercase">Menyinkronkan Data...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: FOLDER BERBASIS PROGRAM KORPORAT
  // ==========================================
  if (!activeProgramFolder) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Data Asesmen</h1>
            <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
              Sistem pintar secara otomatis mengelompokkan entitas pendaftar berdasarkan Program atau Token yang digunakan.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl ring-1 ring-slate-200 shadow-sm shrink-0">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Users size={20}/></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Keseluruhan</p>
              <p className="text-xl font-black text-slate-900 leading-none">{assessments.length} <span className="text-sm font-medium text-slate-500">Entitas</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.entries(groupedPrograms).map(([programName, items]) => {
            const total = items.length;
            const validated = items.filter(i => i.status === 'Curator_Validated').length;
            const draft = items.filter(i => i.status === 'Curator_Draft').length;
            
            // Hitung rata-rata skor final
            const avgScore = total > 0 
              ? Math.round(items.reduce((acc, curr) => acc + (curr.curatorAssessment?.verifiedScore || curr.score || 0), 0) / total) 
              : 0;

            const isPublic = programName === 'Program Umum (Publik)';

            return (
              <Card 
                key={programName} 
                onClick={() => {
                  // PUSH URL BARU KE BROWSER HISTORY
                  router.push(`?folder=${encodeURIComponent(programName)}`);
                  setSearchTerm('');
                }}
                className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-indigo-300 transition-all cursor-pointer group flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isPublic ? 'bg-slate-100 text-slate-500 group-hover:bg-slate-200' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      {isPublic ? <FolderOpen size={24} /> : <Building2 size={24} />}
                    </div>
                    <span className="bg-slate-50 text-slate-600 font-black text-xs px-3 py-1.5 rounded-lg ring-1 ring-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                      {total} Pendaftar
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug mb-1 line-clamp-2">{programName}</h3>
                  <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-1.5"><Briefcase size={14}/> Workspace Direktori</p>
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center mt-auto">
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Selesai</p>
                    <p className="text-sm font-black text-emerald-600">{validated}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Draf</p>
                    <p className="text-sm font-black text-amber-500">{draft}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-2 ring-1 ring-indigo-100/50">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Rata Skor</p>
                    <p className="text-sm font-black text-indigo-700">{avgScore}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: TABEL ASESMEN DI DALAM FOLDER
  // ==========================================
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      {/* HEADER FOLDER AKTIF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm sticky top-0 md:relative z-20">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => {
              // MENGHAPUS QUERY FOLDER UNTUK KEMBALI KE DAFTAR FOLDER
              router.push('/admin');
              setSearchTerm('');
            }}
            className="w-10 h-10 p-0 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-600 shrink-0"
            title="Kembali ke Daftar Folder"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Direktori Program Aktif</p>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">{activeProgramFolder}</h1>
          </div>
        </div>
        
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="Cari nama usaha, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-slate-50 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      {/* TABEL DATA */}
      <Card className="bg-white rounded-[2rem] border-none ring-1 ring-slate-200 shadow-sm overflow-hidden flex flex-col">
        {filteredTableData.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">Tidak ada data pendaftar yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5">Identitas Usaha</th>
                  <th className="px-6 py-5">Kategori / Modul</th>
                  <th className="px-6 py-5 text-center">Skor Akhir</th>
                  <th className="px-6 py-5">Status Validasi</th>
                  <th className="px-6 py-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTableData.map((item) => {
                  const finalScore = item.curatorAssessment?.verifiedScore || item.score || 0;
                  const isCuratorValidated = item.status === 'Curator_Validated';
                  const isCuratorDraft = item.status === 'Curator_Draft';
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition-colors">
                          {item.namaUsaha}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                          {item.trackType}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-base ring-1 shadow-sm ${isCuratorValidated ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'}`}>
                          {finalScore}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isCuratorValidated ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                          </span>
                        ) : isCuratorDraft ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                            <Edit3 className="w-3.5 h-3.5" /> Draf Kurator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                            <Clock className="w-3.5 h-3.5" /> AI Selesai
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Button 
                          onClick={() => router.push(`/admin/assessment/${item.id}`)}
                          className="bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl h-9 px-4 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                        >
                           Buka Detail <ArrowRight className="w-4 h-4 ml-1.5" />
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

      {/* RENDER KOMPONEN MODAL DETAIL */}
      {selectedItem && (
        <AdminAssessmentDetail 
           data={selectedItem} 
           onClose={() => setSelectedItem(null)} 
        />
      )}

    </div>
  );
}

// ==========================================
// ROOT COMPONENT DENGAN SUSPENSE BOUNDARY
// Mencegah Error "De-opt to CSR" pada Next.js Build
// ==========================================
export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="font-bold tracking-widest text-xs uppercase">Menyiapkan Dashboard...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}