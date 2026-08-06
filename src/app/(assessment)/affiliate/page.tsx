'use client'

// src/app/(public)/affiliate/page.tsx

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, functions } from '@/lib/firebase/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Copy, Check, Link2, Wallet, Users, BadgeDollarSign,
  Clock3, Save, Loader2, BookOpen, TrendingUp,
  HandCoins, ShieldCheck, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PageShell, PageHeader, StatCard, ContentCard,
  EmptyState, PageLoading,
} from '@/components/domain/public'

type AffiliateProfile = {
  ownerUid?: string
  ownerEmail?: string
  displayName?: string
  payoutMethod?: string
  payoutAccount?: string
  payoutPhone?: string
  payoutEwalletProvider?: string
  payoutEwalletAccountName?: string
  payoutDataConfirmed?: boolean
  commissionRate?: number
  status?: string
  stats?: {
    totalReferrals?: number
    referredRevenue?: number
    pendingCommission?: number
    approvedCommission?: number
    paidCommission?: number
  }
  referralLink?: string
}

type AffiliateProgramConfig = {
  defaultCommissionRate?: number
  commissionInfoText?: string
}

type CommissionRow = {
  id: string
  packageName?: string
  commissionAmount?: number
  transactionAmount?: number
  status?: string
  paymentStatus?: string
  createdAt?: any
}

const formatRupiah = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (raw: any): string => {
  if (!raw) return '-'
  try {
    if (typeof raw.toDate === 'function') {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(raw.toDate())
    }
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return '-'
  }
}

