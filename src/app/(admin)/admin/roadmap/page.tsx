// src/app/admin/roadmap/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { Plus, Save, MapPinned, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

interface RoadmapItem {
  id: string
  quarter: string
  title: string
  description: string
  status: 'planned' | 'in-progress' | 'completed'
  order: number
  isNew?: boolean
}

export default function AdminRoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRoadmaps()
  }, [])

  const fetchRoadmaps = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'roadmaps'), orderBy('order', 'asc'))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoadmapItem))
      setItems(data)
    } catch (error) {
      console.error('Gagal memuat roadmap', error)
      toast.error('Gagal memuat data roadmap.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    const newItem: RoadmapItem = {
      id: `temp_${Date.now()}`,
      quarter: '',
      title: '',
      description: '',
      status: 'planned',
      order: items.length,
      isNew: true,
    }
    setItems([...items, newItem])
  }

  const handleDeleteItem = (id: string, isNew?: boolean) => {
    setItems(items.filter((item) => item.id !== id))
    if (!isNew) {
      setDeletedIds([...deletedIds, id])
    }
  }

  const handleChange = (id: string, field: keyof RoadmapItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === items.length - 1) return

    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]

    newItems.forEach((item, idx) => {
      item.order = idx
    })
    setItems(newItems)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const batch = writeBatch(db)

      deletedIds.forEach((id) => {
        const docRef = doc(db, 'roadmaps', id)
        batch.delete(docRef)
      })

      items.forEach((item, index) => {
        item.order = index

        let docRef
        if (item.isNew) {
          docRef = doc(collection(db, 'roadmaps'))
        } else {
          docRef = doc(db, 'roadmaps', item.id)
        }

        const dataToSave = {
          quarter: item.quarter,
          title: item.title,
          description: item.description,
          status: item.status,
          order: item.order,
        }

        batch.set(docRef, dataToSave, { merge: true })
      })

      await batch.commit()

      toast.success('Roadmap berhasil diperbarui!')
      setDeletedIds([])
      fetchRoadmaps()
    } catch (error) {
      console.error('Gagal menyimpan', error)
      toast.error('Gagal menyimpan perubahan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto font-sans">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="indigo" className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider">
              Build in Public
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-muted-foreground">Feature Timeline Management</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <MapPinned className="w-6 h-6" />
            </div>
            Pengaturan Roadmap
          </h1>
          <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Kelola tahapan rilis produk, fitur prioritas, dan transparansi pengembangan kepada publik.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleAddItem}
            variant="outline"
            className="card-solid text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-50 dark:bg-indigo-500/10 font-bold rounded-2xl gap-1.5 h-11 text-xs cursor-pointer shadow-xs"
          >
            <Plus size={16} /> Tambah Fase Baru
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-2xl px-6 h-11 text-xs shadow-lg shadow-indigo-600/25 gap-1.5 transition-all cursor-pointer"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* QUICK STATUS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fase</p>
            <p className="text-xl font-black text-foreground mt-0.5">{items.length}</p>
          </div>
          <div className="p-2 bg-secondary text-secondary-foreground text-muted-foreground rounded-xl"><MapPinned size={18} /></div>
        </div>

        <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direncanakan</p>
            <p className="text-xl font-black text-muted-foreground mt-0.5">{items.filter(i => i.status === 'planned').length}</p>
          </div>
          <div className="p-2 bg-secondary text-secondary-foreground text-muted-foreground rounded-xl"><Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Planned</Badge></div>
        </div>

        <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sedang Berjalan</p>
            <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">{items.filter(i => i.status === 'in-progress').length}</p>
          </div>
          <div className="p-2 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl"><Badge variant="sky" className="px-1.5 py-0 text-[10px]">Active</Badge></div>
        </div>

        <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selesai</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{items.filter(i => i.status === 'completed').length}</p>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><Badge variant="emerald" className="px-1.5 py-0 text-[10px]">Done</Badge></div>
        </div>
      </div>

      {/* ROADMAP CARDS CONTAINER */}
      <Card className="card-solid rounded-3xl p-6 ring-1 ring-border/80 shadow-xs space-y-4 min-h-[400px] border-none">
        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <MapPinned size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="font-bold text-sm text-muted-foreground">
              Belum ada fase pengembangan yang ditambahkan.
            </p>
            <p className="text-xs text-slate-400 mt-1">Klik &quot;Tambah Fase Baru&quot; di kanan atas untuk memulainya.</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const statusBadgeVariant =
              item.status === 'completed'
                ? 'emerald'
                : item.status === 'in-progress'
                ? 'sky'
                : 'secondary'

            const statusBorderClass =
              item.status === 'completed'
                ? 'border-l-4 border-l-emerald-500'
                : item.status === 'in-progress'
                ? 'border-l-4 border-l-sky-500'
                : 'border-l-4 border-l-slate-400'

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row gap-4 items-start p-5 bg-muted text-muted-foreground/70 rounded-2xl ring-1 ring-border/70 hover:ring-indigo-300 hover:bg-muted text-muted-foreground transition-all group ${statusBorderClass}`}
              >
                {/* REORDER BUTTONS */}
                <div className="flex sm:flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => moveItem(idx, 'up')}
                    disabled={idx === 0}
                    className="p-2 rounded-xl card-solid ring-1 ring-border/80 hover:bg-indigo-50 dark:bg-indigo-500/10 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 disabled:opacity-30 transition-all cursor-pointer"
                    title="Naikkan Urutan"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveItem(idx, 'down')}
                    disabled={idx === items.length - 1}
                    className="p-2 rounded-xl card-solid ring-1 ring-border/80 hover:bg-indigo-50 dark:bg-indigo-500/10 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 disabled:opacity-30 transition-all cursor-pointer"
                    title="Turunkan Urutan"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                {/* FORM INPUTS */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={item.quarter}
                      onChange={(e) => handleChange(item.id, 'quarter', e.target.value)}
                      placeholder="Kuartal / Waktu (Mis: Q4 2026)"
                      className="card-solid rounded-xl font-bold text-xs h-10 border-border focus-visible:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(e) => handleChange(item.id, 'status', e.target.value)}
                        className="card-solid rounded-xl border border-border px-3 h-10 text-xs font-bold text-slate-700 w-full focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="planned">Direncanakan (Planned)</option>
                        <option value="in-progress">Sedang Dikerjakan (In Progress)</option>
                        <option value="completed">Selesai (Completed)</option>
                      </select>
                      <Badge variant={statusBadgeVariant} className="text-[9px] px-2.5 py-1 shrink-0 uppercase tracking-widest font-black">
                        {item.status === 'in-progress' ? 'ACTIVE' : item.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <Input
                    value={item.title}
                    onChange={(e) => handleChange(item.id, 'title', e.target.value)}
                    placeholder="Judul Fitur Utama"
                    className="card-solid rounded-xl font-black text-sm h-11 border-border focus-visible:ring-indigo-500 text-foreground"
                  />

                  <Textarea
                    value={item.description}
                    onChange={(e) => handleChange(item.id, 'description', e.target.value)}
                    placeholder="Deskripsikan secara detail apa yang akan dibawa oleh pembaruan ini..."
                    className="card-solid rounded-xl resize-y min-h-[75px] text-xs font-medium leading-relaxed border-border focus-visible:ring-indigo-500 text-slate-700"
                  />
                </div>

                {/* DELETE BUTTON WITH ALERT DIALOG */}
                <div className="shrink-0 w-full sm:w-auto flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400 transition-colors h-10 w-10 cursor-pointer"
                        title="Hapus Fase"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Fase Roadmap?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus fase <strong>{item.title || item.quarter || 'ini'}</strong>?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteItem(item.id, item.isNew)} className="btn-danger-rich cursor-pointer">
                          Ya, Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}