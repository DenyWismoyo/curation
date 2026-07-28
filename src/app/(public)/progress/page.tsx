'use client'

// src/app/(public)/progress/page.tsx

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  ChevronLeft, TrendingUp, TrendingDown, Minus,
  Calendar, ExternalLink, Activity, History, // <--- HISTORY DITAMBAHKAN DI SINI
  ArrowRight
} from 'lucide-react'
import { BrainIcon, DocExportIcon, AiSparkIcon } from '@/types'
import { Button } from '@/components/ui/button'
import { ScoreLineChart } from '@/components/domain/public'

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

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="text-xs text-slate-400 font-bold">Proses...</span>
  
  const color =
    score >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : score >= 60 ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-rose-50 text-rose-700 ring-rose-200'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-black ring-1 ${color}`}>
      {score}
    </span>
  )
}

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

  const completed = records.filter((r) => r.status === 'COMPLETED' && r.score)
  const scores = completed.map((r) => r.score!)
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
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <BrainIcon size={48} className="text-indigo-600 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 pt-20 font-sans selection:bg-indigo-100">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-100/60 px-6 lg:px-12 py-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors group mb-6 bg-slate-50 px-3 py-1.5 rounded-xl w-fit"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-[1.2rem] ring-1 ring-indigo-100 flex items-center justify-center">
              <Activity size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Progres Saya</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Timeline & analisis perjalanan asesmen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 mt-8 space-y-8">
        {records.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center ring-1 ring-slate-200/60 shadow-sm">
            <DocExportIcon size={56} className="text-slate-200 mx-auto mb-4 grayscale opacity-60" />
            <h3 className="text-xl font-black text-slate-900 mb-2">Belum Ada Riwayat</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
              Mulai asesmen pertama untuk melihat grafik progres dan analisis perjalanan Anda.
            </p>
            <Button onClick={() => router.push('/assessment')} className="bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 px-8 font-black transition-all">
              Mulai Asesmen
            </Button>
          </div>
        ) : (
          <>
            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Program', value: records.length, color: 'text-slate-900' },
                { label: 'Skor Tertinggi', value: bestScore, color: 'text-emerald-600' },
                { label: 'Skor Terakhir', value: latestScore, color: 'text-indigo-600' },
                { label: 'Rata-rata', value: avgScore, color: 'text-amber-600' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white p-6 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm flex flex-col justify-center"
                >
                  <p className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* TREND SUMMARY */}
            {scores.length >= 2 && (
              <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] ring-1 shadow-sm ${
                  improvement > 0 ? 'bg-emerald-50/50 ring-emerald-100'
                    : improvement < 0 ? 'bg-rose-50/50 ring-rose-100'
                    : 'bg-slate-50 ring-slate-200/60'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${improvement > 0 ? 'bg-emerald-100' : improvement < 0 ? 'bg-rose-100' : 'bg-slate-200'}`}>
                  {TrendIcon}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Analisis Tren</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">
                    {improvement > 0 ? `Luar biasa! Skor Anda meningkat ${improvement} poin sejak asesmen pertama.`
                      : improvement < 0 ? `Skor menurun ${Math.abs(improvement)} poin — tantangan mendatang!`
                      : 'Skor stabil konsisten — pertahankan momentum!'}
                  </p>
                </div>
              </div>
            )}

            {/* LINE CHART */}
            {scores.length >= 2 && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-black text-slate-900">Grafik Performa</h3>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-widest ring-1 ring-indigo-100">
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

            {/* GRID RIWAYAT (Menggantikan Timeline) */}
            <div>
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <History size={14} /> Riwayat Perjalanan Asesmen
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...records].reverse().map((rec, i) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className="bg-white p-5 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm hover:shadow-md hover:ring-indigo-200 transition-all flex flex-col h-full min-h-[140px] group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      {rec.trackType && (
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md ring-1 ring-indigo-100 uppercase tracking-widest">
                          {rec.trackType}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                        <Calendar size={12} /> {formatDate(rec.createdAt)}
                      </span>
                    </div>
                    
                    <h4 className="font-black text-slate-900 text-sm mb-4 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors flex-1">
                      {rec.namaUsaha || rec.businessName || 'Asesmen Tanpa Nama'}
                    </h4>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-2">
                        {rec.status === 'COMPLETED' ? <AiSparkIcon size={16} className="text-emerald-500" /> : <BrainIcon size={16} className="text-slate-400" />}
                        <ScoreBadge score={rec.score} />
                      </div>
                      {rec.status === 'COMPLETED' && (
                        <button
                          onClick={() => router.push(`/result/${rec.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 ring-1 ring-slate-200 hover:ring-indigo-200 transition-all"
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
            <div className="bg-indigo-50/50 p-8 sm:p-10 rounded-[2rem] ring-1 ring-indigo-100 text-center flex flex-col items-center justify-center mt-6">
              <div className="w-14 h-14 bg-white text-indigo-600 rounded-[1.2rem] flex items-center justify-center shadow-sm ring-1 ring-indigo-100 mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="font-black text-xl text-indigo-950 mb-2 tracking-tight">Siap Melampaui Batas?</h3>
              <p className="text-indigo-700/80 text-sm mb-6 max-w-sm leading-relaxed">
                Lakukan asesmen berikutnya untuk memantau perkembangan dan mendapatkan rekomendasi terbaru dari AI.
              </p>
              <button
                onClick={() => router.push('/assessment')}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 shadow-md transition-all"
              >
                Mulai Evaluasi Baru <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}