export default function AffiliatePortalPage() {
  const { user, loading, loginWithGoogle } = useAuth()
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [booting, setBooting] = useState(true)
  const [profile, setProfile] = useState<AffiliateProfile | null>(null)
  const [affiliateCode, setAffiliateCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('manual')
  const [payoutAccount, setPayoutAccount] = useState('')
  const [payoutPhone, setPayoutPhone] = useState('')
  const [payoutEwalletProvider, setPayoutEwalletProvider] = useState('')
  const [payoutEwalletAccountName, setPayoutEwalletAccountName] = useState('')
  const [payoutDataConfirmed, setPayoutDataConfirmed] = useState(false)
  const [programConfig, setProgramConfig] =
    useState<AffiliateProgramConfig | null>(null)
  const [commissions, setCommissions] = useState<CommissionRow[]>([])

  const referralLink =
    profile?.referralLink ||
    (affiliateCode ? `https://omnifit.cloud/?ref=${affiliateCode}` : '')

  const loadCommissions = async (uid: string) => {
    const q = query(
      collection(db, 'affiliate_commissions'),
      where('affiliateOwnerUid', '==', uid)
    )
    const snap = await getDocs(q)
    const rows = snap.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as any) }) as CommissionRow
    )
    rows.sort((a, b) => {
      const ad = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
      const bd = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
      return bd - ad
    })
    setCommissions(rows.slice(0, 25))
  }

  const loadAffiliate = async () => {
    if (!user) return

    setBooting(true)
    try {
      const callable = httpsCallable(functions, 'createOrGetAffiliateProfile')
      const res = await callable({
        displayName: user.displayName || 'Affiliate Partner',
      })

      const data = res.data as {
        affiliateCode: string
        profile: AffiliateProfile
        programConfig?: AffiliateProgramConfig
      }
      setAffiliateCode(data.affiliateCode || '')
      setProfile(data.profile || {})
      setProgramConfig(data.programConfig || null)
      setDisplayName(data.profile?.displayName || user.displayName || '')
      setPayoutMethod(data.profile?.payoutMethod || 'manual')
      setPayoutAccount(data.profile?.payoutAccount || '')
      setPayoutPhone(data.profile?.payoutPhone || '')
      setPayoutEwalletProvider(data.profile?.payoutEwalletProvider || '')
      setPayoutEwalletAccountName(data.profile?.payoutEwalletAccountName || '')
      setPayoutDataConfirmed(Boolean(data.profile?.payoutDataConfirmed))

      await loadCommissions(user.uid)
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memuat portal affiliate.')
    } finally {
      setBooting(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      return
    }
    if (user) {
      loadAffiliate()
    }
  }, [loading, user?.uid])

  const handleSave = async () => {
    if (!affiliateCode) return

    if (!payoutDataConfirmed) {
      toast.error(
        'Centang konfirmasi bahwa data payout yang dimasukkan sudah benar.'
      )
      return
    }

    if (payoutMethod === 'ewallet') {
      if (
        !payoutPhone.trim() ||
        !payoutEwalletProvider.trim() ||
        !payoutEwalletAccountName.trim()
      ) {
        toast.error(
          'Lengkapi nomor telepon, provider e-wallet, dan nama akun e-wallet.'
        )
        return
      }
    }

    setSaving(true)
    try {
      const callable = httpsCallable(functions, 'updateAffiliatePayoutProfile')
      const res = await callable({
        affiliateCode,
        displayName,
        payoutMethod,
        payoutAccount,
        payoutPhone,
        payoutEwalletProvider,
        payoutEwalletAccountName,
        payoutDataConfirmed,
      })

      const data = res.data as { profile: AffiliateProfile }
      setProfile(data.profile || {})
      toast.success('Data payout affiliate berhasil diperbarui.')
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan data payout.')
    } finally {
      setSaving(false)
    }
  }

  const totals = useMemo(() => {
    const stats = profile?.stats || {}
    return {
      totalReferrals: Number(stats.totalReferrals || 0),
      referredRevenue: Number(stats.referredRevenue || 0),
      pendingCommission: Number(stats.pendingCommission || 0),
      approvedCommission: Number(stats.approvedCommission || 0),
      paidCommission: Number(stats.paidCommission || 0),
    }
  }, [profile])

  const programCommissionPercent = useMemo(() => {
    const rate = Number(
      programConfig?.defaultCommissionRate ?? profile?.commissionRate ?? 0.1
    )
    if (!Number.isFinite(rate)) return '10'
    return String(Math.round(rate * 10000) / 100)
  }, [programConfig?.defaultCommissionRate, profile?.commissionRate])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading || booting) return <PageLoading message="Memuat Portal Affiliate..." />

  // ── Guest gate ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <PageShell size="sm" className="flex items-center justify-center min-h-screen">
        <ContentCard className="text-center space-y-5 max-w-sm mx-auto">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-indigo-100">
            <HandCoins size={24} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Portal Affiliate</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Masuk ke akun Anda untuk mengakses tautan referral dan data komisi.
            </p>
          </div>
          <Button
            onClick={() => loginWithGoogle()}
            variant="brand"
            className="w-full h-12 rounded-xl"
          >
            Masuk dengan Google
          </Button>
        </ContentCard>
      </PageShell>
    )
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const statusColor = (s?: string) => {
    const v = (s || '').toUpperCase()
    if (v === 'APPROVED') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    if (v === 'PENDING') return 'bg-amber-50 text-amber-700 ring-amber-200'
    if (v === 'PAID') return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    return 'bg-slate-100 text-slate-600 ring-slate-200'
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageShell size="lg" fullBleed>
      {/* HEADER */}
      <PageHeader
        title="Portal Affiliate"
        subtitle="Kelola tautan referral, lengkapi data payout, dan pantau komisi terbaru."
        icon={<HandCoins size={24} className="text-indigo-600" />}
        onBack={() => router.back()}
        actions={
          <Link
            href="/affiliate/program"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Panduan Program
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-8 space-y-6">

        {/* ── COMMISSION RATE BANNER ─────────────────────────────────────── */}
        <div className="bg-slate-900 rounded-[1.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Komisi Program Anda</p>
            <p className="text-4xl font-black text-white">{programCommissionPercent}<span className="text-xl text-slate-400">%</span></p>
            <p className="text-sm text-slate-400 font-medium mt-1.5 max-w-sm leading-relaxed">
              {programConfig?.commissionInfoText || 'Komisi dihitung dari transaksi yang berhasil dibayar sesuai ketentuan Omnifit.'}
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ring-1 ${
              (profile?.status || 'ACTIVE') === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                : 'bg-slate-700 text-slate-400 ring-slate-600'
            }`}>
              {profile?.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* ── STATS GRID ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Referral"
            value={totals.totalReferrals}
            icon={<div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center ring-1 ring-emerald-100 mb-2"><Users size={16} className="text-emerald-600" /></div>}
          />
          <StatCard
            label="Omzet Referral"
            value={<span className="text-xl">{formatRupiah(totals.referredRevenue)}</span>}
            icon={<div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center ring-1 ring-blue-100 mb-2"><TrendingUp size={16} className="text-blue-600" /></div>}
          />
          <StatCard
            label="Komisi Pending"
            value={<span className="text-xl">{formatRupiah(totals.pendingCommission)}</span>}
            icon={<div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center ring-1 ring-amber-100 mb-2"><BadgeDollarSign size={16} className="text-amber-600" /></div>}
          />
          <StatCard
            label="Komisi Dibayar"
            value={<span className="text-xl">{formatRupiah(totals.paidCommission)}</span>}
            icon={<div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center ring-1 ring-indigo-100 mb-2"><Wallet size={16} className="text-indigo-600" /></div>}
          />
        </div>

        {/* ── REFERRAL LINK CARD ────────────────────────────────────────── */}
        <ContentCard>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center ring-1 ring-indigo-100">
              <Link2 size={15} className="text-indigo-600" />
            </div>
            <h2 className="text-sm font-black text-slate-900">Kode & Tautan Referral</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kode */}
            <div className="bg-slate-50 rounded-2xl p-4 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Kode Affiliate</p>
              <p className="text-2xl font-black text-slate-900 font-mono tracking-wider">{affiliateCode || '-'}</p>
            </div>

            {/* Link */}
            <div className="bg-slate-50 rounded-2xl p-4 ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Referral Link</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-slate-600 truncate flex-1">{referralLink || '-'}</p>
                <CopyButton text={referralLink} />
              </div>
            </div>
          </div>
        </ContentCard>

        {/* ── PAYOUT FORM ───────────────────────────────────────────────── */}
        <ContentCard>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center ring-1 ring-amber-100">
              <Wallet size={15} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-black text-slate-900">Data Payout Komisi</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Tampilan</label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Metode Payout</label>
                <select
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="manual">Manual (Koordinasi Admin)</option>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detail Rekening / Akun Payout</label>
              <Input
                value={payoutAccount}
                onChange={e => setPayoutAccount(e.target.value)}
                placeholder="Contoh: BCA 123456789 a.n. Nama Anda"
                className="h-11 rounded-xl"
              />
            </div>

            {payoutMethod === 'ewallet' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">No. Telepon E-Wallet</label>
                  <Input value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="0812xxxxxx" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</label>
                  <select
                    value={payoutEwalletProvider}
                    onChange={e => setPayoutEwalletProvider(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="">Pilih provider</option>
                    {['DANA', 'GoPay', 'OVO', 'ShopeePay', 'LinkAja'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Akun</label>
                  <Input value={payoutEwalletAccountName} onChange={e => setPayoutEwalletAccountName(e.target.value)} placeholder="Nama pada akun e-wallet" className="h-11 rounded-xl" />
                </div>
              </div>
            )}

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={payoutDataConfirmed}
                onChange={e => setPayoutDataConfirmed(e.target.checked)}
                className="mt-0.5 accent-amber-600"
              />
              <span className="text-sm text-amber-900 font-medium leading-relaxed">
                Saya mengonfirmasi bahwa data payout yang saya masukkan adalah benar dan siap digunakan untuk proses pembagian komisi.
              </span>
            </label>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !payoutDataConfirmed}
                variant="brand"
                className="h-11 px-6 rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Data Payout
              </Button>
            </div>
          </div>
        </ContentCard>

        {/* ── COMMISSION HISTORY ────────────────────────────────────────── */}
        <ContentCard>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center ring-1 ring-slate-100">
              <Clock3 size={15} className="text-slate-500" />
            </div>
            <h2 className="text-sm font-black text-slate-900">Riwayat Komisi Terbaru</h2>
          </div>

          {commissions.length === 0 ? (
            <div className="py-10 text-center">
              <BadgeDollarSign size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Belum ada komisi masuk.</p>
              <p className="text-xs text-slate-400 mt-1">Bagikan link referral Anda untuk mulai mendapatkan komisi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="py-3 pr-4 font-black">Tanggal</th>
                    <th className="py-3 pr-4 font-black">Modul</th>
                    <th className="py-3 pr-4 font-black">Nilai Tx</th>
                    <th className="py-3 pr-4 font-black">Komisi</th>
                    <th className="py-3 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {commissions.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-4 text-slate-500 text-xs font-medium whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-slate-800 max-w-[180px] truncate">
                        {row.packageName || '-'}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600 font-medium">
                        {formatRupiah(Number(row.transactionAmount || 0))}
                      </td>
                      <td className="py-3.5 pr-4 font-black text-indigo-700">
                        {formatRupiah(Number(row.commissionAmount || 0))}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ring-1 ${statusColor(row.status)}`}>
                          {row.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>

        {/* ── PRIVACY NOTE ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 text-slate-400 pb-4">
          <ShieldCheck size={14} className="text-emerald-500" />
          <p className="text-xs font-bold">Data payout Anda dienkripsi dan hanya diakses oleh tim keuangan Omnifit.</p>
        </div>
      </div>
    </PageShell>
  )
}

// ─── Copy Button helper ───────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Referral link disalin.')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`h-8 w-8 flex items-center justify-center rounded-lg ring-1 transition-all shrink-0 ${
        copied ? 'bg-emerald-100 text-emerald-600 ring-emerald-200' : 'bg-white text-slate-400 hover:text-indigo-600 ring-slate-200'
      }`}
      title="Salin link"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}
