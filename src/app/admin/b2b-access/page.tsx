'use client'

import React, { useMemo, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
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
            <span className="text-xs font-bold text-slate-500">
              Tenant Access & Persona Provisioning
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <UserCog className="w-6 h-6" />
            </div>
            B2B Management Console
          </h1>
          <p className="text-slate-500 mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Kelola organisasi B2B, penetapan role pengguna, persona
            executive/HR/leader, dan otorisasi tenant terpusat.
          </p>
        </div>

        {/* METRICS SUMMARY */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Organisasi
              </p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {organizations.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Aktif / Pilot
              </p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">
                {activeOrganizationCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-6 bg-white shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-slate-800">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            Manajemen Organisasi B2B
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Nama Organisasi
            </span>
            <Input
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Contoh: PT Maju Jaya"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Display Name
            </span>
            <Input
              value={orgDisplayName}
              onChange={(event) => setOrgDisplayName(event.target.value)}
              placeholder="Nama tampilan tenant"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Status
            </span>
            <select
              value={orgStatus}
              onChange={(event) =>
                setOrgStatus(event.target.value as OrganizationStatus)
              }
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="pilot">pilot</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Industry
            </span>
            <Input
              value={orgIndustry}
              onChange={(event) => setOrgIndustry(event.target.value)}
              placeholder="Contoh: Manufacturing"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Contact Name
            </span>
            <Input
              value={orgContactName}
              onChange={(event) => setOrgContactName(event.target.value)}
              placeholder="PIC organisasi"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Contact Email
            </span>
            <Input
              value={orgContactEmail}
              onChange={(event) => setOrgContactEmail(event.target.value)}
              placeholder="pic@company.com"
              className="mt-1 h-11 rounded-xl"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Contact Phone
            </span>
            <Input
              value={orgContactPhone}
              onChange={(event) => setOrgContactPhone(event.target.value)}
              placeholder="08xxxx"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Tags
            </span>
            <Input
              value={orgTags}
              onChange={(event) => setOrgTags(event.target.value)}
              placeholder="pilot-2026, enterprise, hr"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Notes
          </span>
          <textarea
            value={orgNotes}
            onChange={(event) => setOrgNotes(event.target.value)}
            className="mt-1 w-full min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Catatan operasional tenant (opsional)"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSaveOrganization}
            disabled={loadingOrgSave}
            className="h-10 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white font-black"
          >
            {loadingOrgSave ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}{' '}
            Simpan Organisasi
          </Button>
          <div className="text-xs text-slate-500 self-center">
            {activeOrganizationCount} organisasi active/pilot dari total{' '}
            {organizations.length}
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-6 bg-white shadow-sm space-y-5">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Grant Akses User B2B
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Target Email
            </span>
            <Input
              value={targetEmail}
              onChange={(event) => setTargetEmail(event.target.value)}
              placeholder="user@company.com"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Target UID (Opsional)
            </span>
            <Input
              value={targetUid}
              onChange={(event) => setTargetUid(event.target.value)}
              placeholder="uid pengguna"
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Display Name
            </span>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Nama pengguna B2B"
              className="mt-1 h-11 rounded-xl"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              System Role
            </span>
            <select
              value={systemRole}
              onChange={(event) =>
                setSystemRole(event.target.value as SystemRole)
              }
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="user">user</option>
              <option value="assessor">assessor</option>
              <option value="curator">curator</option>
              <option value="admin_omnifit">admin_omnifit</option>
              <option value="admin_csrs">admin_csrs</option>
            </select>
          </label>

          <div className="md:col-span-1 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 p-3 text-xs text-indigo-800">
            Assign role dilakukan via callable API agar perubahan akses tercatat
            dan tervalidasi di backend.
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
            Persona B2B
          </p>
          <div className="flex flex-wrap gap-2">
            {PERSONA_OPTIONS.map((option) => {
              const active = selectedPersonas.includes(option.value)
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handlePersonaToggle(option.value)}
                  className={`px-3 h-9 rounded-xl text-xs font-black uppercase tracking-[0.14em] ring-1 ${active ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white text-slate-500 ring-slate-200'}`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
            Pilih Organisasi B2B
          </p>
          {organizations.length === 0 ? (
            <div className="rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-200 p-3 text-sm">
              Belum ada organisasi B2B. Buat organisasi terlebih dahulu.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {organizations.map((org) => {
                const checked = selectedOrganizationIds.includes(org.id)
                return (
                  <label
                    key={org.id}
                    className={`rounded-xl border px-3 py-2 text-sm cursor-pointer ${checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleOrganizationToggle(org.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-black text-slate-900">
                          {org.name || org.id}
                        </p>
                        <p className="text-xs text-slate-500">
                          ID: {org.id} • status: {org.status || 'pilot'}
                        </p>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          {selectedOrganizationNames.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Scope terpilih: {selectedOrganizationNames.join(', ')}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700">
            Integrasi Assessor / Curator
          </p>
          <div className="text-xs text-indigo-800 leading-relaxed">
            Saat role assessor/curator dipilih, callable API akan sinkron ke
            koleksi assessor dan mengikat linkedOrganizations.
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <input
              type="checkbox"
              checked={enableCuratorToken}
              onChange={(event) => setEnableCuratorToken(event.target.checked)}
              className="rounded border-indigo-300"
            />
            Buat kode akses Curator B2B otomatis saat simpan
          </label>
          {latestCuratorToken && (
            <div className="rounded-lg bg-white ring-1 ring-indigo-200 px-3 py-2 text-xs">
              <span className="font-black text-indigo-700">
                Kode Curator Baru:
              </span>{' '}
              <span className="font-mono font-bold text-slate-900">
                {latestCuratorToken}
              </span>
            </div>
          )}
        </div>

        {feedback && (
          <div className="rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200 p-3 text-sm">
            {feedback}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSaveAccess}
            disabled={loadingSave}
            className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
          >
            {loadingSave ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}{' '}
            Simpan Akses B2B
          </Button>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            Daftar User dengan Akses B2B
          </h2>
          <div className="text-xs text-slate-500">
            Maksimum 80 data terbaru berdasarkan updatedAt
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Personas</th>
                <th className="py-3 pr-4">Organizations</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-black text-slate-900">
                      {row.displayName || '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {row.email || row.id}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                      {row.role || 'user'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {(row.b2bPersonas || []).join(', ') || '-'}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {(row.allowedOrganizations || []).slice(0, 4).join(', ') ||
                      '-'}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">
                    {row.updatedAt || '-'}
                  </td>
                  <td className="py-3">
                    <Button
                      onClick={() => handleRevoke(row)}
                      disabled={loadingSave}
                      variant="outline"
                      className="h-8 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      {loadingSave ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                      )}{' '}
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 text-sm text-slate-500 mt-3">
              Belum ada user dengan konfigurasi persona B2B.
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 mt-0.5 text-indigo-200" />
          <div className="text-sm leading-relaxed text-slate-100">
            <p className="font-black uppercase tracking-[0.16em] text-[11px]">
              Catatan Keamanan
            </p>
            <p className="mt-2">
              Assignment akses tenant dilakukan penuh dari callable API agar
              audit trail tetap konsisten dan minim risiko privilege escalation.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/assessor"
            className="inline-flex items-center h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black uppercase tracking-widest"
          >
            Buka Menu Assessor
          </Link>
          <Link
            href="/curator"
            className="inline-flex items-center h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black uppercase tracking-widest"
          >
            Buka Menu Curator
          </Link>
        </div>
      </Card>
    </div>
  )
}
