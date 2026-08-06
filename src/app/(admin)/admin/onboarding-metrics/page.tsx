'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { Card } from '@/components/ui/card'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type DailyMetric = {
  id: string
  totalCalls?: number
  fallbackCalls?: number
  sources?: Record<string, number>
  updatedAt?: any
}

type QualityLog = {
  id: string
  uid?: string
  role?: string
  purpose?: string
  sector?: string
  source?: string
  stepCount?: number
  recommendationCount?: number
  latencyMs?: number
  fallback?: boolean
  warning?: string | null
  createdAt?: any
}

const formatDate = (raw: any) => {
  try {
    if (!raw) return '-'
    const date = typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return '-'
  }
}

export default function AdminOnboardingMetricsPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [logs, setLogs] = useState<QualityLog[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const [mSnap, lSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'onboarding_agent_metrics'),
              orderBy('updatedAt', 'desc'),
              limit(14)
            )
          ),
          getDocs(
            query(
              collection(db, 'onboarding_agent_logs'),
              orderBy('createdAt', 'desc'),
              limit(40)
            )
          ),
        ])

        const mRows = mSnap.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) }) as DailyMetric
        )
        const lRows = lSnap.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) }) as QualityLog
        )

        setMetrics(mRows)
        setLogs(lRows)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const summary = useMemo(() => {
    const totalCalls = logs.reduce(
      (acc, row) => acc + Number(row.stepCount ? 1 : 1),
      0
    )
    const fallbackCalls = logs.filter((row) => row.fallback).length
    const avgLatencyMs =
      logs.length > 0
        ? Math.round(
            logs.reduce((acc, row) => acc + Number(row.latencyMs || 0), 0) /
              logs.length
          )
        : 0

    const sourceDist = logs.reduce(
      (acc, row) => {
        const source = String(row.source || 'unknown')
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalCalls,
      fallbackCalls,
      avgLatencyMs,
      fallbackRate:
        totalCalls > 0
          ? Math.round((fallbackCalls / totalCalls) * 1000) / 10
          : 0,
      sourceDist,
    }
  }, [logs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[55vh]">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Activity className="w-4 h-4 animate-pulse" />
          Memuat onboarding metrics...
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
            Agent Analytics
          </Badge>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold text-slate-500">
            Model Performance & Quality Logs
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
            <Activity className="w-6 h-6" />
          </div>
          Onboarding Agent Metrics
        </h1>
        <p className="text-slate-500 mt-1 font-medium max-w-3xl text-sm leading-relaxed">
          Monitoring kualitas output adaptive onboarding (model vs fallback) dan
          latensi respons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-white rounded-2xl ring-1 ring-slate-200/80 border-none shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Calls
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.totalCalls}
          </p>
        </Card>
        <Card className="p-5 bg-white rounded-2xl ring-1 ring-slate-200/80 border-none shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Fallback Calls
          </p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {summary.fallbackCalls}
          </p>
        </Card>
        <Card className="p-5 bg-white rounded-2xl ring-1 ring-slate-200/80 border-none shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Fallback Rate
          </p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {summary.fallbackRate}%
          </p>
        </Card>
        <Card className="p-5 bg-white rounded-2xl ring-1 ring-slate-200/80 border-none shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Avg Latency
          </p>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {summary.avgLatencyMs} ms
          </p>
        </Card>
      </div>

      <Card className="p-6 bg-white rounded-2xl ring-1 ring-slate-200 border-none shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Distribusi Sumber Output
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(summary.sourceDist).map(([key, value]) => (
            <div
              key={key}
              className="p-4 rounded-xl bg-slate-50 ring-1 ring-slate-100"
            >
              <p className="text-xs font-bold text-slate-500">{key}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
            </div>
          ))}
          {Object.keys(summary.sourceDist).length === 0 && (
            <p className="text-sm text-slate-500">
              Belum ada data source distribution.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl ring-1 ring-slate-200 border-none shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Log Terbaru (40 call)
          </h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="py-3 pr-4">Waktu</th>
                <th className="py-3 pr-4">Purpose / Sector</th>
                <th className="py-3 pr-4">Source</th>
                <th className="py-3 pr-4">Step / Modul</th>
                <th className="py-3 pr-4">Latency</th>
                <th className="py-3">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 align-top">
                  <td className="py-3 pr-4 text-slate-600">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    <p className="font-semibold">
                      {row.purpose || '-'} / {row.sector || '-'}
                    </p>
                    <p className="text-xs text-slate-400">
                      role: {row.role || '-'}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                        row.fallback
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      }`}
                    >
                      {row.source || '-'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {Number(row.stepCount || 0)} /{' '}
                    {Number(row.recommendationCount || 0)}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-800">
                    {Number(row.latencyMs || 0)} ms
                  </td>
                  <td className="py-3">
                    {row.warning ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {row.warning}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 bg-white rounded-2xl ring-1 ring-slate-200 border-none shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
          Metrik Harian (14 dokumen terakhir)
        </h2>
        <div className="space-y-2">
          {metrics.map((row) => (
            <div
              key={row.id}
              className="p-4 rounded-xl bg-slate-50 ring-1 ring-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <p className="text-xs font-bold text-slate-600">{row.id}</p>
              <p className="text-xs text-slate-700">
                total:{' '}
                <span className="font-black">
                  {Number(row.totalCalls || 0)}
                </span>{' '}
                | fallback:{' '}
                <span className="font-black text-amber-700">
                  {Number(row.fallbackCalls || 0)}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                updated: {formatDate(row.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
