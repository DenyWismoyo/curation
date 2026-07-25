'use client';
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Newspaper, Plus, Trash2, Edit3, Loader2, X, CheckCircle2, BookOpen, Image as ImageIcon, UploadCloud, Sparkles, Wand2 } from 'lucide-react';
import { FormTemplate } from '@/types/curation';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: string;
  featured: boolean;
  isPublished: boolean;
  iconName: string;
  imageUrl?: string;
  imageStoragePath?: string;
  createdAt: string;
  updatedAt: string;
  linkedTemplateId?: string | null;
  linkedTemplateName?: string | null;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STATE UNTUK AI GENERATOR
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Edukasi AI');
  const [readTime, setReadTime] = useState('5 min');
  const [featured, setFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [iconName, setIconName] = useState('AILensIcon');

  // Image State (3x4 Ratio)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Articles
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Article[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Article));
      setArticles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Form Templates untuk Dropdown AI & Tautan CTA
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const q = query(collection(db, 'form_templates'), where('isActive', '==', true));
        const snap = await getDocs(q);
        const data: FormTemplate[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as FormTemplate));
        setTemplates(data);
      } catch (error) {
        console.error("Gagal memuat template", error);
      }
    };
    fetchTemplates();
  }, []);

  // FUNGSI MEMICU AI COPYWRITER
  const handleGenerateAI = async () => {
    if (!selectedTemplateId) {
      return toast.warning("Pilih modul asesmen terlebih dahulu.");
    }
    const targetTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!targetTemplate) return;

    setIsGeneratingArticle(true);
    toast.info("AI sedang meracik artikel. Mohon tunggu...", { id: 'ai-loading' });

    try {
      const functions = getFunctions(undefined, 'asia-southeast2');
      const generateArticleFn = httpsCallable(functions, 'generateArticleFromTemplate');
      
      const payload = {
        templateId: targetTemplate.id,
        trackName: targetTemplate.trackName,
        trackDescription: targetTemplate.trackDescription,
        expectedOutputs: targetTemplate.expectedOutputs,
        aiPromptConfig: targetTemplate.aiPromptConfig
      };

      const result = await generateArticleFn(payload);
      const data = result.data as any;

      if (data.success) {
        setTitle(data.title);
        setExcerpt(data.excerpt);
        setContent(data.content);
        toast.success('Berhasil! Artikel edukatif siap ditinjau.', { id: 'ai-loading' });
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal meracik artikel: ' + error.message, { id: 'ai-loading' });
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setCategory('Edukasi AI');
    setReadTime('5 min');
    setFeatured(false);
    setIsPublished(true);
    setIconName('AILensIcon');
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setExistingStoragePath(null);
    setSelectedTemplateId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = (article: Article) => {
    setIsEditing(true);
    setEditingId(article.id);
    setTitle(article.title);
    setExcerpt(article.excerpt);
    setContent(article.content);
    setCategory(article.category);
    setReadTime(article.readTime);
    setFeatured(article.featured);
    setIsPublished(article.isPublished);
    setIconName(article.iconName);
    
    setExistingImageUrl(article.imageUrl || null);
    setExistingStoragePath(article.imageStoragePath || null);
    setImagePreview(article.imageUrl || null);
    setImageFile(null);
    setSelectedTemplateId(article.linkedTemplateId || ''); 
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveArticle = async () => {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      return toast.warning('Judul, kutipan, dan konten utama wajib diisi.');
    }
    setIsSubmitting(true);
    try {
      const articleId = isEditing && editingId ? editingId : `article_${Date.now()}`;
      
      let finalImageUrl = existingImageUrl || '';
      let finalStoragePath = existingStoragePath || '';

      if (imageFile) {
        const storage = getStorage();
        const ext = imageFile.name.split('.').pop();
        const fileName = `articles/${articleId}_${Date.now()}.${ext}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
        finalStoragePath = fileName;

        if (isEditing && existingStoragePath) {
          const oldRef = ref(storage, existingStoragePath);
          await deleteObject(oldRef).catch(err => console.warn("Gambar lama tidak ditemukan:", err));
        }
      }

      // KUNCI PERBAIKAN: Menyertakan Tautan CTA secara otomatis ke database
      const payload: Partial<Article> = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        category,
        readTime,
        featured,
        isPublished,
        iconName,
        imageUrl: finalImageUrl,
        imageStoragePath: finalStoragePath,
        updatedAt: new Date().toISOString(),
        linkedTemplateId: selectedTemplateId || null, 
        linkedTemplateName: templates.find(t => t.id === selectedTemplateId)?.trackName || null
      };

      if (!isEditing) {
        payload.id = articleId;
        payload.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'articles', articleId), payload as Article);
        toast.success('Artikel baru berhasil diterbitkan!');
      } else {
        await updateDoc(doc(db, 'articles', articleId), payload);
        toast.success('Artikel berhasil diperbarui!');
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan artikel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean, field: 'isPublished' | 'featured') => {
    try {
      await updateDoc(doc(db, 'articles', id), { [field]: !currentStatus });
      toast.success(`Status ${field === 'featured' ? 'Sorotan' : 'Publikasi'} diperbarui.`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengubah status.');
    }
  };

  const handleDelete = async (article: Article) => {
    if (!confirm(`Hapus permanen artikel "${article.title}"?`)) return;
    try {
      if (article.imageStoragePath) {
        const storage = getStorage();
        const fileRef = ref(storage, article.imageStoragePath);
        await deleteObject(fileRef).catch(err => console.warn("File di storage tidak ditemukan:", err));
      }
      await deleteDoc(doc(db, 'articles', article.id));
      toast.success('Artikel berhasil dihapus.');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus artikel.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-indigo-600" /> Pusat Artikel & Wawasan
        </h1>
        <p className="text-slate-500 mt-2 font-medium max-w-2xl text-balance">
          Kelola publikasi edukasi, studi kasus, dan update sistem yang akan tampil di halaman Explore Publik.
        </p>
      </div>

      {/* FORM EDITOR */}
      <Card className={`p-6 sm:p-8 bg-white rounded-3xl border-none shadow-sm flex flex-col gap-6 transition-all ${isEditing ? 'ring-2 ring-amber-400 shadow-amber-500/10' : 'ring-1 ring-slate-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isEditing ? 'text-amber-600' : 'text-slate-400'}`}>
            {isEditing ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4 text-indigo-600"/>} 
            {isEditing ? 'Ubah Artikel' : 'Tulis Artikel Baru'}
          </h3>
          {isEditing && (
            <Button variant="ghost" onClick={handleCancelEdit} className="text-slate-500 hover:bg-slate-100 h-8 px-3 rounded-lg text-xs font-bold">
              <X className="w-3.5 h-3.5 mr-1.5" /> Batal Edit
            </Button>
          )}
        </div>

        {/* MODUL AI COPYWRITER PANEL & TAUTAN CTA */}
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-end mb-2 ${isEditing ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
          <div className="flex-1 w-full space-y-2">
            <label className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isEditing ? 'text-amber-800' : 'text-indigo-800'}`}>
              <Sparkles className={`w-4 h-4 ${isEditing ? 'text-amber-600' : 'text-indigo-600'}`}/> Tautan CTA (Call to Action) Asesmen
            </label>
            <select 
              value={selectedTemplateId} 
              onChange={e => setSelectedTemplateId(e.target.value)}
              className={`w-full h-12 rounded-xl bg-white border px-3 font-bold text-sm text-slate-700 outline-none focus:ring-2 shadow-sm cursor-pointer ${isEditing ? 'border-amber-200 focus:ring-amber-500' : 'border-indigo-200 focus:ring-indigo-500'}`}
            >
              <option value="">-- Tidak Terhubung ke Modul Asesmen Manapun --</option>
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{tpl.trackName}</option>
              ))}
            </select>
            <p className={`text-xs font-medium ${isEditing ? 'text-amber-600/80' : 'text-indigo-500/80'}`}>
              {isEditing ? 'Mengubah modul akan memperbarui Banner CTA di halaman artikel ini.' : 'Pilih modul, lalu tekan Racik Artikel agar AI menulis artikel edukasi otomatis.'}
            </p>
          </div>
          {!isEditing && (
            <Button 
              onClick={handleGenerateAI} 
              disabled={!selectedTemplateId || isGeneratingArticle}
              className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shrink-0 w-full sm:w-auto transition-all"
            >
              {isGeneratingArticle ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Wand2 className="w-4 h-4 mr-2"/>}
              Racik Artikel
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* UPLOAD GAMBAR 3x4 */}
          <div className="space-y-2 md:col-span-3 flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-32 aspect-[3/4] shrink-0 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-300 flex flex-col items-center gap-2 p-4 text-center">
                  <ImageIcon size={24} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">3:4 Portrait</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5"/> Gambar Cover (Rasio 3:4)
              </label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                className="h-12 rounded-xl bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer pt-2.5"
              />
              <p className="text-xs text-slate-400 font-medium">Opsional: Gambar dengan proporsi vertikal 3:4. Jika kosong, sistem akan menggunakan Ikon Representasi di bawah.</p>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 border-t border-slate-100 pt-5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Judul Artikel</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tulis judul yang menarik..." className="h-12 rounded-xl font-bold bg-slate-50" />
          </div>
          
          <div className="space-y-2 border-t border-slate-100 pt-5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Edukasi AI">Edukasi AI</option>
              <option value="Update Sistem">Update Sistem</option>
              <option value="Studi Kasus">Studi Kasus</option>
              <option value="Praktik Terbaik">Praktik Terbaik</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kutipan Singkat (Excerpt)</label>
            <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Ringkasan 1-2 kalimat untuk ditampilkan di kartu..." className="bg-slate-50 rounded-xl resize-none h-20" />
          </div>

          <div className="space-y-2 md:col-span-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Konten Utama (Dukung format Markdown)</label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Tulis isi artikel lengkap di sini (mendukung penulisan Markdown)..." className="bg-slate-50 rounded-xl min-h-[350px] font-medium leading-relaxed" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Estimasi Baca</label>
            <Input value={readTime} onChange={e => setReadTime(e.target.value)} placeholder="Misal: 5 min" className="h-12 rounded-xl bg-slate-50 font-medium" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ikon Representasi</label>
            <select value={iconName} onChange={e => setIconName(e.target.value)} className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="AILensIcon">Lensa AI (Analitik)</option>
              <option value="AiSparkIcon">Spark AI (Inovasi/Update)</option>
              <option value="GlobalTargetIcon">Target (Studi Kasus)</option>
              <option value="BrainIcon">Otak AI (Kecerdasan)</option>
              <option value="BookOpen">Buku Terbuka (Panduan)</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-6 md:col-span-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-sm font-bold text-slate-700">Publikasikan</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="w-4 h-4 text-amber-500 rounded" />
              <span className="text-sm font-bold text-amber-700">Sorotan Utama</span>
            </label>
          </div>

        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={handleSaveArticle} disabled={isSubmitting} className={`w-full sm:w-auto text-white font-bold h-12 px-8 rounded-xl shadow-md transition-all ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-indigo-600'}`}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
            {isEditing ? 'Simpan Perubahan' : 'Terbitkan Artikel'}
          </Button>
        </div>
      </Card>

      {/* TABEL DATA */}
      <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">Daftar Artikel Tersimpan</h3>
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-md">{articles.length} Artikel</span>
        </div>
        
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-medium flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600"/> Memuat basis data...
          </div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium space-y-2">
            <BookOpen className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-bold text-slate-700">Belum ada artikel ditulis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Visual</th>
                  <th className="px-6 py-4">Judul & Kategori</th>
                  <th className="px-6 py-4 text-center">Tgl Dibuat</th>
                  <th className="px-6 py-4 text-center">Status Tayang</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {articles.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      {item.imageUrl ? (
                        <div className="w-10 h-14 bg-slate-100 rounded-md overflow-hidden ring-1 ring-slate-200">
                          <img src={item.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-14 bg-slate-50 rounded-md ring-1 ring-slate-200 flex items-center justify-center text-slate-300">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-[300px]">
                      <p className="font-bold text-slate-900 text-base truncate">{item.title}</p>
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-medium text-xs">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-center space-y-1.5">
                      <button onClick={() => handleToggleStatus(item.id, item.isPublished, 'isPublished')} className={`flex justify-center w-24 mx-auto items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${item.isPublished ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'}`}>
                        {item.isPublished ? 'Tayang' : 'Draft'}
                      </button>
                      <button onClick={() => handleToggleStatus(item.id, item.featured, 'featured')} className={`flex justify-center w-24 mx-auto items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${item.featured ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'}`}>
                        {item.featured ? 'Sorotan' : 'Reguler'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button onClick={() => handleEditClick(item)} variant="ghost" className="text-amber-600 bg-amber-50 hover:bg-amber-100 h-9 px-3 rounded-xl font-bold flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4" /> Edit
                        </Button>
                        <Button onClick={() => handleDelete(item)} variant="ghost" className="text-rose-500 bg-rose-50 hover:bg-rose-100 h-9 w-9 p-0 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}