// src/app/(public)/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Copy, Check, Clock, FolderKanban, ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TechCardIcon, DocExportIcon, InfinityWorkflowIcon, AiSparkIcon } from '@/components/icon';
import {
  PageShell,
  PageHeader,
  EmptyState,
  PageLoading,
} from '@/components/domain/public';

interface Transaction {
  id: string;
  packageName: string;
  packageId: string;
  amount: number;
  status: string;
  tokenCode?: string;
  paidAt?: any;
}

interface AssessmentHistory {
  id: string;
  trackType: string;
  namaUsaha: string;
  score: number;
  readinessLevel: string;
  createdAt: any;
}

const asSafeText = (value: unknown, fallback = '-'): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value) return fallback;

  if (typeof value === 'object') {
    const maybeName = (value as any).name || (value as any).label || (value as any).title || (value as any).value || (value as any).trackName;
    if (typeof maybeName === 'string' && maybeName.trim().length > 0) return maybeName;
    return fallback;
  }
  
  return fallback;
};

export default function CustomerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assessments, setAssessments] = useState<AssessmentHistory[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/dashboard');
      return;
    }

    if (user) {
      const qTx = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('status', '==', 'PAID')
      );
      const qAss = query(
        collection(db, 'assessments'),
        where('userId', '==', user.uid)
      );

      let isTxLoaded = false;
      let isAssLoaded = false;
      const checkLoading = () => { if (isTxLoaded && isAssLoaded) setIsFetching(false); };

      const unsubTx = onSnapshot(qTx, (snap) => {
        const txData: Transaction[] = [];
        snap.forEach(doc => txData.push({ id: doc.id, ...doc.data() } as Transaction));
        txData.sort((a, b) => (b.paidAt?.toMillis() || 0) - (a.paidAt?.toMillis() || 0));
        setTransactions(txData);
        isTxLoaded = true;
        checkLoading();
      }, (err) => console.error(err));

      const unsubAss = onSnapshot(qAss, (snap) => {
        const assData: AssessmentHistory[] = [];
        snap.forEach(doc => assData.push({ id: doc.id, ...doc.data() } as AssessmentHistory));
        assData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setAssessments(assData);
        isAssLoaded = true;
        checkLoading();
      }, (err) => console.error(err));

      return () => { unsubTx(); unsubAss(); };
    }
  }, [user, loading, router]);

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success('Kode Token berhasil disalin!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleStartAssessment = (tokenCode: string, packageId: string) => {
    if (packageId.startsWith('BUNDLE_')) {
      router.push('/katalog?from_brankas=1');
      return;
    }
    if (packageId === 'CRYPTO_PREMIUM_MONTHLY') {
      router.push('/crypto-report');
      return;
    }

    sessionStorage.setItem('active_token', tokenCode);
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([packageId]));
    sessionStorage.setItem('active_model', 'flash');
    router.push('/assessment/select');
  };

  if (loading || isFetching) {
    return <PageLoading message="Menyiapkan Ruang Dasbor..." />;
  }

  // Header actions: tombol Onboarding + Workspace
  const headerActions = (
    <>
      <Button
        onClick={() => router.push('/onboarding?force=1')}
        variant="brandOutline"
        className="h-10 px-4 text-xs"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Ulangi Onboarding
      </Button>
      <Button
        onClick={() => router.push('/workspace')}
        variant="brand"
        className="h-10 px-4 text-xs"
      >
        <FolderKanban className="w-4 h-4 mr-2" />
        Buka OS Workspace
      </Button>
    </>
  );

  return (
    <PageShell size="full" fullBleed>
      {/* HEADER */}
      <PageHeader
        title={user?.displayName || 'Pengguna Omnifit'}
        subtitle={user?.email ?? undefined}
        backHref="/"
        backLabel="Kembali ke Beranda Utama"
        actions={headerActions}
      >
        {/* Badge sesi aktif */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-200 dark:ring-emerald-500/20/50 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Sesi Terautentikasi
        </div>
      </PageHeader>

      {/* KONTEN UTAMA */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">

          {/* KOLOM KIRI (4/12): BRANKAS TOKEN */}
          <div className="xl:col-span-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <TechCardIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
                Brankas Token
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {transactions.length} Tersedia
              </span>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon={<TechCardIcon size={40} className="text-slate-200" />}
                title="Belum Ada Modul"
                description="Belum ada modul aktif. Kunjungi katalog untuk mulai."
                actionLabel="Lihat Katalog"
                onAction={() => router.push('/katalog')}
              />
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-solid p-6 rounded-[1.5rem] ring-1 ring-border shadow-sm hover:shadow-md hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all group"
                  >
                    <h3 className="text-sm font-black text-foreground leading-relaxed mb-4 group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">
                      {tx.packageName}
                    </h3>

                    {/* TOKEN DISPLAY */}
                    <div className="flex items-center justify-between gap-3 bg-muted text-muted-foreground p-2.5 pl-4 rounded-xl ring-1 ring-border mb-5">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Akses ID
                        </p>
                        <p className="font-mono font-black text-foreground tracking-tight text-sm">
                          {tx.tokenCode || (
                            <span className="text-amber-500 animate-pulse">Memproses...</span>
                          )}
                        </p>
                      </div>
                      {tx.tokenCode && (
                        <button
                          onClick={() => handleCopy(tx.tokenCode!)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ring-1 ${
                            copiedToken === tx.tokenCode
                              ? 'bg-emerald-100 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-500/20'
                              : 'card-solid text-slate-400 hover:text-indigo-600 dark:text-indigo-400 ring-slate-200'
                          }`}
                        >
                          {copiedToken === tx.tokenCode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>

                    <Button
                      variant="brandOutline"
                      onClick={() => handleStartAssessment(tx.tokenCode!, tx.packageId)}
                      disabled={!tx.tokenCode}
                      className="w-full h-11 text-xs"
                    >
                      <AiSparkIcon size={14} className="mr-2" /> 
                      {tx.packageId.startsWith('BUNDLE_') ? 'Tukarkan di Katalog' : tx.packageId === 'CRYPTO_PREMIUM_MONTHLY' ? 'Lihat Laporan' : 'Gunakan Sekarang'}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* KOLOM KANAN (8/12): REKAM JEJAK ASESMEN */}
          <div className="xl:col-span-8 space-y-6">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2 tracking-tight">
              <InfinityWorkflowIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
              Rekam Jejak Analitik
            </h2>

            {assessments.length === 0 ? (
              <EmptyState
                icon={<DocExportIcon size={64} className="text-slate-200" />}
                title="Basis Data Kosong"
                description="Sistem belum mendeteksi riwayat asesmen yang diselesaikan. Silakan gunakan token untuk memulai evaluasi."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {assessments.map((ass, index) => (
                  <motion.div
                    key={ass.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-solid p-6 rounded-[2rem] ring-1 ring-border shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all flex flex-col h-full group"
                  >
                    {/* TRACK + TANGGAL */}
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md">
                        {asSafeText(ass.trackType, 'Evaluasi')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <Clock size={12} />
                        {ass.createdAt?.toDate
                          ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(ass.createdAt.toDate())
                          : '-'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-foreground mb-8 group-hover:text-indigo-600 dark:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                      {asSafeText(ass.namaUsaha, 'Asesmen Tanpa Nama')}
                    </h3>

                    {/* STAT MINI */}
                    <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                      <div className="bg-muted text-muted-foreground p-4 rounded-2xl ring-1 ring-border flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Skor Kinerja
                        </p>
                        <p className="text-2xl font-black text-foreground">
                          {asSafeText(ass.score, '0')}
                          <span className="text-sm text-slate-400">/100</span>
                        </p>
                      </div>
                      <div className="bg-muted text-muted-foreground p-4 rounded-2xl ring-1 ring-border flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Status Level
                        </p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                          {asSafeText(ass.readinessLevel, 'Diproses')}
                        </p>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                      <Button
                        variant="brandOutline"
                        onClick={() => router.push(`/result/${ass.id}`)}
                        className="flex-1 h-11 text-xs"
                      >
                        <DocExportIcon size={14} className="mr-1.5" /> Dokumen
                      </Button>
                      <Button
                        variant="brand"
                        onClick={() => router.push('/workspace')}
                        className="flex-1 h-11 text-xs"
                      >
                        OS <ArrowUpRight size={14} className="ml-1.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </PageShell>
  );
}