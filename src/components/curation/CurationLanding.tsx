// src/components/curation/CurationLanding.tsx
import React from 'react';
import { ShieldCheck, ArrowRight, History, Clock, Activity, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurationHistory } from '@/types/curation';

interface Props {
  onStart: () => void;
  history: CurationHistory[];
  onLoadHistory: (item: CurationHistory) => void;
}

export function CurationLanding({ onStart, history, onLoadHistory }: Props) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 py-12 px-6 lg:px-12 relative overflow-hidden">
      {/* Ornaments - Diperhalus agar tidak terlalu menutupi konten */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-12 lg:gap-16 items-center relative z-10">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center justify-center p-3.5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/10 ring-1 ring-slate-800">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] text-balance">
              Smart Curation <br/> <span className="text-indigo-600">& Readiness System</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed text-balance">
              Sistem asesmen mendalam berbasis AI untuk mengukur kelayakan UMKM, Bisnis Jasa, dan Startup Anda menuju pendanaan & ekspansi pasar.
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={onStart} 
            className="w-full sm:w-auto gap-3 shadow-lg shadow-indigo-600/20 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl h-14 px-8 text-base transition-all duration-300 active:scale-[0.98]"
          >
            Mulai Asesmen Sekarang <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {history.length > 0 && (
          <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl ring-1 ring-slate-200/50 p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-slate-200/40">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-indigo-600" /> Riwayat Kurasi Anda
            </h3>
            {/* List History yang lebih clean dan elegan */}
            <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar divide-y divide-slate-100/80">
              {history.map((item, idx) => (
                <div key={idx} onClick={() => onLoadHistory(item)} className="py-4 first:pt-2 last:pb-2 hover:bg-slate-50/50 -mx-4 px-4 rounded-xl cursor-pointer transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md ring-1 ring-indigo-100">{item.trackType}</span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3"/> {new Date(item.date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 truncate mb-2 transition-colors">{item.namaUsaha}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Activity size={14} className="text-emerald-500"/>
                      <p className="text-xs font-bold text-slate-600">Skor: {item.score}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}