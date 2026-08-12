'use client';

// src/app/(public)/profil/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, LogOut, Bell,
  TrendingUp, Trophy, Star, Target, Zap,
  CheckCircle2, BarChart3, Award, HandCoins,
} from 'lucide-react';
import { toast } from 'sonner';
import { InfinityWorkflowIcon, DocExportIcon, AiSparkIcon } from '@/components/icon';
import { NotificationBell } from '@/components/common/NotificationBell';
import { AppKeyValueList, AppKeyValueItem } from '@/components/ui/app-data-display';
import { SectionLabel, ContentCard } from '@/components/ui/design-system';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import { GradientBadge } from '@/components/landing/GradientBadge';
import {
  PageShell,
  PageHeader,
  StatCard,
  EmptyState,
  PageLoading,
  AppTabs,
  StatusBadge,
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
  { id: 'first_step', label: 'Langkah Pertama', description: 'Menyelesaikan asesmen pertama', icon: <Zap size={18} />, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-500/10', condition: (s) => s.completedAssessments >= 1 },
  { id: 'score_80', label: 'Skor Gemilang', description: 'Meraih skor di atas 80', icon: <Star size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-500/10', condition: (s) => s.maxScore >= 80 },
  { id: 'consistent', label: 'Konsistensi Strategis', description: 'Menyelesaikan 3 asesmen atau lebih', icon: <TrendingUp size={18} />, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', condition: (s) => s.completedAssessments >= 3 },
  { id: 'multi_track', label: 'Explorer', description: 'Mencoba 3 program berbeda', icon: <Target size={18} />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-500/10', condition: (s) => s.distinctTracks >= 3 },
  { id: 'executor', label: 'Eksekutor', description: 'Menyelesaikan 5+ action items', icon: <CheckCircle2 size={18} />, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-500/10', condition: (s) => s.completedActionItems >= 5 },
  { id: 'premium', label: 'Member Premium', description: 'Memiliki akses modul premium', icon: <Award size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-500/10', condition: (s) => s.hasPremium },
  { id: 'score_90', label: 'Elite Analyst', description: 'Meraih skor di atas 90', icon: <Trophy size={18} />, color: 'text-yellow-500', bgColor: 'bg-yellow-50', condition: (s) => s.maxScore >= 90 },
  { id: 'high_confidence', label: 'Strategis', description: 'Menyelesaikan 5 asesmen atau lebih', icon: <BarChart3 size={18} />, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-500/10', condition: (s) => s.completedAssessments >= 5 },
];

export default function ProfilPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'assessment' | 'crypto'>('account');
  const [profileData, setProfileData] = useState({ phone: '', nudgeEmail: true, nudgeWhatsapp: false });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/profil');
      return;
    }
    if (user) {
      fetchStats();
      fetchProfileData();
    }
  }, [user, loading]);

  const fetchProfileData = async () => {
    if (!user?.uid) return;
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfileData({
          phone: data.phone || '',
          nudgeEmail: data.nudgePreferences?.email ?? true,
          nudgeWhatsapp: data.nudgePreferences?.whatsapp ?? false,
        });
      }
    } catch (e) {
      console.error('Gagal memuat profil user:', e);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setIsSavingProfile(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        phone: profileData.phone,
        nudgePreferences: {
          email: profileData.nudgeEmail,
          whatsapp: profileData.nudgeWhatsapp,
        }
      }, { merge: true });
      toast.success('Pengaturan profil berhasil disimpan');
    } catch (e) {
      console.error('Gagal menyimpan profil user:', e);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchStats = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const q = query(collection(db, 'assessments'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data());
      const completed = docs.filter(d => d.status === 'COMPLETED');
      const scores = completed.map(d => Number(d.score)).filter(s => !isNaN(s) && s > 0);
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
        actions={<NotificationBell />}
        title={undefined}
      >
        {/* PROFILE INFO */}
        <div className="flex items-center gap-5 mt-2">
          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[1.5rem] flex items-center justify-center text-2xl font-black ring-1 ring-indigo-100 shadow-sm">
              {user.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            {stats?.hasPremium && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm ring-2 ring-white">
                <Award size={14} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-foreground truncate mb-1">
              {user.displayName || 'Pengguna Omnifit'}
            </h1>
            <p className="text-sm text-muted-foreground font-medium truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {stats?.hasPremium && (
                <div className="mb-1">
                  <GradientBadge variant="premium" icon={Award}>Member Premium</GradientBadge>
                </div>
              )}
              <StatusBadge variant="success" pulse={true}>
                Status Aktif
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* TAB NAV */}
        <div className="mt-8 pb-1">
          <AppTabs
            active={activeTab}
            onChange={(val: any) => setActiveTab(val)}
            variant="pill"
            tabs={[
              { id: 'account', label: 'Info Akun' },
              { id: 'assessment', label: 'Assessment' },
              { id: 'crypto', label: 'Crypto Premium' },
            ]}
          />
        </div>
      </PageHeader>

      {/* TAB CONTENT */}
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-8">
        <AnimatePresence mode="wait">

          {/* TAB: ASSESSMENT */}
          {activeTab === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* STAT GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Asesmen',
                    value: <><AnimatedCounter value={stats?.totalAssessments ?? 0} /><span className="text-sm text-slate-400 font-bold ml-1">program</span></>,
                    icon: <DocExportIcon size={20} className="text-indigo-600 dark:text-indigo-400" />,
                  },
                  {
                    label: 'Skor Tertinggi',
                    value: <><AnimatedCounter value={stats?.maxScore ?? 0} /><span className="text-sm text-slate-400 font-bold ml-1">/100</span></>,
                    icon: <Star size={20} className="text-amber-500" />,
                  },
                  {
                    label: 'Rata-rata Skor',
                    value: <><AnimatedCounter value={stats?.avgScore ?? 0} /><span className="text-sm text-slate-400 font-bold ml-1">/100</span></>,
                    icon: <BarChart3 size={20} className="text-emerald-600 dark:text-emerald-400" />,
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
                        <div className="w-10 h-10 bg-muted text-muted-foreground rounded-xl flex items-center justify-center ring-1 ring-border mb-2">
                          {s.icon}
                        </div>
                      }
                    />
                  </motion.div>
                ))}
              </div>

              {/* ACTION PLAN PROGRESS DIHAPUS */}

              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Lihat Progress', desc: 'Timeline & grafik performa', href: '/progress', icon: <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />, color: 'emerald' },
                  { label: 'Buka Workspace', desc: 'Selesaikan Action Plan', href: '/workspace', icon: <InfinityWorkflowIcon size={20} className="text-indigo-600 dark:text-indigo-400" />, color: 'indigo' },
                  { label: 'Katalog Modul', desc: 'Cari asesmen baru', href: '/katalog', icon: <AiSparkIcon size={20} className="text-rose-500" />, color: 'rose' },
                  { label: 'Portal Affiliate', desc: 'Komisi & Referral', href: '/affiliate', icon: <HandCoins size={20} className="text-amber-600 dark:text-amber-400" />, color: 'amber' },
                ].map((a, i) => (
                  <SpotlightCard
                    key={i}
                    color={a.color as 'emerald' | 'indigo' | 'rose' | 'amber'}
                    onClick={() => router.push(a.href)}
                    className="p-4 sm:p-6 cursor-pointer text-left flex flex-row sm:flex-col items-center sm:items-start group sm:min-h-[160px]"
                  >
                    <div className="w-10 h-10 shrink-0 bg-muted text-muted-foreground rounded-xl flex items-center justify-center mr-4 sm:mr-0 sm:mb-4 group-hover:scale-110 transition-transform relative z-10">
                      {a.icon}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="text-sm font-black text-foreground mb-0.5 sm:mb-1 truncate">{a.label}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed truncate sm:whitespace-normal sm:line-clamp-2">{a.desc}</p>
                    </div>
                  </SpotlightCard>
                ))}
              </div>

              {/* === BADGES SECTION === */}
              <div className="pt-6 mt-8 border-t border-border">
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
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap gap-4">
                      {earnedBadges.map((badge, i) => {
                        const spotlightColor = badge.color.includes('amber') || badge.color.includes('yellow') ? 'amber' :
                                              badge.color.includes('emerald') || badge.color.includes('teal') ? 'emerald' :
                                              badge.color.includes('rose') || badge.color.includes('red') || badge.color.includes('purple') ? 'rose' : 'indigo';
                        return (
                          <Tooltip key={badge.id}>
                            <TooltipTrigger asChild>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.1, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                className="cursor-help"
                              >
                                <SpotlightCard color={spotlightColor as 'indigo'|'amber'|'emerald'|'rose'} className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl group">
                                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${badge.bgColor} rounded-xl flex items-center justify-center ring-1 ring-white/50 dark:ring-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-300 relative z-10`}>
                                    <span className={badge.color}>{badge.icon}</span>
                                  </div>
                                </SpotlightCard>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-center p-3 z-[60]">
                              <p className="text-sm font-black text-white mb-1">{badge.label}</p>
                              <p className="text-[10px] text-slate-300 leading-relaxed">{badge.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                </div>
              )}

              {lockedBadges.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">
                    Belum Terbuka ({lockedBadges.length})
                  </h3>
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap gap-4">
                      {lockedBadges.map((badge) => (
                        <Tooltip key={badge.id}>
                          <TooltipTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-dashed border-border/60 bg-card/20 flex items-center justify-center opacity-50 grayscale hover:opacity-80 transition-opacity cursor-help"
                            >
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted text-muted-foreground rounded-xl flex items-center justify-center">
                                <span className="text-slate-400">{badge.icon}</span>
                              </div>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-center p-3 z-[60]">
                            <p className="text-sm font-bold text-white mb-1">{badge.label}</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{badge.description}</p>
                            <p className="text-[9px] text-slate-500 mt-2 font-semibold uppercase tracking-wider">Terkunci</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              )}
              </div>
            </motion.div>
          )}

          {/* TAB: CRYPTO */}
          {activeTab === 'crypto' && (
            <motion.div
              key="crypto"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <EmptyState
                icon={<Zap size={48} className="text-slate-200" />}
                title="Crypto Premium"
                description="Fitur portfolio dan laporan cerdas Crypto Premium akan segera hadir di sini."
                actionLabel="Jelajahi Fitur Crypto"
                onAction={() => router.push('/crypto')}
              />
            </motion.div>
          )}

          {/* TAB: ACCOUNT */}
          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* PENGATURAN KONTAK & NOTIFIKASI */}
              <ContentCard>
                <SectionLabel icon={<Bell size={16} className="text-indigo-600 dark:text-indigo-400" />} className="mb-6">
                  Preferensi Kontak & Nudge (Follow-Up)
                </SectionLabel>
                
                <div className="space-y-4">
                  {/* Nomor WhatsApp */}
                  <div className="p-4 bg-muted text-muted-foreground rounded-2xl border border-border">
                    <label className="block text-sm font-bold text-foreground mb-1">Nomor WhatsApp</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Digunakan untuk mengirimkan pesan follow-up otomatis berbasis AI mengenai progress *Action Plan* Anda.
                    </p>
                    <input 
                      type="tel" 
                      placeholder="Contoh: 081234567890" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 text-sm"
                    />
                  </div>

                  {/* Nudge Email */}
                  <div className="flex items-center justify-between p-4 bg-muted text-muted-foreground rounded-2xl border border-border">
                    <div>
                      <p className="text-sm font-bold text-foreground">Weekly Action Plan (Email)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kirim ringkasan mingguan ke email terdaftar Anda.
                      </p>
                    </div>
                    <button
                      onClick={() => setProfileData(prev => ({ ...prev, nudgeEmail: !prev.nudgeEmail }))}
                      className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${profileData.nudgeEmail ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-6 h-6 card-solid rounded-full shadow-md absolute top-1 transition-transform ${profileData.nudgeEmail ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Nudge WhatsApp */}
                  <div className="flex items-center justify-between p-4 bg-muted text-muted-foreground rounded-2xl border border-border">
                    <div>
                      <p className="text-sm font-bold text-foreground">Weekly Action Plan (WhatsApp)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Terima pesan WhatsApp dari AI Coach kami setiap awal pekan.
                      </p>
                    </div>
                    <button
                      onClick={() => setProfileData(prev => ({ ...prev, nudgeWhatsapp: !prev.nudgeWhatsapp }))}
                      className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${profileData.nudgeWhatsapp ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-6 h-6 card-solid rounded-full shadow-md absolute top-1 transition-transform ${profileData.nudgeWhatsapp ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-6 h-11 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                    >
                      {isSavingProfile ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                  </div>
                </div>
              </ContentCard>

              {/* INFO AKUN */}
              <ContentCard padding="none">
                <div className="p-6 pb-2">
                  <SectionLabel icon={<Settings size={16} className="text-muted-foreground" />}>
                    Informasi Akun Sistem
                  </SectionLabel>
                </div>
                <AppKeyValueList variant="striped" className="border-t border-border">
                  <AppKeyValueItem 
                    label="Nama Lengkap" 
                    value={user.displayName} 
                  />
                  <AppKeyValueItem 
                    label="Alamat Email" 
                    value={user.email} 
                  />
                  <AppKeyValueItem 
                    label="Terdaftar Sejak" 
                    value={
                      user.metadata.creationTime
                        ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(user.metadata.creationTime))
                        : '-'
                    } 
                  />
                </AppKeyValueList>
              </ContentCard>

              {/* LOGOUT */}
              <button
                onClick={async () => { await logout(); router.push('/'); }}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-sm transition-colors ring-1 ring-rose-200 dark:ring-rose-500/20"
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