'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, ArrowRight, Loader2, Target, AlertTriangle } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/firebase';
import { toast } from 'sonner';

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
    <div className="w-full max-w-xl mx-auto mt-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Brain size={24} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Micro-Simulator AI</h3>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Ketik 1 kalimat tentang ide bisnis atau program Anda. Biarkan AI kami membedahnya dalam 3 detik.
        </p>

        <form onSubmit={handleSimulate} className="flex space-x-2 relative z-20">
          <Input 
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Contoh: Aplikasi kasir warteg berbasis cloud..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-indigo-500"
            disabled={loading}
          />
          <Button 
            type="submit" 
            disabled={loading || !idea.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                <div className="bg-white/5 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-2">
                    <Target size={16} /> <span>Kekuatan Utama</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.kekuatan}</p>
                </div>
                
                <div className="bg-white/5 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-2 text-amber-400 font-semibold mb-2">
                    <AlertTriangle size={16} /> <span>Blind Spot Potensial</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.kelemahan}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                <div>
                  <div className="text-sm text-gray-400">Skor Kelayakan (Estimasi AI)</div>
                  <div className="text-2xl font-bold text-white flex items-end space-x-1">
                    <span>{result.skor}</span>
                    <span className="text-sm font-normal text-gray-500 mb-1">/ 100</span>
                  </div>
                </div>
                <Button 
                  onClick={() => document.getElementById('assessment-tracks')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white border-0 shadow-sm"
                >
                  Asesmen Lengkap <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
