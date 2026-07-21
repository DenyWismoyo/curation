// src/app/workspace/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ActionPlanBuilder } from '@/app/components/curation/ActionPlanBuilder';
import { motion, AnimatePresence } from 'framer-motion';

// IMPORT CUSTOM ICONS BRAND OMNIFIT
import { 
  BrainIcon,
  InfinityWorkflowIcon
} from '@/types';

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
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <InfinityWorkflowIcon size={56} className="text-indigo-500 animate-pulse" />
          <p className="font-bold text-xs uppercase tracking-widest text-indigo-400">Menghubungkan Sistem Operasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER MINIMALIS ELEGANT */}
      <header className="bg-white border-b border-slate-100 pt-6 pb-6 px-6 lg:px-12 sticky top-0 z-40">
        <div className="w-full max-w-[1000px] mx-auto">
          
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg ring-1 ring-slate-200 hover:ring-indigo-200 group"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> 
              Kembali ke Dasbor Utama
            </button>
            
            <div className="flex items-center gap-2">
              <InfinityWorkflowIcon size={20} className="text-indigo-600" />
              <span className="text-sm font-black text-slate-900 tracking-tight">Omnifit <span className="text-indigo-600">OS</span></span>
            </div>
          </div>

          {/* TAB SELECTOR MINIMALIS */}
          {assessments.length > 0 && (
            <div className="relative w-full overflow-x-auto custom-scrollbar pb-2 -mx-6 px-6 lg:mx-0 lg:px-0">
              <div className="flex gap-3 min-w-max">
                {assessments.map((a) => {
                  const isActive = selectedDoc?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedDoc(a)}
                      className={`relative px-5 py-3 rounded-xl flex flex-col items-start text-left transition-all duration-300 min-w-[200px] max-w-[280px] ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-lg' 
                          : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 ring-1 ring-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest truncate ${isActive ? 'text-indigo-300' : 'text-slate-400'}`}>
                          {a.trackType}
                        </span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>}
                      </div>
                      <span className="text-sm font-bold truncate w-full leading-tight">{a.namaUsaha || 'Project Rahasia'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden p-6 lg:p-12 w-full max-w-[1000px] mx-auto">
        
        {assessments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-12 lg:p-16 rounded-[2rem] ring-1 ring-slate-200 text-center max-w-2xl mx-auto mt-10 shadow-sm"
          >
            <BrainIcon size={56} className="text-slate-200 mx-auto mb-6 grayscale opacity-60" />
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">OS Belum Menerima Data</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed max-w-md mx-auto">
              Anda membutuhkan setidaknya satu riwayat asesmen AI untuk mengaktifkan fungsi Action Plan dan Sinkronisasi Strategi.
            </p>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="bg-slate-900 hover:bg-indigo-600 text-white rounded-xl h-12 px-8 text-sm font-bold transition-all shadow-md"
            >
              Cek Brankas Modul
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedDoc && (
              <motion.div 
                key={selectedDoc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="bg-transparent">
                  <ActionPlanBuilder 
                    assessmentId={selectedDoc.id} 
                    initialData={selectedDoc.aiResult?.customActionPlan} 
                    aiResult={selectedDoc.aiResult}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}