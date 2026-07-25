// src/app/(public)/explore/page.tsx
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
  Search, Sparkles, BarChart2, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { AiSparkIcon, BrainIcon, InfinityWorkflowIcon } from '@/types';
import { NotificationBell } from '@/app/components/shared/NotificationBell';

// ============================================================
// TYPES
// ============================================================
interface TemplateCard {
  id: string;
  title: string;
  description: string;
  trackType?: string;
  difficulty?: string;
  tags?: string[];
  usageCount?: number;
  isActive?: boolean;
}

interface PlatformStat {
  totalAssessments?: number;
  totalUsers?: number;
  avgScore?: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-50 text-emerald-600',
  intermediate: 'bg-amber-50 text-amber-600',
  advanced: 'bg-rose-50 text-rose-600',
};

const TRACK_ICONS: Record<string, React.ReactNode> = {
  B2B: <BrainIcon size={18} className="text-indigo-600" />,
  Startup: <AiSparkIcon size={18} className="text-purple-500" />,
  Personal: <InfinityWorkflowIcon size={18} className="text-teal-500" />,
};

export default function ExplorePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStat>({});
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('Semua');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Load active templates
        const tmplQ = query(
          collection(db, 'form_templates'),
          where('isActive', '==', true),
          orderBy('usageCount', 'desc'),
          limit(24)
        );
        const tmplSnap = await getDocs(tmplQ);
        setTemplates(tmplSnap.docs.map(d => ({ id: d.id, ...d.data() } as TemplateCard)));

        // Try platform_stats (non-blocking)
        try {
          const statsSnap = await getDocs(collection(db, 'platform_stats'));
          if (!statsSnap.empty) {
            setPlatformStats(statsSnap.docs[0].data() as PlatformStat);
          }
        } catch {
          // Silently ignore if collection doesn't exist yet
        }
      } catch (e) {
        console.error('Gagal load explore:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allTags = ['Semua', ...Array.from(new Set(templates.flatMap(t => t.tags || []).filter(Boolean)))];

  const filtered = templates.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = filterTag === 'Semua' || (t.tags || []).includes(filterTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 font-sans selection:bg-indigo-100">

      {/* HERO */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white pt-14 pb-16 px-6 lg:px-12">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Jelajahi Program</p>
              <h1 className="text-3xl font-black leading-tight">Temukan Modul<br/>Asesmen Anda</h1>
            </div>
            <NotificationBell />
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari program asesmen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
            />
          </div>

          {/* PLATFORM STATS */}
          {(platformStats.totalAssessments || platformStats.totalUsers) ? (
            <div className="flex gap-6 mt-6">
              {[
                { label: 'Asesmen', value: platformStats.totalAssessments?.toLocaleString('id-ID') ?? '-' },
                { label: 'Pengguna', value: platformStats.totalUsers?.toLocaleString('id-ID') ?? '-' },
                { label: 'Rata-rata Skor', value: platformStats.avgScore ? `${platformStats.avgScore}/100` : '-' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 lg:px-12 -mt-6">

        {/* FILTER TAGS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8 no-scrollbar">
          <SlidersHorizontal size={14} className="text-slate-400 flex-shrink-0" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                filterTag === tag
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-52 ring-1 ring-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-3xl p-16 text-center ring-1 ring-slate-200">
            <Sparkles size={48} className="text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-700 mb-2">
              {search ? 'Program tidak ditemukan' : 'Belum ada program aktif'}
            </h3>
            <p className="text-sm text-slate-400">
              {search ? `Coba kata kunci lain atau hapus filter.` : 'Program asesmen akan segera hadir.'}
            </p>
          </div>
        )}

        {/* TEMPLATE GRID */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              {filtered.length} program tersedia
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((tmpl, i) => (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/assessment?templateId=${tmpl.id}`)}
                  className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm hover:shadow-md hover:ring-indigo-200 cursor-pointer transition-all group overflow-hidden"
                >
                  {/* CARD HEADER */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        {TRACK_ICONS[tmpl.trackType || ''] || <BrainIcon size={18} className="text-indigo-600" />}
                      </div>
                      {tmpl.difficulty && (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${DIFFICULTY_COLORS[tmpl.difficulty] || 'bg-slate-50 text-slate-500'}`}>
                          {tmpl.difficulty}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-slate-900 text-sm leading-snug group-hover:text-indigo-700 transition-colors">
                      {tmpl.title}
                    </h3>
                  </div>

                  {/* CARD BODY */}
                  <div className="p-5 pt-3">
                    {tmpl.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{tmpl.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {(tmpl.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        {tmpl.usageCount ? (
                          <><BarChart2 size={11} /> {tmpl.usageCount.toLocaleString('id-ID')}</>
                        ) : (
                          <ChevronRight size={14} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* BOTTOM CTA */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-3xl text-white text-center">
          <AiSparkIcon size={36} className="mx-auto mb-3 opacity-80" />
          <h3 className="font-black text-xl mb-2">Tidak menemukan yang tepat?</h3>
          <p className="text-indigo-100 text-sm mb-5">Buat asesmen kustom dengan AI sesuai kebutuhan spesifik bisnis Anda</p>
          <button
            onClick={() => router.push('/assessment')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-black text-sm rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Buat Asesmen Kustom <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
