'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle, ArrowUpDown, Filter, Eye, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CryptoModule {
  id: string;
  level: string;
  moduleOrder: number;
  title: string;
  difficulty: string;
  isPublished: boolean;
  assessmentTemplateId?: string;
}

export default function CryptoAcademyAdminPage() {
  const router = useRouter();
  const [modules, setModules] = useState<CryptoModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crypto/academy/modules');
      const data = await res.json();
      if (data.success) {
        setModules(data.data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/crypto/academy/modules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });
      if (res.ok) {
        setModules(modules.map(m => m.id === id ? { ...m, isPublished: !currentStatus } : m));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus modul ini?')) return;
    
    try {
      const res = await fetch(`/api/crypto/academy/modules/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setModules(modules.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Error deleting module:', error);
    }
  };

  const filteredModules = modules.filter(m => {
    const matchLevel = filterLevel ? m.level.includes(filterLevel) : true;
    const matchSearch = search ? m.title.toLowerCase().includes(search.toLowerCase()) : true;
    return matchLevel && matchSearch;
  });

  const levels = Array.from(new Set(modules.map(m => m.level)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Modul Crypto</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola kurikulum dan konten untuk Crypto Academy</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => router.push('/study')}
            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Generate via AI (Study)
          </button>
          <button 
            onClick={() => router.push('/admin/crypto-academy/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus size={16} /> Tambah Manual
          </button>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari modul..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400 w-4 h-4" />
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none bg-white"
            >
              <option value="">Semua Level</option>
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Tidak ada modul ditemukan.
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Urutan</th>
                  <th className="px-6 py-4">Judul Modul</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4 text-center">Kuis</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModules.map((module) => (
                  <tr key={module.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-3 h-3 text-slate-400 cursor-move" />
                        <span className="font-bold text-slate-700">{module.moduleOrder}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 truncate max-w-[250px]">
                      {module.title}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-white">
                        {module.level}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={
                        module.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                        module.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                        'bg-rose-100 text-rose-700 hover:bg-rose-100'
                      }>
                        {module.difficulty}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {module.assessmentTemplateId ? (
                        <Badge variant="indigo" className="bg-indigo-50 text-indigo-700">Tersedia</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleTogglePublish(module.id, module.isPublished)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          module.isPublished 
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {module.isPublished ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {module.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => window.open(`/crypto-academy/${encodeURIComponent(module.level)}/${module.id}`, '_blank')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => router.push(`/admin/crypto-academy/${module.id}`)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(module.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
