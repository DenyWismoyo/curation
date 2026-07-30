'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
} from 'firebase/firestore'
import { db, functions } from '@/lib/firebase'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { httpsCallable } from 'firebase/functions'
import {
  Search,
  Radar,
  Users,
  Clock3,
  ShieldCheck,
  Link2,
  Copy,
  CheckCircle2,
  FileDown,
  HandCoins,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type ReferralAttributionDoc = {
  id: string
  visitorId: string
  attributionModel: 'first_click_30d' | 'last_click_30d'
  selectedAffiliateCode: string
  status: string
  expiresAtMs?: number
  boundUserUid?: string | null
  boundUserEmail?: string | null
  lastTransactionId?: string | null
  lastTouchAtMs?: number
  firstClick?: {
    affiliateCode?: string
    capturedAtMs?: number
    landingPath?: string
    sourceQuery?: string
  }
  lastClick?: {
    affiliateCode?: string
    capturedAtMs?: number
    landingPath?: string
    sourceQuery?: string
  }
}

type CommissionDoc = {
  id: string
  affiliateCode?: string
  affiliateOwnerUid?: string
  packageName?: string
  transactionId?: string
  transactionAmount?: number
  commissionAmount?: number
  status?: string
  createdAt?: any
  updatedAt?: any
}

const formatDate = (ms?: number | null): string => {
  if (!ms || !Number.isFinite(ms)) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

const trimText = (value: string, max = 70): string => {
  if (!value) return '-'
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ReferralAttributionDoc[]>([])
  const [selected, setSelected] = useState<ReferralAttributionDoc | null>(null)
  const [approvedCommissions, setApprovedCommissions] = useState<
    CommissionDoc[]
  >([])
  const [pendingCommissions, setPendingCommissions] = useState<CommissionDoc[]>(
    []
  )
  const [payingId, setPayingId] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'referral_attributions'),
          orderBy('updatedAt', 'desc'),
          limit(100)
        )
        const snap = await getDocs(q)
        const docs = snap.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) }) as ReferralAttributionDoc
        )
        setRows(docs)
      } catch (error) {
        console.error('Gagal memuat referral_attributions:', error)
        toast.error('Gagal memuat data referral attribution.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const qApproved = query(
          collection(db, 'affiliate_commissions'),
          where('status', '==', 'APPROVED'),
          limit(30)
        )
        const snapApproved = await getDocs(qApproved)
        let docsApproved = snapApproved.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) }) as CommissionDoc
        )
        docsApproved.sort((a, b) => {
          const dateA = a.updatedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0
          const dateB = b.updatedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0
          return dateB - dateA
        })
        setApprovedCommissions(docsApproved)

        const qPending = query(
          collection(db, 'affiliate_commissions'),
          where('status', '==', 'PENDING_APPROVAL'),
          limit(30)
        )
        const snapPending = await getDocs(qPending)
        let docsPending = snapPending.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) }) as CommissionDoc
        )
        docsPending.sort((a, b) => {
          const dateA = a.updatedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0
          const dateB = b.updatedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0
          return dateB - dateA
        })
        setPendingCommissions(docsPending)
      } catch (error) {
        console.error('Gagal memuat commissions:', error)
      }
    }

    fetchCommissions()
  }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return rows

    return rows.filter((row) => {
      const text = [
        row.id,
        row.visitorId,
        row.selectedAffiliateCode,
        row.boundUserEmail || '',
        row.boundUserUid || '',
        row.lastTransactionId || '',
        row.firstClick?.affiliateCode || '',
        row.lastClick?.affiliateCode || '',
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(needle)
    })
  }, [rows, search])

  const activeCount = useMemo(
    () => filtered.filter((row) => row.status === 'ACTIVE').length,
    [filtered]
  )

  const exportCsv = () => {
    const headers = [
      'attribution_id',
      'visitor_id',
      'selected_affiliate_code',
      'model',
      'status',
      'bound_user_email',
      'bound_user_uid',
      'first_click_affiliate',
      'first_click_at',
      'last_click_affiliate',
      'last_click_at',
      'landing_path',
      'source_query',
      'last_transaction_id',
      'expires_at',
    ]

    const escape = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`
    const lines = filtered.map((row) => [
      row.id,
      row.visitorId,
      row.selectedAffiliateCode,
      row.attributionModel,
      row.status,
      row.boundUserEmail || '',
      row.boundUserUid || '',
      row.firstClick?.affiliateCode || '',
      row.firstClick?.capturedAtMs
        ? new Date(row.firstClick.capturedAtMs).toISOString()
        : '',
      row.lastClick?.affiliateCode || '',
      row.lastClick?.capturedAtMs
        ? new Date(row.lastClick.capturedAtMs).toISOString()
        : '',
      row.lastClick?.landingPath || row.firstClick?.landingPath || '',
      row.lastClick?.sourceQuery || row.firstClick?.sourceQuery || '',
      row.lastTransactionId || '',
      row.expiresAtMs ? new Date(row.expiresAtMs).toISOString() : '',
    ])

    const csv = [
      headers.map(escape).join(','),
      ...lines.map((line) => line.map(escape).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `referral-attribution-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV referral attribution berhasil diekspor.')
  }

  const handleMarkPaid = async (commissionId: string) => {
    setPayingId(commissionId)
    try {
      const callable = httpsCallable(
        functions,
        'adminMarkAffiliateCommissionPaid'
      )
      await callable({ commissionId })
      toast.success('Komisi berhasil ditandai sebagai PAID.')
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menandai komisi sebagai PAID.')
    } finally {
      setPayingId('')
    }
  }

  const handleReview = async (
    commissionId: string,
    action: 'APPROVE' | 'REJECT'
  ) => {
    if (
      !confirm(
        `Anda yakin ingin ${action === 'APPROVE' ? 'menyetujui' : 'menolak'} komisi ini?`
      )
    ) {
      return
    }

    setReviewingId(commissionId)
    try {
      const callable = httpsCallable(functions, 'adminReviewAffiliatePayout')
      await callable({
        commissionId,
        action,
        note: `Direview oleh admin pada ${new Date().toLocaleString('id-ID')}`,
      })
      toast.success(
        `Komisi berhasil di-${action === 'APPROVE' ? 'setujui' : 'tolak'}.`
      )
    } catch (error: any) {
      console.error('Gagal review komisi:', error)
      toast.error(`Gagal melakukan review komisi: ${error?.message || 'Error'}`)
    } finally {
      setReviewingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="font-bold tracking-widest text-xs uppercase">
            Memuat Audit Referral...
          </p>
        </div>
      </div>
    )
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
              Referral Intelligence
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-500">
              Attribution & Commission Audit
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <Radar className="w-6 h-6" />
            </div>
            Audit Referral Attribution
          </h1>
          <p className="text-slate-500 mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Monitor jejak ref per visitor, model atribusi, binding user, dan
            transaksi terakhir untuk validasi komisi affiliate.
          </p>
        </div>

        {/* QUICK METRICS */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Visitor Tracked
              </p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {rows.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Aktif (30-Hari)
              </p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">
                {activeCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Cari visitorId, affiliateCode, email, transactionId..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-slate-50 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-slate-500">
            Menampilkan{' '}
            <span className="text-slate-900">{filtered.length}</span> dokumen
            referral attribution
          </p>
          <Button
            onClick={exportCsv}
            variant="outline"
            className="h-9 rounded-xl"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">
                Belum ada data attribution yang cocok.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">Visitor</th>
                    <th className="px-6 py-5">Affiliate</th>
                    <th className="px-6 py-5">Model</th>
                    <th className="px-6 py-5">Bound User</th>
                    <th className="px-6 py-5">Tx Terakhir</th>
                    <th className="px-6 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((row) => {
                    const active = row.status === 'ACTIVE'
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelected(row)}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800">
                            {trimText(row.visitorId || row.id, 24)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Touch: {formatDate(row.lastTouchAtMs)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-black text-indigo-700">
                            {row.selectedAffiliateCode || '-'}
                          </p>
                          <p className="text-xs text-slate-500">
                            first: {row.firstClick?.affiliateCode || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700">
                            {row.attributionModel || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {trimText(row.boundUserEmail || '-', 26)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {trimText(row.boundUserUid || '-', 20)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {row.lastTransactionId || '-'}
                          </p>
                          <p className="text-xs text-slate-500">
                            exp: {formatDate(row.expiresAtMs)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                              active
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            }`}
                          >
                            {row.status || '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm p-6">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Link2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-bold text-slate-500">
                Pilih satu baris untuk melihat detail attribution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  Detail Attribution
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(selected.id)
                    toast.success('ID attribution disalin.')
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Attribution ID
                  </p>
                  <p className="font-semibold text-slate-800 break-all">
                    {selected.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Selected Affiliate
                  </p>
                  <p className="font-black text-indigo-700">
                    {selected.selectedAffiliateCode || '-'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      First Click
                    </p>
                    <p className="font-semibold text-slate-800">
                      {selected.firstClick?.affiliateCode || '-'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(selected.firstClick?.capturedAtMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Last Click
                    </p>
                    <p className="font-semibold text-slate-800">
                      {selected.lastClick?.affiliateCode || '-'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(selected.lastClick?.capturedAtMs)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Landing Path
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selected.lastClick?.landingPath ||
                      selected.firstClick?.landingPath ||
                      '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Query Source
                  </p>
                  <p className="font-semibold text-slate-700 break-words">
                    {trimText(
                      selected.lastClick?.sourceQuery ||
                        selected.firstClick?.sourceQuery ||
                        '-',
                      120
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Bound User
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selected.boundUserEmail || '-'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selected.boundUserUid || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Last Transaction
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selected.lastTransactionId || '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <Clock3 className="w-3.5 h-3.5" />
                  Expired at: {formatDate(selected.expiresAtMs)}
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg ring-1 ring-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Audit-only view. Perubahan attribution dilakukan via backend
                  pipeline.
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {selected && (
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Selected: {selected.id}
        </div>
      )}

      <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-600">
            Antrian Review Komisi (PENDING)
          </h3>
          <p className="text-xs font-bold text-slate-500">
            {pendingCommissions.length} item
          </p>
        </div>

        {pendingCommissions.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Tidak ada komisi berstatus PENDING_APPROVAL saat ini.
          </p>
        ) : (
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="py-3 pr-4">Komisi ID</th>
                  <th className="py-3 pr-4">Affiliate</th>
                  <th className="py-3 pr-4">Modul</th>
                  <th className="py-3 pr-4">Nilai Komisi</th>
                  <th className="py-3 pr-4">Nilai Tx</th>
                  <th className="py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingCommissions.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-800">
                      {trimText(row.id, 20)}
                    </td>
                    <td className="py-3 pr-4 text-indigo-700 font-black">
                      {row.affiliateCode || '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.packageName || '-'}
                    </td>
                    <td className="py-3 pr-4 font-black text-amber-600">
                      Rp{' '}
                      {Number(row.commissionAmount || 0).toLocaleString(
                        'id-ID'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      Rp{' '}
                      {Number(row.transactionAmount || 0).toLocaleString(
                        'id-ID'
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReview(row.id, 'APPROVE')}
                          disabled={reviewingId === row.id}
                          className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3"
                        >
                          {reviewingId === row.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          )}{' '}
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReview(row.id, 'REJECT')}
                          disabled={reviewingId === row.id}
                          variant="outline"
                          className="h-8 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 px-3"
                        >
                          Reject
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

      <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Antrian Payout Komisi (APPROVED)
          </h3>
          <p className="text-xs font-bold text-slate-500">
            {approvedCommissions.length} item
          </p>
        </div>

        {approvedCommissions.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Tidak ada komisi berstatus APPROVED saat ini.
          </p>
        ) : (
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="py-3 pr-4">Komisi ID</th>
                  <th className="py-3 pr-4">Affiliate</th>
                  <th className="py-3 pr-4">Modul</th>
                  <th className="py-3 pr-4">Nilai Komisi</th>
                  <th className="py-3 pr-4">Nilai Tx</th>
                  <th className="py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {approvedCommissions.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-800">
                      {row.id}
                    </td>
                    <td className="py-3 pr-4 text-indigo-700 font-black">
                      {row.affiliateCode || '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.packageName || '-'}
                    </td>
                    <td className="py-3 pr-4 font-black text-emerald-700">
                      Rp{' '}
                      {Number(row.commissionAmount || 0).toLocaleString(
                        'id-ID'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      Rp{' '}
                      {Number(row.transactionAmount || 0).toLocaleString(
                        'id-ID'
                      )}
                    </td>
                    <td className="py-3">
                      <Button
                        onClick={() => handleMarkPaid(row.id)}
                        disabled={payingId === row.id}
                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {payingId === row.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                        ) : (
                          <HandCoins className="w-3.5 h-3.5 mr-2" />
                        )}
                        Mark Paid
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
