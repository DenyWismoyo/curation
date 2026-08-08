// src/app/admin/tokens/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, deleteField } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  KeyRound,
  Download,
  Plus,
  Building2,
  Users,
  Sparkles,
  Zap,
  Eye,
  X,
  Copy,
  Check,
  Search,
  ShieldCheck,
  UserCheck,
  Trash2,
  Edit3,
  FileText,
  Settings2,
} from 'lucide-react'

import { TokenExportPDFButton } from '@/features/assessment/components/pdf/TokenExportPDFButton';
import { DocumentPresets } from '@/config/templates/documentPromptTemplates'

interface CorporateBatch {
  id: string
  corporateName: string
  modelType: 'flash' | 'pro'
  totalTokens: number
  usedCount: number
  createdAt: string
  organizationId?: string
  programName?: string
  allowedTemplates?: string[]
  allowedDocumentTemplates?: string[]
  tokens: Record<string, { isUsed: boolean; usedAt: string | null; usedByNamaUsaha: string | null }>
}

interface CuratorToken {
  id: string
  programName: string
  createdAt: string
  role: string
}

interface FormTemplateLight {
  id: string
  trackName: string
  isActive: boolean
}

interface B2BOrganizationLight {
  id: string
  displayName: string
}

export default function TokenManagerPage() {
  const [activeTab, setActiveTab] = useState<'peserta' | 'kurator'>('peserta')
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const [availableTemplates, setAvailableTemplates] = useState<FormTemplateLight[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [selectedDocTemplates, setSelectedDocTemplates] = useState<string[]>([])

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [editingAllowedTemplates, setEditingAllowedTemplates] = useState<string[]>([])
  const [editingDocTemplates, setEditingDocTemplates] = useState<string[]>([])
  const [isUpdatingTemplates, setIsUpdatingTemplates] = useState(false)

  const [batches, setBatches] = useState<CorporateBatch[]>([])
  const [qty, setQty] = useState(50)
  
  const [organizations, setOrganizations] = useState<B2BOrganizationLight[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [programName, setProgramName] = useState('')
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash')

  const [curatorTokens, setCuratorTokens] = useState<CuratorToken[]>([])
  const [curatorProgram, setCuratorProgram] = useState('')
  const [curatorCode, setCuratorCode] = useState('')

  const [selectedBatch, setSelectedBatch] = useState<CorporateBatch | null>(null)
  const [searchToken, setSearchToken] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const [editingQuotaBatch, setEditingQuotaBatch] = useState<CorporateBatch | null>(null)
  const [newQuotaAmount, setNewQuotaAmount] = useState<number>(0)
  const [isUpdatingQuota, setIsUpdatingQuota] = useState(false)
  const [deletingCuratorTokenId, setDeletingCuratorTokenId] = useState<string | null>(null)
  const [migratingBatchId, setMigratingBatchId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const qTemplates = query(collection(db, 'form_templates'))
      const snapTemplates = await getDocs(qTemplates)
      const dataTemplates = snapTemplates.docs
        .map(
          (d) =>
            ({
              id: d.id,
              trackName: d.data().trackName,
              isActive: d.data().isActive,
            } as FormTemplateLight)
        )
        .filter((t) => t.isActive)
      setAvailableTemplates(dataTemplates)

      const qOrgs = query(collection(db, 'b2b_organizations'))
      const snapOrgs = await getDocs(qOrgs)
      const dataOrgs = snapOrgs.docs.map((d) => ({ 
        id: d.id, 
        displayName: d.data().displayName || d.data().name || d.id 
      } as B2BOrganizationLight))
      // Sort alphabetically by displayName
      dataOrgs.sort((a, b) => a.displayName.localeCompare(b.displayName))
      setOrganizations(dataOrgs)

      const qBatch = query(collection(db, 'corporate_tokens'), orderBy('createdAt', 'desc'))
      const snapBatch = await getDocs(qBatch)
      const dataBatch = snapBatch.docs.map((d) => ({ id: d.id, ...d.data() } as CorporateBatch))
      setBatches(dataBatch)

      const qCurator = query(collection(db, 'curator_tokens'), orderBy('createdAt', 'desc'))
      const snapCurator = await getDocs(qCurator)
      const dataCurator = snapCurator.docs.map((d) => ({ id: d.id, ...d.data() } as CuratorToken))
      setCuratorTokens(dataCurator)
    } catch (e) {
      console.error(e)
      toast.error('Gagal menarik data dari server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const uniquePrograms = Array.from(new Set(batches.map((b) => b.corporateName)))

  const generateCorporateBatch = async () => {
    if (!selectedOrganizationId) return toast.warning('Pilih Organisasi B2B terlebih dahulu.')
    if (!programName) return toast.warning('Nama Program wajib diisi.')
    if (qty < 1 || qty > 5000) return toast.warning('Jumlah token maksimal 5000 per batch.')

    const org = organizations.find((o) => o.id === selectedOrganizationId)
    const orgPrefix = org ? org.displayName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'B2B'
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const generatedCorpId = `${orgPrefix}${randomSuffix}`
    
    const combinedCorporateName = org ? `${org.displayName} - ${programName}` : programName

    setIsGenerating(true)
    try {
      const newTokens: Record<string, any> = {}
      for (let i = 0; i < qty; i++) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
        newTokens[randomStr] = { isUsed: false, usedAt: null, usedByNamaUsaha: null }
      }

      const batchData = {
        organizationId: selectedOrganizationId,
        programName,
        corporateName: combinedCorporateName,
        modelType,
        totalTokens: qty,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        allowedTemplates: selectedTemplates,
        allowedDocumentTemplates: selectedDocTemplates,
        tokens: newTokens,
      }

      await setDoc(doc(db, 'corporate_tokens', generatedCorpId), batchData)
      setBatches([{ id: generatedCorpId, ...batchData } as CorporateBatch, ...batches])
      toast.success(`Berhasil! Batch untuk ${combinedCorporateName} dibuat.`)

      setProgramName('')
      setSelectedOrganizationId('')
      setSelectedTemplates([])
      setSelectedDocTemplates([])
    } catch (e) {
      console.error(e)
      toast.error('Gagal membuat token batch.')
    } finally {
      setIsGenerating(false)
    }
  }

  const updateBatchTemplates = async (batchId: string) => {
    setIsUpdatingTemplates(true)
    try {
      await updateDoc(doc(db, 'corporate_tokens', batchId), {
        allowedTemplates: editingAllowedTemplates,
        allowedDocumentTemplates: editingDocTemplates,
      })

      setBatches(
        batches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                allowedTemplates: editingAllowedTemplates,
                allowedDocumentTemplates: editingDocTemplates,
              }
            : b
        )
      )

      toast.success('Batasan modul & dokumen berhasil diperbarui.')
      setEditingBatchId(null)
    } catch (e) {
      console.error(e)
      toast.error('Gagal memperbarui batasan template.')
    } finally {
      setIsUpdatingTemplates(false)
    }
  }

  const handleSaveQuota = async () => {
    if (!editingQuotaBatch) return
    const diff = newQuotaAmount - editingQuotaBatch.totalTokens

    if (newQuotaAmount < editingQuotaBatch.usedCount) {
      toast.error(`Total kuota baru tidak boleh kurang dari jumlah yang sudah terpakai (${editingQuotaBatch.usedCount}).`)
      return
    }

    setIsUpdatingQuota(true)
    try {
      const updatedTokens = { ...editingQuotaBatch.tokens }

      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
          updatedTokens[randomStr] = { isUsed: false, usedAt: null, usedByNamaUsaha: null }
        }
      } else if (diff < 0) {
        const removeCount = Math.abs(diff)
        const unusedKeys = Object.keys(updatedTokens).filter((k) => !updatedTokens[k].isUsed)

        if (unusedKeys.length < removeCount) {
          toast.error('Gagal menghapus token. Jumlah token tersisa tidak mencukupi.')
          setIsUpdatingQuota(false)
          return
        }

        for (let i = 0; i < removeCount; i++) {
          delete updatedTokens[unusedKeys[i]]
        }
      }

      await updateDoc(doc(db, 'corporate_tokens', editingQuotaBatch.id), {
        totalTokens: newQuotaAmount,
        tokens: updatedTokens,
      })

      setBatches(
        batches.map((b) =>
          b.id === editingQuotaBatch.id
            ? { ...b, totalTokens: newQuotaAmount, tokens: updatedTokens }
            : b
        )
      )

      toast.success(`Kuota berhasil diperbarui menjadi ${newQuotaAmount} token.`)
      setEditingQuotaBatch(null)
    } catch (e) {
      console.error(e)
      toast.error('Gagal memperbarui kuota.')
    } finally {
      setIsUpdatingQuota(false)
    }
  }

  const generateCuratorToken = async () => {
    if (!curatorProgram) return toast.warning('Pilih program terlebih dahulu.')
    if (!curatorCode || curatorCode.length < 4) return toast.warning('Kode login minimal 4 karakter.')

    setIsGenerating(true)
    try {
      const curatorData = {
        programName: curatorProgram,
        createdAt: new Date().toISOString(),
        role: 'curator',
      }
      await setDoc(doc(db, 'curator_tokens', curatorCode), curatorData)
      setCuratorTokens([{ id: curatorCode, ...curatorData }, ...curatorTokens])
      toast.success(`Akses Kurator [${curatorCode}] dibuat!`)
      setCuratorCode('')
    } catch (e) {
      console.error(e)
      toast.error('Gagal membuat akses kurator.')
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteCuratorToken = async (tokenId: string) => {
    try {
      await deleteDoc(doc(db, 'curator_tokens', tokenId))
      setCuratorTokens(curatorTokens.filter((t) => t.id !== tokenId))
      toast.success('Akses kurator dicabut.')
    } catch (e) {
      console.error(e)
      toast.error('Gagal mencabut akses.')
    } finally {
      setDeletingCuratorTokenId(null)
    }
  }

  const handleMigrateToTenant = async (batch: CorporateBatch) => {
    setMigratingBatchId(batch.id)
    try {
      const upsertB2B = httpsCallable(functions, 'adminUpsertB2BOrganization')
      const res = await upsertB2B({ 
        name: batch.corporateName, 
        status: 'active',
        tags: ['migrated-from-tokens']
      }) as any
      
      const newOrgId = res.data.organization.id
      
      await updateDoc(doc(db, 'corporate_tokens', batch.id), {
        organizationId: newOrgId
      })
      
      setBatches(batches.map(b => b.id === batch.id ? { ...b, organizationId: newOrgId } : b))
      toast.success(`Berhasil! Data telah dimigrasi ke Tenant B2B.`)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Gagal memigrasi ke Tenant B2B.')
    } finally {
      setMigratingBatchId(null)
    }
  }

  const handleUnlinkTenant = async (batchId: string) => {
    if (!confirm('Lepas tautan dari Tenant B2B?')) return
    try {
      await updateDoc(doc(db, 'corporate_tokens', batchId), {
        organizationId: deleteField()
      })
      setBatches(batches.map(b => b.id === batchId ? { ...b, organizationId: undefined } : b))
      toast.success('Berhasil! Tautan ke Tenant telah dilepas.')
    } catch (e: any) {
      console.error(e)
      toast.error('Gagal melepas tautan.')
    }
  }

  const exportTokensToCSV = (batchId: string, batchData: CorporateBatch) => {
    const rows = [
      ['Corporate Name', batchData.corporateName],
      ['ID Prefix', batchId],
      ['AI Model', batchData.modelType.toUpperCase()],
      ['Total Tokens', batchData.totalTokens],
      ['Used Count', batchData.usedCount],
      ['Created At', new Date(batchData.createdAt).toLocaleString('id-ID')],
      [],
      ['Full Token Code', 'Status', 'Claimed By', 'Used At'],
    ]

    Object.entries(batchData.tokens).forEach(([code, data]) => {
      rows.push([
        `${batchId}-${code}`,
        data.isUsed ? 'USED' : 'AVAILABLE',
        data.usedByNamaUsaha || '-',
        data.usedAt ? new Date(data.usedAt).toLocaleString('id-ID') : '-',
      ])
    })

    const csvContent = rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute(
      'download',
      `Token_${batchData.modelType.toUpperCase()}_${batchId}_${batchData.corporateName.replace(/\s+/g, '_')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyToken = (tokenStr: string) => {
    navigator.clipboard.writeText(tokenStr)
    setCopiedToken(tokenStr)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const getFilteredTokens = () => {
    if (!selectedBatch) return []
    const entries = Object.entries(selectedBatch.tokens)
    if (!searchToken) return entries

    const lowerSearch = searchToken.toLowerCase()
    return entries.filter(([code, data]) => {
      const fullToken = `${selectedBatch.id}-${code}`.toLowerCase()
      const userName = (data.usedByNamaUsaha || '').toLowerCase()
      return fullToken.includes(lowerSearch) || userName.includes(lowerSearch)
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="indigo" className="px-2.5 py-0.5 text-[10px]">
              Token Control Center
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Akses & Kuota Token
          </h1>
          <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Kelola kuota kurasi untuk peserta (batch) dan berikan akses untuk para kurator secara terpusat.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="card-solid border border-border/80 p-1 rounded-2xl shadow-xs">
            <TabsTrigger value="peserta" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
              <Users className="w-4 h-4" /> Peserta ({batches.length})
            </TabsTrigger>
            <TabsTrigger value="kurator" className="rounded-xl px-5 py-2 text-xs font-bold gap-2">
              <UserCheck className="w-4 h-4" /> Kurator ({curatorTokens.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'peserta' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* FORM GENERATE BATCH */}
          <Card className="p-6 sm:p-8 card-solid rounded-3xl shadow-xs border-none ring-1 ring-border/80 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-end gap-5">
              <div className="space-y-2 flex-1 w-full">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                  Pilih Tenant / Organisasi B2B
                </label>
                <select
                  value={selectedOrganizationId}
                  onChange={(e) => setSelectedOrganizationId(e.target.value)}
                  className="w-full h-12 rounded-xl bg-muted text-muted-foreground/80 font-bold px-3 border border-border focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>-- Pilih Organisasi --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 w-full md:w-64">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                  Nama Program / Batch
                </label>
                <Input
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="Contoh: Batch 1"
                  className="h-12 rounded-xl bg-muted text-muted-foreground/80 font-bold"
                />
              </div>
              <div className="space-y-2 w-full md:w-32">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                  Jumlah Token
                </label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  min={1}
                  max={5000}
                  className="h-12 rounded-xl bg-muted text-muted-foreground/80 font-bold text-center"
                />
              </div>
            </div>

            {/* FILTER MODUL ASESMEN */}
            <div className="pt-4 border-t border-border space-y-3">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                <span>1. Batasi Akses Form Modul Asesmen</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableTemplates.map((tpl) => (
                  <label
                    key={tpl.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedTemplates.includes(tpl.id)
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10/50 shadow-2xs'
                        : 'border-border bg-muted text-muted-foreground/50 hover:border-indigo-200 dark:border-indigo-500/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 dark:text-indigo-400 rounded border-border focus:ring-indigo-500"
                      checked={selectedTemplates.includes(tpl.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTemplates([...selectedTemplates, tpl.id])
                        else setSelectedTemplates(selectedTemplates.filter((id) => id !== tpl.id))
                      }}
                    />
                    <span
                      className={`text-xs font-extrabold ${
                        selectedTemplates.includes(tpl.id) ? 'text-indigo-900' : 'text-slate-700'
                      }`}
                    >
                      {tpl.trackName}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* FILTER DOKUMEN WORD */}
            <div className="pt-4 border-t border-border space-y-3">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                <span>2. Batasi Akses Template Dokumen AI (Word)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DocumentPresets.map((docTpl) => (
                  <label
                    key={docTpl.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedDocTemplates.includes(docTpl.id)
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10/50 shadow-2xs'
                        : 'border-border bg-muted text-muted-foreground/50 hover:border-emerald-200 dark:border-emerald-500/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-emerald-600 dark:text-emerald-400 rounded border-border focus:ring-emerald-500"
                      checked={selectedDocTemplates.includes(docTpl.id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedDocTemplates([...selectedDocTemplates, docTpl.id])
                        else
                          setSelectedDocTemplates(
                            selectedDocTemplates.filter((id) => id !== docTpl.id)
                          )
                      }}
                    />
                    <span
                      className={`text-xs font-extrabold ${
                        selectedDocTemplates.includes(docTpl.id)
                          ? 'text-emerald-900'
                          : 'text-slate-700'
                      }`}
                    >
                      {docTpl.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-4 border-t border-border">
              <div className="space-y-2 w-full md:w-auto">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                  Pilih Mesin AI (Model)
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModelType('flash')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      modelType === 'flash'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'border-border card-solid text-muted-foreground hover:border-indigo-300'
                    }`}
                  >
                    <Zap className="w-4 h-4" /> AI Flash (Standar)
                  </button>
                  <button
                    onClick={() => setModelType('pro')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      modelType === 'pro'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border card-solid text-muted-foreground hover:border-amber-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> AI Pro (Premium)
                  </button>
                </div>
              </div>

              <Button
                onClick={generateCorporateBatch}
                disabled={isGenerating}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> {isGenerating ? 'Memproses...' : 'Buat Batch Baru'}
              </Button>
            </div>
          </Card>

          {/* TABEL BATCH TOKEN */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Program</TableHead>
                <TableHead>Tipe & Prefix</TableHead>
                <TableHead>Akses Modul & Dokumen</TableHead>
                <TableHead className="text-center">Penggunaan</TableHead>
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
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold">
                    Belum ada batch token peserta.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-muted text-muted-foreground/70">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 ring-1 ring-indigo-100">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="font-extrabold text-foreground text-sm">{batch.corporateName}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {new Date(batch.createdAt).toLocaleDateString('id-ID')}
                          </p>
                          {batch.organizationId && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="indigo" className="text-[9px] px-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                Linked to Tenant
                              </Badge>
                              <button 
                                onClick={() => handleUnlinkTenant(batch.id)}
                                className="text-[9px] text-slate-400 hover:text-red-500 font-medium underline"
                                title="Lepas tautan dari Tenant"
                              >
                                Unlink
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <Badge variant={batch.modelType === 'pro' ? 'amber' : 'indigo'} className="text-[9px] px-2 py-0">
                          AI {batch.modelType.toUpperCase()}
                        </Badge>
                        <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10/80 px-2 py-0.5 rounded-lg text-xs ring-1 ring-indigo-100/50">
                          {batch.id}-******
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top max-w-[280px]">
                      {editingBatchId === batch.id ? (
                        <div className="space-y-4 card-solid p-4 rounded-2xl ring-1 ring-border shadow-md relative z-10 w-[300px]">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                              1. Akses Form Asesmen:
                            </p>
                            <div className="max-h-[100px] overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                              {availableTemplates.map((tpl) => (
                                <label key={tpl.id} className="flex items-start gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 rounded text-indigo-600 dark:text-indigo-400"
                                    checked={editingAllowedTemplates.includes(tpl.id)}
                                    onChange={(e) => {
                                      if (e.target.checked)
                                        setEditingAllowedTemplates([...editingAllowedTemplates, tpl.id])
                                      else
                                        setEditingAllowedTemplates(
                                          editingAllowedTemplates.filter((id) => id !== tpl.id)
                                        )
                                    }}
                                  />
                                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 dark:text-indigo-400">
                                    {tpl.trackName}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 border-t border-border pt-3">
                              2. Akses Dokumen Word:
                            </p>
                            <div className="max-h-[100px] overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                              {DocumentPresets.map((docTpl) => (
                                <label key={docTpl.id} className="flex items-start gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 rounded text-emerald-600 dark:text-emerald-400"
                                    checked={editingDocTemplates.includes(docTpl.id)}
                                    onChange={(e) => {
                                      if (e.target.checked)
                                        setEditingDocTemplates([...editingDocTemplates, docTpl.id])
                                      else
                                        setEditingDocTemplates(
                                          editingDocTemplates.filter((id) => id !== docTpl.id)
                                        )
                                    }}
                                  />
                                  <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 dark:text-emerald-400">
                                    {docTpl.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button
                              size="sm"
                              className="h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex-1 rounded-xl"
                              onClick={() => updateBatchTemplates(batch.id)}
                              disabled={isUpdatingTemplates}
                            >
                              Simpan
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-3 text-muted-foreground flex-1 rounded-xl"
                              onClick={() => setEditingBatchId(null)}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Modul Form:</p>
                            <div className="flex flex-wrap gap-1">
                              {!batch.allowedTemplates || batch.allowedTemplates.length === 0 ? (
                                <Badge variant="secondary" className="text-[9px]">
                                  Semua Modul
                                </Badge>
                              ) : (
                                batch.allowedTemplates.map((id) => {
                                  const tName =
                                    availableTemplates.find((t) => t.id === id)?.trackName ||
                                    'Form Dihapus'
                                  return (
                                    <Badge key={id} variant="indigo" className="text-[9px] truncate max-w-[140px]">
                                      {tName}
                                    </Badge>
                                  )
                                })
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dokumen Word:</p>
                            <div className="flex flex-wrap gap-1">
                              {!batch.allowedDocumentTemplates ||
                              batch.allowedDocumentTemplates.length === 0 ? (
                                <Badge variant="secondary" className="text-[9px]">
                                  Semua Dokumen
                                </Badge>
                              ) : (
                                batch.allowedDocumentTemplates.map((id) => {
                                  const dName =
                                    DocumentPresets.find((d) => d.id === id)?.name ||
                                    'Dokumen Dihapus'
                                  return (
                                    <Badge key={id} variant="emerald" className="text-[9px] truncate max-w-[140px]">
                                      <FileText size={10} className="mr-1" />
                                      {dName}
                                    </Badge>
                                  )
                                })
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setEditingBatchId(batch.id)
                              setEditingAllowedTemplates(batch.allowedTemplates || [])
                              setEditingDocTemplates(batch.allowedDocumentTemplates || [])
                            }}
                            className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline mt-1"
                          >
                            <Edit3 size={10} /> Ubah Batasan Akses
                          </button>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <div className="font-black text-foreground text-base">
                          {batch.usedCount || 0}{' '}
                          <span className="text-slate-400 text-xs">/ {batch.totalTokens}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-secondary text-secondary-foreground rounded-full mt-1.5 overflow-hidden relative">
                          <div
                            className="absolute h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${((batch.usedCount || 0) / batch.totalTokens) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1.5">
                        <Button
                          onClick={() => {
                            setEditingQuotaBatch(batch)
                            setNewQuotaAmount(batch.totalTokens)
                          }}
                          variant="outline"
                          className="border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 shadow-2xs w-9 h-9 p-0 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl"
                          title="Atur Ulang Kuota Token"
                        >
                          <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </Button>

                        <Button
                          onClick={() => setSelectedBatch(batch)}
                          variant="outline"
                          className="border-border card-solid shadow-2xs w-9 h-9 p-0 rounded-xl"
                          title="Lihat Detail Kode Token"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>

                        <Button
                          onClick={() => exportTokensToCSV(batch.id, batch)}
                          variant="outline"
                          className="border-indigo-200 dark:border-indigo-500/20 card-solid shadow-2xs w-9 h-9 p-0 rounded-xl"
                          title="Unduh CSV"
                        >
                          <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </Button>

                        <TokenExportPDFButton batch={batch} availableTemplates={availableTemplates} />
                        
                        {!batch.organizationId && (
                          <Button
                            onClick={() => handleMigrateToTenant(batch)}
                            disabled={migratingBatchId === batch.id}
                            variant="outline"
                            className="border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 shadow-2xs h-9 px-2.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl flex items-center gap-1.5"
                            title="Migrasi ke Tenant B2B"
                          >
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {migratingBatchId === batch.id ? 'Loading...' : 'Ke Tenant'}
                            </span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 2: MANAJEMEN AKSES KURATOR */}
      {activeTab === 'kurator' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="p-6 sm:p-8 card-solid rounded-3xl shadow-xs border-none ring-1 ring-border/80 flex flex-col md:flex-row items-end gap-5">
            <div className="space-y-2 flex-1 w-full">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Nama Program / Entitas Tugas
              </label>
              <select
                value={curatorProgram}
                onChange={(e) => setCuratorProgram(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-muted text-muted-foreground/80 px-3 py-2 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="" disabled>
                  -- Pilih Program / Entitas --
                </option>
                {uniquePrograms.map((prog, idx) => (
                  <option key={idx} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 w-full md:w-64">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Kode Login Kurator
              </label>
              <Input
                value={curatorCode}
                onChange={(e) => setCuratorCode(e.target.value.toUpperCase().replace(/\s/g, '-'))}
                placeholder="CUR-SOLO-2026"
                className="h-12 rounded-xl bg-muted text-muted-foreground/80 uppercase font-mono font-bold"
              />
            </div>

            <Button
              onClick={generateCuratorToken}
              disabled={isGenerating}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 rounded-xl font-bold shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Buat Akses
            </Button>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode Login (Token)</TableHead>
                <TableHead>Ditugaskan Untuk Program</TableHead>
                <TableHead className="text-center">Tanggal Dibuat</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <Skeleton className="h-6 w-full max-w-md mx-auto rounded-xl" />
                  </TableCell>
                </TableRow>
              ) : curatorTokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-bold">
                    Belum ada akses kurator yang dibuat.
                  </TableCell>
                </TableRow>
              ) : (
                curatorTokens.map((token) => (
                  <TableRow key={token.id} className="hover:bg-muted text-muted-foreground/70">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyToken(token.id)}
                          className="h-8 px-2 border-border rounded-lg"
                        >
                          {copiedToken === token.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg ring-1 ring-emerald-100/50">
                          {token.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-extrabold text-foreground text-sm">{token.programName}</span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground font-medium text-xs">
                      {new Date(token.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-rose-500 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:bg-rose-500/10 h-9 w-9 p-0 rounded-xl"
                            title="Cabut Akses"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cabut Akses Kurator?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus kode akses <strong>{token.id}</strong>? Kurator terkait tidak akan dapat masuk kembali menggunakan kode ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCuratorToken(token.id)}>
                              Ya, Cabut Akses
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* MODAL EDIT KUOTA TOKEN */}
      {editingQuotaBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card-solid rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col ring-1 ring-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted text-muted-foreground/50">
              <div>
                <h3 className="text-lg font-black text-foreground">Atur Ulang Kuota Token</h3>
                <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-widest">
                  {editingQuotaBatch.corporateName}
                </p>
              </div>
              <button
                onClick={() => setEditingQuotaBatch(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted text-muted-foreground rounded-2xl ring-1 ring-border">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Awal</p>
                  <p className="text-2xl font-black text-foreground">{editingQuotaBatch.totalTokens}</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Terpakai</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{editingQuotaBatch.usedCount}</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sisa Aktif</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {editingQuotaBatch.totalTokens - editingQuotaBatch.usedCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Tentukan Total Kuota Baru
                </label>
                <Input
                  type="number"
                  min={editingQuotaBatch.usedCount}
                  max={5000}
                  value={newQuotaAmount}
                  onChange={(e) => setNewQuotaAmount(Number(e.target.value))}
                  className="h-14 text-xl font-black card-solid rounded-xl text-center"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border bg-muted text-muted-foreground/50 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingQuotaBatch(null)}
                className="w-full h-12 rounded-xl font-bold border-border text-muted-foreground hover:bg-secondary text-secondary-foreground"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveQuota}
                disabled={
                  isUpdatingQuota ||
                  newQuotaAmount === editingQuotaBatch.totalTokens ||
                  newQuotaAmount < editingQuotaBatch.usedCount
                }
                className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
              >
                {isUpdatingQuota ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL BATCH KODE TOKEN */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card-solid rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col ring-1 ring-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted text-muted-foreground/50">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Detail Batch: {selectedBatch.corporateName}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                  Prefix: {selectedBatch.id} | Total: {selectedBatch.totalTokens} Token
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBatch(null)
                  setSearchToken('')
                  setEditingBatchId(null)
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary text-secondary-foreground text-muted-foreground hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border card-solid">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder="Cari Kode Token atau Nama Usaha..."
                  className="pl-9 h-11 bg-muted text-muted-foreground border-border rounded-xl font-medium text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-muted text-muted-foreground/30 p-4 space-y-3 custom-scrollbar">
              {getFilteredTokens().length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold text-sm">
                  Tidak ada token yang cocok.
                </div>
              ) : (
                getFilteredTokens().map(([code, data]) => {
                  const fullToken = `${selectedBatch.id}-${code}`
                  return (
                    <div
                      key={code}
                      className="card-solid p-4 rounded-2xl ring-1 ring-border shadow-2xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-black text-foreground font-mono bg-secondary text-secondary-foreground px-3 py-1 rounded-lg border border-border">
                            {fullToken}
                          </code>
                          {data.isUsed ? (
                            <Badge variant="amber" className="text-[9px]">
                              Terpakai
                            </Badge>
                          ) : (
                            <Badge variant="emerald" className="text-[9px]">
                              Tersedia
                            </Badge>
                          )}
                        </div>
                        {data.isUsed && data.usedByNamaUsaha && (
                          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> Diklaim oleh{' '}
                            <strong className="text-slate-700">{data.usedByNamaUsaha}</strong>
                          </div>
                        )}
                      </div>

                      {!data.isUsed ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyToken(fullToken)}
                          className={`shrink-0 rounded-xl font-bold h-9 px-4 text-xs ${
                            copiedToken === fullToken
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                          }`}
                        >
                          {copiedToken === fullToken ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1" /> Tersalin!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Kode
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="shrink-0 h-9 px-3 flex items-center justify-center text-xs font-bold text-slate-400 bg-muted text-muted-foreground rounded-xl ring-1 ring-border cursor-not-allowed">
                          Token Tidak Berlaku
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}