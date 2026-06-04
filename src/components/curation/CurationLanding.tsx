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
      {/* Ornaments */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-16 items-center relative z-10">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-2xl shadow-xl">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Smart Curation <br/> <span className="text-indigo-600">& Readiness System</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-medium">
              Sistem asesmen mendalam berbasis AI untuk mengukur kelayakan UMKM, Bisnis Jasa, dan Startup Anda menuju pendanaan & ekspansi pasar.
            </p>
          </div>
          <Button size="lg" onClick={onStart} className="gap-3 shadow-xl shadow-slate-900/20 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-14 px-8 text-base">
            Mulai Asesmen Sekarang <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {history.length > 0 && (
          <div className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-200/60 pb-4">
              <History className="h-5 w-5 text-indigo-600" /> Riwayat Kurasi Anda
            </h3>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {history.map((item, idx) => (
                <div key={idx} onClick={() => onLoadHistory(item)} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">{item.trackType}</span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3"/> {new Date(item.date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 truncate mb-3">{item.namaUsaha}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <Activity size={14} className="text-emerald-500"/>
                      <p className="text-xs font-bold text-slate-600">Skor: {item.score}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
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