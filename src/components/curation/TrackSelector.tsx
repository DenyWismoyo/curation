// src/components/curation/TrackSelector.tsx
import React from 'react';
import { ChevronLeft, ArrowRight, Rocket, Store, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onSelect: (track: string) => void;
  onBack: () => void;
}

export function TrackSelector({ onSelect, onBack }: Props) {
  const tracks = [
    { id: 'Startup', title: 'Startup Teknologi', desc: 'Aplikasi, SaaS, atau Platform Digital.', icon: Rocket },
    { id: 'UMKM', title: 'UMKM & Produk Fisik', desc: 'F&B, Fashion, Kriya, atau Manufaktur.', icon: Store },
    { id: 'Jasa', title: 'Bisnis Jasa / Agensi', desc: 'Software House, Konsultan, atau Kreatif.', icon: Briefcase }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 lg:px-12 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full space-y-10">
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-4 hover:bg-slate-100 text-slate-600 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Kembali ke Beranda
        </Button>
        <div className="space-y-4">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Pilih Model Bisnis</h2>
          <p className="text-slate-500 text-lg lg:text-xl max-w-2xl font-medium">Pilih kategori yang paling mendeskripsikan model operasi bisnis Anda saat ini agar matriks AI dapat mengkalibrasi dengan tepat.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {tracks.map((track) => {
            const Icon = track.icon;
            return (
              <div 
                key={track.id} 
                className="group relative cursor-pointer overflow-hidden rounded-[2rem] border-2 border-slate-200 bg-white p-8 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1"
                onClick={() => onSelect(track.id)}
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-slate-600">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-indigo-900">{track.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{track.desc}</p>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Mulai Asesmen <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}