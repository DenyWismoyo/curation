// src/components/curation/DynamicTrackSelector.tsx
'use client';

import React, { useState } from 'react';
import { ChevronLeft, ArrowRight, LayoutGrid, Search, Sparkles } from 'lucide-react';
import { FormTemplate } from '@/types/curation';
import * as LucideIcons from 'lucide-react';

interface DynamicTrackSelectorProps {
  templates: FormTemplate[];
  onSelect: (template: FormTemplate) => void;
  onBack: () => void;
}

// MESIN DETEKSI TEMA KATEGORI
const getCategoryTheme = (title: string, desc: string) => {
  const text = `${title} ${desc}`.toLowerCase();
  
  // Tema Hijau: Koperasi, Komunitas, Lingkungan
  if (text.includes('koperasi') || text.includes('kelurahan') || text.includes('komunitas') || text.includes('hijau') || text.includes('sampah')) {
    return {
      gradient: 'bg-gradient-to-br from-white to-emerald-50/40 hover:to-emerald-100/60',
      iconWrap: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-emerald-500/30',
      title: 'group-hover:text-emerald-900',
      watermark: 'text-emerald-500/5 group-hover:text-emerald-500/10',
      line: 'bg-emerald-500',
      shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)]',
      border: 'ring-slate-200/80 hover:ring-emerald-200',
      arrowWrap: 'group-hover:bg-emerald-100',
      arrow: 'group-hover:text-emerald-600'
    };
  }
  
  // Tema Oranye/Amber: Pemerintahan, Layanan Publik, Administrasi
  if (text.includes('pemerintah') || text.includes('skp') || text.includes('kecamatan') || text.includes('layanan') || text.includes('disposisi')) {
    return {
      gradient: 'bg-gradient-to-br from-white to-amber-50/40 hover:to-amber-100/60',
      iconWrap: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-amber-500/30',
      title: 'group-hover:text-amber-900',
      watermark: 'text-amber-500/5 group-hover:text-amber-500/10',
      line: 'bg-amber-500',
      shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)]',
      border: 'ring-slate-200/80 hover:ring-amber-200',
      arrowWrap: 'group-hover:bg-amber-100',
      arrow: 'group-hover:text-amber-600'
    };
  }

  // Tema Biru Muda: Riset, Akademik, Techno Park
  if (text.includes('riset') || text.includes('akademik') || text.includes('perguruan') || text.includes('techno park') || text.includes('inkubasi')) {
    return {
      gradient: 'bg-gradient-to-br from-white to-sky-50/40 hover:to-sky-100/60',
      iconWrap: 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white group-hover:shadow-sky-500/30',
      title: 'group-hover:text-sky-900',
      watermark: 'text-sky-500/5 group-hover:text-sky-500/10',
      line: 'bg-sky-500',
      shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(14,165,233,0.15)]',
      border: 'ring-slate-200/80 hover:ring-sky-200',
      arrowWrap: 'group-hover:bg-sky-100',
      arrow: 'group-hover:text-sky-600'
    };
  }
  
  // Tema Ungu/Indigo: Default (Startup, Tech, Umum)
  return {
    gradient: 'bg-gradient-to-br from-white to-indigo-50/40 hover:to-indigo-100/60',
    iconWrap: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-500/30',
    title: 'group-hover:text-indigo-900',
    watermark: 'text-indigo-500/5 group-hover:text-indigo-500/10',
    line: 'bg-indigo-600',
    shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)]',
    border: 'ring-slate-200/80 hover:ring-indigo-200',
    arrowWrap: 'group-hover:bg-indigo-100',
    arrow: 'group-hover:text-indigo-600'
  };
};

