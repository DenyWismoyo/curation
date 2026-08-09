'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Sparkles, BrainCircuit } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MarkdownContent } from '@/components/domain/public/MarkdownContent'
import { functions, db } from '@/lib/firebase/firebase'
import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'

export default function EditCryptoModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  const isNew = moduleId === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [refactoring, setRefactoring] = useState(false);
  const [refactorStatus, setRefactorStatus] = useState<string>("IDLE");
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [refactoredData, setRefactoredData] = useState<{title?: string, description?: string, content: string} | null>(null);
  const [dismissedContent, setDismissedContent] = useState<string | null>(null);
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

    const unsub = onSnapshot(doc(db, "cryptoEducation", moduleId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.refactorStatus) {
          setRefactorStatus(data.refactorStatus);
          
          if (data.refactorStatus === "COMPLETED" && data.refactoredContent) {
            setRefactoring(false);
            setRefactoredData(prev => {
              return prev; // Handled by separate useEffect to avoid closure staleness
            });
          } else if (data.refactorStatus === "FAILED") {
            alert("Gagal melakukan refactor: " + data.refactorError);
            setRefactoring(false);
          } else if (data.refactorStatus !== "IDLE" && data.refactorStatus !== "COMPLETED") {
            setRefactoring(true);
          }
        }
      }
    });

    return () => unsub();
  }, [moduleId, isNew]);

  // Separate effect to handle the completed content safely with latest formData
  useEffect(() => {
    if (refactorStatus === "COMPLETED" && !refactoring) {
      const unsub = onSnapshot(doc(db, "cryptoEducation", moduleId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.refactoredContent && data.refactoredContent !== formData.content && data.refactoredContent !== dismissedContent) {
             setRefactoredData({
               title: data.refactoredTitle,
               description: data.refactoredDescription,
               content: data.refactoredContent
             });
          }
        }
      });
      return () => unsub();
    }
  }, [refactorStatus, refactoring, formData.content, dismissedContent, moduleId]);

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

  const handleRefactor = async () => {
    if (!moduleId || isNew) return;
    setRefactoring(true);
    setRefactorStatus("STARTING");
    try {
      const refactorFn = httpsCallable<{ moduleId: string }, { success: boolean; message?: string }>(functions, 'refactorCryptoModuleWithStudyData');
      await refactorFn({ moduleId });
      // The rest is handled by onSnapshot
    } catch (error) {
      console.error('Error refactoring:', error);
      alert('Gagal memulai pipeline refactor AI.');
      setRefactoring(false);
      setRefactorStatus("IDLE");
    }
  };

  const applyRefactoredContent = () => {
    if (refactoredData) {
      setFormData(prev => ({ 
        ...prev, 
        content: refactoredData.content,
        ...(refactoredData.title ? { title: refactoredData.title } : {}),
        ...(refactoredData.description ? { description: refactoredData.description } : {})
      }));
      setRefactoredData(null);
    }
  };

  const dismissRefactoredContent = () => {
    if (refactoredData) {
      setDismissedContent(refactoredData.content);
      setRefactoredData(null);
    }
  };

  const getRefactorStatusText = () => {
    switch (refactorStatus) {
      case 'INDEXING_RESEARCH': return 'Agent 1: Mengumpulkan Fakta...';
      case 'WRITING': return 'Agent 2: Menulis Draft...';
      case 'EDITING': return 'Agent 3: Fact-Checking...';
      case 'STARTING': return 'Memulai Pipeline...';
      default: return 'Sempurnakan dengan AI';
    }
  };

  const handleGenerateQuiz = async () => {
    if (!moduleId || isNew) {
      alert("Simpan modul terlebih dahulu sebelum generate kuis.");
      return;
    }
    setGeneratingQuiz(true);
    try {
      const genQuizFn = httpsCallable<{ moduleId: string }, { success: boolean; templateId: string }>(
        functions, 
        'generateCryptoModuleAssessment',
        { timeout: 300000 }
      );
      const res = await genQuizFn({ moduleId });
      if (res.data?.success) {
        setFormData(prev => ({ ...prev, assessmentTemplateId: res.data.templateId }));
        alert('Berhasil generate kuis dengan AI!');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Gagal generate kuis.');
    } finally {
      setGeneratingQuiz(false);
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
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-secondary text-secondary-foreground rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground">
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
          <Card className="border border-border shadow-lg shadow-slate-200/40 dark:shadow-none rounded-2xl bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Judul Modul</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  placeholder="Contoh: Pengenalan Blockchain"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Deskripsi Singkat (Snippet)</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-colors"
                  placeholder="Ringkasan untuk kartu preview (max 200 karakter)"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-foreground">Konten Modul (Markdown)</label>
                  <button 
                    onClick={handleRefactor}
                    disabled={refactoring || isNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors disabled:opacity-50 border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                  >
                    {refactoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {refactoring ? getRefactorStatusText() : 'Sempurnakan dengan AI'}
                  </button>
                </div>
                
                {refactoredData && (
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-800 space-y-4 mb-4 shadow-inner">
                    <div className="flex justify-between items-center pb-2 border-b border-indigo-200/50 dark:border-indigo-800/50">
                       <span className="text-sm font-black flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                         <Sparkles className="w-4 h-4" /> Hasil Refactor AI (Tersedia)
                       </span>
                       <div className="flex gap-2">
                         <button onClick={dismissRefactoredContent} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Batal</button>
                         <button onClick={applyRefactoredContent} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">Terapkan Semua Hasil</button>
                       </div>
                    </div>
                    
                    {refactoredData.title && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase">Saran Judul</p>
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{refactoredData.title}</p>
                      </div>
                    )}
                    
                    {refactoredData.description && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase">Saran Deskripsi</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">{refactoredData.description}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase">Saran Konten</p>
                      <div className="max-h-[300px] overflow-y-auto text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 mt-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-indigo-900 dark:prose-headings:text-indigo-100 prose-a:text-indigo-600">
                          <MarkdownContent content={refactoredData.content} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-6">
                  <textarea 
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={20}
                    className="w-full px-4 py-4 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-sm leading-relaxed transition-colors"
                    placeholder="Tulis konten dengan Markdown..."
                  />
                  <div className="w-full min-h-[400px] max-h-[600px] overflow-y-auto px-8 py-6 rounded-xl border border-border bg-card text-foreground shadow-inner">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none dark:prose-headings:text-white prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                      <MarkdownContent content={formData.content || '*Preview akan muncul di sini*'} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-border shadow-lg shadow-slate-200/40 dark:shadow-none rounded-2xl bg-card">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-bold text-foreground border-b border-border pb-2 mb-4">Metadata</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Status Publikasi</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="isPublished"
                    name="isPublished"
                    checked={formData.isPublished}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPublished" className="text-sm font-bold text-foreground cursor-pointer">
                    Terbitkan ke User
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Level</label>
                <select 
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                >
                  <option value="Level 1: Pemula">Level 1: Pemula</option>
                  <option value="Level 2: Menengah">Level 2: Menengah</option>
                  <option value="Level 3: Lanjutan">Level 3: Lanjutan</option>
                  <option value="Level 4: Profesional">Level 4: Profesional</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Urutan</label>
                  <input 
                    type="number" 
                    name="moduleOrder"
                    value={formData.moduleOrder}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Estimasi (Menit)</label>
                  <input 
                    type="number" 
                    name="estimatedMinutes"
                    value={formData.estimatedMinutes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tingkat Kesulitan</label>
                  <select 
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  >
                    <option value="beginner">Pemula (Hijau)</option>
                    <option value="intermediate">Menengah (Kuning)</option>
                    <option value="advanced">Lanjutan (Merah)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Emoji Cover</label>
                  <input 
                    type="text" 
                    name="coverEmoji"
                    value={formData.coverEmoji}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm text-center text-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-lg shadow-slate-200/40 dark:shadow-none rounded-2xl relative overflow-hidden bg-card">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <h3 className="font-bold text-foreground">Pengaturan Kuis</h3>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz || isNew}
                  className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-1.5 rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md disabled:opacity-50"
                >
                  {generatingQuiz ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                  Generate Kuis
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">ID Template Assessment</label>
                <input 
                  type="text" 
                  name="assessmentTemplateId"
                  value={formData.assessmentTemplateId}
                  onChange={handleChange}
                  placeholder="Opsional, masukkan ID template kuis"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Jika diisi, fitur "Mulai Kuis" akan aktif di akhir modul. Klik tombol <strong>Generate Kuis</strong> di atas untuk membuat soal mendalam menggunakan AI berdasarkan materi dan data kajian (study).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
