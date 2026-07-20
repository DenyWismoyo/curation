// src/app/workspace/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionPlanBuilder } from '@/app/components/curation/ActionPlanBuilder';
import { TextToBullets } from '@/app/components/shared/UniversalAssessmentView';
import { SocialShareCard } from '@/app/components/shared/SocialShareCard';
import { motion, AnimatePresence } from 'framer-motion';

// IMPORT CUSTOM ICONS BRAND OMNIFIT
import { 
  AiSparkIcon, 
  GlobalTargetIcon, 
  AdminShieldIcon, 
  TechCardIcon,
  BrainIcon
} from '@/types';

export default function ExecutionWorkspacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  
  // State untuk Interkonektivitas UI (Hover Effect)
  const [hoveredFocus, setHoveredFocus] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (user) {
      const fetchAssessments = async () => {
        try {
          const q = query(
            collection(db, 'assessments'),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(q);
          const rawData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Sorting lokal untuk menghindari error missing index di Firestore
          rawData.sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
          });
          
          setAssessments(rawData);
          if (rawData.length > 0) {
            setSelectedDoc(rawData[0]); 
          }
        } catch (error) {
          console.error("Gagal menarik data Workspace:", error);
        } finally {
          setIsFetching(false);
        }
      };
      fetchAssessments();
    }
  }, [user, loading, router]);

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <BrainIcon size={40} className="text-indigo-600 animate-pulse" />
          <p className="font-bold text-xs uppercase tracking-widest mt-2">Inisialisasi Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* DYNAMIC DARK HEADER OMNIFIT IDENTITY */}
      <header className="bg-slate-900 border-b border-slate-800 pt-6 pb-4 sm:pt-8 sm:pb-6 px-4 sm:px-8 shrink-0 sticky top-0 z-40 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-full max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4 relative z-10 mb-6">
            <Button variant="ghost" onClick={() => router.push('/')} className="h-10 w-10 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <GlobalTargetIcon size={24} className="text-indigo-400" />
                Omnifit <span className="font-medium text-slate-300">Workspace</span>
              </h1>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Pusat Kendali Eksekusi Berkelanjutan</p>
            </div>
          </div>

          {/* FUTURISTIC HORIZONTAL TAB SELECTOR */}
          {assessments.length > 0 && (
            <div className="relative z-10 w-full overflow-x-auto custom-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-3 min-w-max">
                {assessments.map((a) => {
                  const isActive = selectedDoc?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedDoc(a)}
                      className={`relative px-5 py-3 rounded-2xl flex flex-col items-start text-left transition-all duration-300 min-w-[200px] ${
                        isActive 
                          ? 'text-white bg-slate-800/50 backdrop-blur-md' 
                          : 'text-slate-400 bg-slate-900 hover:bg-slate-800/80 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-sm font-black truncate w-full">{a.namaUsaha || 'Project Tanpa Nama'}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate w-full ${isActive ? 'text-indigo-400' : 'text-slate-600'}`}>
                        {a.trackType}
                      </span>
                      
                      {isActive && (
                        <motion.div
                          layoutId="active-workspace-tab"
                          className="absolute inset-0 rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.2)] pointer-events-none"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden p-4 sm:p-8 lg:p-12 w-full max-w-[1400px] mx-auto relative z-10">
        {assessments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-12 rounded-[2rem] ring-1 ring-slate-200 text-center max-w-2xl mx-auto mt-10 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-slate-100">
              <FolderKanban className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Workspace Tidak Ditemukan</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Pusat kendali eksekusi memerlukan setidaknya satu data asesmen aktif. Selesaikan modul pertama Anda untuk membuka akses wawasan taktis.
            </p>
            <Button onClick={() => router.push('/katalog')} className="bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 px-8 font-bold transition-all shadow-lg shadow-slate-900/10">
              Pilih Modul Asesmen
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedDoc && (
              <motion.div 
                key={selectedDoc.id}
                initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start"
              >
                
                {/* KOLOM KIRI: STRATEGI & RISIKO */}
                <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-32">
                  <SocialShareCard 
                    namaUsaha={selectedDoc.namaUsaha}
                    score={selectedDoc.score}
                    readinessLevel={selectedDoc.readinessLevel}
                    trackType={selectedDoc.trackType}
                  />

                  {selectedDoc.aiResult?.riskAssessment?.criticalRisks && selectedDoc.aiResult.riskAssessment.criticalRisks.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-md ring-1 ring-rose-200/60 p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:scale-150"></div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2 relative z-10">
                        <AdminShieldIcon size={16} /> Risiko Utama & Mitigasi
                      </h3>
                      <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                        {selectedDoc.aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-rose-200 transition-colors">
                            <p className="text-[11px] font-bold text-slate-800 mb-3 leading-relaxed">{risk}</p>
                            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Rekomendasi Mitigasi</p>
                              <div className="text-xs font-medium text-slate-600 leading-relaxed"> 
                                <TextToBullets text={selectedDoc.aiResult.riskAssessment.mitigationStrategies?.[idx]} colorClass="text-emerald-500" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDoc.aiResult?.recommendations && selectedDoc.aiResult.recommendations.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-md ring-1 ring-slate-200/60 p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:scale-150"></div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2 relative z-10">
                        <AiSparkIcon size={16} className="text-indigo-600" /> Area Fokus Strategis
                      </h3>
                      <ul className="space-y-3 relative z-10">
                        {selectedDoc.aiResult.recommendations.map((rec: any, idx: number) => (
                          <li 
                            key={idx} 
                            onMouseEnter={() => setHoveredFocus(rec.title)}
                            onMouseLeave={() => setHoveredFocus(null)}
                            className="text-sm font-bold text-slate-700 pb-3 border-b border-slate-100 last:border-0 last:pb-0 cursor-crosshair hover:text-indigo-600 transition-colors flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 group-hover:bg-indigo-500 transition-colors"></div>
                            {rec.title}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-widest">* Sorot area untuk mensinkronisasi tugas</p>
                    </div>
                  )}
                </div>

                {/* KOLOM KANAN: ACTION PLAN BUILDER DENGAN EFEK SINKRONISASI */}
                <div className="xl:col-span-8">
                    <div className={`transition-all duration-500 rounded-[2.5rem] p-1 ${
                      hoveredFocus 
                        ? 'bg-gradient-to-br from-indigo-500/20 via-transparent to-blue-500/20 shadow-2xl shadow-indigo-500/10 scale-[1.01]' 
                        : 'bg-transparent'
                    }`}>
                      <ActionPlanBuilder 
                        key={selectedDoc.id}
                        assessmentId={selectedDoc.id} 
                        initialData={selectedDoc.aiResult?.customActionPlan} 
                        aiResult={selectedDoc.aiResult}
                      />
                    </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}