'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogOut, ShieldCheck, Search, Users, Activity, CheckCircle2, Clock, MapPin, Eye, Tag, X, Plus, Loader2, Edit3 } from 'lucide-react';
import { CuratorAssessmentDetail } from '@/app/components/curator/CuratorAssessmentDetail';

// IMPORT CUSTOM HOOK MOBILE BACK
import { useMobileBack } from '@/hooks/useMobileBack';

interface CuratorSession {
  token: string;
  programName: string;
  role: string;
}

export default function CuratorDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<CuratorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [masterTags, setMasterTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // ==========================================
  // MOBILE BACK HANDLERS (SWIPE)
  // ==========================================
  useMobileBack(!!selectedAssessment, () => setSelectedAssessment(null));
  useMobileBack(isManageTagsOpen, () => setIsManageTagsOpen(false));

  useEffect(() => {
    const sessionData = localStorage.getItem('curatorSession');
    if (!sessionData) {
      router.push('/curator');
    } else {
      setSession(JSON.parse(sessionData));
    }
  }, [router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.programName) return;
      
      setLoading(true);
      setIsLoadingTags(true);
      
      try {
        const q = query(
          collection(db, 'assessments'),
          where('corporateEntity', '==', session.programName)
        );
        
        const snap = await getDocs(q);
        
        // NORMALISASI TANGGAL SEBELUM DI-SORTING
        const data = snap.docs.map(doc => {
          const docData = doc.data();
          let dateStr = new Date().toISOString();
          
          if (docData.createdAt) {
            if (typeof docData.createdAt.toDate === 'function') {
              dateStr = docData.createdAt.toDate().toISOString();
            } else {
              dateStr = new Date(docData.createdAt).toISOString();
            }
          }
          return { id: doc.id, ...docData, createdAt: dateStr };
        });
        
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAssessments(data);

        const tagsDocRef = doc(db, 'corporate_tags', session.programName);
        const tagsSnap = await getDoc(tagsDocRef);
        if (tagsSnap.exists() && tagsSnap.data().tags) {
          setMasterTags(tagsSnap.data().tags);
        } else {
          setMasterTags([]); 
        }

      } catch (error) {
        console.error("Gagal menarik data untuk kurator:", error);
      } finally {
        setLoading(false);
        setIsLoadingTags(false);
      }
    };

    fetchDashboardData();
  }, [session]);

  const handleLogout = () => {
    localStorage.removeItem('curatorSession');
    router.push('/curator');
  };

  const triggerRefresh = () => {
    setSelectedAssessment(null);
    window.location.reload(); 
  };

  const updateTagsInFirestore = async (newTagsList: string[]) => {
    if (!session?.programName) return;
    try {
      const tagsDocRef = doc(db, 'corporate_tags', session.programName);
      await setDoc(tagsDocRef, {
        corporateEntity: session.programName,
        tags: newTagsList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setMasterTags(newTagsList);
    } catch (error) {
      console.error("Gagal menyimpan tags ke database:", error);
      alert("Gagal menyimpan tag. Periksa koneksi Anda.");
    }
  };

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim().toUpperCase();
    if (trimmed && !masterTags.includes(trimmed)) {
      updateTagsInFirestore([...masterTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = masterTags.filter(t => t !== tagToRemove);
    updateTagsInFirestore(updatedTags);
  };

  const filteredAssessments = assessments.filter(a => 
    a.namaUsaha?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSubmissions = assessments.length;
  const validatedCount = assessments.filter(a => a.status === 'Curator_Validated').length;
  const pendingCount = totalSubmissions - validatedCount;

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-black text-slate-900 leading-tight">Portal Kurator</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  {session.programName}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold gap-2">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pendaftar</p>
              <h3 className="text-3xl font-black text-slate-900">{totalSubmissions}</h3>
            </div>
          </Card>
          
          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Menunggu Finalisasi</p>
              <h3 className="text-3xl font-black text-slate-900">{pendingCount}</h3>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Selesai Validasi</p>
              <h3 className="text-3xl font-black text-slate-900">{validatedCount}</h3>
            </div>
          </Card>
        </div>

        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Daftar Tugas Kurasi Lapangan
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Cari nama usaha..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <Button 
                onClick={() => setIsManageTagsOpen(true)} 
                variant="outline" 
                className="gap-2 font-bold bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl h-10 shadow-sm w-full sm:w-auto"
              >
                <Tag className="w-4 h-4" /> Kelola Tags
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium">
               <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
               Memuat data peserta...
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">
              Belum ada data pendaftar baru.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">Nama Usaha / Startup</th>
                    <th className="px-6 py-5 text-center">Skor Akhir</th>
                    <th className="px-6 py-5">Status Kurasi</th>
                    <th className="px-6 py-5 text-center">Tanggal Masuk</th>
                    <th className="px-6 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAssessments.map((item) => {
                    const isFinalized = item.status === 'Curator_Validated';
                    const isDraft = item.status === 'Curator_Draft' || (!isFinalized && item.curatorAssessment !== undefined);
                    
                    const skorAwal = item.originalAiResult ? item.originalAiResult.totalScore : item.aiResult?.totalScore || item.score || 0;
                    const skorAkhir = item.aiResult?.totalScore || item.score || 0;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-900 text-base mb-0.5">{item.namaUsaha}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3" /> {item.formData?.kota || 'Lokasi tidak diketahui'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-5 text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-base ring-1 ${isFinalized ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'}`}>
                            {skorAkhir}
                          </div>
                          {(isFinalized || isDraft) && skorAkhir !== skorAwal && (
                            <div className="text-[10px] font-bold text-slate-400 mt-1">
                              Skor AI Awal: {skorAwal}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-5">
                          {isFinalized ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                            </span>
                          ) : isDraft ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                              <Edit3 className="w-3.5 h-3.5" /> Draf
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Cek
                            </span>
                          )}
                        </td>
                        
                        <td className="px-6 py-5 text-center text-slate-500 font-medium">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                        </td>
                        
                        <td className="px-6 py-5 text-center">
                          <Button 
                            variant="default"
                            onClick={() => router.push(`/curator/assessment/${item.id}`)}
                            className={`rounded-xl font-bold h-9 px-4 shadow-sm transition-all ${isFinalized ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100' : isDraft ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                          >
                            {isFinalized ? (
                              <><Eye className="w-4 h-4 mr-1.5" /> Lihat Hasil</>
                            ) : isDraft ? (
                              <><Edit3 className="w-4 h-4 mr-1.5" /> Lanjut Draf</>
                            ) : (
                              <><MapPin className="w-4 h-4 mr-1.5" /> Mulai Validasi</>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL MANAJEMEN QUICK TAGS */}
      {isManageTagsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <Tag className="text-indigo-600" /> Kelola Master Tags
              </h3>
              <button onClick={() => setIsManageTagsOpen(false)} className="text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-100 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
              Tag yang dikelola di sini terhubung dengan entitas <strong>{session.programName}</strong> dan otomatis tersedia untuk kurator lain saat memvalidasi.
            </p>

            <div className="flex gap-2 mb-6">
              <Input 
                value={newTagInput} 
                onChange={(e)=>setNewTagInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                placeholder="Buat tag baru..." 
                className="h-11 bg-slate-50 rounded-xl"
              />
              <Button onClick={handleAddNewTag} className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
                <Plus size={16} />
              </Button>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl ring-1 ring-slate-100 min-h-[100px]">
              {isLoadingTags ? (
                <div className="flex justify-center py-4 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {masterTags.length === 0 ? (
                    <span className="text-sm italic text-slate-400">Belum ada tag di database.</span>
                  ) : masterTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 bg-white ring-1 ring-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                      {tag} 
                      <button onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-rose-50 transition-colors">
                        <X size={14}/>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full mt-6 h-12 rounded-xl font-bold bg-slate-900 text-white" onClick={() => setIsManageTagsOpen(false)}>
              Selesai &amp; Tutup
            </Button>
          </div>
        </div>
      )}

      {selectedAssessment && (
        <CuratorAssessmentDetail 
          data={selectedAssessment} 
          availableTags={masterTags}
          onClose={() => setSelectedAssessment(null)} 
          onSaveSuccess={triggerRefresh} 
        />
      )}
    </div>
  );
}