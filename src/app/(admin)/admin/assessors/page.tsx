// src/app/admin/assessors/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCheck,
  Plus,
  Trash2,
  Mail,
  ShieldAlert,
  Loader2,
  FolderOpen,
  Edit3,
  X,
  User,
} from 'lucide-react'

interface CorporateBatch {
  id: string
  corporateName: string
  totalTokens: number
  usedCount: number
  allowedTemplates: string[]
}

interface AssessorData {
  id: string
  assessorName: string
  assessorEmail: string
  programName: string
  createdAt: string
}

interface FormTemplateLight {
  id: string
  trackName: string
  isActive: boolean
}

export default function AdminAssessorManagerPage() {
  const [assessors, setAssessors] = useState<AssessorData[]>([])
  const [programs, setPrograms] = useState<CorporateBatch[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<FormTemplateLight[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [assessorName, setAssessorName] = useState('')
  const [assessorEmail, setAssessorEmail] = useState('')
  const [programName, setProgramName] = useState('')

  const [editingAssessor, setEditingAssessor] = useState<AssessorData | null>(null)
  const [editName, setEditName] = useState('')
  const [editProgram, setEditProgram] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const snapTemplates = await getDocs(query(collection(db, 'form_templates')))
      const activeTpls = snapTemplates.docs
        .map(
          (d) =>
            ({
              id: d.id,
              trackName: d.data().trackName,
              isActive: d.data().isActive,
            } as FormTemplateLight)
        )
        .filter((t) => t.isActive)
      setAvailableTemplates(activeTpls)

      const snapTokens = await getDocs(
        query(collection(db, 'corporate_tokens'), orderBy('createdAt', 'desc'))
      )
      const progs: CorporateBatch[] = []
      snapTokens.forEach((docSnap) => {
        const data = docSnap.data()
        if (!data.isAssessorControlled) {
          progs.push({
            id: docSnap.id,
            corporateName: data.corporateName,
            totalTokens: data.totalTokens || 0,
            usedCount: data.usedCount || 0,
            allowedTemplates: data.allowedTemplates || [],
          })
        }
      })
      setPrograms(progs)

      const snapAssessors = await getDocs(
        query(collection(db, 'assessors'), orderBy('createdAt', 'desc'))
      )
      const assData: AssessorData[] = []
      snapAssessors.forEach((docSnap) => {
        assData.push({ id: docSnap.id, ...docSnap.data() } as AssessorData)
      })
      setAssessors(assData)
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyinkronkan data dari server.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterAssessor = async () => {
    const cleanEmail = assessorEmail.trim().toLowerCase()

    if (!programName.trim()) return toast.warning('Program Kemitraan wajib dipilih.')
    if (!assessorName.trim()) return toast.warning('Nama Asesor / Instansi wajib diisi.')
    if (!cleanEmail) return toast.warning('Email akun Google Asesor wajib diisi.')

    if (assessors.find((a) => a.id === cleanEmail)) {
      return toast.error('Email ini sudah terdaftar sebagai Asesor.')
    }

    setIsSubmitting(true)
    try {
      const assessorData = {
        assessorName: assessorName.trim(),
        assessorEmail: cleanEmail,
        programName: programName.trim(),
        createdAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'assessors', cleanEmail), assessorData)

      await setDoc(
        doc(db, 'users', cleanEmail),
        {
          email: cleanEmail,
          role: 'assessor',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )

      toast.success(`Akun Asesor ${cleanEmail} berhasil didaftarkan!`)

      setAssessorName('')
      setAssessorEmail('')
      setProgramName('')

      loadData()
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan pendaftaran asesor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAssessor = async () => {
    if (!editingAssessor) return

    if (!editProgram.trim()) return toast.warning('Program Kemitraan wajib dipilih.')
    if (!editName.trim()) return toast.warning('Nama Asesor wajib diisi.')

    setIsUpdating(true)
    try {
      const ref = doc(db, 'assessors', editingAssessor.id)

      await updateDoc(ref, {
        assessorName: editName.trim(),
        programName: editProgram.trim(),
      })

      setAssessors((prev) =>
        prev.map((a) =>
          a.id === editingAssessor.id
            ? {
                ...a,
                assessorName: editName.trim(),
                programName: editProgram.trim(),
              }
            : a
        )
      )

      toast.success('Profil Asesor berhasil diperbarui!')
      setEditingAssessor(null)
    } catch (error) {
      console.error('Gagal update asesor:', error)
      toast.error('Terjadi kesalahan saat memperbarui data asesor.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRevokeAssessor = async (id: string, email: string) => {
    try {
      await deleteDoc(doc(db, 'assessors', id))

      await setDoc(
        doc(db, 'users', email),
        {
          role: 'user',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )

      toast.success('Hak kemitraan asesor berhasil dicabut.')
      loadData()
    } catch (error) {
      console.error(error)
      toast.error('Gagal mencabut hak akses.')
    }
  }

  const openEditModal = (item: AssessorData) => {
    setEditingAssessor(item)
    setEditName(item.assessorName)
    setEditProgram(item.programName || '')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="indigo" className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider">
              Partner Management
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-500">Access Control & Delegations</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <UserCheck className="w-6 h-6" />
            </div>
            Kemitraan & Manajemen Asesor
          </h1>
          <p className="text-slate-500 mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Daftarkan email asesor eksternal, alokasikan kuota form penilaian secara eksklusif, dan sinkronkan dengan program pada Token Page.
          </p>
        </div>

        {/* QUICK SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><UserCheck size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Asesor</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{assessors.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><FolderOpen size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program Kemitraan</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{programs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM REGISTRASI ASESOR */}
      <Card className="p-6 sm:p-8 bg-white rounded-3xl border-none ring-1 ring-slate-200/80 shadow-xs flex flex-col gap-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" /> Pembuatan Akun & Alokasi Asesor Baru
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5" /> Program Kemitraan
            </label>
            <select
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <option value="" disabled>
                -- Pilih Program Kemitraan --
              </option>
              {programs.length === 0 && (
                <option value="" disabled>
                  Belum ada program di Token Page
                </option>
              )}
              {programs.map((p) => (
                <option key={p.id} value={p.corporateName}>
                  {p.corporateName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Nama Asesor / Instansi
            </label>
            <Input
              value={assessorName}
              onChange={(e) => setAssessorName(e.target.value)}
              placeholder="Cth: Dr. Budi Santoso"
              className="h-12 rounded-xl bg-slate-50/80 text-xs font-bold border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Akun Google Asesor
            </label>
            <Input
              type="email"
              value={assessorEmail}
              onChange={(e) => setAssessorEmail(e.target.value)}
              placeholder="budi@gmail.com"
              className="h-12 rounded-xl bg-slate-50/80 font-mono text-xs font-bold border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            onClick={handleRegisterAssessor}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold h-11 px-7 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all text-xs cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <UserCheck className="w-4 h-4 mr-2" />
            )}
            Daftarkan Akun & Alokasikan
          </Button>
        </div>
      </Card>

      {/* TABEL DATA ASESOR */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asesor & Instansi</TableHead>
            <TableHead>Program Kemitraan</TableHead>
            <TableHead>Modul Terkunci & Token</TableHead>
            <TableHead className="text-center">Kuota Program Terpakai</TableHead>
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
          ) : assessors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-36 text-center text-slate-400 font-bold space-y-1">
                <ShieldAlert className="w-8 h-8 mx-auto opacity-30 text-slate-400 mb-2" />
                <p className="text-sm">Belum ada Mitra Asesor terdaftar.</p>
              </TableCell>
            </TableRow>
          ) : (
            assessors.map((item) => {
              const matchedProgram = programs.find((p) => p.corporateName === item.programName)

              const templateNames =
                matchedProgram?.allowedTemplates
                  ?.map((id) => availableTemplates.find((t) => t.id === id)?.trackName || 'Modul Dihapus')
                  .join(', ') || 'Semua Modul (Akses Penuh)'

              return (
                <TableRow key={item.id} className="hover:bg-slate-50/70">
                  <TableCell>
                    <p className="font-extrabold text-slate-900 text-sm">{item.assessorName}</p>
                    <p className="text-[11px] font-mono text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <Mail size={10} />
                      {item.assessorEmail}
                    </p>
                  </TableCell>

                  <TableCell>
                    <Badge variant="indigo" className="text-[10px] px-2.5 py-0.5">
                      {item.programName || 'Tanpa Program'}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-[200px] truncate">
                    <span className="block font-medium text-slate-700 text-xs truncate" title={templateNames}>
                      {matchedProgram ? templateNames : <span className="text-rose-500">Program Tidak Ditemukan</span>}
                    </span>
                    {matchedProgram && (
                      <span className="font-mono font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[9px] mt-1 inline-block">
                        Prefix: {matchedProgram.id}-***
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {matchedProgram ? (
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-800 text-sm">
                          {matchedProgram.usedCount}{' '}
                          <span className="text-slate-300 text-xs">/ {matchedProgram.totalTokens}</span>
                        </span>
                        <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden relative">
                          <div
                            className="absolute h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(((matchedProgram.usedCount || 0) / matchedProgram.totalTokens) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 font-medium text-xs">-</div>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        onClick={() => openEditModal(item)}
                        variant="ghost"
                        className="text-amber-600 bg-amber-50 hover:bg-amber-100 h-8 px-3 rounded-xl font-bold text-xs"
                        title="Edit Data Asesor"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 rounded-xl"
                            title="Cabut Hak Asesor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cabut Hak Akses Asesor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin mencabut seluruh hak akses Asesor untuk <strong>{item.assessorEmail}</strong>? Akun ini tidak dapat lagi mengakses dashboard penilaian asesor.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevokeAssessor(item.id, item.assessorEmail)}>
                              Ya, Cabut Hak
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* MODAL UPDATE / EDIT ASESOR */}
      <AnimatePresence>
        {editingAssessor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl flex flex-col ring-1 ring-slate-200 overflow-hidden relative"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-amber-500" /> Edit Data Asesor
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    Akun Terkait: <span className="text-indigo-600">{editingAssessor.assessorEmail}</span>
                  </p>
                </div>
                <button
                  onClick={() => setEditingAssessor(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Nama Asesor / Instansi
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-12 bg-white rounded-xl focus-visible:ring-indigo-500 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Pindah Program Kemitraan
                    </label>
                    <select
                      value={editProgram}
                      onChange={(e) => setEditProgram(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={p.corporateName}>
                          {p.corporateName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Pengaturan modul, prefix, dan sisa kuota bergantung pada Program Kemitraan yang dipilih. Kuota dapat diatur ulang pada menu <b>Akses & Kuota Token</b>.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingAssessor(null)}
                  className="w-full h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleUpdateAssessor}
                  disabled={isUpdating}
                  className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}