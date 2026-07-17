// src/components/curation/DynamicTrackSelector.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, ArrowRight, LayoutGrid, X 
} from 'lucide-react';
import { FormTemplate } from '@/types/curation';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// IMPORT CUSTOM ICONS
import { 
  AppModuleTealIcon, 
  TechCardIcon, 
  AILensIcon, 
  InfinityWorkflowIcon, 
  BrainIcon, 
  GlobalTargetIcon, 
  AdminShieldIcon,
  DocExportIcon,
  AiSparkIcon
} from '@/types';

interface DynamicTrackSelectorProps {
  templates: FormTemplate[];
  onBack?: () => void;
}

// MESIN DETEKSI TEMA KATEGORI
const getCategoryTheme = (title: string, category: string) => {
  const text = `${title} ${category}`.toLowerCase();
  
  if (text.includes('koperasi') || text.includes('kelurahan') || text.includes('komunitas') || text.includes('hijau') || text.includes('sampah') || text.includes('properti')) {
    return { 
      bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200',
      hoverRing: 'hover:ring-emerald-300', hoverText: 'group-hover:text-emerald-600', hoverBg: 'group-hover:bg-emerald-50'
    };
  }
  if (text.includes('pemerintah') || text.includes('skp') || text.includes('kecamatan') || text.includes('layanan') || text.includes('disposisi') || text.includes('anak') || text.includes('parenting')) {
    return { 
      bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200',
      hoverRing: 'hover:ring-amber-300', hoverText: 'group-hover:text-amber-600', hoverBg: 'group-hover:bg-amber-50'
    };
  }
  if (text.includes('riset') || text.includes('akademik') || text.includes('perguruan') || text.includes('techno park') || text.includes('inkubasi') || text.includes('gen z') || text.includes('gen-z') || text.includes('talent')) {
    return { 
      bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200',
      hoverRing: 'hover:ring-sky-300', hoverText: 'group-hover:text-sky-600', hoverBg: 'group-hover:bg-sky-50'
    };
  }
  if (text.includes('kesehatan') || text.includes('medis') || text.includes('psikologi') || text.includes('mental')) {
    return { 
      bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200',
      hoverRing: 'hover:ring-rose-300', hoverText: 'group-hover:text-rose-600', hoverBg: 'group-hover:bg-rose-50'
    };
  }
  
  return { 
    bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200',
    hoverRing: 'hover:ring-indigo-300', hoverText: 'group-hover:text-indigo-600', hoverBg: 'group-hover:bg-indigo-50'
  };
};

