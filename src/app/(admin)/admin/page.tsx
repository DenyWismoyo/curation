// src/app/admin/page.tsx
'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  Search,
  Users,
  Target,
  FolderOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  Building2,
  ChevronLeft,
  Briefcase,
  Layers,
  BarChart3,
  Filter,
} from 'lucide-react'

export interface AssessmentDoc {
  id: string
  trackType: string
  namaUsaha: string
  email: string
  whatsapp: string
  score: number
  readinessLevel: string
  formData: any
  aiResult: any
  createdAt: string
  status?: string
  corporateEntity?: string
  curatorAssessment?: any
  analyticsSummary?: any
}

function AdminDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeProgramFolder = searchParams.get('folder')

  const [assessments, setAssessments] = useState<AssessmentDoc[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    const fetchAssessments = async () => {
      const q = query(collection(db, 'assessments'), orderBy('createdAt', 'desc'), limit(50))
      try {
        const snapshot = await getDocs(q)
        const data: AssessmentDoc[] = []
        snapshot.forEach((doc) => {
          const item = doc.data()
          let dateStr = new Date().toISOString()
          if (item.createdAt && typeof item.createdAt.toDate === 'function') {
            dateStr = item.createdAt.toDate().toISOString()
          } else if (item.createdAt) {
            dateStr = new Date(item.createdAt).toISOString()
          }
          data.push({ id: doc.id, ...item, createdAt: dateStr } as AssessmentDoc)
        })
        setAssessments(data)
      } catch (error) {
        console.error('Gagal menarik data admin:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAssessments()
  }, [])

  const groupedPrograms = useMemo(() => {
    const groups: Record<string, AssessmentDoc[]> = {}

    assessments.forEach((item) => {
      const programName = item.corporateEntity || 'Program Umum (Publik)'
      if (!groups[programName]) {
        groups[programName] = []
      }
      groups[programName].push(item)
    })

    return groups
  }, [assessments])

  const filteredTableData = useMemo(() => {
    if (!activeProgramFolder) return []
    let programData = groupedPrograms[activeProgramFolder] || []

    if (activeTab === 'validated') {
      programData = programData.filter((i) => i.status === 'Curator_Validated')
    } else if (activeTab === 'draft') {
      programData = programData.filter((i) => i.status === 'Curator_Draft')
    }

    return programData.filter(
      (item) =>
        item.namaUsaha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.trackType?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [activeProgramFolder, groupedPrograms, searchTerm, activeTab])

  // --- SKELETON LOADING STATE ---
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 1: FOLDER BERBASIS PROGRAM KORPORAT
  // ==========================================
  if (!activeProgramFolder) {
    const totalEntitas = assessments.length
    const totalValidated = assessments.filter((i) => i.status === 'Curator_Validated').length
    const totalDraft = assessments.filter((i) => i.status === 'Curator_Draft').length
    const totalPrograms = Object.keys(groupedPrograms).length

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="indigo" className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider">
                CSRS Admin Dashboard
              </Badge>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500">Overview Real-time</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Manajemen Data Asesmen
            </h1>
            <p className="text-slate-500 mt-1 font-medium max-w-2xl text-sm leading-relaxed">
              Direktori pendaftar terorganisir otomatis berdasarkan Program Korporat, Token Akses, dan Jalur Publik.
            </p>
          </div>

          {/* QUICK SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Entitas</span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={16} /></div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalEntitas}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program</span>
                <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg"><FolderOpen size={16} /></div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalPrograms}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terverifikasi</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={16} /></div>
              </div>
              <p className="text-2xl font-black text-emerald-600">{totalValidated}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draf Kurator</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={16} /></div>
              </div>
              <p className="text-2xl font-black text-amber-600">{totalDraft}</p>
            </div>
          </div>
        </div>

        {/* FOLDER CARDS GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" /> Direktori Program Korporat ({totalPrograms})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Object.entries(groupedPrograms).map(([programName, items]) => {
              const total = items.length
              const validated = items.filter((i) => i.status === 'Curator_Validated').length
              const draft = items.filter((i) => i.status === 'Curator_Draft').length

              const avgScore =
                total > 0
                  ? Math.round(
                      items.reduce(
                        (acc, curr) =>
                          acc + (curr.curatorAssessment?.verifiedScore || curr.score || 0),
                        0
                      ) / total
                    )
                  : 0

              const isPublic = programName === 'Program Umum (Publik)'

              return (
                <Card
                  key={programName}
                  onClick={() => {
                    router.push(`?folder=${encodeURIComponent(programName)}`)
                    setSearchTerm('')
                  }}
                  className="p-6 bg-white rounded-3xl border-0 ring-1 ring-slate-200/80 shadow-xs hover:shadow-xl hover:ring-indigo-400/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>

                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isPublic
                            ? 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'
                            : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-indigo-700 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-600/30'
                        }`}
                      >
                        {isPublic ? <FolderOpen size={24} /> : <Building2 size={24} />}
                      </div>
                      <Badge
                        variant={isPublic ? 'secondary' : 'indigo'}
                        className="px-3 py-1 font-bold text-xs"
                      >
                        {total} Pendaftar
                      </Badge>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 leading-snug mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {programName}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-slate-400" /> Workspace Direktori
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center mt-auto">
                    <div className="bg-slate-50 rounded-xl p-2 group-hover:bg-slate-100/60 transition-colors">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Valid
                      </p>
                      <p className="text-sm font-black text-emerald-600">{validated}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 group-hover:bg-slate-100/60 transition-colors">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Draf
                      </p>
                      <p className="text-sm font-black text-amber-500">{draft}</p>
                    </div>
                    <div className="bg-indigo-50/70 rounded-xl p-2 ring-1 ring-indigo-100 group-hover:bg-indigo-100/70 transition-colors">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        Skor Rata
                      </p>
                      <p className="text-sm font-black text-indigo-700">{avgScore}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: TABEL ASESMEN DI DALAM FOLDER AKTIF
  // ==========================================
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* HEADER FOLDER AKTIF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl ring-1 ring-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Button
            variant="ghost"
            onClick={() => {
              router.push('/admin')
              setSearchTerm('')
            }}
            className="w-10 h-10 p-0 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 shrink-0 transition-colors"
            title="Kembali ke Daftar Folder"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Direktori Program Aktif
            </p>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate mt-0.5">
              {activeProgramFolder}
            </h1>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Cari entitas, email, track..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-slate-50/80 rounded-xl border-slate-200 focus-visible:ring-indigo-500 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* FILTER TABS & DATATABLE CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="bg-slate-100/80 p-1 rounded-2xl border-0">
              <TabsTrigger value="all" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                Semua ({groupedPrograms[activeProgramFolder]?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="validated" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                Selesai Validasi
              </TabsTrigger>
              <TabsTrigger value="draft" className="rounded-xl text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                Draf Kurator
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="m-0">
            <div className="rounded-2xl border border-slate-200/70 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200/70">
                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Identitas Usaha</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Kategori / Modul</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500 text-center">Skor Akhir</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Analitik AI</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500">Status Validasi</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-500 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                        <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm">Tidak ada data pendaftar yang cocok.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTableData.map((item) => {
                      const finalScore = item.curatorAssessment?.verifiedScore || item.score || item.aiResult?.totalScore || 0
                      const isCuratorValidated = item.status === 'Curator_Validated'
                      const isCuratorDraft = item.status === 'Curator_Draft'
                      const analyticsScore = item.analyticsSummary?.performanceScore
                      const analyticsBand = item.analyticsSummary?.performanceBand
                      const analyticsVersion = item.analyticsSummary?.version

                      return (
                        <TableRow key={item.id} className="group hover:bg-slate-50/80 transition-colors">
                          <TableCell>
                            <div className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                              {item.namaUsaha}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {item.email}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              {item.trackType}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm ring-1 shadow-2xs ${
                                isCuratorValidated
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                              }`}
                            >
                              {finalScore}
                            </span>
                          </TableCell>

                          <TableCell>
                            {item.analyticsSummary ? (
                              <div className="space-y-1">
                                <div className="text-xs font-black text-slate-800">
                                  {analyticsScore ?? '-'} / 100
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="indigo" className="text-[9px] px-1.5 py-0">
                                    {analyticsBand || '-'}
                                  </Badge>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                                    {analyticsVersion || '-'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Belum tersedia</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {isCuratorValidated ? (
                              <Badge variant="emerald" className="gap-1 px-2.5 py-1 text-[10px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                              </Badge>
                            ) : isCuratorDraft ? (
                              <Badge variant="amber" className="gap-1 px-2.5 py-1 text-[10px]">
                                <Edit3 className="w-3.5 h-3.5" /> Draf Kurator
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-[10px]">
                                <Clock className="w-3.5 h-3.5" /> AI Selesai
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              onClick={() => router.push(`/admin/assessment/${item.id}`)}
                              className="bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl h-8 px-3 text-xs shadow-xs opacity-90 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              Buka Detail <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  )
}