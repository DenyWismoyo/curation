// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, Clock, ChevronLeft, 
  FolderKanban, ArrowUpRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// IMPORT CUSTOM ICONS BRAND
import { 
  TechCardIcon, 
  DocExportIcon, 
  BrainIcon,
  InfinityWorkflowIcon,
  AiSparkIcon
} from '@/types';

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

      const checkLoading = () => {
        if (isTxLoaded && isAssLoaded) setIsFetching(false);
      };

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

      return () => {
        unsubTx();
        unsubAss();
      };
    }
  }, [user, loading, router]);

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success("Kode Token berhasil disalin!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleStartAssessment = (tokenCode: string, packageId: string) => {
    sessionStorage.setItem('active_token', tokenCode);
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([packageId]));
    sessionStorage.setItem('active_model', 'flash'); 
    router.push('/assessment');
  };

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <BrainIcon size={56} className="text-indigo-600 animate-pulse" />
          <p className="font-bold text-xs uppercase tracking-widest text-indigo-400">Menyiapkan Ruang Dasbor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ================= HEADER MINIMALIS ================= */}
      <div className="bg-white border-b border-slate-100 pt-8 pb-12 px-6 lg:px-12 relative">
        <div className="max-w-[1200px] mx-auto">
          <button 
            onClick={() => router.push('/')} 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8 group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Beranda Utama
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-black ring-1 ring-slate-200 shadow-sm shrink-0">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-200/50 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Sesi Terautentikasi
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {user?.displayName || 'Pengguna Omnifit'}
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => router.push('/onboarding?force=1')}
                variant="outline"
                className="w-full md:w-auto bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl h-12 px-5 font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Ulangi Onboarding
              </Button>

              <Button 
                onClick={() => router.push('/workspace')} 
                className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-slate-900/10 hover:shadow-indigo-600/20 transition-all group"
              >
                <FolderKanban className="w-4 h-4 mr-2" /> 
                Buka OS Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= KONTEN UTAMA ================= */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 mt-12">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
          
          {/* KOLOM KIRI (4/12): BRANKAS MODUL */}
          <div className="xl:col-span-4 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TechCardIcon size={20} className="text-indigo-600" />
                Brankas Token
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {transactions.length} Tersedia
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[2rem] ring-1 ring-slate-200 border border-slate-100 shadow-sm">
                <TechCardIcon size={40} className="text-slate-200 mx-auto mb-4 grayscale" />
                <p className="text-sm font-bold text-slate-500">Belum ada modul aktif</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <motion.div 
                    key={tx.id} 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[1.5rem] ring-1 ring-slate-200 shadow-sm hover:shadow-md hover:ring-indigo-200 transition-all group"
                  >
                    <h3 className="text-sm font-black text-slate-900 leading-relaxed mb-4 group-hover:text-indigo-600 transition-colors">
                      {tx.packageName}
                    </h3>
                    
                    <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 pl-4 rounded-xl ring-1 ring-slate-100 mb-5">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Akses ID</p>
                        <p className="font-mono font-black text-slate-800 tracking-tight text-sm">
                          {tx.tokenCode || <span className="text-amber-500 animate-pulse">Memproses...</span>}
                        </p>
                      </div>
                      {tx.tokenCode && (
                        <button 
                          onClick={() => handleCopy(tx.tokenCode!)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${copiedToken === tx.tokenCode ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 hover:text-indigo-600 ring-1 ring-slate-200'}`}
                        >
                          {copiedToken === tx.tokenCode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => handleStartAssessment(tx.tokenCode!, tx.packageId)}
                      disabled={!tx.tokenCode}
                      className="w-full h-11 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-xs ring-1 ring-slate-200 hover:ring-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                      <AiSparkIcon size={14} /> Gunakan Sekarang
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* KOLOM KANAN (8/12): RIWAYAT ASESMEN */}
          <div className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <InfinityWorkflowIcon size={20} className="text-indigo-600" />
                Rekam Jejak Analitik
              </h2>
            </div>

            {assessments.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
                <DocExportIcon size={64} className="text-slate-200 mx-auto mb-6 grayscale opacity-60" />
                <h3 className="text-lg font-black text-slate-800 mb-2">Basis Data Kosong</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm leading-relaxed">
                  Sistem belum mendeteksi riwayat asesmen yang diselesaikan. Silakan gunakan token untuk memulai evaluasi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {assessments.map((ass, index) => (
                  <motion.div 
                    key={ass.id} 
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    className="bg-white p-6 rounded-[2rem] ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:ring-indigo-200 transition-all flex flex-col h-full group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        {ass.trackType}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <Clock size={12}/> 
                        {ass.createdAt?.toDate ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(ass.createdAt.toDate()) : '-'}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-900 mb-8 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                      {ass.namaUsaha}
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                      <div className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Skor Kinerja</p>
                        <p className="text-2xl font-black text-slate-900">{ass.score}<span className="text-sm text-slate-400">/100</span></p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Level</p>
                        <p className="text-xs font-bold text-emerald-600 leading-snug">{ass.readinessLevel}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => router.push(`/result/${ass.id}`)}
                        className="flex-1 h-11 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <DocExportIcon size={14} /> Dokumen
                      </button>
                      <button 
                        onClick={() => router.push('/workspace')}
                        className="flex-1 h-11 rounded-xl text-xs font-bold bg-slate-900 hover:bg-indigo-600 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        OS <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}