export function DynamicTrackSelector({ templates, onSelect, onBack }: DynamicTrackSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const activeTemplates = templates.filter(t => t.isActive);
  const filteredTemplates = activeTemplates.filter(t => 
    t.trackName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.trackDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-6 lg:py-16 lg:px-12 flex flex-col items-center">
      <div className="max-w-[1400px] w-full space-y-10 lg:space-y-16">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="space-y-8 animate-in fade-in slide-in-from-top-8 duration-700 ease-out relative z-20">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all w-fit px-4 py-2.5 -ml-4 rounded-xl hover:bg-white hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" /> Kembali ke Dasbor
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4 flex-1">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 text-balance flex items-center gap-3">
                Model Bisnis <Sparkles className="h-8 w-8 lg:h-10 lg:w-10 text-indigo-500" />
              </h2>
              <p className="text-slate-500 text-base sm:text-lg max-w-2xl font-medium leading-relaxed text-balance">
                Pilih kategori yang mendeskripsikan model operasi bisnis Anda. Matriks AI akan menyesuaikan secara dinamis.
              </p>
            </div>

            {/* PENCARIAN */}
            <div className="w-full lg:w-[380px] relative shrink-0 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Cari model atau kata kunci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border-none ring-1 ring-slate-200/80 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* ================= GRID SECTION ================= */}
        {activeTemplates.length === 0 ? (
          <div className="py-24 text-center text-slate-500 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 duration-500">
            <LayoutGrid className="mx-auto h-16 w-16 text-slate-200 mb-6" />
            <p className="font-black text-2xl text-slate-900 mb-2">Katalog Belum Tersedia</p>
            <p className="text-base font-medium">Silakan hubungi administrator untuk menerbitkan modul asesmen.</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-24 text-center text-slate-500">
            <p className="font-bold text-xl text-slate-900">Pencarian Tidak Ditemukan</p>
            <p className="text-sm mt-2">Coba gunakan kata kunci lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {filteredTemplates.map((template, index) => {
              const IconComponent = template.trackIcon && (LucideIcons as any)[template.trackIcon] 
                                     ? (LucideIcons as any)[template.trackIcon] 
                                     : LayoutGrid;
              
              // Terapkan deteksi tema
              const theme = getCategoryTheme(template.trackName, template.trackDescription);
              
              return (
                <div 
                  key={template.id} 
                  onClick={() => onSelect(template)}
                  style={{ animationFillMode: 'both', animationDelay: `${index * 100}ms` }}
                  className={`animate-in fade-in slide-in-from-bottom-12 duration-700 ease-out group relative cursor-pointer rounded-[2rem] p-8 ring-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between overflow-hidden h-full min-h-[300px] ${theme.gradient} ${theme.border} ${theme.shadow}`}
                >
                  {/* WATERMARK ICON BESAR DI KANAN BAWAH */}
                  <div className={`absolute -bottom-8 -right-8 w-48 h-48 transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 ease-out pointer-events-none ${theme.watermark}`}>
                    <IconComponent className="w-full h-full" strokeWidth={1.5} />
                  </div>
                  
                  <div className="relative z-10 flex flex-col flex-1">
                    <div className={`w-16 h-16 rounded-[1.25rem] ring-1 ring-white/50 flex items-center justify-center mb-8 transition-all duration-500 shadow-sm group-hover:scale-110 ${theme.iconWrap}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    
                    <h3 className={`text-2xl font-black mb-3 text-slate-900 leading-tight transition-colors duration-300 ${theme.title}`}>
                      {template.trackName}
                    </h3>
                    <p className="text-base text-slate-500 font-medium leading-relaxed text-balance line-clamp-3">
                      {template.trackDescription}
                    </p>
                  </div>

                  {/* Bagian Bawah: Action Button Interaktif */}
                  <div className="relative z-10 mt-10 flex items-center justify-between border-t border-slate-100/50 pt-6 transition-colors duration-300">
                    <span className={`text-sm font-bold text-slate-400 transition-colors duration-300 ${theme.arrow}`}>
                      Mulai Asesmen
                    </span>
                    <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center transition-all duration-500 group-hover:translate-x-2 ${theme.arrowWrap}`}>
                      <ArrowRight className={`h-5 w-5 text-slate-400 transition-colors ${theme.arrow}`} />
                    </div>
                  </div>
                  
                  {/* Garis Bawah Aksen */}
                  <div className={`absolute bottom-0 left-0 h-1.5 w-0 group-hover:w-full transition-all duration-700 ease-out ${theme.line}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}