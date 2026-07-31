// src/app/admin/templates/page.tsx
'use client'

import React, { useState, useEffect, Suspense, useMemo } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormTemplate } from '@/types/curation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { getFunctions, httpsCallable } from 'firebase/functions'
import JSZip from 'jszip'
import {
  Plus,
  Save,
  Trash2,
  Settings2,
  LayoutGrid,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  BrainCircuit,
  FileEdit,
  ChevronLeft,
  Calendar,
  Eye,
  Folder,
  FolderOpen,
  List as ListIcon,
  GripVertical,
  Search,
  CheckSquare,
  Edit3,
  MoveRight,
  X,
  Terminal,
  Sparkles,
  Loader2,
} from 'lucide-react'

import { TabGeneral } from '@/app/components/admin/template-builder/TabGeneral'
import { TabAIConfig } from '@/app/components/admin/template-builder/TabAIConfig'
import { TabAdaptive } from '@/app/components/admin/template-builder/TabAdaptive'
import { TabFormBuilder } from '@/app/components/admin/template-builder/TabFormBuilder'
import { AdminTemplatePreview } from '@/app/components/admin/AdminTemplatePreview'
import { TabLogs } from '@/app/components/admin/template-builder/TabLogs'

const DEFAULT_AI_CONFIG = {
  aiPersona: '',
  assessmentGoal: '',
  expectedMetrics: [],
  expectedAnalysisBlocks: [],
  expectedRecommendations: [],
  riskFramework: '',
  customScoringRubric: '',
  customSystemPrompt: '',
  negativePrompts: '',
  formatInstructions: '',
  reportTone: 'consultative' as const,
  gradingStrictness: 'standard' as const,
  targetAudience: 'company' as const,
  formPurpose: 'assessment' as any,
  customUiLabels: {
    scoreLabel: 'AI Readiness Score',
    swotLabel: 'Capability Matrix (SWOT)',
    riskLabel: 'Critical Risks & Mitigation Map',
    roadmapLabel: 'Rekomendasi Strategis',
    executionLabel: 'Action Plan Timeline',
  },
}

function TemplateBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeFolder = searchParams.get('folder') || 'Semua'
  const editId = searchParams.get('edit')
  const tabParam = searchParams.get('tab') || 'general'

  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeView, setActiveView] = useState<'list' | 'edit'>('list')
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'builder' | 'preview' | 'logs'>('general')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [isEditMode, setIsEditMode] = useState(false)
  const [dbFolders, setDbFolders] = useState<string[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [isMassGenerating, setIsMassGenerating] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (editId) {
      if (activeTemplate && activeTemplate.id === editId) {
        setActiveView('edit')
        setActiveTab(tabParam as any)
      } else {
        const found = templates.find((t) => t.id === editId)
        if (found) {
          setActiveTemplate(found)
          setActiveView('edit')
          setActiveTab(tabParam as any)
        }
      }
    } else {
      setActiveView('list')
      setActiveTemplate(null)
    }
  }, [editId, tabParam, templates, activeTemplate?.id])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const templateSnap = await getDocs(collection(db, 'form_templates'))
      const loadedTemplates: FormTemplate[] = []
      templateSnap.forEach((docSnap) => {
        const data = docSnap.data() as FormTemplate
        if (!data.aiPromptConfig) {
          data.aiPromptConfig = { ...DEFAULT_AI_CONFIG }
        }
        loadedTemplates.push(data)
      })
      loadedTemplates.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
      setTemplates(loadedTemplates)

      const folderSnap = await getDocs(collection(db, 'template_folders'))
      const loadedFolders: string[] = []
      folderSnap.forEach((doc) => {
        loadedFolders.push(doc.id)
      })
      setDbFolders(loadedFolders)
    } catch (error) {
      console.error('Gagal memuat data:', error)
      toast.error('Gagal memuat data template.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const folders = useMemo(() => {
    const uniqueFolders = new Set([
      ...templates.map((t) => t.folder).filter(Boolean),
      ...dbFolders,
    ])
    return ['Semua', ...Array.from(uniqueFolders), 'Uncategorized']
  }, [templates, dbFolders])

  const filteredTemplates = useMemo(() => {
    let result = templates
    if (activeFolder !== 'Semua') {
      if (activeFolder === 'Uncategorized') result = result.filter((t) => !t.folder)
      else result = result.filter((t) => t.folder === activeFolder)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.trackName.toLowerCase().includes(query) ||
          (t.trackDescription && t.trackDescription.toLowerCase().includes(query))
      )
    }
    return result
  }, [templates, activeFolder, searchQuery])

  const handleMassGenerateExpectedOutputs = async () => {
    setIsMassGenerating(true)
    toast.info('Menyiapkan generator massal untuk seluruh template...')

    try {
      const functions = getFunctions(undefined, 'asia-southeast2')
      const massGenFn = httpsCallable(functions, 'massGenerateExpectedOutputs')

      const result = await massGenFn()
      const data = result.data as any

      if (data.success) {
        toast.success(`Berhasil! ${data.updatedCount} Template berhasil diperbarui.`)
        fetchData()
      } else {
        toast.error('Gagal menjalankan mass generator.')
      }
    } catch (e: any) {
      console.error(e)
      toast.error(`Terjadi kesalahan: ${e.message}`)
    } finally {
      setIsMassGenerating(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    const folderNameClean = newFolderName.trim()

    if (folders.includes(folderNameClean)) {
      toast.error('Folder dengan nama ini sudah ada.')
      return
    }

    try {
      await setDoc(doc(db, 'template_folders', folderNameClean), {
        name: folderNameClean,
        createdAt: new Date().toISOString(),
      })

      setDbFolders((prev) => [...prev, folderNameClean])
      setNewFolderName('')
      setIsCreatingFolder(false)
      toast.success(`Folder "${folderNameClean}" berhasil dibuat!`)
    } catch (e) {
      console.error(e)
      toast.error('Gagal membuat folder.')
    }
  }

  const handleRenameFolder = async (oldName: string) => {
    if (!editFolderName.trim() || editFolderName.trim() === oldName) {
      setEditingFolder(null)
      return
    }
    const newName = editFolderName.trim()

    setTemplates((prev) =>
      prev.map((t) => (t.folder === oldName ? { ...t, folder: newName } : t))
    )
    setDbFolders((prev) => prev.map((f) => (f === oldName ? newName : f)))
    setEditingFolder(null)
    if (activeFolder === oldName) router.push(`?folder=${encodeURIComponent(newName)}`)

    try {
      const batch = writeBatch(db)
      const templatesToUpdate = templates.filter((t) => t.folder === oldName)

      batch.set(doc(db, 'template_folders', newName), {
        name: newName,
        updatedAt: new Date().toISOString(),
      })
      batch.delete(doc(db, 'template_folders', oldName))
      templatesToUpdate.forEach((t) => {
        batch.update(doc(db, 'form_templates', t.id), { folder: newName })
      })
      await batch.commit()
      toast.success('Nama folder berhasil diubah.')
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengubah nama folder.')
      fetchData()
    }
  }

  const handleDeleteFolder = async (folderName: string) => {
    const templatesToUpdate = templates.filter((t) => t.folder === folderName)
    setTemplates((prev) =>
      prev.map((t) => (t.folder === folderName ? { ...t, folder: undefined } : t))
    )
    setDbFolders((prev) => prev.filter((f) => f !== folderName))
    if (activeFolder === folderName) router.push('?folder=Semua')

    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'template_folders', folderName))
      templatesToUpdate.forEach((t) => {
        batch.update(doc(db, 'form_templates', t.id), { folder: null })
      })
      await batch.commit()
      toast.success('Folder berhasil dihapus.')
    } catch (e) {
      console.error(e)
      toast.error('Gagal menghapus folder.')
      fetchData()
    }
  }

  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    if (!isEditMode) return
    setDraggedTemplateId(templateId)
    e.dataTransfer.setData('text/plain', templateId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    if (!isEditMode) return
    e.preventDefault()
    const templateId = e.dataTransfer.getData('text/plain') || draggedTemplateId
    setDraggedTemplateId(null)
    if (!templateId || targetFolder === 'Semua') return

    const finalFolderValue = targetFolder === 'Uncategorized' ? null : targetFolder
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, folder: finalFolderValue || undefined } : t
      )
    )

    try {
      await updateDoc(doc(db, 'form_templates', templateId), { folder: finalFolderValue })
      toast.success('Template berhasil dipindahkan.')
    } catch (error) {
      console.error('Gagal move template', error)
      toast.error('Gagal memindahkan template.')
    }
  }

  const toggleSelectTemplate = (id: string) => {
    if (!isEditMode) return
    setSelectedTemplates((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const selectAllFiltered = () => {
    if (!isEditMode) return
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([])
    } else {
      setSelectedTemplates(filteredTemplates.map((t) => t.id))
    }
  }

  const handleBulkMove = async (targetFolder: string) => {
    if (selectedTemplates.length === 0 || !targetFolder) return
    const finalFolderValue = targetFolder === 'Uncategorized' ? null : targetFolder

    setTemplates((prev) =>
      prev.map((t) =>
        selectedTemplates.includes(t.id)
          ? { ...t, folder: finalFolderValue || undefined }
          : t
      )
    )

    try {
      const batch = writeBatch(db)
      selectedTemplates.forEach((id) => {
        batch.update(doc(db, 'form_templates', id), { folder: finalFolderValue })
      })
      await batch.commit()
      setSelectedTemplates([])
      toast.success(`${selectedTemplates.length} Template dipindahkan ke ${targetFolder}.`)
    } catch (e) {
      console.error('Bulk Move error', e)
      toast.error('Gagal memindahkan beberapa template.')
    }
  }

  const handleBulkDelete = async () => {
    setTemplates((prev) => prev.filter((t) => !selectedTemplates.includes(t.id)))

    try {
      const batch = writeBatch(db)
      selectedTemplates.forEach((id) => {
        batch.delete(doc(db, 'form_templates', id))
      })
      await batch.commit()
      toast.success(`${selectedTemplates.length} Template berhasil dihapus.`)
      setSelectedTemplates([])
    } catch (e) {
      console.error('Bulk Delete error', e)
      toast.error('Gagal menghapus beberapa template.')
    }
  }

  const handleBulkDownload = async () => {
    if (selectedTemplates.length === 0) return

    try {
      toast.info('Sedang menyiapkan file ZIP...')

      const zip = new JSZip()
      const templatesToExport = templates.filter((t) => selectedTemplates.includes(t.id))

      templatesToExport.forEach((template, index) => {
        const safeName = template.trackName
          ? template.trackName
              .replace(/[^a-zA-Z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-')
          : `template_${index + 1}`

        const fileName = `${safeName}.json`
        const dataStr = JSON.stringify(template, null, 2)

        zip.file(fileName, dataStr)
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const dataUri = URL.createObjectURL(zipBlob)

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute(
        'download',
        `Batch_Templates_${new Date().toISOString().split('T')[0]}.zip`
      )
      document.body.appendChild(linkElement)
      linkElement.click()
      document.body.removeChild(linkElement)

      setTimeout(() => URL.revokeObjectURL(dataUri), 100)

      toast.success(`${selectedTemplates.length} Template berhasil diunduh sebagai ZIP.`)
      setSelectedTemplates([])
    } catch (error) {
      console.error('Gagal membuat file ZIP:', error)
      toast.error('Terjadi kesalahan saat meng-compress file ZIP.')
    }
  }

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        if (!importedData || !importedData.trackName || !Array.isArray(importedData.steps)) {
          toast.error('Format Invalid', {
            description: 'File JSON bukan format export Template Form Builder yang sah.',
          })
          return
        }

        if (importedData.aiGenerationStatus) {
          importedData.aiGenerationStatus = {
            phase: 'COMPLETED',
            message: 'Hasil Import JSON.',
            updatedAt: new Date().toISOString(),
          }
        }

        const newTemplate: FormTemplate = {
          trackIcon: 'FileText',
          version: 1,
          ...importedData,
          id: `track_imported_${Date.now()}`,
          trackName: `${importedData.trackName || 'Imported'}`,
          isActive: false,
          lastUpdated: new Date().toISOString(),
          folder: activeFolder !== 'Semua' ? activeFolder : undefined,
        }

        if (!newTemplate.aiPromptConfig) {
          newTemplate.aiPromptConfig = { ...DEFAULT_AI_CONFIG }
        }
        if (!newTemplate.expectedOutputs) {
          newTemplate.expectedOutputs = []
        }

        setActiveTemplate(newTemplate)
        toast.success('Berhasil Import', {
          description: 'Template baru berhasil dimuat dari file JSON.',
        })
        router.push(
          `?folder=${encodeURIComponent(activeFolder)}&edit=${newTemplate.id}&tab=general`
        )
      } catch (error) {
        toast.error('Gagal Membaca File', {
          description:
            'Terjadi kesalahan saat memparsing file JSON. (Catatan: Untuk upload massal belum didukung, extract zip terlebih dahulu).',
        })
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const createNewTemplate = () => {
    const newId = `track_custom_${Date.now()}`
    const newTemplate: FormTemplate = {
      id: newId,
      trackName: 'Template Form Baru',
      trackDescription: 'Deskripsi modul asesmen...',
      trackIcon: 'FileText',
      version: 1,
      isActive: false,
      folder: activeFolder !== 'Semua' ? activeFolder : undefined,
      lastUpdated: new Date().toISOString(),
      expectedOutputs: [],
      aiPromptConfig: {
        aiPersona: '',
        assessmentGoal: '',
        expectedMetrics: [],
        expectedAnalysisBlocks: [],
        expectedRecommendations: [],
        riskFramework: '',
        customScoringRubric: '',
        customSystemPrompt: '',
        negativePrompts: '',
        formatInstructions: '',
        targetAudience: 'company',
        formPurpose: 'assessment' as any,
        customUiLabels: {
          scoreLabel: 'AI Readiness Score',
          swotLabel: 'Capability Matrix (SWOT)',
          riskLabel: 'Critical Risks & Mitigation Map',
          roadmapLabel: 'Rekomendasi Strategis',
          executionLabel: 'Action Plan Timeline',
        },
      },
      steps: [
        {
          stepNumber: 1,
          title: 'Langkah 1',
          fields: [
            {
              id: 'namaUsaha',
              label: 'Nama Entitas/Nama Anda',
              type: 'text',
              required: true,
              gridSpan: 2,
            },
            {
              id: 'namaPengisi',
              label: 'Nama Pengisi/Panggilan',
              type: 'text',
              required: true,
              gridSpan: 2,
            },
          ],
        },
      ],
    }

    setActiveTemplate(newTemplate)
    router.push(`?folder=${encodeURIComponent(activeFolder)}&edit=${newTemplate.id}&tab=general`)
  }

  const duplicateTemplate = () => {
    if (!activeTemplate) return
    const duplicatedId = `track_copy_${Date.now()}`
    const duplicatedTemplate = {
      ...activeTemplate,
      id: duplicatedId,
      trackName: `${activeTemplate.trackName} (Salinan)`,
      isActive: false,
      lastUpdated: new Date().toISOString(),
    }

    if ((duplicatedTemplate as any).aiGenerationStatus) {
      ;(duplicatedTemplate as any).aiGenerationStatus = {
        phase: 'COMPLETED',
        message: 'Hasil Duplikasi.',
        updatedAt: new Date().toISOString(),
      }
    }
    setActiveTemplate(duplicatedTemplate)
    router.push(
      `?folder=${encodeURIComponent(activeFolder)}&edit=${duplicatedId}&tab=general`
    )
    toast.success('Kategori berhasil digandakan!', {
      description: 'Klik "Simpan" untuk merekam permanen ke database.',
    })
  }

  const saveTemplate = async (overrideTemplate?: FormTemplate) => {
    const templateToSave = overrideTemplate || activeTemplate

    if (!templateToSave) return

    const hasNamaUsaha = templateToSave.steps?.some((step) =>
      step.fields?.some((f) => f.id === 'namaUsaha')
    )
    if (!hasNamaUsaha) {
      toast.error('GAGAL MENYIMPAN: Form kehilangan kolom "namaUsaha" (Identitas Utama).', {
        description:
          'Kolom pertama pada langkah 1 harus memiliki id: "namaUsaha" agar database bisa melacak entitas.',
      })
      return
    }

    setIsSaving(true)
    try {
      const templateFinal = {
        ...templateToSave,
        lastUpdated: new Date().toISOString(),
        aiGenerationStatus: {
          phase: 'COMPLETED',
          message: 'Disimpan secara manual oleh Admin.',
          updatedAt: new Date().toISOString(),
        },
      }

      const firestoreSafePayload = JSON.parse(JSON.stringify(templateFinal))

      await setDoc(doc(db, 'form_templates', firestoreSafePayload.id), firestoreSafePayload)

      setTemplates((prev) => {
        const exists = prev.find((t) => t.id === firestoreSafePayload.id)
        if (exists)
          return prev.map((t) =>
            t.id === firestoreSafePayload.id ? firestoreSafePayload : t
          )
        return [firestoreSafePayload, ...prev]
      })

      if (!overrideTemplate) {
        toast.success('Template Form Berhasil Tersimpan!', {
          description: 'Perubahan Anda telah direkam ke database.',
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan ke database.', {
        description: 'Periksa koneksi internet atau konsol log Anda.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'form_templates', id))
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template berhasil dihapus permanen.')
      if (editId === id) {
        router.push(`?folder=${encodeURIComponent(activeFolder)}`)
      }
    } catch (error) {
      console.error(error)
      toast.error('Gagal menghapus template.')
    } finally {
      setDeletingTemplateId(null)
    }
  }

  // ==========================================
  // VIEW 1: DASHBOARD DAFTAR TEMPLATE FORM
  // ==========================================
  if (activeView === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full min-w-0 font-sans">
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="indigo" className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider">
                Dynamic Form Engine
              </Badge>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500">Schema & AI Blueprint Builder</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                <Settings2 className="w-6 h-6" />
              </div>
              Template Form Builder
            </h1>
            <p className="text-slate-500 mt-1 font-medium max-w-2xl text-sm leading-relaxed">
              Kelola struktur pertanyaan, prompt AI, dan direktori modul asesmen secara dinamis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={handleMassGenerateExpectedOutputs}
              disabled={isMassGenerating}
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-2xl h-10 px-4 font-bold text-xs cursor-pointer shadow-xs"
            >
              {isMassGenerating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              {isMassGenerating ? 'Memproses...' : 'Mass Generate'}
            </Button>

            <Button
              variant={isEditMode ? 'default' : 'outline'}
              onClick={() => {
                setIsEditMode(!isEditMode)
                if (isEditMode) setSelectedTemplates([])
              }}
              className={`rounded-2xl h-10 px-4 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isEditMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isEditMode ? <CheckCircle2 className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
              {isEditMode ? 'Selesai Mengatur' : 'Atur Organisasi'}
            </Button>

            <div className="hidden sm:flex bg-slate-100 p-1 rounded-2xl ring-1 ring-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white shadow-xs text-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListIcon size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-xs text-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <label className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-bold cursor-pointer shadow-xs transition-all">
              <Upload className="h-4 w-4 text-slate-500" /> Import JSON
              <input type="file" accept=".json" onChange={importTemplate} className="hidden" />
            </label>

            <Button
              onClick={createNewTemplate}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl shadow-lg shadow-indigo-600/25 gap-1.5 h-10 px-5 font-bold text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Template Baru
            </Button>
          </div>
        </div>

        {/* FOLDER DIRECTORY TABS */}
        <div className="w-full bg-white p-3 rounded-3xl ring-1 ring-slate-200/80 shadow-2xs flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-1 shrink-0">
            <Folder size={12} /> DIREKTORI:
          </span>

          {folders.map((folderName) => {
            const name = folderName as string
            const isCurrentActive = activeFolder === name
            const count =
              name === 'Semua'
                ? templates.length
                : name === 'Uncategorized'
                ? templates.filter((t) => !t.folder).length
                : templates.filter((t) => t.folder === name).length

            return (
              <button
                key={name}
                onClick={() => router.push(`?folder=${encodeURIComponent(name)}`)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, name)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl cursor-pointer transition-all border shrink-0 text-xs font-bold ${
                  isCurrentActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isCurrentActive ? (
                  <FolderOpen size={15} className="text-white shrink-0" />
                ) : (
                  <Folder size={15} className="text-slate-400 shrink-0" />
                )}
                <span>{name}</span>
                <Badge
                  variant={isCurrentActive ? 'secondary' : 'indigo'}
                  className="text-[9px] px-1.5 py-0 font-extrabold"
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* SEARCH BAR & DATATABLE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl ring-1 ring-slate-200/80 shadow-2xs">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Cari di folder ${activeFolder}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl h-9 pl-9 pr-4 text-xs font-medium outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-3xl border border-dashed border-slate-200 ring-1 ring-slate-100">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-700">
                {searchQuery ? 'Pencarian Tidak Ditemukan' : 'Folder Kosong'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {searchQuery
                  ? `Tidak ada form yang cocok dengan "${searchQuery}".`
                  : 'Tarik form dari folder lain dan lepas di folder ini.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identitas Template</TableHead>
                  <TableHead>Status Publikasi</TableHead>
                  <TableHead className="text-center">Isi Form</TableHead>
                  <TableHead className="text-right">Update Terakhir</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-slate-50/70 group">
                    <TableCell>
                      <div
                        onClick={() =>
                          router.push(
                            `?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`
                          )
                        }
                        className="cursor-pointer"
                      >
                        <p className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {template.trackName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                          {template.trackDescription || 'Tanpa deskripsi'}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      {template.isActive ? (
                        <Badge variant="emerald" className="text-[10px] px-2.5 py-0.5">
                          Aktif (Publik)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5">
                          Draf Admin
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-center font-extrabold text-slate-700 text-xs">
                      {template.steps?.length || 0} Langkah
                    </TableCell>

                    <TableCell className="text-right text-xs font-medium text-slate-400">
                      {new Date(template.lastUpdated).toLocaleDateString('id-ID')}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          onClick={() =>
                            router.push(
                              `?folder=${encodeURIComponent(activeFolder)}&edit=${template.id}&tab=general`
                            )
                          }
                          variant="ghost"
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 h-8 px-3 rounded-xl font-bold text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 rounded-xl"
                              title="Hapus Template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Template Form?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus <strong>{template.trackName}</strong> secara permanen? Data yang dihapus tidak dapat dikembalikan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTemplate(template.id)}>
                                Ya, Hapus Permanen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: EDITOR TEMPLATE FORM (EDIT MODE)
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20 w-full min-w-0 font-sans">
      {/* HEADER EDITOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl ring-1 ring-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push(`?folder=${encodeURIComponent(activeFolder)}`)}
            className="w-10 h-10 p-0 rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-600 shrink-0"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="indigo" className="text-[9px]">
                {activeTemplate?.folder || 'Uncategorized'}
              </Badge>
              {activeTemplate?.isActive ? (
                <Badge variant="emerald" className="text-[9px]">
                  Publik
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px]">
                  Draf
                </Badge>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight mt-1">
              {activeTemplate?.trackName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={duplicateTemplate}
            variant="outline"
            className="rounded-xl h-10 px-4 font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Copy className="w-4 h-4 mr-1.5 text-slate-500" /> Salin Template
          </Button>

          <Button
            onClick={() => saveTemplate()}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* TABS NAVIGATION EDITOR */}
      <Tabs
        value={activeTab}
        onValueChange={(val) =>
          router.push(
            `?folder=${encodeURIComponent(activeFolder)}&edit=${activeTemplate?.id}&tab=${val}`
          )
        }
        className="w-full"
      >
        <TabsList className="bg-white border border-slate-200/80 p-1 rounded-2xl shadow-2xs">
          <TabsTrigger value="general" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
            <FileEdit className="w-4 h-4" /> Informasi Umum
          </TabsTrigger>
          <TabsTrigger value="builder" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
            <LayoutGrid className="w-4 h-4" /> Form Builder
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
            <BrainCircuit className="w-4 h-4" /> Konfigurasi AI
          </TabsTrigger>
          <TabsTrigger value="adaptive" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
            <Sparkles className="w-4 h-4" /> Adaptive RAG
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
            <Eye className="w-4 h-4" /> Preview Live
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
            <Terminal className="w-4 h-4" /> Log Generation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          {activeTemplate && (
            <TabGeneral
              template={activeTemplate}
              onChange={(updated) => setActiveTemplate(updated)}
            />
          )}
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          {activeTemplate && (
            <TabFormBuilder
              template={activeTemplate}
              onChange={(updated) => setActiveTemplate(updated)}
            />
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          {activeTemplate && (
            <TabAIConfig
              template={activeTemplate}
              onChange={(updated) => setActiveTemplate(updated)}
            />
          )}
        </TabsContent>

        <TabsContent value="adaptive" className="mt-6">
          {activeTemplate && (
            <TabAdaptive
              template={activeTemplate}
              onChange={(updated) => setActiveTemplate(updated)}
            />
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          {activeTemplate && <AdminTemplatePreview template={activeTemplate} />}
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          {activeTemplate && <TabLogs template={activeTemplate} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function TemplateBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <TemplateBuilderContent />
    </Suspense>
  )
}