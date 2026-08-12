'use client'

// src/app/(public)/progress/page.tsx

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus,
  Calendar, ExternalLink, Activity, History,
  ArrowRight
} from 'lucide-react'
import { DocExportIcon, AiSparkIcon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import {
  PageShell,
  PageHeader,
  StatCard,
  EmptyState,
  PageLoading,
  ScoreLineChart,
} from '@/components/domain/public'

interface AssessmentRecord {
  id: string
  trackType?: string
  businessName?: string
  namaUsaha?: string
  score?: number
  status: string
  createdAt: string
  updatedAt?: string
}

function ScoreBadge({ score, status, isAdaptive }: { score?: number, status: string, isAdaptive?: boolean }) {
  if (score != null) {
    const numScore = Number(score);
    if (!isNaN(numScore)) {
      const color =
        numScore >= 80 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20'
          : numScore >= 60 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/20'
          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20'

      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-black ring-1 ${color}`}>
          {numScore}
        </span>
      )
    }
  }
  
  if (status === 'COMPLETED' || isAdaptive) {
    return <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg ring-1 ring-indigo-200 dark:ring-indigo-500/20">Selesai</span>
  }
  
  return <span className="text-xs text-slate-400 font-bold">Proses...</span>
}

const asSafeText = (value: unknown, fallback = '-'): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value) return fallback;

  if (typeof value === 'object') {
    const maybeName = (value as any).name || (value as any).label || (value as any).title || (value as any).value || (value as any).trackName;
    if (typeof maybeName === 'string' && maybeName.trim().length > 0) return maybeName;
    return fallback;
  }
  
  return fallback;
};

export default function ProgressPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [records, setRecords] = useState<AssessmentRecord[]>([])
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/progress')
      return
    }
    if (user) fetchRecords()
  }, [user, loading])

  const fetchRecords = async () => {
    if (!user?.uid) return
    try {
      const q = query(
        collection(db, 'assessments'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'asc')
      )
      const snap = await getDocs(q)
      setRecords(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt,
          } as AssessmentRecord
        })
      )
    } catch (e) {
      console.error('Gagal load progress:', e)
    } finally {
      setIsFetching(false)
    }
  }

  // Pisahkan record yang valid memiliki skor angka untuk chart
  const completedWithScores = records.filter((r) => r.status === 'COMPLETED' && r.score != null && !isNaN(Number(r.score)))
  const scores = completedWithScores.map((r) => Number(r.score))
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : 0
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const improvement = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0

  const TrendIcon = useMemo(() => {
    if (improvement > 0) return <TrendingUp size={20} className="text-emerald-500" />
    if (improvement < 0) return <TrendingDown size={20} className="text-rose-500" />
    return <Minus size={20} className="text-slate-400" />
  }, [improvement])

  const formatDate = (iso: string) => {
    try {
      if (!iso) return 'Invalid date'
      return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
    } catch (error) {
      return 'Invalid date'
    }
  }

  if (loading || isFetching) {
    return <PageLoading message="Memuat Data Progres..." />
  }

  return (
    <PageShell size="lg" fullBleed>
      {/* HEADER */}
      <PageHeader
        title="Progres Saya"
        subtitle="Timeline & analisis perjalanan asesmen"
        icon={<Activity size={24} className="text-indigo-600 dark:text-indigo-400" />}
        onBack={() => router.back()}
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-8 space-y-8">
        {records.length === 0 ? (
          <EmptyState
            icon={<DocExportIcon size={56} className="text-slate-200" />}
            title="Belum Ada Riwayat"
            description="Mulai asesmen pertama untuk melihat grafik progres dan analisis perjalanan Anda."
            actionLabel="Mulai Asesmen"
            onAction={() => router.push('/assessment')}
          />
        ) : (
          <>
            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Program', value: records.length, valueClassName: 'text-foreground' },
                { label: 'Skor Tertinggi', value: bestScore, valueClassName: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Skor Terakhir', value: latestScore, valueClassName: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Rata-rata', value: avgScore, valueClassName: 'text-amber-600 dark:text-amber-400' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <StatCard label={s.label} value={s.value} valueClassName={s.valueClassName} />
                </motion.div>
              ))}
            </div>

            {/* TREND SUMMARY */}
            {scores.length >= 2 && (
              <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] ring-1 shadow-sm ${
                improvement > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10/50 ring-emerald-100'
                  : improvement < 0 ? 'bg-rose-50 dark:bg-rose-500/10/50 ring-rose-100'
                  : 'bg-muted text-muted-foreground ring-slate-200/60'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  improvement > 0 ? 'bg-emerald-100' : improvement < 0 ? 'bg-rose-100' : 'bg-slate-200'
                }`}>
                  {TrendIcon}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Analisis Tren</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {improvement > 0
                      ? `Luar biasa! Skor Anda meningkat ${improvement} poin sejak asesmen pertama.`
                      : improvement < 0
                      ? `Skor menurun ${Math.abs(improvement)} poin — tantangan mendatang!`
                      : 'Skor stabil konsisten — pertahankan momentum!'}
                  </p>
                </div>
              </div>
            )}

            {/* LINE CHART */}
            {scores.length >= 2 && (
              <div className="card-solid p-6 sm:p-8 rounded-[2rem] ring-1 ring-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-black text-foreground">Grafik Performa</h3>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase tracking-widest ring-1 ring-indigo-100 dark:ring-indigo-500/30">
                    {scores.length} Titik Data
                  </span>
                </div>
                <ScoreLineChart scores={scores} />
                <div className="flex justify-between mt-3 px-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Asesmen Pertama</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Terbaru</span>
                </div>
              </div>
            )}

            {/* GRID RIWAYAT */}
            <div>
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <History size={14} /> Riwayat Perjalanan Asesmen
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...records].reverse().map((rec, i) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className="card-solid p-5 rounded-[1.5rem] ring-1 ring-border shadow-sm hover:shadow-md hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all flex flex-col h-full min-h-[140px] group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      {rec.trackType && (
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md ring-1 ring-indigo-100 uppercase tracking-widest">
                          {asSafeText(rec.trackType, 'Evaluasi')}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                        <Calendar size={12} /> {formatDate(rec.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-black text-foreground text-sm mb-4 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:text-indigo-400 transition-colors flex-1">
                      {asSafeText(rec.namaUsaha || rec.businessName, 'Asesmen Tanpa Nama')}
                    </h4>
                    <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                      <div className="flex items-center gap-2">
                        <AiSparkIcon size={16} className={rec.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-400'} />
                        <ScoreBadge score={rec.score} status={rec.status} isAdaptive={rec.trackType?.toLowerCase().includes('adaptive')} />
                      </div>
                      {rec.status === 'COMPLETED' && (
                        <button
                          onClick={() => router.push(`/result/${rec.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 ring-1 ring-border transition-all"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-indigo-50 dark:bg-indigo-500/10/50 p-8 sm:p-10 rounded-[2rem] ring-1 ring-indigo-100 text-center flex flex-col items-center">
              <div className="w-14 h-14 card-solid text-indigo-600 dark:text-indigo-400 rounded-[1.2rem] flex items-center justify-center shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800 mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="font-black text-xl text-indigo-950 dark:text-indigo-50 mb-2 tracking-tight">Siap Melampaui Batas?</h3>
              <p className="text-indigo-700 dark:text-indigo-300/80 text-sm mb-6 max-w-sm leading-relaxed">
                Lakukan asesmen berikutnya untuk memantau perkembangan dan mendapatkan rekomendasi terbaru dari AI.
              </p>
              <Button
                variant="brand"
                onClick={() => router.push('/assessment')}
                className="px-8 h-12"
              >
                Mulai Evaluasi Baru <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}