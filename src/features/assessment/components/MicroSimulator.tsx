'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, ArrowRight, Loader2, Target, AlertTriangle } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/firebase';
import { toast } from 'sonner';

import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { GradientBadge } from '@/components/landing/GradientBadge';
import { ScoreRing } from '@/features/assessment/components/shared/ScoreRing';

export const MicroSimulator = () => {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{kekuatan: string; kelemahan: string; skor: number} | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length < 5) {
      toast.error('Ide terlalu singkat, mohon deskripsikan sedikit lebih panjang.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const analyzeIdea = httpsCallable(functions, 'analyzeMicroIdea');
      const res: any = await analyzeIdea({ idea: idea.trim() });
      if (res.data?.success && res.data?.data) {
        setResult(res.data.data);
      } else {
        toast.error('Gagal memproses simulasi.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-10 relative overflow-hidden rounded-[2rem] bg-card/40 dark:bg-slate-900/40 backdrop-blur-xl ring-1 ring-border dark:ring-white/5 shadow-xl p-6 sm:p-8">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[60px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col items-start gap-4 mb-6">
          <GradientBadge variant="indigo" className="text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Micro-Simulator AI
          </GradientBadge>
          <div>
            <h3 className="text-xl font-black text-foreground">Bedah Ide Anda dalam 3 Detik</h3>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              Ketik 1 kalimat tentang ide bisnis atau program Anda. Biarkan AI kami menemukan kekuatan dan titik butanya.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="flex space-x-2 relative z-20">
          <Input 
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Contoh: Aplikasi kasir warteg berbasis cloud..."
            className="flex-1 bg-background/60 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-indigo-400 rounded-xl h-11"
            disabled={loading}
          />
          <Button 
            type="submit" 
            disabled={loading || !idea.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5 rounded-xl transition-all"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Bedah Ide'}
          </Button>
        </form>

        <AnimatePresence>
          {result && (
            <m.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SpotlightCard color="emerald" className="p-5 h-full">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold mb-3">
                    <Target size={18} /> <span>Kekuatan Utama</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.kekuatan}</p>
                </SpotlightCard>
                
                <SpotlightCard color="amber" className="p-5 h-full">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold mb-3">
                    <AlertTriangle size={18} /> <span>Blind Spot</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.kelemahan}</p>
                </SpotlightCard>
              </div>

              <div className="mt-4 flex items-center justify-between bg-card/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-border dark:ring-white/5 shadow-lg rounded-[1.5rem] p-5">
                <div className="flex items-center gap-4">
                  <ScoreRing score={result.skor} size={64} strokeWidth={6} label="Skor" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Skor Kelayakan</h4>
                    <p className="text-[11px] text-muted-foreground">Estimasi AI berdasarkan deskripsi</p>
                  </div>
                </div>
                <Button 
                  onClick={() => document.getElementById('assessment-tracks')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-background/80 hover:bg-background ring-1 ring-border text-foreground hover:text-indigo-600 font-bold shadow-sm transition-all rounded-xl relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 flex items-center">Asesmen Lengkap <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" /></span>
                </Button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

