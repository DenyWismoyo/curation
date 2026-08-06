'use client'

import React, { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { functions } from '@/lib/firebase/firebase'
import { Loader2, Percent, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type ProgramConfig = {
  defaultCommissionRate: number
  commissionInfoText: string
}

export default function AdminAffiliateProgramPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ratePercent, setRatePercent] = useState('10')
  const [commissionInfoText, setCommissionInfoText] = useState('')
  const [applyToExistingAffiliates, setApplyToExistingAffiliates] =
    useState(true)

  const loadConfig = async () => {
    setLoading(true)
    try {
      const callable = httpsCallable(
        functions,
        'getAffiliateProgramConfigPublic'
      )
      const res = await callable()
      const data = res.data as { programConfig?: ProgramConfig }
      const config = data.programConfig
      if (config) {
        setRatePercent(
          String(
            Math.round(Number(config.defaultCommissionRate || 0) * 10000) / 100
          )
        )
        setCommissionInfoText(config.commissionInfoText || '')
      }
    } catch (error: any) {
      toast.error(
        error?.message || 'Gagal memuat konfigurasi program affiliate.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleSave = async () => {
    const parsedPercent = Number(ratePercent)
    if (
      !Number.isFinite(parsedPercent) ||
      parsedPercent <= 0 ||
      parsedPercent > 100
    ) {
      toast.error('Persentase komisi harus di antara 0.01 hingga 100.')
      return
    }

    setSaving(true)
    try {
      const callable = httpsCallable(
        functions,
        'adminUpdateAffiliateProgramConfig'
      )
      const res = await callable({
        defaultCommissionRate: parsedPercent / 100,
        commissionInfoText,
        applyToExistingAffiliates,
      })
      const data = res.data as { updatedAffiliates?: number }
      toast.success(
        `Konfigurasi komisi berhasil disimpan. ${Number(data.updatedAffiliates || 0)} profil affiliate diperbarui.`
      )
      await loadConfig()
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan konfigurasi affiliate.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-bold tracking-widest text-xs uppercase">
            Memuat Program Affiliate...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="secondary"
            className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
          >
            Affiliate Management
          </Badge>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold text-slate-500">
            Commission Rules Engine
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
            <Percent className="w-6 h-6" />
          </div>
          Pengaturan Program Affiliate
        </h1>
        <p className="text-slate-500 mt-1 font-medium max-w-3xl text-sm leading-relaxed">
          Atur persentase komisi default program affiliate yang akan digunakan
          untuk perhitungan komisi transaksi.
        </p>
      </div>

      <Card className="bg-white rounded-3xl border-none ring-1 ring-slate-200/80 shadow-xs p-6 space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            Komisi Default Program (%)
          </p>
          <div className="relative max-w-sm">
            <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              className="pl-9 h-11 bg-slate-50/80 rounded-xl border-slate-200 font-bold focus-visible:ring-indigo-500"
              placeholder="Contoh: 10"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Contoh input: 10 berarti komisi 10% dari nilai transaksi yang valid.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            Keterangan Komisi (Ditampilkan ke Affiliate)
          </p>
          <textarea
            value={commissionInfoText}
            onChange={(e) => setCommissionInfoText(e.target.value)}
            className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Contoh: Komisi dibayarkan setelah transaksi berstatus PAID dan lolos review admin."
          />
        </div>

        <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/80 ring-1 ring-amber-200/70 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToExistingAffiliates}
            onChange={(e) => setApplyToExistingAffiliates(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span className="text-sm text-amber-900 font-bold">
            Terapkan juga persentase komisi ini ke profil affiliate yang sudah
            ada (maksimal 500 profil per penyimpanan).
          </span>
        </label>

        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold h-11 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Konfigurasi Program
          </Button>
        </div>
      </Card>
    </div>
  )
}
