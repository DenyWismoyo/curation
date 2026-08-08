// src/app/(public)/komunitas/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  Share2,
  Trophy,
  Users,
  TrendingUp,
  Star,
  Crown,
  Medal,
} from 'lucide-react'
import { BrainIcon, AiSparkIcon, InfinityWorkflowIcon } from '@/components/icon'
import { toast } from 'sonner'
import { PageShell, StatCard } from '@/components/domain/public'

// ============================================================
// TYPES
// ============================================================
interface LeaderboardEntry {
  rank: number
  displayName: string
  score: number
  trackType?: string
  badge?: string
}

const RANK_ICONS = [
  <Crown key={1} size={16} className="text-yellow-500" />,
  <Medal key={2} size={16} className="text-slate-400" />,
  <Medal key={3} size={16} className="text-amber-600 dark:text-amber-400" />,
]

const TRACK_COLORS: Record<string, string> = {
  B2B: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  Startup: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  Personal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
  Komunitas: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const MILESTONES = [
  {
    icon: <BrainIcon size={24} className="text-indigo-600 dark:text-indigo-400" />,
    label: '10,000+',
    sublabel: 'Asesmen Selesai',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    icon: <Users size={24} className="text-emerald-600 dark:text-emerald-400" />,
    label: '5,000+',
    sublabel: 'Pengguna Aktif',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: <TrendingUp size={24} className="text-amber-500" />,
    label: '76',
    sublabel: 'Rata-rata Skor',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    icon: <Star size={24} className="text-purple-500" />,
    label: '92%',
    sublabel: 'Kepuasan Pengguna',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
]

const SOCIAL_SHARE_TEXT =
  'Saya baru saja menyelesaikan asesmen di @OmnifitAI — sistem AI assessment terbaik untuk bisnis dan pertumbuhan personal! 🚀 Coba sekarang di'
const SHARE_URL = 'https://omnifit.ai'

// Mask business name: show first 2 chars + *** for each word
function maskName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((word) => word.slice(0, 2) + '*'.repeat(Math.max(2, word.length - 2)))
    .join(' ')
}

export default function KomunitasPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const q = query(
        collection(db, 'assessments'),
        where('status', '==', 'COMPLETED'),
        where('score', '>', 0),
        orderBy('score', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      const entries: LeaderboardEntry[] = snap.docs.map((d, i) => {
        const data = d.data()
        const rawName = data.namaUsaha || data.businessName || 'Pengguna Anonim'
        return {
          rank: i + 1,
          displayName: maskName(rawName),
          score: data.score || 0,
          trackType: data.trackType,
        }
      })
      setLeaderboard(entries)
    } catch (e) {
      console.error('Gagal load leaderboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const text = `${SOCIAL_SHARE_TEXT} ${SHARE_URL}`
    if (navigator.share) {
      try {
        setSharing(true)
        await navigator.share({ title: 'Omnifit AI', text, url: SHARE_URL })
      } catch {
        /* ignore cancel */
      } finally {
        setSharing(false)
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Link berhasil disalin!')
      } catch {
        toast.error('Gagal menyalin link')
      }
    }
  }

  return (
    <PageShell size="md" fullBleed>
      <div className="max-w-3xl mx-auto px-5 lg:px-10 pt-8 space-y-8">
        {/* HERO */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Komunitas Omnifit
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground font-medium">
            Bergabunglah dengan ribuan pemimpin bisnis dan profesional yang
            menggunakan AI untuk tumbuh bersama.
          </p>
        </div>

        {/* PLATFORM MILESTONES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <StatCard
                label={m.sublabel}
                value={m.label}
                icon={
                  <div className={`w-12 h-12 ${m.bg} rounded-2xl flex items-center justify-center mb-1`}>
                    {m.icon}
                  </div>
                }
                className="text-center rounded-3xl"
              />
            </motion.div>
          ))}
        </div>

        {/* LEADERBOARD */}
        <div className="card-solid rounded-3xl ring-1 ring-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" />
              <h2 className="text-sm font-black text-foreground">
                Papan Skor Teratas
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Nama disamarkan
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-muted text-muted-foreground rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                Belum ada data leaderboard
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 px-6 py-4 ${i < 3 ? 'bg-gradient-to-r from-yellow-50/30 to-transparent' : ''}`}
                >
                  {/* RANK */}
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    {i < 3 ? (
                      RANK_ICONS[i]
                    ) : (
                      <span className="text-sm font-black text-slate-400 w-6 text-center">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* AVATAR */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      i === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : i === 1
                          ? 'bg-secondary text-secondary-foreground text-muted-foreground'
                          : i === 2
                            ? 'bg-amber-100 text-amber-700 dark:text-amber-300'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>

                  {/* NAME + TRACK */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground text-sm truncate">
                      {entry.displayName}
                    </p>
                    {entry.trackType && (
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${TRACK_COLORS[entry.trackType] || 'bg-muted text-muted-foreground text-muted-foreground'}`}
                      >
                        {entry.trackType}
                      </span>
                    )}
                  </div>

                  {/* SCORE */}
                  <div
                    className={`px-3 py-1.5 rounded-xl font-black text-sm flex-shrink-0 ${
                      entry.score >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : entry.score >= 60
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'bg-muted text-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {entry.score}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* SOCIAL SHARE */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 card-solid/10 rounded-2xl flex items-center justify-center">
              <Share2 size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Ajak Teman Bergabung</h3>
              <p className="text-indigo-100 text-sm">
                Bantu ekosistem berkembang bersama
              </p>
            </div>
          </div>

          <p className="text-indigo-100 text-sm leading-relaxed mb-5 card-solid/5 rounded-2xl p-4 font-medium">
            "{SOCIAL_SHARE_TEXT} {SHARE_URL}"
          </p>

          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full h-12 card-solid text-indigo-700 dark:text-indigo-300 font-black rounded-2xl text-sm hover:bg-indigo-50 dark:bg-indigo-500/10 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Share2 size={16} />
            {sharing ? 'Membagikan...' : 'Bagikan ke Teman'}
          </button>
        </div>

        {/* JOIN CTA */}
        {!user && (
          <div className="card-solid rounded-3xl ring-1 ring-border shadow-sm p-8 text-center">
            <AiSparkIcon size={40} className="text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
            <h3 className="font-black text-lg text-foreground mb-2">
              Daftar & Masuk Leaderboard
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Mulai asesmen dan tampilkan nama Anda di papan skor
            </p>
            <button
              onClick={() => router.push('/assessment')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl transition-colors"
            >
              Mulai Asesmen Sekarang <InfinityWorkflowIcon size={16} />
            </button>
          </div>
        )}

        {/* BOTTOM PADDING */}
        <div className="pb-8" />
      </div>
    </PageShell>
  )
}
