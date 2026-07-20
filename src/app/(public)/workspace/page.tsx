// src/app/workspace/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Target, ShieldAlert, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionPlanBuilder } from '@/app/components/curation/ActionPlanBuilder';
import { TextToBullets } from '@/app/components/shared/UniversalAssessmentView';
import { SocialShareCard } from '@/app/components/shared/SocialShareCard';
import { AiSparkIcon } from '@/types';

export default function ExecutionWorkspacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState(true);

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
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="font-bold text-xs uppercase tracking-widest">Inisialisasi Sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* DYNAMIC DARK HEADER OMNIFIT IDENTITY */}
      <header className="bg-slate-900 border-b border-slate-800 h-20 sm:h-24 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-40 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <Button variant="ghost" onClick={() => router.push('/')} className="h-10 w-10 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft size={20} />
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              Omnifit <span className="font-medium text-slate-300">Workspace</span>
            </h1>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Mode Implementasi Berkelanjutan</p>
          </div>
        </div>
        
        {assessments.length > 0 && (
          <div className="relative max-w-[200px] sm:max-w-sm w-full z-10">
            <select
              value={selectedDoc?.id || ''}
              onChange={(e) => {
                const found = assessments.find(a => a.id === e.target.value);
                if (found) setSelectedDoc(found);
              }}
              className="w-full bg-slate-800/80 border border-slate-700 text-sm font-bold text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate shadow-inner"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.namaUsaha || 'Project Tanpa Nama'} - {a.trackType}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                ▼
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-x-hidden p-4 sm:p-8 lg:p-12 w-full max-w-[1400px] mx-auto">
        {assessments.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] ring-1 ring-slate-200 text-center max-w-2xl mx-auto mt-10 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderKanban className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Workspace Tidak Ditemukan</h3>
            <p className="text-slate-500 font-medium mb-8">
              Pusat kendali eksekusi memerlukan setidaknya satu data asesmen aktif. Selesaikan modul pertama Anda untuk membuka akses.
            </p>
            <Button onClick={() => router.push('/katalog')} className="bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 px-8 font-bold transition-colors">
              Pilih Modul Asesmen
            </Button>
          </div>
        ) : selectedDoc ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-32">
              <SocialShareCard 
                namaUsaha={selectedDoc.namaUsaha}
                score={selectedDoc.score}
                readinessLevel={selectedDoc.readinessLevel}
                trackType={selectedDoc.trackType}
              />

              {selectedDoc.aiResult?.riskAssessment?.criticalRisks && selectedDoc.aiResult.riskAssessment.criticalRisks.length > 0 && (
                <div className="bg-white ring-1 ring-rose-200 p-6 rounded-[2rem] shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2">
                    <ShieldAlert size={16} /> Risiko Utama & Mitigasi
                  </h3>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {selectedDoc.aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
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
                <div className="bg-white ring-1 ring-slate-200 p-6 rounded-[2rem] shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                    <AiSparkIcon size={16} className="text-indigo-600" /> Area Fokus Strategis
                  </h3>
                  <ul className="space-y-3">
                    {selectedDoc.aiResult.recommendations.map((rec: any, idx: number) => (
                      <li key={idx} className="text-sm font-bold text-slate-700 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        {rec.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="xl:col-span-8">
                {/* Area Action Plan akan mengisi sisi kanan sepenuhnya tanpa border berlapis */}
                 <ActionPlanBuilder 
                    key={selectedDoc.id}
                    assessmentId={selectedDoc.id} 
                    initialData={selectedDoc.aiResult?.customActionPlan} 
                    aiResult={selectedDoc.aiResult} 
                 />
            </div>

          </div>
        ) : null}
      </main>
    </div>
  );
}