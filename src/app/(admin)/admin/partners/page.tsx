// src/app/admin/partners/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db } from '@/lib/firebase/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Handshake,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  UploadCloud,
  FileImage,
  Edit3,
  X,
  Layers,
  UserCheck,
  MessageSquareQuote,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LandingPartner {
  id: string
  name: string
  logoUrl: string // Akan digunakan sebagai URL Foto jika kategori testimoni_ahli
  storagePath?: string
  targetUrl?: string
  category: 'powered_by' | 'mitra_strategis' | 'klien' | 'testimoni_ahli'
  role?: string // Khusus Testimoni Ahli (Jabatan/Gelar)
  message?: string // Khusus Testimoni Ahli (Isi Testimoni)
  isActive: boolean
  order: number
  createdAt: string
  updatedAt?: string // <-- Tipe ditambahkan di dalam Interface
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<LandingPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter Tab State
  const [activeTab, setActiveTab] = useState<
    'semua' | 'powered_by' | 'mitra_strategis' | 'klien' | 'testimoni_ahli'
  >('semua')

  // Form & Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStoragePath, setEditingStoragePath] = useState<string | null>(
    null
  )
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [targetUrl, setTargetUrl] = useState('')
  const [category, setCategory] = useState<
    'powered_by' | 'mitra_strategis' | 'klien' | 'testimoni_ahli'
  >('mitra_strategis')
  const [role, setRole] = useState('')
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState<number>(1)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPartners()
  }, [])

  const loadPartners = async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, 'landing_partners'),
        orderBy('order', 'asc')
      )
      const snap = await getDocs(q)
      const data: LandingPartner[] = []
      snap.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as LandingPartner)
      })
      setPartners(data)
    } catch (error) {
      console.error(error)
      toast.error('Gagal memuat data mitra & testimoni.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePartner = async () => {
    if (!name.trim()) return toast.warning('Nama institusi/ahli wajib diisi.')
    if (!isEditing && !logoFile)
      return toast.warning('File Logo/Foto wajib diunggah untuk entitas baru.')
    if (category === 'testimoni_ahli' && !message.trim())
      return toast.warning('Isi pesan testimoni wajib diisi untuk pakar.')

    setIsSubmitting(true)
    try {
      let finalLogoUrl = existingLogoUrl || ''
      let finalStoragePath = editingStoragePath || ''

      // 1. Jika ada file baru yang diunggah
      if (logoFile) {
        const storage = getStorage()
        const fileExtension = logoFile.name.split('.').pop()
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase()

        // Pisahkan folder untuk logo dan foto orang agar rapi
        const folderName =
          category === 'testimoni_ahli' ? '2_expert_photos' : '1_logo'
        const fileName = `curation_files/${folderName}/img_${safeName}_${Date.now()}.${fileExtension}`
        const storageRef = ref(storage, fileName)

        await uploadBytes(storageRef, logoFile)
        finalLogoUrl = await getDownloadURL(storageRef)
        finalStoragePath = fileName

        // Hapus logo lama dari Storage jika sedang edit
        if (isEditing && editingStoragePath) {
          const oldRef = ref(storage, editingStoragePath)
          await deleteObject(oldRef).catch((err) =>
            console.warn('File lama tidak ditemukan:', err)
          )
        }
      }

      // 2. Siapkan Payload Data
      const partnerId =
        isEditing && editingId ? editingId : `partner_${Date.now()}`

      const partnerData: Partial<LandingPartner> = {
        name: name.trim(),
        logoUrl: finalLogoUrl,
        storagePath: finalStoragePath,
        targetUrl: targetUrl.trim(),
        category,
        order: Number(order),
        updatedAt: new Date().toISOString(), // <-- Di sini kita memberikan nilainya (bukan tipenya)
      }

      // Tambahkan field khusus jika kategori adalah testimoni_ahli
      if (category === 'testimoni_ahli') {
        partnerData.role = role.trim()
        partnerData.message = message.trim()
      } else {
        // Bersihkan field jika berubah kategori dari ahli ke mitra biasa
        partnerData.role = ''
        partnerData.message = ''
      }

      if (!isEditing) {
        partnerData.id = partnerId
        partnerData.isActive = true
        partnerData.createdAt = new Date().toISOString()
        await setDoc(
          doc(db, 'landing_partners', partnerId),
          partnerData as LandingPartner
        )
        toast.success('Data berhasil disimpan!')
      } else {
        await updateDoc(doc(db, 'landing_partners', partnerId), partnerData)
        toast.success('Data berhasil diperbarui!')
      }

      handleCancelEdit()
      loadPartners()
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan data.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (partner: LandingPartner) => {
    setIsEditing(true)
    setEditingId(partner.id)
    setName(partner.name)
    setCategory(partner.category)
    setTargetUrl(partner.targetUrl || '')
    setOrder(partner.order)
    setExistingLogoUrl(partner.logoUrl)
    setEditingStoragePath(partner.storagePath || null)

    // Set field khusus testimoni
    setRole(partner.role || '')
    setMessage(partner.message || '')

    setLogoFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
    setExistingLogoUrl(null)
    setEditingStoragePath(null)

    setName('')
    setLogoFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTargetUrl('')
    setCategory('mitra_strategis')
    setRole('')
    setMessage('')
    setOrder(partners.length + 1)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'landing_partners', id), {
        isActive: !currentStatus,
      })
      setPartners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
      )
      toast.success(
        `Status diubah menjadi ${!currentStatus ? 'Tayang' : 'Disembunyikan'}.`
      )
    } catch (error) {
      console.error(error)
      toast.error('Gagal mengubah status.')
    }
  }

  const handleDeletePartner = async (partner: LandingPartner) => {
    if (!confirm(`Hapus permanen data "${partner.name}" dari sistem?`)) return

    try {
      await deleteDoc(doc(db, 'landing_partners', partner.id))
      if (partner.storagePath) {
        const storage = getStorage()
        const fileRef = ref(storage, partner.storagePath)
        await deleteObject(fileRef).catch((err) =>
          console.warn('File di storage tidak ditemukan:', err)
        )
      }
      setPartners((prev) => prev.filter((p) => p.id !== partner.id))
      toast.success('Data dan file berhasil dihapus.')
    } catch (error) {
      console.error(error)
      toast.error('Gagal menghapus data.')
    }
  }

  const getCategoryLabel = (cat: string) => {
    if (cat === 'powered_by') return 'Powered By'
    if (cat === 'mitra_strategis') return 'Mitra Strategis'
    if (cat === 'testimoni_ahli') return 'Testimoni Pakar'
    return 'Klien / Pengguna'
  }

  const isExpert = category === 'testimoni_ahli'
  const filteredPartners =
    activeTab === 'semua'
      ? partners
      : partners.filter((p) => p.category === activeTab)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="indigo"
              className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider"
            >
              Ecosystem Hub
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-500">
              Partners & Endorsements
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <Handshake className="w-6 h-6" />
            </div>
            Kemitraan & Ekosistem
          </h1>
          <p className="text-slate-500 mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Kelola logo institusi mitra dan testimoni dari pakar/ahli yang
            mendukung ekosistem Omnifit.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Handshake size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Mitra
              </p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {partners.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Testimoni Pakar
              </p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">
                {partners.filter((p) => p.category === 'testimoni_ahli').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM INPUT / EDIT */}
      <Card
        className={`p-6 sm:p-8 bg-white rounded-3xl border-none shadow-sm flex flex-col gap-6 transition-all ${isEditing ? 'ring-2 ring-amber-400 shadow-amber-500/10' : 'ring-1 ring-slate-200'}`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isEditing ? 'text-amber-600' : 'text-slate-400'}`}
          >
            {isEditing ? (
              <Edit3 className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4 text-indigo-600" />
            )}
            {isEditing ? 'Ubah Data' : 'Tambah Data Baru'}
          </h3>
          {isEditing && (
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
              className="text-slate-500 hover:bg-slate-100 h-8 px-3 rounded-lg text-xs font-bold"
            >
              <X className="w-3.5 h-3.5 mr-1.5" /> Batal Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              Kategori Input
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className={`flex h-12 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'} ${isExpert ? 'text-indigo-700 border-indigo-200 bg-indigo-50/30' : 'text-slate-700'}`}
            >
              <option value="mitra_strategis">
                Mitra Strategis (Logo Institusi)
              </option>
              <option value="powered_by">
                Powered By (Logo Dukungan Utama)
              </option>
              <option value="klien">Klien / Ekosistem (Logo Pengguna)</option>
              <option value="testimoni_ahli">
                Testimoni Pakar (Foto & Profil Ahli)
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              {isExpert ? 'Nama Lengkap Pakar' : 'Nama Institusi / Mitra'}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isExpert ? 'Misal: Dr. Budi Santoso' : 'Misal: Solo Techno Park'
              }
              className={`h-12 rounded-xl font-semibold ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'}`}
            />
          </div>

          {isExpert && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                Jabatan / Gelar / Institusi
              </label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Misal: Kepala Dinas / Pakar AI"
                className={`h-12 rounded-xl font-medium text-sm ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'}`}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <UploadCloud className="w-3 h-3" />{' '}
              {isEditing
                ? `Ganti ${isExpert ? 'Foto' : 'Logo'} (Opsional)`
                : `Unggah ${isExpert ? 'Foto Pakar' : 'Logo Mitra'}`}
            </label>
            <div className="relative flex items-center gap-3">
              {isEditing && existingLogoUrl && !logoFile && (
                <div
                  className={`w-12 h-12 bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden ${isExpert ? 'rounded-full' : 'rounded-xl p-1'}`}
                >
                  <img
                    src={existingLogoUrl}
                    alt="Current"
                    className={`max-w-full max-h-full ${isExpert ? 'object-cover w-full h-full' : 'object-contain'}`}
                  />
                </div>
              )}
              <div className="flex-1 relative">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0])
                      setLogoFile(e.target.files[0])
                  }}
                  className={`h-12 rounded-xl font-medium text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer pt-2.5 ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'}`}
                />
              </div>
            </div>
          </div>

          {isExpert && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                Pesan Testimoni
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan ulasan atau pendapat ahli tentang platform ini..."
                className={`min-h-[100px] rounded-xl text-sm font-medium resize-y ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'}`}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Link Tujuan (Opsional)
              </label>
              <Input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={
                  isExpert
                    ? 'Link profil LinkedIn ahli (opsional)'
                    : 'https://...'
                }
                className={`h-12 rounded-xl text-sm font-medium ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                Urutan Tampil
              </label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                min={1}
                className={`h-12 rounded-xl font-bold ${isEditing ? 'bg-amber-50/30' : 'bg-slate-50'}`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            onClick={handleSavePartner}
            disabled={isSubmitting}
            className={`w-full sm:w-auto text-white font-bold h-12 px-8 rounded-xl shadow-md transition-all ${isEditing ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-slate-900 hover:bg-indigo-600'}`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : isEditing ? (
              <Edit3 className="w-4 h-4 mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Simpan Perubahan' : 'Simpan Data Baru'}
          </Button>
        </div>
      </Card>

      {/* FILTER TAB & TABEL DATA */}
      <Card className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-slate-200 border-none flex flex-col">
        <div className="px-4 pt-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto hide-scrollbar bg-slate-50/30">
          {[
            { id: 'semua', label: 'Semua Data', icon: Layers },
            { id: 'powered_by', label: 'Powered By', icon: CheckCircle2 },
            {
              id: 'mitra_strategis',
              label: 'Mitra Strategis',
              icon: Handshake,
            },
            { id: 'klien', label: 'Klien', icon: Eye },
            { id: 'testimoni_ahli', label: 'Testimoni Pakar', icon: UserCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
              }`}
            >
              <tab.icon
                className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`}
              />
              {tab.label}
              {tab.id === 'semua' && (
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}
                >
                  {partners.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 font-medium flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Memuat
            basis data...
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium space-y-2">
            <FileImage className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">
              Belum ada data di kategori ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Preview</th>
                  <th className="px-6 py-4">Informasi Utama</th>
                  <th className="px-6 py-4">Kategori & Urutan</th>
                  <th className="px-6 py-4 text-center">Status Tayang</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredPartners.map((item) => {
                  const isPakar = item.category === 'testimoni_ahli'
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div
                          className={`bg-white border border-slate-200 p-1 flex items-center justify-center relative overflow-hidden ${isPakar ? 'w-14 h-14 rounded-full' : 'w-24 h-12 rounded-lg'}`}
                        >
                          <img
                            src={item.logoUrl}
                            alt={item.name}
                            className={`max-w-full max-h-full ${isPakar ? 'object-cover w-full h-full rounded-full' : 'object-contain'}`}
                            onError={(e) => {
                              ;(e.target as any).src =
                                'https://via.placeholder.com/150?text=Error'
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[250px]">
                        <p className="font-bold text-slate-900 text-base truncate">
                          {item.name}
                        </p>
                        {isPakar && item.role && (
                          <p className="text-[11px] font-medium text-slate-500 truncate">
                            {item.role}
                          </p>
                        )}
                        {item.targetUrl && (
                          <a
                            href={item.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 mt-0.5 truncate"
                          >
                            <LinkIcon size={10} className="shrink-0" />{' '}
                            {item.targetUrl}
                          </a>
                        )}
                        {isPakar && item.message && (
                          <div
                            className="mt-2 text-xs text-slate-500 italic truncate"
                            title={item.message}
                          >
                            "{item.message}"
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${isPakar ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                        >
                          {getCategoryLabel(item.category)}
                        </span>
                        <div className="flex items-center gap-2 mt-2 ml-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            Urutan Tampil:
                          </span>
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-1.5 rounded">
                            {item.order}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            handleToggleActive(item.id, item.isActive)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${item.isActive ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 hover:bg-slate-200'}`}
                        >
                          {item.isActive ? (
                            <>
                              <Eye size={12} /> Tayang
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} /> Sembunyi
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() => handleEditClick(item)}
                            variant="ghost"
                            className="text-amber-600 bg-amber-50 hover:bg-amber-100 h-9 px-3 rounded-xl font-bold flex items-center gap-1.5"
                            title="Ubah Data"
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </Button>
                          <Button
                            onClick={() => handleDeletePartner(item)}
                            variant="ghost"
                            className="text-rose-500 bg-rose-50 hover:bg-rose-100 h-9 w-9 p-0 rounded-xl"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
