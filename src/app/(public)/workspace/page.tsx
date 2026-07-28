// src/app/(public)/workspace/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ActionPlanBuilder } from '@/app/components/curation/ActionPlanBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainIcon, InfinityWorkflowIcon } from '@/types';
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
      <header className="bg-white border-b border-slate-100 sticky top-0 md:top-20 z-40 shadow-sm">
        <div className="max-w-[1000px] mx-auto px-5 lg:px-8 py-4">

          {/* Top row: back + brand */}
          <div className="flex items-center justify-between mb-4">
            <BackLink href="/dashboard" label="Kembali ke Dasbor" />
            <div className="flex items-center gap-2">
              <InfinityWorkflowIcon size={18} className="text-indigo-600" />
              <span className="text-sm font-black text-slate-900 tracking-tight">
                Omnifit <span className="text-indigo-600">OS</span>
              </span>
            </div>
          </div>

          {/* Project tabs — horizontal scroll */}
          {assessments.length > 0 && (
            <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 pb-1">
              <div className="flex gap-2.5 min-w-max">
                {assessments.map(a => {
                  const active = selectedDoc?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedDoc(a)}
                      className={`relative px-4 py-2.5 rounded-xl flex flex-col items-start text-left transition-all min-w-[180px] max-w-[260px] ${
                        active
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 ring-1 ring-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest truncate ${active ? 'text-indigo-300' : 'text-slate-400'}`}>
                          {a.trackType || 'Asesmen'}
                        </span>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                      </div>
                      <span className="text-sm font-bold truncate w-full leading-tight">
                        {a.namaUsaha || 'Project Tanpa Nama'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
              icon={<BrainIcon size={56} className="text-slate-200" />}
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