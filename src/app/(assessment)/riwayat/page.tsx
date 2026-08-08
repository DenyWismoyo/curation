'use client';

// src/app/(public)/riwayat/page.tsx

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ShoppingBag, ExternalLink, Clock, Receipt, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
    toast.success('Kode Token berhasil disalin!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleStartAssessment = (tokenCode: string, packageId: string) => {
    sessionStorage.setItem('active_token', tokenCode);
    sessionStorage.setItem('active_allowed_templates', JSON.stringify([packageId]));
    sessionStorage.setItem('active_model', 'flash');
    router.push('/assessment/select');
  };

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
  };

  const checkIsPaid = (rawStatus: string) => {
    if (!rawStatus) return false;
    const s = String(rawStatus).toUpperCase();
    return ['PAID', 'SUCCESS', 'SETTLED', 'SETTLEMENT', 'COMPLETED'].includes(s);
  };

  if (loading || isFetching) {
    return <PageLoading message="Memuat Riwayat Tagihan..." />;
  }

  return (
    <PageShell size="lg" fullBleed>
      {/* HEADER */}
      <PageHeader
        title="Riwayat Transaksi"
        subtitle="Lacak status tagihan dan kelola token akses modul Anda."
        icon={<Receipt size={24} className="text-indigo-600 dark:text-indigo-400" />}
        backHref="/"
        backLabel="Kembali ke Beranda"
      />

      {/* KONTEN UTAMA */}
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-8">
        {transactions.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={56} className="text-slate-200" />}
            title="Belum Ada Transaksi"
            description="Anda belum melakukan pembelian modul asesmen. Silakan kunjungi katalog untuk melihat koleksi kami."
            actionLabel="Eksplorasi Katalog"
            onAction={() => router.push('/katalog')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {transactions.map((tx, index) => {
                const isPaid = checkIsPaid(tx.status);

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`card-solid p-6 rounded-[1.5rem] ring-1 shadow-sm flex flex-col h-full transition-all hover:shadow-md ${
                      isPaid
                        ? 'ring-slate-200/60 hover:ring-indigo-200 dark:ring-indigo-500/20'
                        : 'bg-amber-50 dark:bg-amber-500/10/30 ring-amber-200 dark:ring-amber-500/20/80 hover:ring-amber-300'
                    }`}
                  >
                    {/* STATUS + TANGGAL */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ring-1 ${
                        isPaid
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20'
                          : 'bg-amber-100 text-amber-800 ring-amber-300'
                      }`}>
                        {isPaid ? 'Lunas' : 'Menunggu Pembayaran'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <Clock size={12} /> {formatDate(tx.createdAt || tx.paidAt)}
                      </span>
                    </div>

                    {/* NAMA PAKET + HARGA */}
                    <div className="mb-6 flex-1">
                      <h3 className="text-lg font-black text-foreground leading-snug line-clamp-2 mb-2">
                        {tx.packageName}
                      </h3>
                      <p className="text-sm font-bold text-muted-foreground">
                        Total Tagihan:{' '}
                        <span className="text-foreground">{formatRupiah(tx.amount)}</span>
                      </p>
                    </div>

                    {/* TOKEN AKSES */}
                    {isPaid && tx.tokenCode && (
                      <div className="flex items-center justify-between gap-3 bg-muted text-muted-foreground p-3 pl-4 rounded-xl ring-1 ring-border w-full mb-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Token Akses
                          </p>
                          <p className="font-mono font-black text-foreground tracking-tight text-sm">
                            {tx.tokenCode}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(tx.tokenCode!)}
                          className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ring-1 ${
                            copiedToken === tx.tokenCode
                              ? 'bg-emerald-100 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-500/20'
                              : 'card-solid text-slate-400 hover:text-indigo-600 dark:text-indigo-400 ring-slate-200'
                          }`}
                          title="Salin Token"
                        >
                          {copiedToken === tx.tokenCode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="pt-4 border-t border-border/80 mt-auto">
                      {isPaid ? (
                        <Button
                          variant="brand"
                          onClick={() => handleStartAssessment(tx.tokenCode!, tx.packageId)}
                          disabled={!tx.tokenCode}
                          className="w-full h-11 rounded-xl text-xs group"
                        >
                          Gunakan Modul{' '}
                          <ExternalLink
                            size={14}
                            className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                          />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => router.push(`/checkout/${tx.id}`)}
                          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                        >
                          Selesaikan Pembayaran <CreditCard size={14} />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageShell>
  );
}