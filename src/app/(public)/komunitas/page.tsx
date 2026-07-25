// src/app/(public)/komunitas/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, query, where, getDocs, orderBy, limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Share2, Trophy, Users, TrendingUp, Star, Crown, Medal
} from 'lucide-react';
import { BrainIcon, AiSparkIcon, InfinityWorkflowIcon } from '@/types';
import { toast } from 'sonner';

// ============================================================
// TYPES
// ============================================================
interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  trackType?: string;
  badge?: string;
}

const RANK_ICONS = [
  <Crown key={1} size={16} className="text-yellow-500" />,
  <Medal key={2} size={16} className="text-slate-400" />,
  <Medal key={3} size={16} className="text-amber-600" />,
];

const TRACK_COLORS: Record<string, string> = {
  B2B: 'bg-indigo-50 text-indigo-600',
  Startup: 'bg-purple-50 text-purple-600',
  Personal: 'bg-teal-50 text-teal-600',
  Komunitas: 'bg-emerald-50 text-emerald-600',
};

const MILESTONES = [
  { icon: <BrainIcon size={24} className="text-indigo-600" />, label: '10,000+', sublabel: 'Asesmen Selesai', bg: 'bg-indigo-50' },
  { icon: <Users size={24} className="text-emerald-600" />, label: '5,000+', sublabel: 'Pengguna Aktif', bg: 'bg-emerald-50' },
  { icon: <TrendingUp size={24} className="text-amber-500" />, label: '76', sublabel: 'Rata-rata Skor', bg: 'bg-amber-50' },
  { icon: <Star size={24} className="text-purple-500" />, label: '92%', sublabel: 'Kepuasan Pengguna', bg: 'bg-purple-50' },
];

const SOCIAL_SHARE_TEXT = 'Saya baru saja menyelesaikan asesmen di @OmnifitAI — sistem AI assessment terbaik untuk bisnis dan pertumbuhan personal! 🚀 Coba sekarang di';
const SHARE_URL = 'https://omnifit.ai';

// Mask business name: show first word + "****"
function maskName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return parts[0].charAt(0) + '****';
  return parts[0] + ' ' + parts.slice(1).map(() => '****').join(' ');
}

export default function KomunitasPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const q = query(
        collection(db, 'assessments'),
        where('status', '==', 'COMPLETED'),
        where('score', '>', 0),
        orderBy('score', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const entries: LeaderboardEntry[] = snap.docs.map((d, i) => {
        const data = d.data();
        const rawName = data.namaUsaha || data.businessName || 'Pengguna Anonim';
        return {
          rank: i + 1,
          displayName: maskName(rawName),
          score: data.score || 0,
          trackType: data.trackType,
        };
      });
      setLeaderboard(entries);
    } catch (e) {
      console.error('Gagal load leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const text = `${SOCIAL_SHARE_TEXT} ${SHARE_URL}`;
    if (navigator.share) {
      try {
        setSharing(true);
        await navigator.share({ title: 'Omnifit AI', text, url: SHARE_URL });
      } catch { /* ignore cancel */ } finally { setSharing(false); }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success('Link berhasil disalin!');
      } catch {
        toast.error('Gagal menyalin link');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 font-sans selection:bg-indigo-100">

      {/* HERO */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-700 to-indigo-600 text-white pt-14 pb-20 px-6 lg:px-12">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="inline-flex w-16 h-16 bg-white/10 backdrop-blur-sm rounded-3xl items-center justify-center mb-5 ring-1 ring-white/20">
            <Users size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3">Komunitas Omnifit</h1>
          <p className="text-purple-100 font-medium max-w-md mx-auto text-sm leading-relaxed">
            Bergabunglah dengan ribuan pemimpin bisnis dan profesional yang menggunakan AI untuk tumbuh bersama.
          </p>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 lg:px-12 -mt-8 space-y-8">

        {/* PLATFORM MILESTONES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white p-5 rounded-3xl ring-1 ring-slate-200 shadow-sm text-center"
            >
              <div className={`w-12 h-12 ${m.bg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                {m.icon}
              </div>
              <p className="text-2xl font-black text-slate-900">{m.label}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 leading-tight">{m.sublabel}</p>
            </motion.div>
          ))}
        </div>

        {/* LEADERBOARD */}
        <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" />
              <h2 className="text-sm font-black text-slate-900">Papan Skor Teratas</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama disamarkan</span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Belum ada data leaderboard</p>
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
                    {i < 3 ? RANK_ICONS[i] : (
                      <span className="text-sm font-black text-slate-400 w-6 text-center">{entry.rank}</span>
                    )}
                  </div>

                  {/* AVATAR */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>

                  {/* NAME + TRACK */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate">{entry.displayName}</p>
                    {entry.trackType && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${TRACK_COLORS[entry.trackType] || 'bg-slate-50 text-slate-500'}`}>
                        {entry.trackType}
                      </span>
                    )}
                  </div>

                  {/* SCORE */}
                  <div className={`px-3 py-1.5 rounded-xl font-black text-sm flex-shrink-0 ${
                    entry.score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                    entry.score >= 60 ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-50 text-slate-600'
                  }`}>
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
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Share2 size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Ajak Teman Bergabung</h3>
              <p className="text-indigo-100 text-sm">Bantu ekosistem berkembang bersama</p>
            </div>
          </div>

          <p className="text-indigo-100 text-sm leading-relaxed mb-5 bg-white/5 rounded-2xl p-4 font-medium">
            "{SOCIAL_SHARE_TEXT} {SHARE_URL}"
          </p>

          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full h-12 bg-white text-indigo-700 font-black rounded-2xl text-sm hover:bg-indigo-50 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Share2 size={16} />
            {sharing ? 'Membagikan...' : 'Bagikan ke Teman'}
          </button>
        </div>

        {/* JOIN CTA */}
        {!user && (
          <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm p-8 text-center">
            <AiSparkIcon size={40} className="text-indigo-600 mx-auto mb-3" />
            <h3 className="font-black text-lg text-slate-900 mb-2">Daftar & Masuk Leaderboard</h3>
            <p className="text-sm text-slate-500 mb-5">Mulai asesmen dan tampilkan nama Anda di papan skor</p>
            <button
              onClick={() => router.push('/assessment')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl transition-colors"
            >
              Mulai Asesmen Sekarang <InfinityWorkflowIcon size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