export function DynamicTrackSelector({ templates, onBack }: DynamicTrackSelectorProps) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<FormTemplate | null>(null);
  const activeTemplates = templates.filter(t => t.isActive);

  const handleSelectTrack = (template: FormTemplate) => {
    setSelectedTrack(template);
  };

  const confirmSelection = () => {
    if (!selectedTrack) return;
    const slug = selectedTrack.trackName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    router.push(`/assessment/${slug}`);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  const drawerTheme = selectedTrack ? getCategoryTheme(selectedTrack.trackName, selectedTrack.category || '') : getCategoryTheme('', '');
  
  // Custom Default Icon untuk Header Modal Drawer & Kartu
  const DrawerIcon = selectedTrack?.trackIcon && (LucideIcons as any)[selectedTrack.trackIcon] 
    ? (LucideIcons as any)[selectedTrack.trackIcon] 
    : AppModuleTealIcon;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-6 lg:py-12 flex flex-col items-center">
      <div className="max-w-[1200px] w-full space-y-8">
        
        {/* ================= HEADER KEMBALI ================= */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 ease-out relative z-20">
          <button 
            onClick={handleBack} 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all w-fit px-4 py-2.5 -ml-4 rounded-xl hover:bg-white hover:shadow-sm ring-1 ring-transparent hover:ring-slate-200 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>
        </div>

        {/* ================= GRID SECTION ================= */}
        {activeTemplates.length === 0 ? (
          <div className="py-24 text-center text-slate-500 bg-white ring-1 ring-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 duration-500">
            {/* Menggunakan TechCardIcon untuk Empty State */}
            <TechCardIcon className="mx-auto h-16 w-16 text-slate-200 mb-6 grayscale opacity-50" />
            <p className="font-black text-2xl text-slate-900 mb-2">Katalog Belum Tersedia</p>
            <p className="text-base font-medium">Silakan hubungi administrator untuk menerbitkan modul asesmen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {activeTemplates.map((template, index) => {
              const IconComponent = template.trackIcon && (LucideIcons as any)[template.trackIcon] 
                                     ? (LucideIcons as any)[template.trackIcon] 
                                     : AppModuleTealIcon; // Custom Fallback Icon
              
              const theme = getCategoryTheme(template.trackName, template.category || '');
              
              return (
                <div 
                  key={template.id} 
                  onClick={() => handleSelectTrack(template)}
                  style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
                  className={`animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out bg-white rounded-3xl p-6 lg:p-8 ring-1 ring-slate-200 ${theme.hoverRing} flex flex-col transition-all duration-300 relative group overflow-hidden cursor-pointer hover:shadow-xl shadow-sm min-h-[280px]`}
                >
                  <div className={`absolute -bottom-10 -right-10 w-48 h-48 transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 ease-out pointer-events-none opacity-5 ${theme.text}`}>
                    <IconComponent className="w-full h-full" strokeWidth={1} />
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <div className={`w-14 h-14 ${theme.bg} ${theme.text} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ring-1 ${theme.ring}`}>
                      <IconComponent className="w-7 h-7" />
                    </div>
                    
                    <h3 className="text-xl lg:text-2xl font-black text-slate-900 leading-snug mb-3 pr-4">
                      {template.trackName}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3">
                      {template.trackDescription}
                    </p>
                  </div>

                  <div className="relative z-10 pt-6 mt-6 flex items-center justify-between border-t border-slate-100">
                    <span className={`text-sm font-bold text-slate-400 transition-colors ${theme.hoverText}`}>
                      Mulai Asesmen
                    </span>
                    <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center transition-all duration-300 ${theme.hoverBg} group-hover:translate-x-1`}>
                      <ArrowRight className={`w-5 h-5 text-slate-400 transition-colors ${theme.hoverText}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL SLIDING DRAWER ================= */}
      <AnimatePresence>
        {selectedTrack && (
          <React.Fragment key="track-drawer-fragment">
            <motion.div 
              key="track-drawer-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTrack(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[200]"
            />
            
            <motion.div 
              key="track-drawer-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-white z-[210] shadow-2xl flex flex-col border-l border-slate-100"
            >
              {/* Header Drawer */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md shrink-0">
                <div>
                  <h3 className="font-black text-xl text-slate-900">Persiapan Asesmen</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedTrack.category || 'Asesmen Mandiri'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedTrack(null)} 
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Drawer */}
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                <div className="flex items-start gap-4 mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ${drawerTheme.bg} ${drawerTheme.text} ${drawerTheme.ring}`}>
                    <DrawerIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      {selectedTrack.trackName}
                    </h4>
                  </div>
                </div>

                <div className="space-y-6">
                  
                  {/* KOTAK EKSPEKTASI HASIL (MENGGUNAKAN CUSTOM ICON) */}
                  <div className={`${drawerTheme.bg} p-6 rounded-3xl ring-1 ${drawerTheme.ring} bg-opacity-40`}>
                    <h5 className={`text-[11px] font-black ${drawerTheme.text} uppercase tracking-widest mb-5 flex items-center gap-2`}>
                      <AiSparkIcon size={14} /> Apa yang akan Anda dapatkan?
                    </h5>
                    <ul className="space-y-5">
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <AILensIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 mb-1">Analisis Instan & Mendalam</p>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Laporan pemetaan komprehensif akan langsung disajikan dalam hitungan menit setelah Anda menyelesaikan pengisian.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <DocExportIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 mb-1">Salinan Terkirim ke Email</p>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Akses hasil Anda kapan saja. Tautan dasbor dan salinan dokumen akan otomatis dikirimkan ke kotak masuk Anda.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-600 ring-1 ring-slate-200">
                          <BrainIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 mb-1">Fondasi Konsultasi Lanjutan</p>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Menjadi langkah awal dan <span className="italic">baseline</span> data objektif yang sangat berharga sebelum Anda melangkah ke sesi konsultasi bersama ahli.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* KOTAK PANDUAN PENGISIAN (MENGGUNAKAN CUSTOM ICON) */}
                  <div className="bg-slate-50 p-6 rounded-3xl ring-1 ring-slate-200">
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                      <AdminShieldIcon size={14} /> Panduan Sebelum Memulai
                    </h5>
                    <ul className="space-y-5">
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-500 ring-1 ring-slate-200">
                          <GlobalTargetIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-1">Jawab Secara Objektif</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Sistem AI kami membutuhkan data yang jujur dan apa adanya untuk merumuskan cetak biru yang paling akurat dan tepat sasaran.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-500 ring-1 ring-slate-200">
                          <AdminShieldIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-1">Privasi Sepenuhnya Terjaga</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Jangan ragu membagikan kendala nyata. Seluruh data yang dimasukkan diproses dalam ekosistem yang tertutup dan aman.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-500 ring-1 ring-slate-200">
                          <InfinityWorkflowIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-1">Progres Tersimpan Otomatis</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Tidak perlu terburu-buru. Anda dapat menutup halaman kapan saja dan melanjutkannya nanti tanpa takut kehilangan data.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-500 ring-1 ring-slate-200">
                          <AiSparkIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 mb-1">Nikmati Prosesnya</p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Instrumen ini dirancang interaktif layaknya berkonsultasi dengan ahlinya. Ikuti alurnya dan temukan wawasan baru.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Footer Drawer */}
              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <Button 
                  onClick={confirmSelection}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-base hover:bg-indigo-600 shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 group"
                >
                  Mulai Pengisian Sekarang <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}