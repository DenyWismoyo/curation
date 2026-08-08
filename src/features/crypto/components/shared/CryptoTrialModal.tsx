'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Lock, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface CryptoTrialModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  featureName: string;
}

export function CryptoTrialModal({ isOpen, setIsOpen, featureName }: CryptoTrialModalProps) {
  const { user, isPremium, cryptoTrialUsed, isTrial } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Jika user sudah premium atau trial sedang aktif, tidak perlu modal ini
  if (isPremium || isTrial) {
    return null;
  }

  const handleTrial = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/crypto-report')}`);
      return;
    }
    
    setLoading(true);
    try {
      const activateCryptoTrial = httpsCallable(functions, 'activateCryptoTrial');
      await activateCryptoTrial();
      
      toast.success('Akses Trial 3 Hari Berhasil Diaktifkan!');
      setIsOpen(false);
      // AuthContext onSnapshot akan otomatis mengupdate UI
    } catch (error: any) {
      console.error('Error activating trial:', error);
      toast.error(error.message || 'Gagal mengaktifkan trial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-slate-200 dark:border-slate-800 bg-background text-foreground p-0 overflow-hidden">
        
        {/* Banner Image / Graphic */}
        <div className="h-40 bg-gradient-to-br from-indigo-100 dark:from-indigo-900/50 to-slate-200 dark:to-slate-900 relative flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px]"></div>
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 card-solid border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center shadow-2xl relative">
              <Lock className="w-8 h-8 text-muted-foreground" />
              <div className="absolute -top-2 -right-2 bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-900">
                <Sparkles className="w-3 h-3 text-foreground" />
              </div>
            </div>
            <div className="card-solid/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-indigo-400" /> Penawaran Terbatas
            </div>
          </div>
        </div>

        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold text-center text-foreground mb-2">
              Buka Kunci {featureName}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Dapatkan akses langsung ke analisis AI premium, sinyal institusi, dan fitur intelijen pasar lainnya.
            </DialogDescription>
          </DialogHeader>

          {cryptoTrialUsed ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl card-solid/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center text-sm text-muted-foreground">
                Masa coba gratis Anda telah berakhir. Upgrade sekarang untuk melanjutkan akses premium.
              </div>
              <Button 
                onClick={() => router.push('/crypto')}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-foreground font-bold"
              >
                Lihat Paket Premium
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-900/50 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-full h-full bg-emerald-500/5 blur-[20px] group-hover:bg-emerald-500/10 transition-colors"></div>
                <h4 className="text-lg font-bold text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
                  <Zap className="w-4 h-4 fill-emerald-400" /> Coba Gratis 3 Hari
                </h4>
                <p className="text-sm text-emerald-200/70">Tanpa kartu kredit. Tanpa komitmen.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => router.push('/crypto')}
                  variant="outline"
                  className="h-12 border-slate-300 dark:border-slate-700 bg-transparent hover:bg-secondary text-secondary-foreground dark:hover:bg-secondary text-secondary-foreground text-muted-foreground"
                >
                  Lihat Harga
                </Button>
                <Button 
                  onClick={handleTrial}
                  disabled={loading}
                  className="h-12 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aktifkan Trial'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
