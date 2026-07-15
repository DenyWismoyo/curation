// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ArrowRight, Copy, Check, KeyRound, 
  Loader2, Clock, ChevronLeft, LayoutGrid, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  packageName: string;
  packageId: string;
  amount: number;
  status: string;
  tokenCode?: string;
  paidAt?: any;
}

export default function CustomerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Proteksi Halaman & Tarik Data
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('status', '==', 'PAID')
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const txData: Transaction[] = [];
        snap.forEach(doc => txData.push({ id: doc.id, ...doc.data() } as Transaction));
        
        // Urutkan dari yang terbaru (dijalankan di JS agar tidak perlu index Firestore tambahan)
        txData.sort((a, b) => {
          const dateA = a.paidAt?.toDate ? a.paidAt.toDate().getTime() : 0;
          const dateB = b.paidAt?.toDate ? b.paidAt.toDate().getTime() : 0;
          return dateB - dateA;
        });

        setTransactions(txData);
        setIsFetching(false);
      }, (error) => {
        console.error("Gagal menarik data transaksi:", error);
        setIsFetching(false);
      });

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success("Kode Token berhasil disalin!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Fungsi Pintu Tol (Langsung by-pass login form)
  const handleStartAssessment = (tokenCode: string, packageId: string) => {
    sessionStorage.setItem('active_token', tokenCode);
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([packageId]));
    sessionStorage.setItem('active_model', 'flash'); // Default AI Model
    
    toast.loading("Mempersiapkan ruang kerja AI...");
    router.push('/assessment');
  };

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="font-bold text-xs uppercase tracking-widest">Memuat Brankas Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-8 px-6 lg:py-16 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')} 
              className="mb-4 -ml-2 text-slate-500 hover:text-indigo-600 h-8 px-3 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Beranda
            </Button>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-600" />
              Brankas Modul
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              Kumpulan akses modul asesmen yang telah Anda bayar. Gunakan token di bawah ini untuk memulai evaluasi.
            </p>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-2xl ring-1 ring-indigo-100 text-center shrink-0 min-w-[140px]">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Akses</p>
            <p className="text-3xl font-black text-indigo-700">{transactions.length}</p>
          </div>
        </div>

        {/* LIST TOKEN */}
        {transactions.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] ring-1 ring-slate-200 shadow-sm text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <LayoutGrid className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Belum Ada Modul Aktif</h3>
            <p className="text-slate-500 font-medium mb-8">
              Anda belum melakukan pembelian, atau transaksi Anda sedang diproses oleh sistem.
            </p>
            <Button onClick={() => router.push('/')} className="bg-slate-900 text-white rounded-xl h-12 px-8 font-bold">
              Jelajahi Katalog
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {transactions.map((tx) => (
              <motion.div 
                key={tx.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 sm:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm hover:shadow-md hover:ring-indigo-200 transition-all flex flex-col md:flex-row gap-6 md:items-center justify-between group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-widest ring-1 ring-emerald-200/50">
                      <Check className="w-3 h-3" /> Lunas
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tx.paidAt?.toDate ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(tx.paidAt.toDate()) : 'Baru Saja'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 leading-snug mb-1">
                    {tx.packageName || 'Modul Asesmen'}
                  </h3>
                  <p className="text-sm font-bold text-slate-400">
                    ID Transaksi: <span className="font-mono">{tx.id.substring(0, 8)}...</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 border-t border-slate-100 pt-4 md:border-none md:pt-0">
                  
                  {/* KOTAK TOKEN */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 p-2 pl-4 rounded-xl ring-1 ring-slate-200 w-full sm:w-auto">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kode Akses</p>
                      {tx.tokenCode ? (
                        <p className="font-mono font-black text-slate-800 tracking-tight">{tx.tokenCode}</p>
                      ) : (
                        <p className="text-xs font-bold text-amber-500 animate-pulse">Memproses...</p>
                      )}
                    </div>
                    {tx.tokenCode && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCopy(tx.tokenCode!)}
                        className={`h-10 w-10 p-0 rounded-lg shrink-0 ${copiedToken === tx.tokenCode ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-200'}`}
                      >
                        {copiedToken === tx.tokenCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleStartAssessment(tx.tokenCode!, tx.packageId)}
                    disabled={!tx.tokenCode}
                    className="w-full sm:w-auto h-14 sm:h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-all"
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Mulai Asesmen
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}