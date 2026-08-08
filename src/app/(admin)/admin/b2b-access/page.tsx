'use client'

import React, { useMemo, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  UserCog,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type SystemRole =
  | 'user'
  | 'assessor'
  | 'curator'
  | 'admin_omnifit'
  | 'admin_csrs'
type B2BPersona = 'executive' | 'hr' | 'leader'
type OrganizationStatus = 'active' | 'pilot' | 'inactive'

interface UserAccessRow {
  id: string
  email?: string
  displayName?: string
  role?: SystemRole
  updatedAt?: string
  b2bPersonas?: B2BPersona[]
  b2bOrganizationIds?: string[]
  allowedOrganizations?: string[]
}

interface B2BOrganizationRow {
  id: string
  name?: string
  displayName?: string
  slug?: string
  status?: OrganizationStatus
  industry?: string
  tags?: string[]
  updatedAt?: string
  contact?: {
    name?: string
    email?: string
    phone?: string
  }
}

const PERSONA_OPTIONS: Array<{ value: B2BPersona; label: string }> = [
  { value: 'executive', label: 'Executive' },
  { value: 'hr', label: 'HR' },
  { value: 'leader', label: 'Leader' },
]

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
}

function toOrganizationStatus(raw: unknown): OrganizationStatus {
  if (raw === 'active' || raw === 'pilot' || raw === 'inactive') {
    return raw
  }
  return 'pilot'
}

