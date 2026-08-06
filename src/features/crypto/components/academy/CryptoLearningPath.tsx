'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Lock, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ModuleRef {
  id: string;
  title: string;
  moduleOrder: number;
  level: string;
}

interface CryptoLearningPathProps {
  currentModuleId: string;
  level: string;
}

export function CryptoLearningPath({ currentModuleId, level }: CryptoLearningPathProps) {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleRef[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!level) return;
    
    const fetchModules = async () => {
      try {
        const q = query(
          collection(db, 'cryptoEducation'),
          where('level', '==', level),
          orderBy('moduleOrder', 'asc')
        );
        const snapshot = await getDocs(q);
        const mods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleRef));
        setModules(mods);
      } catch (error) {
        console.error("Error fetching learning path modules:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchModules();
  }, [level]);

  useEffect(() => {
    if (!user) return;
    const progressRef = collection(db, 'userProgress', user.uid, 'modules');
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const map: Record<string, boolean> = {};
      snapshot.forEach(doc => {
        if (doc.data().completed) {
          map[doc.id] = true;
        }
      });
      setCompletedMap(map);
    });
    
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">
        Jalur Belajar
      </h3>
      <div className="space-y-0 relative">
        {/* Vertical line connecting nodes */}
        <div className="absolute left-3 top-4 bottom-4 w-px bg-slate-100 dark:bg-slate-800 z-0"></div>
        
        {modules.map((mod, idx) => {
          const isCurrent = mod.id === currentModuleId;
          const isCompleted = completedMap[mod.id] || false;
          // Asumsi sederhana: modul terbuka jika modul sebelumnya sudah selesai, atau ini modul pertama
          const previousCompleted = idx === 0 || completedMap[modules[idx - 1].id];
          const isLocked = !isCompleted && !isCurrent && !previousCompleted;
          
          return (
            <div key={mod.id} className="relative z-10 flex items-start gap-3 py-3 group">
              <div className="shrink-0 mt-0.5 relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ring-4 ring-slate-950 transition-colors ${
                  isCurrent ? 'bg-purple-600 border-purple-400' : 
                  isCompleted ? 'bg-emerald-600 border-emerald-400' :
                  'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3 text-slate-500" />
                  ) : isCurrent ? (
                    <BookOpen className="w-3 h-3 text-white" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                {isLocked ? (
                  <div className="block cursor-not-allowed opacity-50">
                    <p className="text-sm font-medium text-slate-300 truncate transition-colors group-hover:whitespace-normal">
                      {mod.title}
                    </p>
                  </div>
                ) : (
                  <Link href={`/crypto-academy/${encodeURIComponent(level)}/${mod.id}`} className="block">
                    <p className={`text-sm font-medium truncate transition-colors group-hover:whitespace-normal ${
                      isCurrent ? 'text-white font-bold' : 'text-slate-300 hover:text-purple-400'
                    }`}>
                      {mod.title}
                    </p>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
