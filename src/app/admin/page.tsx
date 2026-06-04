'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, Users, Activity, Target, Eye, X, 
  Download, Briefcase, Store, Rocket, Calendar
} from 'lucide-react';

interface AssessmentDoc {
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
  
  const countByTrack = {
    Startup: assessments.filter(a => a.trackType === 'Startup').length,
    UMKM: assessments.filter(a => a.trackType === 'UMKM').length,
    Jasa: assessments.filter(a => a.trackType === 'Jasa').length,
  };

  const filteredData = assessments.filter(item => {
    const matchesSearch = (item.namaUsaha || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrack = filterTrack === 'All' || item.trackType === filterTrack;
    return matchesSearch && matchesTrack;
  });

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
    if (score >= 75) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Dasbor */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1">Monitoring Hasil Kurasi AI Inkubator</p>
          </div>
          <Button onClick={exportToCSV} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
            <Download className="w-4 h-4" /> Ekspor CSV
          </Button>
        </div>

        {/* Statistik Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-6 bg-white border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Users className="w-5 h-5 text-indigo-500"/>
              <h3 className="font-bold text-sm">Total Data</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{totalSubmissions}</p>
          </Card>
          <Card className="p-6 bg-white border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Activity className="w-5 h-5 text-emerald-500"/>
              <h3 className="font-bold text-sm">Rata-rata Skor</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{avgScore}</p>
          </Card>
          <Card className="p-6 bg-white border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Rocket className="w-5 h-5 text-blue-500"/>
              <h3 className="font-bold text-sm">Startup Tech</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{countByTrack.Startup}</p>
          </Card>
          <Card className="p-6 bg-white border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Store className="w-5 h-5 text-amber-500"/>
              <h3 className="font-bold text-sm">UMKM / Fisik</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{countByTrack.UMKM}</p>
          </Card>
          <Card className="p-6 bg-white border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Briefcase className="w-5 h-5 text-purple-500"/>
              <h3 className="font-bold text-sm">Jasa / Agensi</h3>
            </div>
            <p className="text-3xl font-black text-slate-900">{countByTrack.Jasa}</p>
          </Card>
        </div>

        {/* Filter & Table Area */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari nama usaha atau email..." 
                className="pl-9 h-10 border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
              {['All', 'Startup', 'UMKM', 'Jasa'].map(track => (
                <button
                  key={track}
                  onClick={() => setFilterTrack(track)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                    filterTrack === track ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Profil Usaha</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4 text-center">Skor AI</th>
                  <th className="px-6 py-4">Level Kesiapan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                      <div className="flex justify-center items-center gap-3">
                        <div className="w-5 h-5 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                      Tidak ada data yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> 
                          {new Date(item.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{item.namaUsaha}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                          {item.trackType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-sm border-2 ${getScoreColor(item.score)}`}>
                          {item.score || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {item.readinessLevel}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)} className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                          <Eye className="w-4 h-4 mr-2" /> Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>

      {/* MODAL DETAIL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedItem.namaUsaha}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                    {selectedItem.trackType}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(selectedItem.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Kolom Kiri: Data Form */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400"/> Data Input Peserta
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                    {Object.entries(selectedItem.formData || {}).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <div key={key} className="border-b border-slate-200/60 pb-3 last:border-0 last:pb-0">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Hasil AI */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-500"/> Hasil Analisis AI
                  </h3>
                  
                  {/* Score Card */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`p-4 rounded-xl border-2 ${getScoreColor(selectedItem.score)} bg-opacity-50`}>
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Total Skor</p>
                      <p className="text-3xl font-black mt-1">{selectedItem.score}</p>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Readiness Level</p>
                      <p className="text-sm font-bold text-slate-800 mt-2 leading-tight">{selectedItem.readinessLevel}</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-3">
                    {selectedItem.aiResult?.recommendations && Object.entries(selectedItem.aiResult.recommendations).map(([key, value]) => {
                      if (key === 'nextActionSteps' || key === 'incubationRoute') return null;
                      return (
                        <div key={key} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">
                            {String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}