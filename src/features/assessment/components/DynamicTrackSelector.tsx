// src/components/curation/DynamicTrackSelector.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, ArrowRight, LayoutGrid, X 
} from 'lucide-react';
import { FormTemplate } from '@/features/assessment/types/assessment.types';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/landing/SpotlightCard';

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
} from '@/components/icon';
import { FilterChipGroup } from '@omnifit-ui/components';

interface DynamicTrackSelectorProps {
  templates: FormTemplate[];
  onBack?: () => void;
}

// MESIN DETEKSI TEMA KATEGORI
const getCategoryTheme = (title: string, category: string) => {
  const text = `${title} ${category}`.toLowerCase();
  
  if (text.includes('koperasi') || text.includes('kelurahan') || text.includes('komunitas') || text.includes('hijau') || text.includes('sampah') || text.includes('properti')) {
    return { 
      bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-500/20',
      hoverRing: 'hover:ring-emerald-300', hoverText: 'group-hover:text-emerald-600 dark:text-emerald-400', hoverBg: 'group-hover:bg-emerald-50 dark:bg-emerald-500/10'
    };
  }
  if (text.includes('pemerintah') || text.includes('skp') || text.includes('kecamatan') || text.includes('layanan') || text.includes('disposisi') || text.includes('anak') || text.includes('parenting')) {
    return { 
      bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-500/20',
      hoverRing: 'hover:ring-amber-300', hoverText: 'group-hover:text-amber-600 dark:text-amber-400', hoverBg: 'group-hover:bg-amber-50 dark:bg-amber-500/10'
    };
  }
  if (text.includes('riset') || text.includes('akademik') || text.includes('perguruan') || text.includes('techno park') || text.includes('inkubasi') || text.includes('gen z') || text.includes('gen-z') || text.includes('talent')) {
    return { 
      bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-200 dark:ring-sky-500/20',
      hoverRing: 'hover:ring-sky-300', hoverText: 'group-hover:text-sky-600 dark:text-sky-400', hoverBg: 'group-hover:bg-sky-50 dark:bg-sky-500/10'
    };
  }
  if (text.includes('kesehatan') || text.includes('medis') || text.includes('psikologi') || text.includes('mental')) {
    return { 
      bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-200 dark:ring-rose-500/20',
      hoverRing: 'hover:ring-rose-300', hoverText: 'group-hover:text-rose-600 dark:text-rose-400', hoverBg: 'group-hover:bg-rose-50 dark:bg-rose-500/10'
    };
  }

  return { 
    bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-200 dark:ring-indigo-500/20',
    hoverRing: 'hover:ring-indigo-300', hoverText: 'group-hover:text-indigo-600 dark:text-indigo-400', hoverBg: 'group-hover:bg-indigo-50 dark:bg-indigo-500/10'
  };
};

// FUNGSI PARSER UNTUK MEMISAHKAN "JUDUL: DESKRIPSI"
const parseExpectedOutput = (blockStr: string) => {
  if (!blockStr) return { title: '', subs: '' };
  const colonIndex = blockStr.indexOf(':');
  if (colonIndex === -1) return { title: blockStr, subs: '' };
  return { title: blockStr.slice(0, colonIndex).trim(), subs: blockStr.slice(colonIndex + 1).trim() };
};

