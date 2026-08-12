'use client';

import React from 'react';
import { GlassPanel, SpotlightCard } from '@omnifit-ui/components';
import { Trophy, ArrowRight, BrainCircuit, Star, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

interface CryptoLearningRecommendationsProps {
  score: number;
  passed: boolean;
  xpEarned: number;
  newBadges: string[];
  recommendations: string[];
  nextModuleId?: string;
  onClose?: () => void;
}

export function CryptoLearningRecommendations({
  score,
  passed,
  xpEarned,
  newBadges,
  recommendations,
  nextModuleId,
  onClose
}: CryptoLearningRecommendationsProps) {
  return (
    <div className="space-y-6">
      {/* Header Result */}
      <div className={`p-6 rounded-xl border text-center ${passed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <Trophy className={`w-12 h-12 ${passed ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {passed ? 'Selamat, Anda Lulus!' : 'Belum Lulus, Jangan Menyerah!'}
        </h2>
        <p className="text-muted-foreground mb-4">
          Skor Kuis Anda: <span className={`font-bold text-lg ${passed ? 'text-green-500' : 'text-red-500'}`}>{score}</span>/100
        </p>
        <Progress value={score} className="w-full h-2 mb-2" />
        <p className="text-sm text-muted-foreground">Minimal kelulusan: 70</p>
      </div>

      {/* Rewards Section */}
      <div className="grid grid-cols-2 gap-4">
        <SpotlightCard color="amber" className="p-4 flex items-center space-x-4 bg-background">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">XP Didapat</p>
              <p className="text-xl font-bold">+{xpEarned} XP</p>
            </div>
        </SpotlightCard>
        
        {newBadges.length > 0 && (
          <SpotlightCard color="rose" className="p-4 flex items-center space-x-4 bg-background">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badge Baru</p>
                <p className="text-lg font-bold truncate">{newBadges[0]}</p>
              </div>
          </SpotlightCard>
        )}
      </div>

      {/* AI Recommendations */}
      <GlassPanel>
        <div className="pb-3 text-lg font-bold flex items-center border-b border-white/5 mb-4">
            <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
            Rekomendasi AI
        </div>
        <div>
          <ul className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 shrink-0" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                {passed 
                  ? "Pemahaman Anda sudah sangat baik. Silakan lanjutkan ke modul berikutnya."
                  : "Sebaiknya Anda membaca ulang modul ini dan memperhatikan konsep-konsep kuncinya."}
              </li>
            )}
          </ul>
        </div>
      </GlassPanel>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        )}
        {passed && nextModuleId ? (
          <Button asChild>
            <Link href={`/crypto-academy/${nextModuleId}`}>
              Modul Berikutnya <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button onClick={onClose}>
            Review Materi Lagi
          </Button>
        )}
      </div>
    </div>
  );
}
