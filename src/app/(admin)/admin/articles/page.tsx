// src/app/admin/articles/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db } from '@/lib/firebase/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Newspaper,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  CheckCircle2,
  BookOpen,
  Image as ImageIcon,
  UploadCloud,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { FormTemplate } from '@/features/assessment/types/assessment.types'

interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  category: string
  readTime: string
  featured: boolean
  isPublished: boolean
  iconName: string
  imageUrl?: string
  imageStoragePath?: string
  createdAt: string
  updatedAt: string
  linkedTemplateId?: string | null
  linkedTemplateName?: string | null
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Edukasi AI')
  const [readTime, setReadTime] = useState('5 min')
  const [featured, setFeatured] = useState(false)
  const [isPublished, setIsPublished] = useState(true)
  const [iconName, setIconName] = useState('AILensIcon')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Article[] = []
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Article))
      setArticles(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const q = query(collection(db, 'form_templates'), where('isActive', '==', true))
        const snap = await getDocs(q)
        const data: FormTemplate[] = []
        snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as FormTemplate))
        setTemplates(data)
      } catch (error) {
        console.error('Gagal memuat template', error)
      }
    }
    fetchTemplates()
  }, [])

  const handleGenerateAI = async () => {
    if (!selectedTemplateId) {
      return toast.warning('Pilih modul asesmen terlebih dahulu.')
    }
    const targetTemplate = templates.find((t) => t.id === selectedTemplateId)
    if (!targetTemplate) return

    setIsGeneratingArticle(true)
    toast.info('AI sedang meracik artikel. Mohon tunggu...', { id: 'ai-loading' })

    try {
      const functions = getFunctions(undefined, 'asia-southeast2')
      const generateArticleFn = httpsCallable(functions, 'generateArticleFromTemplate')

      const payload = {
        templateId: targetTemplate.id,
        trackName: targetTemplate.trackName,
        trackDescription: targetTemplate.trackDescription,
        expectedOutputs: targetTemplate.expectedOutputs,
        aiPromptConfig: targetTemplate.aiPromptConfig,
      }

      const result = await generateArticleFn(payload)
      const data = result.data as any

      if (data.success) {
        setTitle(data.title)
        setExcerpt(data.excerpt)
        setContent(data.content)
        toast.success('Berhasil! Artikel edukatif siap ditinjau.', { id: 'ai-loading' })
      }
    } catch (error: any) {
      console.error(error)
      toast.error('Gagal meracik artikel: ' + error.message, { id: 'ai-loading' })
    } finally {
      setIsGeneratingArticle(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!title) {
      return toast.warning('Ketik judul artikel terlebih dahulu agar AI memahami konteks gambar.')
    }

    setIsGeneratingImage(true)
    toast.info('AI sedang merender gambar cover (Rasio 2:1)...', { id: 'ai-image' })

    try {
      const functions = getFunctions(undefined, 'asia-southeast2')
      const generateImageFn = httpsCallable(functions, 'generateArticleImage')

      const result = await generateImageFn({ title, excerpt })
      const data = result.data as any

      if (data.success) {
        setExistingImageUrl(data.imageUrl)
        setExistingStoragePath(data.storagePath)
        setImagePreview(data.imageUrl)
        setImageFile(null)
        toast.success('Berhasil! Gambar cover AI berhasil dirender.', { id: 'ai-image' })
      }
    } catch (error: any) {
      console.error(error)
      toast.error('Gagal merender gambar AI: ' + error.message, { id: 'ai-image' })
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleEditClick = (article: Article) => {
    setIsEditing(true)
    setEditingId(article.id)
    setTitle(article.title)
    setExcerpt(article.excerpt)
    setContent(article.content)
    setCategory(article.category || 'Edukasi AI')
    setReadTime(article.readTime || '5 min')
    setFeatured(article.featured || false)
    setIsPublished(article.isPublished ?? true)
    setIconName(article.iconName || 'AILensIcon')
    setSelectedTemplateId(article.linkedTemplateId || '')

    setExistingImageUrl(article.imageUrl || null)
    setExistingStoragePath(article.imageStoragePath || null)
    setImagePreview(article.imageUrl || null)
    setImageFile(null)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
    setTitle('')
    setExcerpt('')
    setContent('')
    setCategory('Edukasi AI')
    setReadTime('5 min')
    setFeatured(false)
    setIsPublished(true)
    setIconName('AILensIcon')
    setSelectedTemplateId('')
    setImageFile(null)
    setImagePreview(null)
    setExistingImageUrl(null)
    setExistingStoragePath(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSaveArticle = async () => {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      return toast.warning('Judul, kutipan, dan konten utama wajib diisi.')
    }
    setIsSubmitting(true)
    try {
      const articleId = isEditing && editingId ? editingId : `article_${Date.now()}`

      let finalImageUrl = existingImageUrl || ''
      let finalStoragePath = existingStoragePath || ''

      if (imageFile) {
        const storage = getStorage()
        const ext = imageFile.name.split('.').pop()
        const fileName = `articles/${articleId}_${Date.now()}.${ext}`
        const storageRef = ref(storage, fileName)

        await uploadBytes(storageRef, imageFile)
        finalImageUrl = await getDownloadURL(storageRef)
        finalStoragePath = fileName

        if (isEditing && existingStoragePath) {
          const oldRef = ref(storage, existingStoragePath)
          await deleteObject(oldRef).catch((err) =>
            console.warn('Gambar lama tidak ditemukan:', err)
          )
        }
      }

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
        linkedTemplateName:
          templates.find((t) => t.id === selectedTemplateId)?.trackName || null,
      }

      if (!isEditing) {
        payload.id = articleId
        payload.createdAt = new Date().toISOString()
        await setDoc(doc(db, 'articles', articleId), payload as Article)
        toast.success('Artikel baru berhasil diterbitkan!')
      } else {
        await updateDoc(doc(db, 'articles', articleId), payload)
        toast.success('Artikel berhasil diperbarui!')
      }

      handleCancelEdit()
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan artikel.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (
    id: string,
    currentStatus: boolean,
    field: 'isPublished' | 'featured'
  ) => {
    try {
      await updateDoc(doc(db, 'articles', id), { [field]: !currentStatus })
      toast.success(
        `Status ${field === 'featured' ? 'Sorotan' : 'Publikasi'} diperbarui.`
      )
    } catch (error) {
      console.error(error)
      toast.error('Gagal mengubah status.')
    }
  }

  const handleDelete = async (article: Article) => {
    try {
      if (article.imageStoragePath) {
        const storage = getStorage()
        const fileRef = ref(storage, article.imageStoragePath)
        await deleteObject(fileRef).catch((err) =>
          console.warn('File di storage tidak ditemukan:', err)
        )
      }
      await deleteDoc(doc(db, 'articles', article.id))
      toast.success('Artikel berhasil dihapus.')
    } catch (error) {
      console.error(error)
      toast.error('Gagal menghapus artikel.')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans">
      {/* HEADER PAGE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="indigo" className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider">
              Editorial Hub
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-muted-foreground">Content & Knowledge Management</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <Newspaper className="w-6 h-6" />
            </div>
            Pusat Artikel & Wawasan
          </h1>
          <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Kelola publikasi edukasi, studi kasus, dan update sistem yang akan tampil di halaman Explore Publik.
          </p>
        </div>

        {/* QUICK SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl"><BookOpen size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Artikel</p>
              <p className="text-xl font-black text-foreground mt-0.5">{articles.length}</p>
            </div>
          </div>

          <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diterbitkan</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{articles.filter(a => a.isPublished).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM EDITOR */}
      <Card
        className={`p-6 sm:p-8 card-solid rounded-3xl border-none shadow-xs flex flex-col gap-6 transition-all ${
          isEditing ? 'ring-2 ring-amber-400' : 'ring-1 ring-border/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
              isEditing ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
            }`}
          >
            {isEditing ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}{' '}
            {isEditing ? 'Ubah Artikel' : 'Tulis Artikel Baru'}
          </h3>
          {isEditing && (
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
              className="text-muted-foreground hover:bg-secondary text-secondary-foreground h-8 px-3 rounded-xl text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Batal Edit
            </Button>
          )}
        </div>

        {/* AI GENERATOR PANEL */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-end mb-2 ${
            isEditing
              ? 'bg-amber-50 dark:bg-amber-500/10/50 border-amber-200 dark:border-amber-500/20/60'
              : 'bg-indigo-50 dark:bg-indigo-500/10/50 border-indigo-200 dark:border-indigo-500/20/60'
          }`}
        >
          <div className="flex-1 w-full space-y-2">
            <label
              className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                isEditing ? 'text-amber-800' : 'text-indigo-800'
              }`}
            >
              <Sparkles
                className={`w-4 h-4 ${isEditing ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}
              />{' '}
              Tautan CTA (Call to Action) Asesmen
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full h-11 rounded-xl card-solid border border-border px-3 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- Tidak Terhubung ke Modul Asesmen Manapun --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.trackName}
                </option>
              ))}
            </select>
          </div>
          {!isEditing && (
            <Button
              onClick={handleGenerateAI}
              disabled={!selectedTemplateId || isGeneratingArticle}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 shrink-0 w-full sm:w-auto transition-all cursor-pointer"
            >
              {isGeneratingArticle ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Wand2 className="w-4 h-4 mr-1.5" />
              )}
              Racik Artikel
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* UPLOAD & COVER AI */}
          <div className="space-y-2 md:col-span-3 flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-full sm:w-72 aspect-[2/1] shrink-0 bg-muted text-muted-foreground rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-300 flex flex-col items-center gap-2 p-4 text-center">
                  <ImageIcon size={26} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Landscape 2:1</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 w-full">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5" /> Gambar Cover Artikel (Rasio 2:1)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className="h-10 flex-1 rounded-xl bg-muted text-muted-foreground text-xs font-medium cursor-pointer pt-1.5"
                />
                <Button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !title.trim()}
                  variant="outline"
                  className="h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-bold text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 shadow-2xs"
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  AI Render Cover
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 border-t border-border pt-5">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              Judul Artikel
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tulis judul yang menarik..."
              className="h-12 rounded-xl font-bold bg-muted text-muted-foreground/80 text-xs"
            />
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 rounded-xl bg-muted text-muted-foreground/80 border border-border px-3 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Edukasi AI">Edukasi AI</option>
              <option value="Update Sistem">Update Sistem</option>
              <option value="Studi Kasus">Studi Kasus</option>
              <option value="Praktik Terbaik">Praktik Terbaik</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-3">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              Kutipan Singkat (Excerpt)
            </label>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Ringkasan 1-2 kalimat untuk ditampilkan di kartu..."
              className="bg-muted text-muted-foreground/80 rounded-xl resize-none h-20 text-xs font-medium"
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              Konten Utama (Dukung Markdown)
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis isi artikel lengkap di sini (mendukung penulisan Markdown)..."
              className="bg-muted text-muted-foreground/80 rounded-xl min-h-[300px] text-xs font-medium leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              Estimasi Baca
            </label>
            <Input
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
              placeholder="Misal: 5 min"
              className="h-11 rounded-xl bg-muted text-muted-foreground/80 font-medium text-xs"
            />
          </div>

          <div className="flex items-center gap-4 pt-6 md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-indigo-600 dark:text-indigo-400 rounded"
              />
              <span className="text-xs font-bold text-slate-700">Publikasikan</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded"
              />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Sorotan Utama</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleSaveArticle}
            disabled={isSubmitting}
            className={`w-full sm:w-auto text-white font-bold h-11 px-8 rounded-xl shadow-md transition-all text-xs ${
              isEditing
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-slate-900 hover:bg-indigo-600'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
            )}
            {isEditing ? 'Simpan Perubahan' : 'Terbitkan Artikel'}
          </Button>
        </div>
      </Card>

      {/* TABEL DATA ARTIKEL */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Visual</TableHead>
            <TableHead>Judul & Kategori</TableHead>
            <TableHead className="text-center">Tgl Dibuat</TableHead>
            <TableHead className="text-center">Status Tayang</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center">
                <Skeleton className="h-6 w-full max-w-md mx-auto rounded-xl" />
              </TableCell>
            </TableRow>
          ) : articles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold">
                Belum ada artikel ditulis.
              </TableCell>
            </TableRow>
          ) : (
            articles.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted text-muted-foreground/70 group">
                <TableCell>
                  {item.imageUrl ? (
                    <div className="w-14 h-10 bg-secondary text-secondary-foreground rounded-lg overflow-hidden ring-1 ring-border">
                      <img src={item.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-10 bg-muted text-muted-foreground rounded-lg ring-1 ring-border flex items-center justify-center text-slate-300">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </TableCell>

                <TableCell className="max-w-[300px]">
                  <p className="font-extrabold text-foreground text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="indigo" className="text-[9px] px-2 py-0">
                      {item.category}
                    </Badge>
                    {item.featured && (
                      <Badge variant="amber" className="text-[9px] px-2 py-0">
                        Sorotan
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center text-slate-400 font-medium text-xs">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    variant={item.isPublished ? 'emerald' : 'secondary'}
                    className="cursor-pointer text-[9px] px-2.5 py-0.5"
                    onClick={() => handleToggleStatus(item.id, item.isPublished, 'isPublished')}
                  >
                    {item.isPublished ? 'Tayang' : 'Draft'}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      onClick={() => handleEditClick(item)}
                      variant="ghost"
                      className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 h-8 px-3 rounded-xl font-bold text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-rose-500 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:bg-rose-500/10 h-8 w-8 p-0 rounded-xl"
                          title="Hapus Artikel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Artikel?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus <strong>{item.title}</strong> secara permanen?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item)}>
                            Ya, Hapus Artikel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}