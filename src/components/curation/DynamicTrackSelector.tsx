'use client';

import React from 'react';
import { ChevronLeft, ArrowRight, ChevronRight, LayoutGrid } from 'lucide-react';
import { FormTemplate } from '@/types/curation';
import * as LucideIcons from 'lucide-react';

interface DynamicTrackSelectorProps {
  templates: FormTemplate[];
  onSelect: (template: FormTemplate) => void;
  onBack: () => void;
}

export function DynamicTrackSelector({ templates, onSelect, onBack }: DynamicTrackSelectorProps) {
  
  // Filter hanya template yang aktif
  const activeTemplates = templates.filter(t => t.isActive);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6 lg:py-12 lg:px-12 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full space-y-8 lg:space-y-10">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors w-fit px-3 py-2 -ml-3 rounded-lg hover:bg-slate-200/50 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
        
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 text-balance">Pilih Model Bisnis</h2>
          <p className="text-slate-500 text-base sm:text-lg lg:text-xl max-w-2xl font-medium leading-relaxed text-balance">
            Pilih kategori yang mendeskripsikan model operasi bisnis Anda. Kuesioner dinamis kami akan menyesuaikan dengan matriks industri yang Anda pilih.
          </p>
        </div>

        {activeTemplates.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-white ring-1 ring-slate-200 rounded-3xl">
            <LayoutGrid className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="font-bold text-lg">Belum ada kategori yang aktif.</p>
            <p className="text-sm mt-1">Silakan minta Admin untuk menerbitkan (publish) form template baru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pt-4 lg:pt-6">
            {activeTemplates.map((template) => {
              // Load Icon secara Dinamis dari Lucide
              const IconComponent = template.trackIcon && (LucideIcons as any)[template.trackIcon] 
                                    ? (LucideIcons as any)[template.trackIcon] 
                                    : LayoutGrid;

              return (
                <div 
                  key={template.id} 
                  onClick={() => onSelect(template)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 p-6 sm:p-8 hover:ring-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] flex flex-row lg:flex-col items-center lg:items-start gap-5 lg:gap-0"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 shrink-0 flex items-center justify-center lg:mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-slate-600">
                    <IconComponent className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-black mb-1 lg:mb-3 text-slate-900 group-hover:text-indigo-900 leading-tight">
                      {template.trackName}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed text-balance line-clamp-2 lg:line-clamp-none">
                      {template.trackDescription}
                    </p>
                  </div>
                  
                  {/* Arrow indikator di mobile */}
                  <div className="lg:hidden shrink-0 text-slate-300 group-hover:text-indigo-600 transition-colors">
                     <ChevronRight className="w-5 h-5" />
                  </div>

                  <div className="hidden lg:flex mt-8 items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                    Mulai Asesmen <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}