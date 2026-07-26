// src/app/(public)/riwayat/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Copy, Check, ChevronLeft, ShoppingBag, 
  ExternalLink, Clock, Receipt, CreditCard 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BrainIcon, TechCardIcon } from '@/types';

interface Transaction {
  id: string;
  packageName: string;
  packageId: string;
  amount: number;
  status: string;
  tokenCode?: string;
  paymentLink?: string;
  createdAt?: any;
  paidAt?: any;
}

export default function RiwayatTransaksiPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/riwayat');
      return;
    }

    if (user) {
      const qTx = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );

      const unsubTx = onSnapshot(qTx, (snap) => {
        const txData: Transaction[] = [];
        snap.forEach(doc => txData.push({ id: doc.id, ...doc.data() } as Transaction));
        
        // Urutkan dari yang terbaru (menggunakan createdAt atau paidAt)
        txData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || a.paidAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || b.paidAt?.toMillis() || 0;
          return timeB - timeA;
        });

        setTransactions(txData);
        setIsFetching(false);
      }, (err) => {
        console.error(err);
        setIsFetching(false);
      });

      return () => unsubTx();
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

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    return new Intl.DateTimeFormat('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).format(timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
  };

  // KUNCI PERBAIKAN: Fungsi kebal variasi status dari Webhook
  const checkIsPaid = (rawStatus: string) => {
    if (!rawStatus) return false;
    const s = String(rawStatus).toUpperCase();
    return ['PAID', 'SUCCESS', 'SETTLED', 'SETTLEMENT', 'COMPLETED'].includes(s);
  };

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <BrainIcon size={56} className="text-indigo-600 animate-pulse" />
          <p className="font-bold text-xs uppercase tracking-widest text-indigo-400">Memuat Riwayat Tagihan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-100 pt-8 pb-10 px-6 lg:px-12 relative">
        <div className="max-w-[800px] mx-auto">
          <button 
            onClick={() => router.push('/')} 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-6 group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Beranda
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center ring-1 ring-indigo-100 shadow-sm shrink-0">
              <Receipt size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Riwayat Transaksi
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Lacak status tagihan dan kelola token akses modul Anda.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="max-w-[800px] mx-auto px-6 lg:px-12 mt-10">
        {transactions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] ring-1 ring-slate-200 border border-slate-100 shadow-sm">
            <ShoppingBag size={56} className="text-slate-200 mx-auto mb-6 grayscale opacity-60" />
            <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Transaksi</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm leading-relaxed mb-6">
              Anda belum melakukan pembelian modul asesmen. Silakan kunjungi katalog untuk melihat koleksi kami.
            </p>
            <Button onClick={() => router.push('/katalog')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold shadow-sm">
              Eksplorasi Katalog
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {transactions.map((tx) => {
              // MENGGUNAKAN LOGIKA STATUS BARU
              const isPaid = checkIsPaid(tx.status);
              
              return (
                <motion.div 
                  key={tx.id} 
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white p-6 rounded-[1.5rem] ring-1 shadow-sm transition-all flex flex-col sm:flex-row gap-6 ${isPaid ? 'ring-slate-200 hover:ring-indigo-200' : 'ring-amber-200 bg-amber-50/10'}`}
                >
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {isPaid ? <Check size={16} /> : <Clock size={16} />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${isPaid ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'}`}>
                          {isPaid ? 'Lunas' : 'Menunggu Pembayaran'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {formatDate(tx.createdAt || tx.paidAt)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-snug truncate">
                        {tx.packageName}
                      </h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">
                        Total Tagihan: <span className="text-slate-700">{formatRupiah(tx.amount)}</span>
                      </p>
                    </div>

                    {isPaid && tx.tokenCode && (
                      <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 pl-4 rounded-xl ring-1 ring-slate-100 w-full sm:max-w-xs">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Token Akses Modul</p>
                          <p className="font-mono font-black text-slate-800 tracking-tight text-sm">
                            {tx.tokenCode}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleCopy(tx.tokenCode!)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${copiedToken === tx.tokenCode ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 hover:text-indigo-600 ring-1 ring-slate-200'}`}
                          title="Salin Token"
                        >
                          {copiedToken === tx.tokenCode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-end shrink-0 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {isPaid ? (
                      <Button 
                        onClick={() => handleStartAssessment(tx.tokenCode!, tx.packageId)}
                        disabled={!tx.tokenCode}
                        className="w-full sm:w-auto h-11 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        Mulai Asesmen <ExternalLink size={14} />
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => router.push(`/checkout/${tx.id}`)}
                        className="w-full sm:w-auto h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        Bayar Sekarang <CreditCard size={14} />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}