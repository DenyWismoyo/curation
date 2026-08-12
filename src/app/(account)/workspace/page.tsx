// src/app/(public)/workspace/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ActionPlanBuilder } from '@/features/assessment/components/result/ActionPlanBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainIcon, InfinityWorkflowIcon } from '@/components/icon';
import { BackLink, EmptyState, PageLoading } from '@/components/domain/public';
import { Button } from '@/components/ui/button';

export default function ExecutionWorkspacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push('/login?next=/workspace'); return; }
    if (user) {
      (async () => {
        try {
          const snap = await getDocs(query(collection(db, 'assessments'), where('userId', '==', user.uid)));
          const raw = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) =>
              (b.createdAt?.toDate?.().getTime() ?? 0) - (a.createdAt?.toDate?.().getTime() ?? 0)
            );
          setAssessments(raw);
          if (raw.length > 0) setSelectedDoc(raw[0]);
        } catch (e) { console.error('Gagal menarik data Workspace:', e); }
        finally { setIsFetching(false); }
      })();
    }
  }, [user, loading, router]);

  if (loading || isFetching) {
    return <PageLoading message="Menghubungkan Sistem Operasi..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* ── STICKY HEADER ─────────────────────────────────────────────────── */}
      <header className="card-solid border-b border-border sticky top-0 md:top-20 z-40 shadow-sm">
        <div className="max-w-[1000px] mx-auto px-5 lg:px-8 py-4">

          {/* Single-row header with compact dropdown selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <BackLink href="/dashboard" label="Kembali ke Dasbor" />
              
              {assessments.length > 0 && (
                <>
                  <span className="text-slate-200 hidden sm:inline">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modul:</span>
                    <select
                      value={selectedDoc?.id || ''}
                      onChange={(e) => {
                        const target = assessments.find(a => a.id === e.target.value);
                        if (target) setSelectedDoc(target);
                      }}
                      className="bg-muted text-muted-foreground hover:bg-secondary text-secondary-foreground border border-border text-foreground font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm max-w-[220px] sm:max-w-[320px] truncate cursor-pointer transition-all"
                    >
                      {assessments.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.namaUsaha || 'Project Tanpa Nama'} — [{a.trackType || 'Asesmen'}]
                        </option>
                      ))}
                    </select>
                    <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full ring-1 ring-indigo-100 dark:ring-indigo-500/30 shrink-0">
                      {assessments.length} Asesmen
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <InfinityWorkflowIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-black text-foreground tracking-tight">
                Omnifit <span className="text-indigo-600 dark:text-indigo-400">OS</span>
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 p-5 lg:p-8 w-full max-w-[1000px] mx-auto">
        {assessments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-10"
          >
            <EmptyState
              icon={<BrainIcon size={56} className="text-muted-foreground opacity-50" />}
              title="OS Belum Menerima Data"
              description="Anda membutuhkan setidaknya satu riwayat asesmen AI untuk mengaktifkan Action Plan dan Sinkronisasi Strategi."
              actionLabel="Cek Brankas Modul"
              onAction={() => router.push('/dashboard')}
            />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedDoc && (
              <motion.div
                key={selectedDoc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ActionPlanBuilder
                  assessmentId={selectedDoc.id}
                  initialData={selectedDoc.aiResult?.customActionPlan}
                  aiResult={selectedDoc.aiResult}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}