export default function AdminB2BAccessPage() {
  const [targetEmail, setTargetEmail] = useState('')
  const [targetUid, setTargetUid] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [systemRole, setSystemRole] = useState<SystemRole>('user')
  const [selectedPersonas, setSelectedPersonas] = useState<B2BPersona[]>([
    'leader',
  ])
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<
    string[]
  >([])
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingOrgSave, setLoadingOrgSave] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [enableCuratorToken, setEnableCuratorToken] = useState(false)
  const [latestCuratorToken, setLatestCuratorToken] = useState<string>('')
  const [rows, setRows] = useState<UserAccessRow[]>([])
  const [organizations, setOrganizations] = useState<B2BOrganizationRow[]>([])

  const [orgName, setOrgName] = useState('')
  const [orgDisplayName, setOrgDisplayName] = useState('')
  const [orgStatus, setOrgStatus] = useState<OrganizationStatus>('pilot')
  const [orgIndustry, setOrgIndustry] = useState('')
  const [orgContactName, setOrgContactName] = useState('')
  const [orgContactEmail, setOrgContactEmail] = useState('')
  const [orgContactPhone, setOrgContactPhone] = useState('')
  const [orgTags, setOrgTags] = useState('')
  const [orgNotes, setOrgNotes] = useState('')

  React.useEffect(() => {
    const qUsers = query(collection(db, 'users'), orderBy('updatedAt', 'desc'))
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const next = snapshot.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>
          return {
            id: entry.id,
            email: typeof data.email === 'string' ? data.email : '',
            displayName:
              typeof data.displayName === 'string' ? data.displayName : '',
            role: (typeof data.role === 'string'
              ? data.role
              : 'user') as SystemRole,
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
            b2bPersonas: toStringArray(data.b2bPersonas) as B2BPersona[],
            b2bOrganizationIds: toStringArray(data.b2bOrganizationIds),
            allowedOrganizations: toStringArray(data.allowedOrganizations),
          } satisfies UserAccessRow
        })
        .filter((item) => item.b2bPersonas && item.b2bPersonas.length > 0)
        .slice(0, 80)

      setRows(next)
    })

    const qOrganizations = query(
      collection(db, 'b2b_organizations'),
      orderBy('updatedAt', 'desc')
    )
    const unsubscribeOrganizations = onSnapshot(qOrganizations, (snapshot) => {
      const next = snapshot.docs.map((entry) => {
        const data = entry.data() as Record<string, unknown>
        return {
          id: entry.id,
          name: typeof data.name === 'string' ? data.name : entry.id,
          displayName:
            typeof data.displayName === 'string' ? data.displayName : '',
          slug: typeof data.slug === 'string' ? data.slug : '',
          status: toOrganizationStatus(data.status),
          industry: typeof data.industry === 'string' ? data.industry : '',
          tags: toStringArray(data.tags),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          contact:
            typeof data.contact === 'object' &&
            data.contact &&
            !Array.isArray(data.contact)
              ? {
                  name:
                    typeof (data.contact as Record<string, unknown>).name ===
                    'string'
                      ? ((data.contact as Record<string, unknown>)
                          .name as string)
                      : '',
                  email:
                    typeof (data.contact as Record<string, unknown>).email ===
                    'string'
                      ? ((data.contact as Record<string, unknown>)
                          .email as string)
                      : '',
                  phone:
                    typeof (data.contact as Record<string, unknown>).phone ===
                    'string'
                      ? ((data.contact as Record<string, unknown>)
                          .phone as string)
                      : '',
                }
              : {},
        } satisfies B2BOrganizationRow
      })
      setOrganizations(next)
    })

    return () => {
      unsubscribeUsers()
      unsubscribeOrganizations()
    }
  }, [])

  const selectedOrganizationNames = useMemo(() => {
    const lookup = new Map(
      organizations.map((org) => [org.id, org.name || org.id])
    )
    return selectedOrganizationIds.map((id) => lookup.get(id) || id)
  }, [organizations, selectedOrganizationIds])

  const activeOrganizationCount = useMemo(
    () =>
      organizations.filter(
        (org) => org.status === 'active' || org.status === 'pilot'
      ).length,
    [organizations]
  )

  const handlePersonaToggle = (value: B2BPersona) => {
    setSelectedPersonas((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    )
  }

  const handleOrganizationToggle = (organizationId: string) => {
    setSelectedOrganizationIds((current) =>
      current.includes(organizationId)
        ? current.filter((item) => item !== organizationId)
        : [...current, organizationId]
    )
  }

  const handleSaveOrganization = async () => {
    if (!orgName.trim()) {
      setFeedback('Nama organisasi wajib diisi.')
      return
    }

    setLoadingOrgSave(true)
    setFeedback('')
    try {
      const callable = httpsCallable(functions, 'adminUpsertB2BOrganization')
      const response = await callable({
        name: orgName.trim(),
        displayName: orgDisplayName.trim() || orgName.trim(),
        status: orgStatus,
        industry: orgIndustry.trim(),
        contactName: orgContactName.trim(),
        contactEmail: orgContactEmail.trim().toLowerCase(),
        contactPhone: orgContactPhone.trim(),
        tags: orgTags
          .split(/[;,]/g)
          .map((item) => item.trim())
          .filter(Boolean),
        notes: orgNotes.trim(),
      })

      const data = response.data as {
        success?: boolean
        organization?: { id?: string }
      }
      const newOrgId = data?.organization?.id || ''
      if (newOrgId) {
        setSelectedOrganizationIds((current) =>
          current.includes(newOrgId) ? current : [...current, newOrgId]
        )
      }

      setOrgName('')
      setOrgDisplayName('')
      setOrgStatus('pilot')
      setOrgIndustry('')
      setOrgContactName('')
      setOrgContactEmail('')
      setOrgContactPhone('')
      setOrgTags('')
      setOrgNotes('')
      setFeedback(
        'Organisasi B2B berhasil disimpan dan siap dipakai untuk assignment akses.'
      )
    } catch (error: any) {
      console.error('Gagal menyimpan organisasi B2B:', error)
      setFeedback(error?.message || 'Gagal menyimpan organisasi B2B.')
    } finally {
      setLoadingOrgSave(false)
    }
  }

  const handleSaveAccess = async () => {
    const email = targetEmail.trim().toLowerCase()
    if (!email) {
      setFeedback('Email target wajib diisi.')
      return
    }
    if (selectedPersonas.length === 0) {
      setFeedback('Pilih minimal 1 persona B2B.')
      return
    }
    if (selectedOrganizationIds.length === 0) {
      setFeedback('Pilih minimal 1 organisasi B2B.')
      return
    }

    setLoadingSave(true)
    setFeedback('')
    setLatestCuratorToken('')

    try {
      const callable = httpsCallable(functions, 'adminSetB2BUserAccess')

      // Susun payload tanpa properti opsional terlebih dahulu
      const payload: Record<string, any> = {
        targetEmail: email,
        displayName: displayName.trim() || email,
        role: systemRole,
        personas: selectedPersonas,
        organizationIds: selectedOrganizationIds,
        enableCuratorToken,
      }

      // Injeksi targetUid hanya jika tidak kosong untuk menghindari masalah konversi JSON
      if (targetUid.trim()) {
        payload.targetUid = targetUid.trim()
      }

      const response = await callable(payload)

      const data = response.data as {
        curatorCode?: string | null
        organizations?: string[]
      }
      if (data.curatorCode) {
        setLatestCuratorToken(data.curatorCode)
      }

      const organizationText =
        Array.isArray(data.organizations) && data.organizations.length > 0
          ? data.organizations.join(', ')
          : selectedOrganizationNames.join(', ')

      setFeedback(
        `Akses B2B berhasil disimpan untuk ${email}. Scope: ${organizationText}.`
      )
      setTargetEmail('')
      setTargetUid('')
      setDisplayName('')
      setSelectedPersonas(['leader'])
      setSelectedOrganizationIds([])
      setSystemRole('user')
      setEnableCuratorToken(false)
    } catch (error: any) {
      console.error('Gagal menyimpan akses B2B:', error)
      setFeedback(error?.message || 'Gagal menyimpan akses B2B.')
    } finally {
      setLoadingSave(false)
    }
  }

  const handleRevoke = async (row: UserAccessRow) => {
    const email = (row.email || '').trim().toLowerCase()
    if (!email) {
      setFeedback('Email user tidak tersedia untuk revoke.')
      return
    }

    setLoadingSave(true)
    setFeedback('')

    try {
      const callable = httpsCallable(functions, 'adminRevokeB2BUserAccess')

      const payload: Record<string, any> = {
        targetEmail: email,
      }

      // Injeksi targetUid hanya jika valid
      if (row.id && row.id !== email) {
        payload.targetUid = row.id
      }

      await callable(payload)
      setFeedback(`Akses B2B untuk ${email} berhasil dicabut.`)
    } catch (error: any) {
      console.error('Gagal revoke akses B2B:', error)
      setFeedback(error?.message || 'Gagal mencabut akses B2B.')
    } finally {
      setLoadingSave(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="indigo"
              className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider"
            >
              B2B Governance
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-muted-foreground">
              Tenant Access & Persona Provisioning
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <UserCog className="w-6 h-6" />
            </div>
            B2B Management Console
          </h1>
          <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Kelola organisasi B2B, penetapan role pengguna, persona
            executive/HR/leader, dan otorisasi tenant terpusat.
          </p>
        </div>

        {/* METRICS SUMMARY */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Organisasi
              </p>
              <p className="text-xl font-black text-foreground mt-0.5">
                {organizations.length}
              </p>
            </div>
          </div>

          <div className="card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Aktif / Pilot
              </p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeOrganizationCount}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-secondary text-secondary-foreground/70 p-1.5 rounded-2xl mb-6">
          <TabsTrigger value="users" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:card-solid data-[state=active]:text-indigo-700 dark:text-indigo-300 data-[state=active]:shadow-sm">Akses & Persona User</TabsTrigger>
          <TabsTrigger value="orgs" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:card-solid data-[state=active]:text-indigo-700 dark:text-indigo-300 data-[state=active]:shadow-sm">Tenant & Organisasi B2B</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-0 outline-none">
          <Card className="rounded-[1.75rem] border-none ring-1 ring-border p-8 card-solid shadow-sm space-y-8">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Grant Akses User B2B
              </h2>
              <p className="text-muted-foreground text-sm">Delegasikan wewenang manajemen tenant kepada user baru atau user yang sudah ada.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Target Email <span className="text-rose-500">*</span>
                </span>
                <Input
                  value={targetEmail}
                  onChange={(event) => setTargetEmail(event.target.value)}
                  placeholder="user@company.com"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Display Name
                </span>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nama (opsional)"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Target UID
                </span>
                <Input
                  value={targetUid}
                  onChange={(event) => setTargetUid(event.target.value)}
                  placeholder="Auto-detect jika kosong"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  System Role
                </span>
                <select
                  value={systemRole}
                  onChange={(event) =>
                    setSystemRole(event.target.value as SystemRole)
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted text-muted-foreground focus:card-solid px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="user">User (Standard)</option>
                  <option value="assessor">Assessor (Penilai)</option>
                  <option value="curator">Curator</option>
                  <option value="admin_omnifit">Admin Omnifit</option>
                  <option value="admin_csrs">Admin CSRS</option>
                </select>
              </label>

              <div className="md:col-span-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10/50 ring-1 ring-indigo-100 p-3 flex items-center gap-3 text-indigo-800">
                 <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-500" />
                 <p className="text-[11px] leading-relaxed font-medium">Assignment via callable API backend memastikan audit log & keamanan.</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Persona B2B <span className="text-rose-500">*</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PERSONA_OPTIONS.map((option) => {
                  const active = selectedPersonas.includes(option.value)
                  const descriptions: Record<B2BPersona, string> = {
                    executive: "Akses penuh laporan level tinggi & analitik makro.",
                    hr: "Melihat & menilai data rekrutmen/personalia.",
                    leader: "Memantau performa anggota tim spesifik."
                  };
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handlePersonaToggle(option.value)}
                      className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all ${active ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10/50 shadow-sm' : 'border-border card-solid hover:border-border'}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm font-black uppercase tracking-widest ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700'}`}>{option.label}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium leading-relaxed ${active ? 'text-indigo-600 dark:text-indigo-400/80' : 'text-muted-foreground'}`}>{descriptions[option.value]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Otorisasi Organisasi (Tenant Scope) <span className="text-rose-500">*</span>
              </p>
              {organizations.length === 0 ? (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 ring-1 ring-amber-200 dark:ring-amber-500/20 p-4 text-sm font-medium">
                  Belum ada organisasi B2B yang didaftarkan.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {organizations.map((org) => {
                    const checked = selectedOrganizationIds.includes(org.id)
                    return (
                      <label
                        key={org.id}
                        className={`flex gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${checked ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10/30' : 'border-border card-solid hover:border-border'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleOrganizationToggle(org.id)}
                          className="mt-1 shrink-0 rounded border-border text-indigo-600 dark:text-indigo-400 focus:ring-indigo-600"
                        />
                        <div>
                          <p className={`font-bold text-sm ${checked ? 'text-indigo-900' : 'text-slate-700'}`}>
                            {org.name || org.id}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">ID: {org.id}</span>
                            {org.slug && (
                              <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">slug: {org.slug}</span>
                            )}
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${org.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:text-amber-300'}`}>{org.status || 'pilot'}</span>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white dark:to-transparent p-5 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                Integrasi Eksternal (Assessor / Curator)
              </p>
              <div className="text-xs text-indigo-800/80 font-medium leading-relaxed">
                Aktifkan opsi ini jika role user adalah assessor atau curator untuk secara otomatis melakukan sinkronisasi dengan koleksi terpisah dan mengamankan kode akses B2B.
              </div>
              <label className="inline-flex items-center gap-2.5 text-sm font-bold text-indigo-900 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCuratorToken}
                  onChange={(event) => setEnableCuratorToken(event.target.checked)}
                  className="rounded border-indigo-300 w-4 h-4 text-indigo-600 dark:text-indigo-400"
                />
                Buat / Perbarui Kode Akses Curator Otomatis
              </label>
              {latestCuratorToken && (
                <div className="mt-3 inline-flex rounded-xl card-solid ring-1 ring-indigo-200 dark:ring-indigo-500/20 px-4 py-2.5 text-xs shadow-sm">
                  <span className="font-bold text-muted-foreground mr-2">Kode Baru:</span>
                  <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                    {latestCuratorToken}
                  </span>
                </div>
              )}
            </div>

            {feedback && (
              <div className={`rounded-xl p-4 text-sm font-medium ${feedback.includes('berhasil') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 ring-1 ring-rose-200 dark:ring-rose-500/20'}`}>
                {feedback}
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-end">
              <Button
                onClick={handleSaveAccess}
                disabled={loadingSave}
                className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-600/20"
              >
                {loadingSave ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}{' '}
                Simpan & Otorisasi Akses
              </Button>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-none ring-1 ring-border p-8 card-solid shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
                  Daftar User Tersertifikasi B2B
                </h2>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Hanya menampilkan user yang telah di-assign Persona B2B (Max 80 data terbaru).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto -mx-8 px-8">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    <th className="py-4 pr-4 font-black">Identitas User</th>
                    <th className="py-4 pr-4 font-black">System Role</th>
                    <th className="py-4 pr-4 font-black">Persona B2B</th>
                    <th className="py-4 pr-4 font-black">Scope Organisasi</th>
                    <th className="py-4 pr-4 font-black">Terakhir Diubah</th>
                    <th className="py-4 font-black text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-middle hover:bg-muted text-muted-foreground/50 transition-colors">
                      <td className="py-4 pr-4">
                        <p className="font-bold text-foreground text-sm">
                          {row.displayName || '-'}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {row.email || row.id}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-muted-foreground font-bold border-border">
                          {row.role || 'user'}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(row.b2bPersonas || []).map((p) => (
                            <span key={p} className="text-[10px] uppercase font-black tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">{p}</span>
                          ))}
                          {(!row.b2bPersonas || row.b2bPersonas.length === 0) && <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground font-medium text-xs">
                        {(row.allowedOrganizations || []).slice(0, 3).join(', ') || '-'}
                        {(row.allowedOrganizations?.length || 0) > 3 && <span className="text-slate-400 ml-1">+{row.allowedOrganizations!.length - 3}</span>}
                      </td>
                      <td className="py-4 pr-4 text-slate-400 text-[11px]">
                        {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'}) : '-'}
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          onClick={() => handleRevoke(row)}
                          disabled={loadingSave}
                          variant="ghost"
                          className="h-8 px-3 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:bg-rose-500/10 font-bold text-xs"
                        >
                          {loadingSave ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          )}{' '}
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div className="rounded-xl bg-muted text-muted-foreground border border-dashed border-border p-8 text-center text-sm text-muted-foreground mt-4">
                  <UserCog className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  Belum ada pendelegasian akses B2B yang dikonfigurasi.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="orgs" className="space-y-6 mt-0 outline-none">
          <Card className="rounded-[1.75rem] border-none ring-1 ring-border p-8 card-solid shadow-sm space-y-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary text-secondary-foreground text-muted-foreground rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
                    Registrasi Tenant B2B Baru
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Daftarkan entitas korporat atau organisasi B2B ke dalam ekosistem Omnifit.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Nama Identitas (Key) <span className="text-rose-500">*</span>
                </span>
                <Input
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="Contoh: SOSO-CREATIVE"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid uppercase font-mono text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Display Name
                </span>
                <Input
                  value={orgDisplayName}
                  onChange={(event) => setOrgDisplayName(event.target.value)}
                  placeholder="Contoh: SOSO Creative"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Status Lisensi
                </span>
                <select
                  value={orgStatus}
                  onChange={(event) =>
                    setOrgStatus(event.target.value as OrganizationStatus)
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted text-muted-foreground px-3 text-sm focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="pilot">Trial / Pilot Project</option>
                  <option value="active">Active (Production)</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Industry / Sektor
                </span>
                <Input
                  value={orgIndustry}
                  onChange={(event) => setOrgIndustry(event.target.value)}
                  placeholder="Retail, Tech, Healthcare..."
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Contact Name (PIC)
                </span>
                <Input
                  value={orgContactName}
                  onChange={(event) => setOrgContactName(event.target.value)}
                  placeholder="Nama representatif tenant"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Contact Email
                </span>
                <Input
                  value={orgContactEmail}
                  onChange={(event) => setOrgContactEmail(event.target.value)}
                  placeholder="pic@tenant.com"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Contact Phone
                </span>
                <Input
                  value={orgContactPhone}
                  onChange={(event) => setOrgContactPhone(event.target.value)}
                  placeholder="+62..."
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Tags & Segmentasi
                </span>
                <Input
                  value={orgTags}
                  onChange={(event) => setOrgTags(event.target.value)}
                  placeholder="Gunakan koma: b2b, enterprise, premium"
                  className="mt-1.5 h-11 rounded-xl bg-muted text-muted-foreground focus:card-solid font-mono text-xs"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Catatan Internal (Notes)
              </span>
              <textarea
                value={orgNotes}
                onChange={(event) => setOrgNotes(event.target.value)}
                className="mt-1.5 w-full min-h-[100px] rounded-xl border border-border bg-muted text-muted-foreground focus:card-solid px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                placeholder="Catatan mengenai perjanjian lisensi, batas waktu, dll..."
              />
            </label>

            <div className="pt-2 border-t border-border flex items-center justify-end">
              <Button
                onClick={handleSaveOrganization}
                disabled={loadingOrgSave}
                className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white font-black shadow-md shadow-slate-900/20"
              >
                {loadingOrgSave ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}{' '}
                Daftarkan Tenant
              </Button>
            </div>
          </Card>
          
          {/* DAFTAR TENANT CARD */}
          <Card className="rounded-[1.75rem] border-none ring-1 ring-border p-8 card-solid shadow-sm overflow-hidden">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground mb-6">
              Daftar Tenant Terdaftar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map(org => (
                <div key={org.id} className="border-2 border-border rounded-2xl p-5 hover:border-indigo-200 dark:border-indigo-500/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <Badge variant="secondary" className={`${org.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' : 'bg-amber-100 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20'} text-[10px] uppercase font-black`}>
                      {org.status || 'pilot'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-foreground">{org.displayName || org.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">ID: {org.id}</p>
                  
                  {org.industry && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Industry</p>
                      <p className="text-sm text-slate-700 font-medium mt-0.5">{org.industry}</p>
                    </div>
                  )}
                </div>
              ))}
              {organizations.length === 0 && (
                <div className="col-span-full py-8 text-center text-muted-foreground font-medium">Belum ada tenant.</div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Keamanan & Shortcuts (Global) */}
      <Card className="rounded-[1.75rem] border-none ring-1 ring-border p-6 bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="p-2.5 card-solid/10 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-200" />
            </div>
            <div className="text-sm leading-relaxed text-slate-200">
              <p className="font-black uppercase tracking-[0.16em] text-[11px] text-white">
                Catatan Keamanan IAM (Identity & Access Management)
              </p>
              <p className="mt-1.5 font-medium">
                Pemberian akses tenant dan role dilakukan penuh via callable API backend Google Cloud Functions. Hal ini memastikan konsistensi audit trail dan mencegah manipulasi akses dari sisi client.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/assessor"
              className="inline-flex items-center h-10 px-5 rounded-xl card-solid/10 hover:card-solid/20 text-xs font-black uppercase tracking-widest transition-colors backdrop-blur-sm"
            >
              Portal Assessor
            </Link>
            <Link
              href="/curator"
              className="inline-flex items-center h-10 px-5 rounded-xl card-solid/10 hover:card-solid/20 text-xs font-black uppercase tracking-widest transition-colors backdrop-blur-sm"
            >
              Portal Curator
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
