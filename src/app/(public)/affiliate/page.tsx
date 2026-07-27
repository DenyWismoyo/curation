'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, functions } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  ChevronLeft,
  Copy,
  Link2,
  Wallet,
  Users,
  BadgeDollarSign,
  Clock3,
  Save,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

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

  if (loading || booting) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-bold tracking-widest text-xs uppercase">
            Memuat Portal Affiliate...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 rounded-3xl ring-1 ring-slate-200 border-none shadow-sm text-center space-y-4">
          <h1 className="text-xl font-black text-slate-900">
            Portal Affiliate
          </h1>
          <p className="text-sm text-slate-500">
            Masuk dulu ke akun Anda untuk mengakses tautan referral dan data
            komisi.
          </p>
          <Button
            onClick={() => loginWithGoogle()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            Login dengan Google
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 px-6 lg:px-12 pt-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors group"
        >
          <ChevronLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali
        </button>

        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Portal Affiliate
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-3xl">
            Kelola tautan referral Anda, lengkapi data payout, dan pantau komisi
            terbaru.
          </p>
        </div>

        <Card className="p-5 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
                Info Komisi Program Affiliate
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {programCommissionPercent}%
              </p>
              <p className="text-sm text-slate-600 mt-2">
                {programConfig?.commissionInfoText ||
                  'Komisi affiliate dihitung dari transaksi yang berhasil dibayar sesuai ketentuan Omnifit.'}
              </p>
            </div>
            <Link
              href="/affiliate/program"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Baca Panduan Program Affiliate
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="md:col-span-2 p-5 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-3 text-indigo-700">
              <Link2 className="w-4 h-4" />
              <p className="text-xs font-black uppercase tracking-widest">
                Kode & Link
              </p>
            </div>
            <p className="text-sm text-slate-500 mb-1">Kode Affiliate</p>
            <p className="text-lg font-black text-slate-900">
              {affiliateCode || '-'}
            </p>
            <p className="text-sm text-slate-500 mt-3 mb-1">Referral Link</p>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="bg-slate-50" />
              <Button
                variant="outline"
                className="px-3"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink || '')
                  toast.success('Referral link disalin.')
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <Users className="w-4 h-4" />
              <p className="text-xs font-black uppercase tracking-widest">
                Referrals
              </p>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {totals.totalReferrals}
            </p>
          </Card>

          <Card className="p-5 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <BadgeDollarSign className="w-4 h-4" />
              <p className="text-xs font-black uppercase tracking-widest">
                Pending
              </p>
            </div>
            <p className="text-base font-black text-slate-900">
              {formatRupiah(totals.pendingCommission)}
            </p>
          </Card>

          <Card className="p-5 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white">
            <div className="flex items-center gap-2 text-indigo-700 mb-2">
              <Wallet className="w-4 h-4" />
              <p className="text-xs font-black uppercase tracking-widest">
                Paid
              </p>
            </div>
            <p className="text-base font-black text-slate-900">
              {formatRupiah(totals.paidCommission)}
            </p>
          </Card>
        </div>

        <Card className="p-6 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Data Payout Komisi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Nama Tampilan Affiliate
              </p>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Metode Payout
              </p>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Detail Rekening / Akun Payout
            </p>
            <Input
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
              placeholder="Contoh: BCA 123456789 a.n. Nama Anda"
            />
          </div>

          {payoutMethod === 'ewallet' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Nomor Telepon E-Wallet
                </p>
                <Input
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="Contoh: 0812xxxxxx"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Provider E-Wallet
                </p>
                <select
                  value={payoutEwalletProvider}
                  onChange={(e) => setPayoutEwalletProvider(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Pilih provider</option>
                  <option value="DANA">DANA</option>
                  <option value="GoPay">GoPay</option>
                  <option value="OVO">OVO</option>
                  <option value="ShopeePay">ShopeePay</option>
                  <option value="LinkAja">LinkAja</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Nama Akun E-Wallet
                </p>
                <Input
                  value={payoutEwalletAccountName}
                  onChange={(e) => setPayoutEwalletAccountName(e.target.value)}
                  placeholder="Nama pada akun e-wallet"
                />
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200">
            <input
              type="checkbox"
              checked={payoutDataConfirmed}
              onChange={(e) => setPayoutDataConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-amber-900 font-medium">
              Saya mengonfirmasi bahwa data payout (rekening / e-wallet / nomor
              telepon / nama akun) yang saya masukkan adalah benar dan siap
              digunakan untuk proses pembagian komisi.
            </span>
          </label>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Status affiliate:{' '}
              <span className="font-bold text-slate-700">
                {profile?.status || 'ACTIVE'}
              </span>
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !payoutDataConfirmed}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Data Payout
            </Button>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl ring-1 ring-slate-200 border-none shadow-sm bg-white">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
            Riwayat Komisi Terbaru
          </h2>

          {commissions.length === 0 ? (
            <div className="text-sm text-slate-500 py-6 text-center">
              Belum ada komisi masuk.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="py-3 pr-4">Tanggal</th>
                    <th className="py-3 pr-4">Modul</th>
                    <th className="py-3 pr-4">Nilai Tx</th>
                    <th className="py-3 pr-4">Komisi</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="py-3 pr-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(row.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">
                        {row.packageName || '-'}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {formatRupiah(Number(row.transactionAmount || 0))}
                      </td>
                      <td className="py-3 pr-4 font-black text-indigo-700">
                        {formatRupiah(Number(row.commissionAmount || 0))}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700">
                          {row.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
