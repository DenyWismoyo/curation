'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MarkdownContent } from '@/components/domain/public/MarkdownContent'

export default function EditCryptoModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  const isNew = moduleId === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    level: 'Level 1: Pemula',
    moduleOrder: 1,
    description: '',
    estimatedMinutes: 5,
    difficulty: 'beginner',
    coverEmoji: '📚',
    content: '',
    assessmentTemplateId: '',
    isPublished: false,
  });

  useEffect(() => {
    if (isNew) return;
    
    const fetchModule = async () => {
      try {
        const res = await fetch(`/api/crypto/academy/modules/${moduleId}`);
        const data = await res.json();
        if (data.success) {
          setFormData({
            title: data.data.title || '',
            level: data.data.level || 'Level 1: Pemula',
            moduleOrder: data.data.moduleOrder || 1,
            description: data.data.description || '',
            estimatedMinutes: data.data.estimatedMinutes || 5,
            difficulty: data.data.difficulty || 'beginner',
            coverEmoji: data.data.coverEmoji || '📚',
            content: data.data.content || '',
            assessmentTemplateId: data.data.assessmentTemplateId || '',
            isPublished: data.data.isPublished || false,
          });
        }
      } catch (error) {
        console.error('Error fetching module:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchModule();
  }, [moduleId, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isNew ? '/api/crypto/academy/modules' : `/api/crypto/academy/modules/${moduleId}`;
      const method = isNew ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (data.success) {
        if (isNew) {
          router.push(`/admin/crypto-academy/${data.data.id}`);
        } else {
          alert('Berhasil disimpan!');
        }
      } else {
        alert('Gagal menyimpan: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/crypto-academy')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {isNew ? 'Tambah Modul Baru' : 'Edit Modul'}
            </h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Modul'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/40 rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Judul Modul</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Contoh: Pengenalan Blockchain"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Deskripsi Singkat (Snippet)</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                  placeholder="Ringkasan untuk kartu preview (max 200 karakter)"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Konten Modul (Markdown)</label>
                  <button className="text-xs text-indigo-600 font-bold hover:underline">
                    Gunakan AI untuk Menulis
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea 
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={25}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm"
                    placeholder="Tulis konten dengan Markdown..."
                  />
                  <div className="w-full h-full min-h-[500px] max-h-[600px] overflow-y-auto px-6 py-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-200">
                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-a:text-indigo-400">
                      <MarkdownContent content={formData.content || '*Preview akan muncul di sini*'} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/40 rounded-2xl">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Metadata</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Status Publikasi</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="isPublished"
                    name="isPublished"
                    checked={formData.isPublished}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPublished" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Terbitkan ke User
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Level</label>
                <select 
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="Level 1: Pemula">Level 1: Pemula</option>
                  <option value="Level 2: Menengah">Level 2: Menengah</option>
                  <option value="Level 3: Lanjutan">Level 3: Lanjutan</option>
                  <option value="Level 4: Profesional">Level 4: Profesional</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Urutan</label>
                  <input 
                    type="number" 
                    name="moduleOrder"
                    value={formData.moduleOrder}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Estimasi (Menit)</label>
                  <input 
                    type="number" 
                    name="estimatedMinutes"
                    value={formData.estimatedMinutes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tingkat Kesulitan</label>
                  <select 
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="beginner">Pemula (Hijau)</option>
                    <option value="intermediate">Menengah (Kuning)</option>
                    <option value="advanced">Lanjutan (Merah)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Emoji Cover</label>
                  <input 
                    type="text" 
                    name="coverEmoji"
                    value={formData.coverEmoji}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-center text-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/40 rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Pengaturan Kuis</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">ID Template Assessment</label>
                <input 
                  type="text" 
                  name="assessmentTemplateId"
                  value={formData.assessmentTemplateId}
                  onChange={handleChange}
                  placeholder="Opsional, masukkan ID template kuis"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Jika diisi, fitur "Mulai Kuis" akan aktif di akhir modul.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
