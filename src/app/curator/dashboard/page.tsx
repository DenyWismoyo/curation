// src/app/curator/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogOut, ShieldCheck, Search, Users, Activity, CheckCircle2, Clock, MapPin, Eye } from 'lucide-react';

// Import komponen modal dari Tahap 3
import { CuratorAssessmentDetail } from '@/components/curator/CuratorAssessmentDetail';

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
  
  // State untuk mengontrol pembukaan modal detail
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);

  // 1. Cek Sesi Login Kurator
  useEffect(() => {
    const sessionData = localStorage.getItem('curatorSession');
    if (!sessionData) {
      router.push('/curator');
    } else {
      setSession(JSON.parse(sessionData));
    }
  }, [router]);

  // 2. Fetch Data berdasarkan Program/Entitas Kemitraan B2B
  useEffect(() => {
    const fetchAssessments = async () => {
      if (!session?.programName) return;
      
      setLoading(true);
      try {
        // Menggunakan 'corporateEntity' sebagai filter pencarian agar selaras dengan token yang diklaim peserta
        const q = query(
          collection(db, 'assessments'),
          where('corporateEntity', '==', session.programName)
        );
        
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Urutkan data berdasarkan pendaftaran paling baru masuk
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAssessments(data);
      } catch (error) {
        console.error("Gagal menarik data assessments untuk kurator:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [session]);

  const handleLogout = () => {
    localStorage.removeItem('curatorSession');
    router.push('/curator');
  };

  // Fungsi refresh untuk memperbarui data di tabel setelah kurator menekan tombol simpan
  const triggerRefresh = () => {
    setSelectedAssessment(null);
    window.location.reload(); 
  };

  const filteredAssessments = assessments.filter(a => 
    a.namaUsaha?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSubmissions = assessments.length;
  const validatedCount = assessments.filter(a => a.curatorNotes !== undefined).length;
  const pendingCount = totalSubmissions - validatedCount;

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      
      {/* NAVBAR */}
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

      {/* BODY DASBOR */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* WIDGET STATISTIK */}
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Menunggu Kurasi</p>
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

        {/* TABEL DATA UTAMA */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Daftar Tugas Kurasi Lapangan
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Cari nama usaha..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 flex justify-center items-center gap-3 font-medium">
               <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
               Memuat data peserta...
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">
              Belum ada data pendaftar baru untuk entitas program ini.
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
                    const isValidated = item.curatorNotes !== undefined;
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
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-base ring-1 ${isValidated ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'}`}>
                            {skorAkhir}
                          </div>
                          {isValidated && skorAkhir !== skorAwal && (
                            <div className="text-[10px] font-bold text-slate-400 mt-1">
                              Skor AI Awal: {skorAwal}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-5">
                          {isValidated ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Telah Divalidasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 ring-1 ring-amber-200">
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
                            onClick={() => setSelectedAssessment(item)}
                            className={`rounded-xl font-bold h-9 px-4 shadow-sm transition-all ${isValidated ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'}`}
                          >
                            {isValidated ? (
                              <><Eye className="w-4 h-4 mr-1.5" /> Lihat Hasil</>
                            ) : (
                              <><MapPin className="w-4 h-4 mr-1.5" /> Validasi Data</>
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

      {/* RENDER MODAL JIKA ADA DATA YANG DIPILIH */}
      {selectedAssessment && (
        <CuratorAssessmentDetail 
          data={selectedAssessment} 
          onClose={() => setSelectedAssessment(null)} 
          onSaveSuccess={triggerRefresh} 
        />
      )}
    </div>
  );
}