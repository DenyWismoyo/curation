// src/app/components/shared/SocialShareCard.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Import custom icons (sesuaikan path jika perlu)
import { AiSparkIcon, EcosystemIcon } from '@/types';

interface SocialShareCardProps {
  namaUsaha: string;
  score: number;
  readinessLevel: string;
  trackType: string;
  urlToShare?: string;
}

export function SocialShareCard({ namaUsaha, score, readinessLevel, trackType, urlToShare = 'https://omnifit.cloud' }: SocialShareCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const shareText = `Saya baru saja menyelesaikan evaluasi komprehensif "${trackType}" di Omnifit AI Analytics!\n\n🏢 Entitas: ${namaUsaha}\n📊 AI Readiness Score: ${score}/100\n🚀 Level: ${readinessLevel}\n\nCek kesiapan bisnismu sekarang di: ${urlToShare}`;

  const handleShare = async () => {
    // Gunakan Native Web Share API jika tersedia (biasanya di HP: Safari/Chrome Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hasil Asesmen Omnifit: ${namaUsaha}`,
          text: shareText,
        });
        toast.success("Berhasil membuka menu bagikan!");
      } catch (error) {
        console.log("Share dibatalkan atau gagal", error);
      }
    } else {
      // Fallback untuk desktop: Salin ke clipboard
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    toast.success("Teks pencapaian disalin!", {
      description: "Silakan paste di caption Instagram, LinkedIn, atau TikTok Anda."
    });
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Menentukan warna badge berdasarkan skor
  const isHighTier = score >= 75;
  const cardGradient = isHighTier 
    ? 'from-emerald-900 via-emerald-800 to-slate-900' 
    : 'from-indigo-900 via-blue-900 to-slate-900';
  
  const accentColor = isHighTier ? 'text-emerald-400' : 'text-indigo-400';
  const glowColor = isHighTier ? 'bg-emerald-500/20' : 'bg-indigo-500/20';

  return (
    <div className="flex flex-col gap-4">
      {/* KARTU PENCAPAIAN (Design khusus untuk di-Screenshot) */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`relative w-full aspect-[4/5] sm:aspect-auto sm:h-[400px] rounded-[2rem] bg-gradient-to-br ${cardGradient} p-6 sm:p-8 text-white shadow-2xl overflow-hidden flex flex-col justify-between ring-1 ring-white/10`}
      >
        {/* Background Ornaments */}
        <div className={`absolute top-0 right-0 w-64 h-64 ${glowColor} rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none`}></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>

        {/* Header Kartu */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full ring-1 ring-white/20">
            <EcosystemIcon className="w-4 h-4 text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Omnifit Verified</span>
          </div>
          <AiSparkIcon className={`w-8 h-8 ${accentColor} opacity-80`} />
        </div>

        {/* Body Kartu (Skor) */}
        <div className="relative z-10 text-center space-y-2 my-auto py-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{trackType}</p>
          <div className="inline-block relative">
            <span className="text-7xl sm:text-8xl font-black tracking-tighter drop-shadow-lg leading-none">
              {score}
            </span>
            <span className={`absolute top-2 -right-6 text-xl font-black ${accentColor}`}>/100</span>
          </div>
          <div className="mt-4">
            <span className={`inline-block px-4 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-sm font-bold ring-1 ring-white/20 ${accentColor}`}>
              {readinessLevel.split('|')[0] || 'Tervalidasi'}
            </span>
          </div>
        </div>

        {/* Footer Kartu */}
        <div className="relative z-10 border-t border-white/10 pt-4 flex justify-between items-end">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-0.5">Entitas</p>
            <p className="text-sm font-black truncate max-w-[180px]">{namaUsaha}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/50">{new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </motion.div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={handleShare}
          className="bg-slate-900 hover:bg-indigo-600 text-white h-12 rounded-xl font-bold shadow-lg flex items-center gap-2"
        >
          <Share2 size={16} /> Share Sosmed
        </Button>
        <Button 
          variant="outline"
          onClick={copyToClipboard}
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-12 rounded-xl font-bold shadow-sm flex items-center gap-2"
        >
          {isCopied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
          {isCopied ? 'Tersalin!' : 'Salin Caption'}
        </Button>
      </div>
      <p className="text-[10px] text-center text-slate-400 font-medium px-2">
        *Screenshot kartu di atas atau salin caption untuk dipamerkan ke LinkedIn, Instagram, atau TikTok Anda.
      </p>
    </div>
  );
}