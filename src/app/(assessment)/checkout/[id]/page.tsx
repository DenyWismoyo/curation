// src/app/checkout/[id]/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronLeft, Loader2, CheckCircle2, QrCode, ExternalLink } from 'lucide-react';
import { BrainIcon } from '@/components/icon';
import { toast } from 'sonner';

export default function CheckoutQrisPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  useEffect(() => {
    if (!params.id) return;
    let hasTriggeredSuccess = false;

    const unsubscribe = onSnapshot(doc(db, 'transactions', params.id as string), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTransaction(data);
        setLoading(false);

        // Render QR otomatis jika sebelumnya sudah pernah dibuat di database
        if (data.qrCodeUrl && !qrCodeUrl) {
          setQrCodeUrl(data.qrCodeUrl);
        }

        const currentStatus = String(data.status).toUpperCase();
        const isPaidStatus = ['PAID', 'SUCCESS', 'SETTLED', 'COMPLETED'].includes(currentStatus);
        
        if (isPaidStatus && data.tokenCode && !hasTriggeredSuccess) {
          hasTriggeredSuccess = true;
          setIsSuccess(true);
          toast.success("Pembayaran Berhasil! Mengarahkan ke Dashboard...");
          
          sessionStorage.setItem('active_token', data.tokenCode);
          sessionStorage.setItem('active_allowed_templates', JSON.stringify([data.packageId]));
          sessionStorage.setItem('active_model', 'flash');
          
          setTimeout(() => {
            if (data.packageId === 'CRYPTO_PREMIUM_MONTHLY') {
              window.location.href = '/crypto-report';
            } else {
              window.location.href = '/assessment/select';
            }
          }, 2000);
        }
      } else {
        toast.error("Transaksi tidak ditemukan.");
        router.replace('/katalog');
      }
    });
    return () => unsubscribe();
  }, [params.id, router, qrCodeUrl]);

  const handleGenerateQR = async () => {
    if (!transaction) return;
    setGeneratingQr(true);
    try {
      const generateQrFn = httpsCallable(functions, 'createDynamicQris');
      const response = await generateQrFn({
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        userEmail: transaction.userEmail,
        userName: transaction.userName
      });
      
      const data = response.data as { qrUrl: string };
      setQrCodeUrl(data.qrUrl);
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat kode QR");
    } finally {
      setGeneratingQr(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <BrainIcon size={56} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <p className="font-bold text-xs uppercase tracking-widest text-indigo-400 text-center">Menyiapkan Transaksi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] sm:w-[40vw] sm:h-[40vw] bg-indigo-200/40 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] sm:w-[30vw] sm:h-[30vw] bg-blue-200/40 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full card-solid/90 backdrop-blur-xl p-6 sm:p-10 rounded-3xl sm:rounded-[2rem] shadow-2xl shadow-indigo-500/10 ring-1 ring-border relative z-10 text-center"
      >
        <button
          onClick={() => router.push('/katalog')}
          className="absolute top-5 left-5 sm:top-6 sm:left-6 p-2 bg-muted text-muted-foreground rounded-full text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 transition-colors"
          title="Batal dan Kembali"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="mb-6 mt-10 sm:mt-4">
          <h1 className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">Selesaikan Pembayaran</h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-2 px-2">
            Modul: <strong className="text-foreground">{transaction?.packageName}</strong>
          </p>
        </div>
        
        <div className="bg-muted text-muted-foreground p-4 rounded-2xl ring-1 ring-border mb-6 sm:mb-8 inline-block w-full">
          <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Tagihan</p>
          <p className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{formatRupiah(transaction?.amount || 0)}</p>
        </div>
        
        {!isSuccess ? (
          <div className="flex flex-col items-center w-full">
            <div className="card-solid p-5 sm:p-6 rounded-2xl shadow-sm ring-1 ring-border mb-6 w-full flex flex-col items-center border-t-4 border-t-indigo-500">
              
              {qrCodeUrl ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
                  <p className="text-sm font-bold text-foreground mb-4 text-center">Scan QRIS dengan e-Wallet / m-Banking</p>
                  <div className="p-3 sm:p-4 card-solid rounded-2xl border-2 border-indigo-50 shadow-md mb-4 w-full max-w-[220px] aspect-square flex items-center justify-center">
                    <img src={qrCodeUrl} alt="QRIS Dinamis" className="w-full h-full object-contain" />
                  </div>
                  {transaction?.paymentLink && (
                    <a 
                      href={transaction.paymentLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1 mt-2"
                    >
                      Buka Web Mayar <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-6 leading-relaxed px-2">
                    Lakukan pembayaran dengan metode QRIS yang cepat dan aman.
                  </p>
                  <button 
                    onClick={handleGenerateQR}
                    disabled={generatingQr}
                    className="bg-indigo-600 text-white w-full py-3.5 sm:py-4 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                  >
                    {generatingQr ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan QR...</> : "Tampilkan QRIS"}
                  </button>
                  
                  {transaction?.paymentLink && (
                    <a 
                      href={transaction.paymentLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full mt-3 py-3.5 sm:py-4 rounded-xl text-sm font-bold text-muted-foreground bg-muted text-muted-foreground hover:bg-secondary text-secondary-foreground ring-1 ring-inset ring-slate-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      Gunakan Metode Lain <ExternalLink size={16} />
                    </a>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold text-muted-foreground animate-pulse bg-muted text-muted-foreground py-3 px-5 rounded-full ring-1 ring-border w-full sm:w-auto">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />
              <span className="truncate">Sistem menunggu konfirmasi...</span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-6 w-full"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-50 shadow-inner">
              <CheckCircle2 size={32} className="sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground mb-2">Pembayaran Diterima!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">Menyiapkan ruang asesmen untuk Anda...</p>
          </motion.div>
        )}
        
        <div className="mt-6 sm:mt-8 bg-indigo-50 dark:bg-indigo-500/10/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 text-left">
          <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs font-medium text-indigo-900/80 leading-relaxed">
            Biarkan halaman ini tetap terbuka. Halaman ini akan otomatis beralih saat pembayaran Anda berhasil dikonfirmasi.
          </p>
        </div>
      </motion.div>
    </div>
  );
}