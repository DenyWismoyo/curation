// src/app/components/shared/SocialShareCard.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Copy, Check, ShieldCheck, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// IMPORT CUSTOM ICON BRAND
import { AiSparkIcon } from '@/types';

export interface SocialShareCardProps {
  namaUsaha: string;
  score: number;
  readinessLevel: string;
  trackType: string;
}

export function SocialShareCard({ namaUsaha, score, readinessLevel, trackType }: SocialShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCaption = () => {
    const text = `Saya baru saja menyelesaikan evaluasi matrik "${trackType}" di Omnifit OS untuk entitas ${namaUsaha}.\n\nSkor Analitik: ${score}/100\nStatus Kesiapan: ${readinessLevel}\n\nPusat kendali eksekusi dan blueprint strategi siap dijalankan. #Omnifit #AI #StrategicAssessment`;
    
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Caption berhasil disalin ke clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Skor Asesmen Omnifit',
      text: `Skor analitik AI untuk ${namaUsaha} adalah ${score}/100 (${readinessLevel}).`,
      url: 'https://omnifit.cloud'
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        handleCopyCaption(); // Fallback jika browser tidak mendukung Web Share API
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 flex flex-col h-full relative group">
      
      {/* KARTU VISUAL (Target Screenshot yang Elegan) */}
      <div 
        ref={cardRef}
        className="bg-slate-50/50 p-6 sm:p-8 rounded-[1.5rem] ring-1 ring-slate-200 mb-6 relative overflow-hidden flex-1 flex flex-col"
      >
        {/* Ornamen Latar yang Sangat Halus */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <AiSparkIcon size={120} className="absolute -bottom-10 -right-10 text-slate-100 opacity-50 grayscale pointer-events-none transform -rotate-12" />

        <div className="flex justify-between items-start mb-10 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white ring-1 ring-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-700 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-500" />
            Omnifit Verified
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-1">
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="mb-10 relative z-10 flex-1">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 line-clamp-1">
            {trackType}
          </p>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-7xl font-black text-slate-900 tracking-tighter leading-none">{score}</span>
            <span className="text-xl font-bold text-slate-400">/100</span>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-slate-200/80 pt-5 relative z-10">
          <div className="flex-1 pr-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entitas Tervalidasi</p>
            <p className="text-sm font-bold text-slate-800 line-clamp-1">{namaUsaha}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Indeks Kesiapan</p>
            <div className="inline-flex items-center px-2.5 py-1 bg-slate-900 text-white rounded-md text-[10px] font-bold tracking-wide">
              {readinessLevel}
            </div>
          </div>
        </div>
      </div>

      {/* AREA AKSI */}
      <div className="relative z-10">
        <div className="flex gap-3 mb-4">
          <Button 
            onClick={handleNativeShare}
            className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 text-xs font-bold shadow-md transition-all group/share"
          >
            <Share2 size={14} className="mr-2 text-indigo-400 group-hover/share:text-white transition-colors" /> Bagikan
          </Button>
          <Button 
            variant="outline"
            onClick={handleCopyCaption}
            className={`flex-1 rounded-xl h-12 text-xs font-bold transition-all ${
              isCopied 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            {isCopied ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2 text-slate-400" />}
            {isCopied ? 'Tersalin!' : 'Salin Caption'}
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed px-4">
          * Ambil tangkapan layar (screenshot) kartu di atas atau salin caption untuk dibagikan ke media profesional Anda.
        </p>
      </div>
      
    </div>
  );
}