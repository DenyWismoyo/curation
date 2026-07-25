// src/app/(public)/profil/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Settings, LogOut, Bell,
  TrendingUp, Trophy, Star, Target, Zap,
  CheckCircle2, BarChart3, Award, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BrainIcon, InfinityWorkflowIcon, DocExportIcon, AiSparkIcon } from '@/types';
import { NotificationBell } from '@/app/components/shared/NotificationBell';

// ============================================================
// BADGE DEFINITIONS
// ============================================================
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
  {
    id: 'first_step',
    label: 'Langkah Pertama',
    description: 'Menyelesaikan asesmen pertama',
    icon: <Zap size={18} />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    condition: (s) => s.completedAssessments >= 1,
  },
  {
    id: 'score_80',
    label: 'Skor Gemilang',
    description: 'Meraih skor di atas 80',
    icon: <Star size={18} />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    condition: (s) => s.maxScore >= 80,
  },
  {
    id: 'consistent',
    label: 'Konsistensi Strategis',
    description: 'Menyelesaikan 3 asesmen atau lebih',
    icon: <TrendingUp size={18} />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    condition: (s) => s.completedAssessments >= 3,
  },
  {
    id: 'multi_track',
    label: 'Explorer',
    description: 'Mencoba 3 program berbeda',
    icon: <Target size={18} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    condition: (s) => s.distinctTracks >= 3,
  },
  {
    id: 'executor',
    label: 'Eksekutor',
    description: 'Menyelesaikan 5+ action items',
    icon: <CheckCircle2 size={18} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    condition: (s) => s.completedActionItems >= 5,
  },
  {
    id: 'premium',
    label: 'Member Premium',
    description: 'Memiliki akses modul premium',
    icon: <Award size={18} />,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    condition: (s) => s.hasPremium,
  },
  {
    id: 'score_90',
    label: 'Elite Analyst',
    description: 'Meraih skor di atas 90',
    icon: <Trophy size={18} />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    condition: (s) => s.maxScore >= 90,
  },
  {
    id: 'high_confidence',
    label: 'Strategis',
    description: 'Menyelesaikan 5 asesmen atau lebih',
    icon: <BarChart3 size={18} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    condition: (s) => s.completedAssessments >= 5,
  },
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
      router.push('/');
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

      const txQ = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('status', '==', 'PAID')
      );
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
    ? Math.round((stats.completedActionItems / stats.totalActionItems) * 100)
    : 0;

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <BrainIcon size={48} className="text-indigo-600 animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-100 pt-8 pb-0 px-6 lg:px-12">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              Kembali
            </button>
            <NotificationBell />
          </div>

          {/* PROFILE CARD */}
          <div className="flex items-center gap-5 pb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-500/20">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              {stats?.hasPremium && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                  <Award size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate mb-1">{user.displayName || 'Pengguna Omnifit'}</h1>
              <p className="text-sm text-slate-500 font-medium truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {stats?.hasPremium && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-md ring-1 ring-amber-200/50">
                    <Award size={10} /> Premium
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md ring-1 ring-emerald-200/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif
                </span>
              </div>
            </div>
          </div>

          {/* TAB NAV */}
          <div className="flex border-b border-slate-100 -mx-6 lg:-mx-12 px-6 lg:px-12 gap-1">
            {(['overview', 'badges', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'overview' ? 'Ringkasan' : tab === 'badges' ? 'Lencana' : 'Pengaturan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 lg:px-12 mt-8">
        <AnimatePresence mode="wait">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Asesmen', value: stats?.totalAssessments ?? 0, sub: 'program', icon: <DocExportIcon size={18} className="text-indigo-600" /> },
                  { label: 'Skor Tertinggi', value: `${stats?.maxScore ?? 0}`, sub: '/100', icon: <Star size={18} className="text-amber-500" /> },
                  { label: 'Rata-rata Skor', value: `${stats?.avgScore ?? 0}`, sub: '/100', icon: <BarChart3 size={18} className="text-emerald-600" /> },
                  { label: 'Lencana Didapat', value: earnedBadges.length, sub: `/ ${BADGES.length}`, icon: <Trophy size={18} className="text-purple-500" /> },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm"
                  >
                    <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center mb-3">{s.icon}</div>
                    <p className="text-2xl font-black text-slate-900">
                      {s.value}<span className="text-sm text-slate-400 font-bold ml-0.5">{s.sub}</span>
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {stats && stats.totalActionItems > 0 && (
                <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <InfinityWorkflowIcon size={18} className="text-indigo-600" />
                      <h3 className="text-sm font-black text-slate-900">Progres Action Plan</h3>
                    </div>
                    <span className="text-sm font-black text-indigo-600">{actionPlanProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${actionPlanProgress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {stats.completedActionItems} dari {stats.totalActionItems} tugas diselesaikan
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Lihat Progress', desc: 'Timeline & perbandingan skor', href: '/progress', icon: <TrendingUp size={20} className="text-emerald-600" />, hover: 'hover:border-emerald-200 hover:bg-emerald-50/30' },
                  { label: 'Buka Workspace', desc: 'Action plan & jurnal eksekusi', href: '/workspace', icon: <InfinityWorkflowIcon size={20} className="text-indigo-600" />, hover: 'hover:border-indigo-200 hover:bg-indigo-50/30' },
                  { label: 'Jelajahi Program', desc: 'Temukan modul baru', href: '/explore', icon: <AiSparkIcon size={20} className="text-purple-500" />, hover: 'hover:border-purple-200 hover:bg-purple-50/30' },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(a.href)}
                    className={`bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm text-left transition-all border border-transparent ${a.hover} group`}
                  >
                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">{a.icon}</div>
                    <p className="text-sm font-black text-slate-900">{a.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB: BADGES */}
          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {earnedBadges.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                    ✅ Lencana Diraih ({earnedBadges.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {earnedBadges.map((badge, i) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm text-center"
                      >
                        <div className={`w-12 h-12 ${badge.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                          <span className={badge.color}>{badge.icon}</span>
                        </div>
                        <p className="text-xs font-black text-slate-900 leading-tight">{badge.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">{badge.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {lockedBadges.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    🔒 Belum Terbuka ({lockedBadges.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {lockedBadges.map((badge) => (
                      <div key={badge.id} className="bg-white p-5 rounded-2xl ring-1 ring-slate-100 text-center opacity-40">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <span className="text-slate-300">{badge.icon}</span>
                        </div>
                        <p className="text-xs font-black text-slate-500 leading-tight">{badge.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {earnedBadges.length === 0 && (
                <div className="bg-white p-12 rounded-2xl ring-1 ring-slate-200 text-center">
                  <Trophy size={48} className="text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Lencana</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Selesaikan asesmen pertama Anda untuk mulai mengumpulkan lencana pencapaian.
                  </p>
                  <Button onClick={() => router.push('/assessment')} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                    Mulai Asesmen
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Bell size={16} className="text-indigo-600" /> Notifikasi
                </h3>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Weekly Action Plan Nudge</p>
                    <p className="text-xs text-slate-500 mt-0.5">Email motivasi setiap Senin pagi</p>
                  </div>
                  <button
                    onClick={() => {
                      setNudgeEnabled(!nudgeEnabled);
                      toast.success(nudgeEnabled ? 'Notifikasi dinonaktifkan' : 'Notifikasi diaktifkan');
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${nudgeEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${nudgeEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Settings size={16} className="text-slate-500" /> Informasi Akun
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Nama', value: user.displayName },
                    { label: 'Email', value: user.email },
                    { label: 'Member Sejak', value: user.metadata.creationTime ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(user.metadata.creationTime)) : '-' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{row.label}</span>
                      <span className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                  <ExternalLink size={16} className="text-slate-500" /> Navigasi Cepat
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Workspace OS', href: '/workspace' },
                    { label: 'Katalog Modul', href: '/katalog' },
                    { label: 'Ekosistem Mitra', href: '/mitra' },
                  ].map(link => (
                    <button
                      key={link.href}
                      onClick={() => router.push(link.href)}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-sm font-bold text-slate-700 transition-colors ring-1 ring-slate-100 hover:ring-indigo-200"
                    >
                      {link.label}
                      <ChevronLeft size={14} className="rotate-180" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => { await logout(); router.push('/'); }}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors ring-1 ring-red-100"
              >
                <LogOut size={16} /> Keluar dari Akun
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