export function DynamicTrackSelector({ templates, onBack }: DynamicTrackSelectorProps) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<FormTemplate | null>(null);
  const [activeCorporateName, setActiveCorporateName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');

  React.useEffect(() => {
    const corpName = sessionStorage.getItem('active_corporate_name');
    if (corpName) {
      setActiveCorporateName(corpName);
    }
  }, []);

  const activeTemplates = templates.filter(t => t.isActive);
  const categories = ['Semua', ...Array.from(new Set(activeTemplates.map(t => t.category || 'Lainnya')))];
  
  const filteredTemplates = activeTemplates.filter(t => 
    activeCategory === 'Semua' || (t.category || 'Lainnya') === activeCategory
  );

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

  // Ikon rotasi dinamis untuk list benefit
  const OutputIcons = [AILensIcon, InfinityWorkflowIcon, BrainIcon, GlobalTargetIcon];

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-6 lg:py-16 flex flex-col items-center relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] w-full space-y-12 relative z-10">
        
        {/* ================= HEADER KEMBALI & WHITE-LABELING ================= */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 ease-out flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={handleBack} 
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-indigo-600 transition-all w-fit px-4 py-2.5 -ml-4 rounded-xl hover:bg-muted/50 ring-1 ring-transparent hover:ring-border active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>
          
          {activeCorporateName && activeCorporateName !== 'Omnifit' && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 px-5 py-2.5 rounded-full ring-1 ring-indigo-200 dark:ring-indigo-500/20 shadow-sm">
              <GlobalTargetIcon size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-black text-indigo-900 dark:text-indigo-100 tracking-tight">Program: {activeCorporateName}</span>
            </div>
          )}
        </div>

        {/* ================= HERO TITLE ================= */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">Pilih Modul Asesmen</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Pilih modul asesmen yang paling relevan dengan kebutuhan Anda. Setiap modul dirancang khusus untuk memetakan kekuatan dan blind-spot secara komprehensif.
          </p>
        </div>

        {/* ================= GRID SECTION ================= */}
        <div className="flex justify-center mb-6">
          <FilterChipGroup 
            chips={categories.map(c => ({ id: c, label: c }))} 
            selectedIds={[activeCategory]} 
            onChange={(ids) => setActiveCategory(ids[0] || 'Semua')} 
            multiSelect={false}
          />
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground bg-card/40 backdrop-blur-xl ring-1 ring-border rounded-[2rem] shadow-sm animate-in zoom-in-95 duration-500">
            <TechCardIcon className="mx-auto h-16 w-16 text-slate-200 mb-6 grayscale opacity-50" />
            <p className="font-black text-2xl text-foreground mb-2">Katalog Belum Tersedia</p>
            <p className="text-base font-medium">Modul untuk kategori ini belum tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {filteredTemplates.map((template, index) => {
              const IconComponent = template.trackIcon && (LucideIcons as any)[template.trackIcon] 
                                      ? (LucideIcons as any)[template.trackIcon] 
                                      : AppModuleTealIcon;
              
              const theme = getCategoryTheme(template.trackName, template.category || '');
              
              // Map theme base color for SpotlightCard
              let spotlightColor: 'indigo' | 'emerald' | 'rose' | 'amber' = 'indigo';
              if (theme.bg.includes('emerald')) spotlightColor = 'emerald';
              if (theme.bg.includes('amber')) spotlightColor = 'amber';
              if (theme.bg.includes('rose')) spotlightColor = 'rose';
              
              return (
                <div 
                  key={template.id} 
                  onClick={() => handleSelectTrack(template)}
                  style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
                  className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out h-full"
                >
                  <SpotlightCard 
                    color={spotlightColor} 
                    className={`h-full flex flex-col p-6 lg:p-8 cursor-pointer group transition-transform hover:-translate-y-1 hover:shadow-xl ${theme.hoverRing}`}
                  >
                    <div className={`absolute -bottom-10 -right-10 w-48 h-48 transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 ease-out pointer-events-none opacity-5 ${theme.text}`}>
                      <IconComponent className="w-full h-full" strokeWidth={1} />
                    </div>
                    
                    <div className="flex-1 relative z-10">
                      <div className={`w-14 h-14 ${theme.bg} ${theme.text} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ring-1 ${theme.ring}`}>
                        <IconComponent className="w-7 h-7" />
                      </div>
                      
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 ring-1 ring-border/50">
                        {template.category || 'Asesmen Mandiri'}
                      </div>
                      
                      <h3 className="text-xl lg:text-2xl font-black text-foreground leading-snug mb-3 pr-4 group-hover:text-foreground/90 transition-colors">
                        {template.trackName}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-3">
                        {template.trackDescription}
                      </p>
                    </div>

                    <div className="relative z-10 pt-6 mt-6 flex items-center justify-between border-t border-border/50">
                      <span className={`text-sm font-bold text-slate-400 transition-colors ${theme.hoverText}`}>
                        Mulai Asesmen
                      </span>
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-all duration-300 ${theme.hoverBg} group-hover:translate-x-1 ring-1 ring-border/50 group-hover:ring-transparent`}>
                        <ArrowRight className={`w-5 h-5 text-slate-400 transition-colors ${theme.hoverText}`} />
                      </div>
                    </div>
                  </SpotlightCard>
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
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200]"
            />
            
            <motion.div 
              key="track-drawer-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-card/70 dark:bg-slate-950/80 backdrop-blur-3xl z-[210] shadow-2xl flex flex-col border-l border-white/10"
            >
              {/* Header Drawer */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-card/30 shrink-0">
                <div>
                  <h3 className="font-black text-xl text-foreground">Persiapan Asesmen</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {selectedTrack.category || 'Asesmen Mandiri'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedTrack(null)} 
                  className="p-2.5 bg-background/50 hover:bg-background ring-1 ring-border text-foreground rounded-full transition-all shadow-sm"
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
                    <h4 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                      {selectedTrack.trackName}
                    </h4>
                  </div>
                </div>

                <div className="space-y-6">
                  
                  {/* KOTAK EKSPEKTASI HASIL */}
                  <div className={`${drawerTheme.bg} p-6 rounded-3xl ring-1 ${drawerTheme.ring} bg-opacity-30 backdrop-blur-md`}>
                    <h5 className={`text-[11px] font-black ${drawerTheme.text} uppercase tracking-widest mb-5 flex items-center gap-2`}>
                      <AiSparkIcon size={14} /> Apa yang akan Anda dapatkan?
                    </h5>
                    <ul className="space-y-5">
                      {selectedTrack.expectedOutputs && selectedTrack.expectedOutputs.length > 0 ? (
                        selectedTrack.expectedOutputs.map((item, idx) => {
                          const { title, subs } = parseExpectedOutput(item);
                          const DynamicIcon = OutputIcons[idx % OutputIcons.length];
                          
                          return (
                            <li key={idx} className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-border/50">
                                <DynamicIcon size={20} className={drawerTheme.text} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground mb-1">{title || item}</p>
                                {subs && (
                                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    {subs}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        // Fallback Jika Kosong (Modul Lama)
                        <>
                          <li className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-border/50">
                              <AILensIcon size={20} className={drawerTheme.text} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground mb-1">Analisis Instan & Mendalam</p>
                              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                Laporan pemetaan komprehensif akan langsung disajikan dalam hitungan menit setelah Anda menyelesaikan pengisian.
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-border/50">
                              <DocExportIcon size={20} className={drawerTheme.text} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground mb-1">Salinan Terkirim ke Email</p>
                              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                Akses hasil Anda kapan saja. Tautan dasbor dan salinan dokumen akan otomatis dikirimkan ke kotak masuk Anda.
                              </p>
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* KOTAK PANDUAN PENGISIAN */}
                  <div className="bg-muted/40 backdrop-blur-md p-6 rounded-3xl ring-1 ring-border/50">
                    <h5 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-5 flex items-center gap-2">
                      <AdminShieldIcon size={14} /> Panduan Sebelum Memulai
                    </h5>
                    <ul className="space-y-5">
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center shrink-0 shadow-sm text-muted-foreground ring-1 ring-border/50">
                          <GlobalTargetIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground mb-1">Jawab Secara Objektif</p>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            Sistem AI kami membutuhkan data yang jujur dan apa adanya untuk merumuskan cetak biru yang paling akurat dan tepat sasaran.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center shrink-0 shadow-sm text-muted-foreground ring-1 ring-border/50">
                          <AdminShieldIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground mb-1">Privasi Sepenuhnya Terjaga</p>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            Jangan ragu membagikan kendala nyata. Seluruh data yang dimasukkan diproses dalam ekosistem yang tertutup dan aman.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-background/60 flex items-center justify-center shrink-0 shadow-sm text-muted-foreground ring-1 ring-border/50">
                          <InfinityWorkflowIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground mb-1">Progres Tersimpan Otomatis</p>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            Tidak perlu terburu-buru. Anda dapat menutup halaman kapan saja dan melanjutkannya nanti tanpa takut kehilangan data.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Footer Drawer */}
              <div className="p-6 border-t border-white/10 bg-background/40 backdrop-blur-xl shrink-0">
                <Button 
                  onClick={confirmSelection}
                  className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                  <span className="relative z-10 flex items-center">
                    Mulai Pengisian Sekarang <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}