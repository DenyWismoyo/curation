'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, Star, Flame, Medal, Award, Zap } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

interface AcademyStats {
  xp: number;
  badges: string[];
  streak: number;
  currentLevel: string;
}

const BADGE_CONFIG: Record<string, { icon: any, color: string, desc: string }> = {
  "Streak 7": { icon: Flame, color: "text-orange-500", desc: "Belajar 7 hari berturut-turut" },
  "Perfectionist": { icon: Trophy, color: "text-yellow-500", desc: "Score 100 di satu modul" },
  "Chart Reader": { icon: Star, color: "text-blue-500", desc: "Score 90+ di modul candlestick" },
  "Crypto 101": { icon: Medal, color: "text-purple-500", desc: "Selesai semua modul Level 1" },
  "Speed Learner": { icon: Zap, color: "text-emerald-500", desc: "Selesai 3 modul dalam 1 hari" },
  "SMC Master": { icon: Award, color: "text-rose-500", desc: "Selesai Level 3" },
};

export function CryptoAcademyBadges() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'userAcademyStats', user.uid), (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as AcademyStats);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) return null;
  if (!stats) return (
    <Card className="card-solid border-slate-200 dark:border-slate-800">
      <CardContent className="p-6 text-center">
        <p className="text-slate-400">Belum ada data pembelajaran.</p>
      </CardContent>
    </Card>
  );

  const nextLevelXp = Math.ceil((stats.xp + 1) / 500) * 500;
  const progressPercent = (stats.xp % 500) / 500 * 100;

  return (
    <div className="space-y-4">
      {/* XP & Level Summary */}
      <Card className="card-solid border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total XP</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                  {stats.xp}
                </span>
                <span className="text-sm text-muted-foreground font-medium pb-1">/ {nextLevelXp} XP</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Streak</p>
              <div className="flex items-center gap-1 justify-end text-orange-400">
                <Flame className="w-5 h-5" />
                <span className="text-xl font-black">{stats.streak} Hari</span>
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2 bg-secondary text-secondary-foreground" />
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {nextLevelXp - stats.xp} XP menuju level berikutnya
          </p>
        </CardContent>
      </Card>

      {/* Badges Collection */}
      <Card className="card-solid border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Medal className="w-5 h-5 text-purple-400" />
            Koleksi Badge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.badges && stats.badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stats.badges.map((badge, idx) => {
                const config = BADGE_CONFIG[badge];
                const Icon = config?.icon || Trophy;
                return (
                  <div key={idx} className="flex flex-col items-center justify-center p-4 bg-slate-200 dark:bg-slate-800/50 rounded-xl border border-slate-300 dark:border-slate-700/50 hover:bg-secondary text-secondary-foreground dark:hover:bg-secondary text-secondary-foreground transition-colors group">
                    <div className="p-3 card-solid rounded-full mb-3 ring-1 ring-white/10 group-hover:ring-white/20 group-hover:scale-110 transition-all">
                      <Icon className={`w-8 h-8 ${config?.color || "text-purple-500"}`} />
                    </div>
                    <p className="font-bold text-sm text-foreground text-center mb-1">{badge}</p>
                    <p className="text-[10px] text-slate-400 text-center leading-tight">
                      {config?.desc || "Pencapaian Spesial"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-200 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-slate-400">Belum ada badge yang dikumpulkan.</p>
              <p className="text-xs text-muted-foreground mt-1">Selesaikan kuis untuk mulai mendapatkan badge!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
