// src/app/(public)/progress/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Calendar, ExternalLink } from 'lucide-react';
import { BrainIcon, DocExportIcon, AiSparkIcon } from '@/types';
import { Button } from '@/components/ui/button';
import { ScoreLineChart, AssessmentStatusBadge } from '@/components/domain/public';

// ============================================================
// TYPES
// ============================================================
interface AssessmentRecord {
  id: string;
  trackType?: string;
  businessName?: string;
  namaUsaha?: string;
  score?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// SCORE BADGE
// ============================================================
function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="text-xs text-slate-400 font-bold">Proses...</span>;
  const color =
    score >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
    score >= 60 ? 'bg-amber-50 text-amber-700 ring-amber-100' :
    'bg-rose-50 text-rose-700 ring-rose-100';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-sm font-black ring-1 ${color}`}>
      {score}
    </span>
  );
}

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push('/login?next=/progress'); return; }
    if (user) fetchRecords();
  }, [user, loading]);

  const fetchRecords = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, 'assessments'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssessmentRecord)));
    } catch (e) {
      console.error('Gagal load progress:', e);
    } finally {
      setIsFetching(false);
    }
  };

  const completed = records.filter(r => r.status === 'COMPLETED' && r.score);
  const scores = completed.map(r => r.score!);
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const improvement = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;

  const TrendIcon = useMemo(() => {
    if (improvement > 0) return <TrendingUp size={16} className="text-emerald-500" />;
    if (improvement < 0) return <TrendingDown size={16} className="text-rose-500" />;
    return <Minus size={16} className="text-slate-400" />;
  }, [improvement]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <BrainIcon size={48} className="text-indigo-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 font-sans selection:bg-indigo-100">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-100 px-6 lg:px-12 py-8">
        <div className="max-w-[800px] mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors group mb-5"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Kembali
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <TrendingUp size={20} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Progres Saya</h1>
              <p className="text-sm text-slate-500 font-medium">Timeline & analisis perjalanan asesmen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 lg:px-12 mt-8 space-y-8">

        {records.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-slate-200 shadow-sm">
            <DocExportIcon size={48} className="text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-700 mb-2">Belum Ada Riwayat</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Mulai asesmen pertama untuk melihat grafik progres dan analisis perjalanan Anda.
            </p>
            <Button onClick={() => router.push('/assessment')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black">
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm"
                >
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* TREND SUMMARY */}
            {scores.length >= 2 && (
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm ${
                improvement > 0 ? 'bg-emerald-50 text-emerald-700' :
                improvement < 0 ? 'bg-rose-50 text-rose-700' :
                'bg-slate-50 text-slate-600'
              }`}>
                {TrendIcon}
                {improvement > 0
                  ? `Luar biasa! Skor Anda meningkat ${improvement} poin sejak asesmen pertama.`
                  : improvement < 0
                  ? `Skor menurun ${Math.abs(improvement)} poin — tantangan mendatang!`
                  : 'Skor stabil konsisten — pertahankan momentum!'}
              </div>
            )}

            {/* LINE CHART */}
            {scores.length >= 2 && (
              <div className="bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black text-slate-900">Tren Skor</h3>
                  <span className="text-xs font-bold text-slate-400">{scores.length} titik data</span>
                </div>
                <ScoreLineChart scores={scores} />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-bold">Pertama</span>
                  <span className="text-[10px] text-slate-400 font-bold">Terbaru</span>
                </div>
              </div>
            )}

            {/* TIMELINE */}
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-5">
                Riwayat Asesmen
              </h3>
              <div className="relative">
                {/* vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />

                <div className="space-y-4">
                  {[...records].reverse().map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative flex gap-5"
                    >
                      {/* dot */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border-2 ${
                        rec.status === 'COMPLETED' ? 'bg-indigo-600 border-indigo-200' : 'bg-slate-100 border-slate-200 animate-pulse'
                      }`}>
                        {rec.status === 'COMPLETED'
                          ? <AiSparkIcon size={16} className="text-white" />
                          : <BrainIcon size={16} className="text-slate-400" />
                        }
                      </div>

                      {/* card */}
                      <div className="flex-1 bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm mb-1">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-900 text-sm truncate">
                              {rec.namaUsaha || rec.businessName || 'Asesmen Tanpa Nama'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {rec.trackType && (
                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                  {rec.trackType}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <Calendar size={10} />
                                {formatDate(rec.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <ScoreBadge score={rec.score} />
                            {rec.status === 'COMPLETED' && (
                              <button
                                onClick={() => router.push(`/result/${rec.id}`)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-3xl text-white text-center">
              <h3 className="font-black text-xl mb-2">Siap Meningkatkan Skor?</h3>
              <p className="text-indigo-100 text-sm mb-5">Lakukan asesmen berikutnya dan lihat perkembangan Anda</p>
              <button
                onClick={() => router.push('/assessment')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-black text-sm rounded-2xl hover:bg-indigo-50 transition-colors"
              >
                Mulai Asesmen Baru <TrendingUp size={16} />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
