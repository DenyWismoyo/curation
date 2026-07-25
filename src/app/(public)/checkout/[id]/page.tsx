// src/app/checkout/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { BrainIcon } from '@/types';
import { toast } from 'sonner';

export default function CheckoutQrisPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  useEffect(() => {
    if (!params.id) return;

    // Real-Time Listener ke Firestore untuk memantau status pembayaran
    const unsubscribe = onSnapshot(doc(db, 'transactions', params.id as string), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTransaction(data);
        setLoading(false);

        // Jika webhook dari Mayar telah mengupdate status transaksi ini ke PAID
        if (data.status === 'PAID' && data.tokenCode && !isSuccess) {
          setIsSuccess(true);
          toast.success("Pembayaran Berhasil! Mengarahkan ke Modul...");

          // Set akses modul ke Session Storage
          sessionStorage.setItem('active_token', data.tokenCode);
          sessionStorage.setItem('active_allowed_templates', JSON.stringify([data.packageId]));
          sessionStorage.setItem('active_model', 'flash');

          // Alihkan pengguna ke ruang asesmen secara otomatis setelah 2 detik
          setTimeout(() => {
            window.location.href = '/assessment';
          }, 2000);
        }
      } else {
        toast.error("Transaksi tidak ditemukan.");
        router.replace('/katalog');
      }
    });

    return () => unsubscribe();
  }, [params.id, router, isSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <BrainIcon size={56} className="text-indigo-600 animate-pulse" />
          <p className="font-bold text-xs uppercase tracking-widest text-indigo-400">Menarik Data Transaksi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments (Minimalist & Futuristic) */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-indigo-500/10 ring-1 ring-slate-200 relative z-10 text-center"
      >
        <button
          onClick={() => router.push('/katalog')}
          className="absolute top-6 left-6 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Batal dan Kembali"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="mb-6 mt-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Selesaikan Pembayaran</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Modul: <strong className="text-slate-800">{transaction?.packageName}</strong>
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 mb-8 inline-block w-full">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tagihan</p>
          <p className="text-3xl font-black text-indigo-600">{formatRupiah(transaction?.amount || 0)}</p>
        </div>

        {!isSuccess ? (
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-200 mb-6 relative">
              {transaction?.qrisString ? (
                <QRCodeSVG value={transaction.qrisString} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50 rounded-xl">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-500 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              Menunggu pemindaian QRIS...
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-6"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-50">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Pembayaran Diterima!</h2>
            <p className="text-sm text-slate-500">Menyiapkan ruang asesmen untuk Anda...</p>
          </motion.div>
        )}

        <div className="mt-10 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 text-left">
          <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-indigo-900/80 leading-relaxed">
            Halaman ini akan otomatis dialihkan ketika pembayaran Anda berhasil dikonfirmasi oleh sistem.
          </p>
        </div>
      </motion.div>
    </div>
  );
}