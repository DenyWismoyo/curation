'use client';

// src/app/(public)/profil/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, LogOut, Bell,
  TrendingUp, Trophy, Star, Target, Zap,
  CheckCircle2, BarChart3, Award, HandCoins,
} from 'lucide-react';
import { toast } from 'sonner';
import { InfinityWorkflowIcon, DocExportIcon, AiSparkIcon } from '@/types';
import { NotificationBell } from '@/components/shared';
import {
  PageShell,
  PageHeader,
  StatCard,
  ContentCard,
  EmptyState,
  PageLoading,
} from '@/components/domain/public';

interface Badge {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  condition: (stats: UserStats) => boolean;
}

interface UserStats {
  totalAssessments: number;
  completedAssessments: number;
  maxScore: number;
  avgScore: number;
  completedActionItems: number;
  totalActionItems: number;
  distinctTracks: number;
  hasPremium: boolean;
}

const BADGES: Badge[] = [
  { id: 'first_step', label: 'Langkah Pertama', description: 'Menyelesaikan asesmen pertama', icon: <Zap size={18} />, color: 'text-indigo-600', bgColor: 'bg-indigo-50', condition: (s) => s.completedAssessments >= 1 },
  { id: 'score_80', label: 'Skor Gemilang', description: 'Meraih skor di atas 80', icon: <Star size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50', condition: (s) => s.maxScore >= 80 },
  { id: 'consistent', label: 'Konsistensi Strategis', description: 'Menyelesaikan 3 asesmen atau lebih', icon: <TrendingUp size={18} />, color: 'text-emerald-600', bgColor: 'bg-emerald-50', condition: (s) => s.completedAssessments >= 3 },
  { id: 'multi_track', label: 'Explorer', description: 'Mencoba 3 program berbeda', icon: <Target size={18} />, color: 'text-blue-600', bgColor: 'bg-blue-50', condition: (s) => s.distinctTracks >= 3 },
  { id: 'executor', label: 'Eksekutor', description: 'Menyelesaikan 5+ action items', icon: <CheckCircle2 size={18} />, color: 'text-purple-600', bgColor: 'bg-purple-50', condition: (s) => s.completedActionItems >= 5 },
  { id: 'premium', label: 'Member Premium', description: 'Memiliki akses modul premium', icon: <Award size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50', condition: (s) => s.hasPremium },
  { id: 'score_90', label: 'Elite Analyst', description: 'Meraih skor di atas 90', icon: <Trophy size={18} />, color: 'text-yellow-500', bgColor: 'bg-yellow-50', condition: (s) => s.maxScore >= 90 },
  { id: 'high_confidence', label: 'Strategis', description: 'Menyelesaikan 5 asesmen atau lebih', icon: <BarChart3 size={18} />, color: 'text-teal-600', bgColor: 'bg-teal-50', condition: (s) => s.completedAssessments >= 5 },
];

export default function ProfilPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'settings'>('overview');
  const [nudgeEnabled, setNudgeEnabled] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/profil');
      return;
    }
    if (user) fetchStats();
  }, [user, loading]);

  const fetchStats = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const q = query(collection(db, 'assessments'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data());
      const completed = docs.filter(d => d.status === 'COMPLETED');
      const scores = completed.map(d => d.score || 0);
      const allTracks = [...new Set(completed.map(d => d.trackType).filter(Boolean))];
      let completedAP = 0;
      let totalAP = 0;
      
      completed.forEach(d => {
        const plan = d.aiResult?.customActionPlan || [];
        totalAP += plan.length;
        completedAP += plan.filter((i: any) => i.isCompleted).length;
      });

      const txQ = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('status', '==', 'PAID'));
      const txSnap = await getDocs(txQ);

      setStats({
        totalAssessments: docs.length,
        completedAssessments: completed.length,
        maxScore: scores.length > 0 ? Math.max(...scores) : 0,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        completedActionItems: completedAP,
        totalActionItems: totalAP,
        distinctTracks: allTracks.length,
        hasPremium: !txSnap.empty,
      });
    } catch (e) {
      console.error('Gagal load stats profil:', e);
    } finally {
      setIsFetching(false);
    }
  }, [user?.uid]);

  const earnedBadges = stats ? BADGES.filter(b => b.condition(stats)) : [];
  const lockedBadges = stats ? BADGES.filter(b => !b.condition(stats)) : BADGES;
  const actionPlanProgress = stats && stats.totalActionItems > 0
    ? Math.round((stats.completedActionItems / stats.totalActionItems) * 100) : 0;

  if (loading || isFetching) {
    return <PageLoading message="Memuat Profil..." />;
  }

  if (!user) return null;

  return (
    <PageShell size="md" fullBleed>
      {/* HEADER */}
      <PageHeader
        onBack={() => router.back()}
        actions={<NotificationBell />} title={undefined}      >
        {/* PROFILE INFO */}
        <div className="flex items-center gap-5 mt-2">
          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center text-2xl font-black ring-1 ring-indigo-100 shadow-sm">
              {user.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            {stats?.hasPremium && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm ring-2 ring-white">
                <Award size={14} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-slate-900 truncate mb-1">
              {user.displayName || 'Pengguna Omnifit'}
            </h1>
            <p className="text-sm text-slate-500 font-medium truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {stats?.hasPremium && (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-1 rounded-md ring-1 ring-amber-200/60">
                  <Award size={12} /> Member Premium
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md ring-1 ring-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Status Aktif
              </span>
            </div>
          </div>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-2 mt-8 overflow-x-auto pb-1">
          {(['overview', 'badges', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {tab === 'overview' ? 'Ringkasan' : tab === 'badges' ? 'Koleksi Lencana' : 'Pengaturan Akun'}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* TAB CONTENT */}
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-8">
        <AnimatePresence mode="wait">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* STAT GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Asesmen',
                    value: <>{stats?.totalAssessments ?? 0}<span className="text-sm text-slate-400 font-bold ml-1">program</span></>,
                    icon: <DocExportIcon size={20} className="text-indigo-600" />,
                  },
                  {
                    label: 'Skor Tertinggi',
                    value: <>{stats?.maxScore ?? 0}<span className="text-sm text-slate-400 font-bold ml-1">/100</span></>,
                    icon: <Star size={20} className="text-amber-500" />,
                  },
                  {
                    label: 'Rata-rata Skor',
                    value: <>{stats?.avgScore ?? 0}<span className="text-sm text-slate-400 font-bold ml-1">/100</span></>,
                    icon: <BarChart3 size={20} className="text-emerald-600" />,
                  },
                  {
                    label: 'Lencana',
                    value: <>{earnedBadges.length}<span className="text-sm text-slate-400 font-bold ml-1">dari {BADGES.length}</span></>,
                    icon: <Trophy size={20} className="text-purple-500" />,
                  },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <StatCard
                      label={s.label}
                      value={s.value}
                      icon={
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center ring-1 ring-slate-100 mb-2">
                          {s.icon}
                        </div>
                      }
                    />
                  </motion.div>
                ))}
              </div>

              {/* ACTION PLAN PROGRESS */}
              {stats && stats.totalActionItems > 0 && (
                <ContentCard className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                    <InfinityWorkflowIcon size={28} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-slate-900">Progres Action Plan OS</h3>
                      <span className="text-sm font-black text-indigo-600">{actionPlanProgress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${actionPlanProgress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Anda telah mengeksekusi{' '}
                      <strong className="text-slate-800">{stats.completedActionItems}</strong>{' '}
                      dari total {stats.totalActionItems} tugas strategis.
                    </p>
                  </div>
                </ContentCard>
              )}

              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Lihat Progress', desc: 'Timeline & grafik performa', href: '/progress', icon: <TrendingUp size={20} className="text-emerald-600" />, ring: 'hover:ring-emerald-200' },
                  { label: 'Buka Workspace', desc: 'Selesaikan Action Plan', href: '/workspace', icon: <InfinityWorkflowIcon size={20} className="text-indigo-600" />, ring: 'hover:ring-indigo-200' },
                  { label: 'Katalog Modul', desc: 'Cari asesmen baru', href: '/katalog', icon: <AiSparkIcon size={20} className="text-purple-500" />, ring: 'hover:ring-purple-200' },
                  { label: 'Portal Affiliate', desc: 'Komisi & Referral', href: '/affiliate', icon: <HandCoins size={20} className="text-amber-600" />, ring: 'hover:ring-amber-200' },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(a.href)}
                    className={`bg-white p-6 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm text-left transition-all ${a.ring} group flex flex-col`}
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {a.icon}
                    </div>
                    <p className="text-sm font-black text-slate-900 mb-1">{a.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{a.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB: BADGES */}
          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {earnedBadges.length === 0 ? (
                <EmptyState
                  icon={<Trophy size={48} className="text-slate-200" />}
                  title="Belum Ada Lencana"
                  description="Selesaikan asesmen pertama Anda untuk mulai mengumpulkan lencana pencapaian."
                  actionLabel="Mulai Asesmen"
                  onAction={() => router.push('/assessment')}
                />
              ) : (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award size={16} /> Lencana Diraih ({earnedBadges.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {earnedBadges.map((badge, i) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        className="bg-white p-6 rounded-[1.5rem] ring-1 ring-slate-200/60 shadow-sm text-center"
                      >
                        <div className={`w-14 h-14 ${badge.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white shadow-inner`}>
                          <span className={badge.color}>{badge.icon}</span>
                        </div>
                        <p className="text-sm font-black text-slate-900 leading-tight mb-1">{badge.label}</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{badge.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {lockedBadges.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">
                    Belum Terbuka ({lockedBadges.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {lockedBadges.map((badge) => (
                      <div key={badge.id} className="bg-white p-6 rounded-[1.5rem] ring-1 ring-slate-100 text-center opacity-50 grayscale">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <span className="text-slate-400">{badge.icon}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 leading-tight mb-1">{badge.label}</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* NOTIFIKASI */}
              <ContentCard>
                <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                  <Bell size={18} className="text-indigo-600" /> Preferensi Notifikasi
                </h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Weekly Action Plan Nudge</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Email motivasi setiap Senin pagi untuk menjaga ritme Anda.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNudgeEnabled(!nudgeEnabled);
                      toast.success(nudgeEnabled ? 'Notifikasi dinonaktifkan' : 'Notifikasi diaktifkan');
                    }}
                    className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${nudgeEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-1 transition-transform ${nudgeEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </ContentCard>

              {/* INFO AKUN */}
              <ContentCard>
                <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                  <Settings size={18} className="text-slate-500" /> Informasi Akun Sistem
                </h3>
                <div className="space-y-1">
                  {[
                    { label: 'Nama Lengkap', value: user.displayName },
                    { label: 'Alamat Email', value: user.email },
                    {
                      label: 'Terdaftar Sejak',
                      value: user.metadata.creationTime
                        ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(user.metadata.creationTime))
                        : '-',
                    },
                  ].map((row, idx) => (
                    <div
                      key={row.label}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50'}`}
                    >
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                      <span className="text-sm font-bold text-slate-900 truncate max-w-xs">{row.value}</span>
                    </div>
                  ))}
                </div>
              </ContentCard>

              {/* LOGOUT */}
              <button
                onClick={async () => { await logout(); router.push('/'); }}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-sm transition-colors ring-1 ring-rose-200"
              >
                <LogOut size={18} /> Keluar dari Sistem (Logout)
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageShell>
  );
}