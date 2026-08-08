import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, ArrowRight, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/firebase';
import { toast } from 'sonner';

interface DraftValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userQuota: number;
  templateId: string;
  onQuotaRedeemed: (newToken: string) => void;
}

export function DraftValidationModal({ isOpen, onClose, userQuota, templateId, onQuotaRedeemed }: DraftValidationModalProps) {
  const router = useRouter();
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeemQuota = async () => {
    if (userQuota < 1) {
      toast.error("Kuota asesmen Anda tidak mencukupi.");
      return;
    }

    setIsRedeeming(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const redeemFn = httpsCallable(functions, 'redeemAssessmentQuota');
      
      const result = await redeemFn({ packageId: templateId });
      const data = result.data as { tokenCode?: string };
      
      if (data?.tokenCode) {
        toast.success("Kuota berhasil ditukarkan!");
        onQuotaRedeemed(data.tokenCode);
      } else {
        toast.error("Gagal menukarkan kuota.");
      }
    } catch (error: any) {
      console.error("Redeem error:", error);
      toast.error(error.message || "Gagal menukarkan kuota. Silakan coba lagi.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleBuyToken = () => {
    onClose();
    router.push('/token');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 card-solid rounded-3xl p-6 md:p-8 shadow-2xl ring-1 ring-border"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center ring-1 ring-rose-100 mb-5 shadow-inner">
                <Lock className="w-8 h-8 text-rose-500" />
              </div>
              
              <h2 className="text-xl font-black text-foreground mb-2">Akses Draf Terkunci!</h2>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6">
                Token yang Anda gunakan untuk draf ini telah terpakai pada riwayat asesmen lain. Tapi jangan khawatir, <strong className="text-slate-700">progres jawaban Anda tetap aman</strong>. Lanjutkan analisis draf ini sekarang dengan menukarkan kuota asesmen atau menggunakan token baru.
              </p>

              <div className="w-full space-y-3">
                <Button 
                  onClick={handleRedeemQuota}
                  disabled={isRedeeming || userQuota < 1}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 group relative overflow-hidden"
                >
                  {isRedeeming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Tukarkan 1 Kuota (Sisa: {userQuota})
                    </>
                  )}
                </Button>

                <Button 
                  onClick={handleBuyToken}
                  variant="outline"
                  className="w-full h-12 rounded-xl font-bold text-slate-700 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 hover:ring-indigo-200 dark:ring-indigo-500/20 transition-all"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Masukkan Kode Token Baru
                </Button>
              </div>

              {userQuota < 1 && (
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  Anda tidak memiliki kuota asesmen tersisa.
                </div>
              )}

              <button 
                onClick={onClose}
                className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
              >
                Tutup & Kembali
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
