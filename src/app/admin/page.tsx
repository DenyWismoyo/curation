'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, Users, Activity, Target, 
  Download, Settings, ArrowRight, KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { AdminAssessmentDetail } from '@/components/admin/AdminAssessmentDetail';

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
}

export default function AdminPage() {
  const [assessments, setAssessments] = useState<AssessmentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrack, setFilterTrack] = useState('All');
  const [selectedItem, setSelectedItem] = useState<AssessmentDoc | null>(null);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const q = query(collection(db, 'assessments'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data: AssessmentDoc[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as AssessmentDoc);
        });
        setAssessments(data);
      } catch (error) {
        console.error("Gagal mengambil data dari Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessments();
  }, []);

  const totalSubmissions = assessments.length;
  const avgScore = totalSubmissions > 0 
    ? (assessments.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalSubmissions).toFixed(1) 
    : 0;

  const filteredData = assessments.filter(item => {
    const matchesSearch = (item.namaUsaha || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrack = filterTrack === 'All' || item.trackType === filterTrack;
    return matchesSearch && matchesTrack;
  });

  const uniqueTracks = Array.from(new Set(assessments.map(a => a.trackType)));

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['Tanggal', 'Nama Usaha', 'Kategori', 'Email', 'WhatsApp', 'Skor', 'Level Kesiapan', 'Rekomendasi Rute'];
    const csvData = filteredData.map(item => [
      new Date(item.createdAt).toLocaleDateString('id-ID'),
      `"${item.namaUsaha || ''}"`,
      item.trackType,
      item.email,
      `'${item.whatsapp}'`, 
      item.score,
      item.readinessLevel,
      `"${item.aiResult?.recommendations?.incubationRoute || ''}"`
    ]);
    const csvContent = [headers.join(','), ...csvData.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Kurasi_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
    if (score >= 60) return 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200';
    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        
        {/* Header Dasbor */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-balance">Admin Dashboard</h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base mt-1">Monitoring Hasil Kurasi Inkubator</p>
          </div>
          
          {/* Menu Navigasi Admin */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Tombol Baru: Menuju Manajemen Token */}
            <Link href="/admin/tokens" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl h-10 px-4 font-bold">
                <KeyRound className="w-4 h-4" /> Kelola Token Akses
              </Button>
            </Link>

            <Link href="/admin/templates" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full gap-2 text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl h-10 px-4 font-bold">
                <Settings className="w-4 h-4" /> Kelola Template Form
              </Button>
            </Link>

            <Button onClick={exportToCSV} className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-4 font-bold">
              <Download className="w-4 h-4" /> Ekspor CSV
            </Button>
          </div>
        </div>

        {/* Statistik Overview */}
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 custom-scrollbar">
          <Card className="min-w-[140px] sm:min-w-0 p-5 bg-white ring-1 ring-slate-200 border-none shadow-sm flex flex-col justify-center rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Users className="w-4 h-4 text-slate-600"/>
              <h3 className="font-bold text-xs uppercase tracking-widest">Total Data</h3>
            </div>
            <p className="text-2xl font-black text-slate-900">{totalSubmissions}</p>
          </Card>
          <Card className="min-w-[140px] sm:min-w-0 p-5 bg-white ring-1 ring-slate-200 border-none shadow-sm flex flex-col justify-center rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Activity className="w-4 h-4 text-emerald-500"/>
              <h3 className="font-bold text-xs uppercase tracking-widest">Rata Skor</h3>
            </div>
            <p className="text-2xl font-black text-slate-900">{avgScore}</p>
          </Card>
          {uniqueTracks.slice(0, 2).map((track, idx) => (
             <Card key={track} className="min-w-[140px] sm:min-w-0 p-5 bg-white ring-1 ring-slate-200 border-none shadow-sm flex flex-col justify-center rounded-2xl">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Target className={`w-4 h-4 ${idx === 0 ? 'text-blue-500' : 'text-amber-500'}`}/>
                <h3 className="font-bold text-xs uppercase tracking-widest truncate">{track}</h3>
              </div>
              <p className="text-2xl font-black text-slate-900">{assessments.filter(a => a.trackType === track).length}</p>
            </Card>
          ))}
        </div>

        {/* Filter Area */}
        <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-2 flex flex-col sm:flex-row gap-2 justify-between items-center shadow-sm">
           <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari nama atau email..." 
                className="pl-9 h-11 sm:h-10 border-none bg-slate-50 ring-1 ring-slate-100 rounded-xl w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex w-full sm:w-auto bg-slate-50 p-1 rounded-xl overflow-x-auto custom-scrollbar">
              {['All', ...uniqueTracks].map(track => (
                <button
                  key={track}
                  onClick={() => setFilterTrack(track)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                    filterTrack === track ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {track}
                </button>
              ))}
           </div>
        </div>

        {/* DATA LIST */}
        {loading ? (
           <div className="py-20 text-center text-slate-500 font-medium flex justify-center items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              Memuat data...
           </div>
        ) : filteredData.length === 0 ? (
           <div className="py-20 text-center text-slate-500 font-medium">Tidak ada data ditemukan.</div>
        ) : (
           <>
              {/* MOBILE VIEW (Cards) */}
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                 {filteredData.map(item => (
                   <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white p-4 rounded-2xl ring-1 ring-slate-200 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start">
                         <div>
                           <p className="font-bold text-slate-900 text-base">{item.namaUsaha}</p>
                           <p className="text-xs text-slate-500 mt-0.5">{item.email}</p>
                         </div>
                         <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-50 ring-1 ring-slate-100 text-slate-600">{item.trackType}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50">
                         <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-slate-400"/> {item.readinessLevel}
                         </span>
                         <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${getScoreColor(item.score)}`}>
                           {item.score}
                         </span>
                      </div>
                   </div>
                 ))}
              </div>

              {/* DESKTOP VIEW (Table) */}
              <Card className="hidden sm:block bg-white ring-1 ring-slate-200 border-none shadow-sm overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 bg-slate-50/50 uppercase font-black tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Profil Usaha</th>
                        <th className="px-6 py-4 text-center">Skor AI</th>
                        <th className="px-6 py-4">Level Kesiapan</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900 text-base">{item.namaUsaha}</p>
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-50 ring-1 ring-slate-200 text-slate-500">{item.trackType}</span>
                               </div>
                               <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                  <span>{item.email}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span>{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-xs shadow-sm ${getScoreColor(item.score)}`}>
                              {item.score || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                            {item.readinessLevel}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)} className="text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                               Detail <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
           </>
        )}
      </div>

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