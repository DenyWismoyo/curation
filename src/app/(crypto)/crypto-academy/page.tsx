'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, CheckCircle, ChevronRight, Loader2, Sparkles, GraduationCap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CryptoModule {
  id: string
  level: string
  moduleOrder: number
  title: string
  assessmentTemplateId?: string
  content?: string
}

interface UserProgress {
  [moduleId: string]: {
    completed: boolean;
    score?: number;
    completedAt: any;
  }
}

export default function CryptoAcademyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [modules, setModules] = useState<CryptoModule[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<UserProgress>({})

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const q = query(collection(db, 'cryptoEducation'), orderBy('moduleOrder', 'asc'))
        const snapshot = await getDocs(q)
        const data: CryptoModule[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as CryptoModule)
        })
        setModules(data)
      } catch (error) {
        console.error('Error fetching modules:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchModules()
  }, [])

  useEffect(() => {
    if (!user) return;
    const progressRef = collection(db, 'userProgress', user.uid, 'modules')
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const data: UserProgress = {}
      snapshot.forEach(doc => {
        data[doc.id] = doc.data() as UserProgress[string]
      })
      setProgress(data)
    })
    return () => unsubscribe()
  }, [user])

  // Group modules by level
  const groupedModules = useMemo(() => {
    const groups: Record<string, CryptoModule[]> = {}
    modules.forEach(mod => {
      if (!groups[mod.level]) {
        groups[mod.level] = []
      }
      groups[mod.level].push(mod)
    })
    
    // Sort levels appropriately if needed (assuming alphabetical or mapping)
    return groups
  }, [modules])

  // Calculate overall progress
  const totalModules = modules.length;
  const completedModules = modules.filter(m => progress[m.id]?.completed).length;
  const progressPercentage = totalModules === 0 ? 0 : Math.round((completedModules / totalModules) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-purple-400 mb-4">
            <GraduationCap className="w-4 h-4" /> Crypto Academy
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Evolusi Menjadi <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Smart Trader</span>
          </h1>
          <p className="text-slate-400 font-medium mt-4 max-w-2xl leading-relaxed">
            Pelajari fundamental kripto, analisis teknikal, hingga Smart Money Concepts. Semua materi di-generate oleh AI secara terstruktur.
          </p>
        </div>

        {totalModules > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 w-full md:w-64 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Progress Belajar</span>
              <span className="text-sm font-black text-emerald-400">{progressPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-right">
              {completedModules} dari {totalModules} modul selesai
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col justify-center items-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
          <p className="font-bold text-xs uppercase tracking-widest text-slate-500">
            Menyiapkan Kurikulum...
          </p>
        </div>
      ) : totalModules === 0 ? (
        <div className="text-center py-24 bg-slate-900/30 rounded-[2rem] border border-slate-800/50">
          <BookOpen size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-xl font-black text-white tracking-tight">
            Belum Ada Modul
          </h3>
          <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto">
            Materi edukasi sedang disiapkan oleh AI Agent. Silakan kembali lagi nanti.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedModules).map(([level, levelModules], idx) => {
            return (
              <div key={level} className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black">
                    {idx + 1}
                  </div>
                  <h2 className="text-2xl font-black text-white">{level}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelModules.map((mod, modIdx) => {
                    const isCompleted = progress[mod.id]?.completed;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: modIdx * 0.05 }}
                        key={mod.id}
                        onClick={() => router.push(`/crypto-academy/${encodeURIComponent(level)}/${mod.id}`)}
                        className={`group relative overflow-hidden rounded-2xl border p-5 cursor-pointer transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-slate-900/40 border-emerald-900/50 hover:bg-slate-900/60 hover:border-emerald-700/50' 
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                            isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            Bab {mod.moduleOrder}
                          </span>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>

                        <h3 className={`text-lg font-black leading-snug mb-2 transition-colors ${
                          isCompleted ? 'text-slate-300' : 'text-slate-100 group-hover:text-purple-400'
                        }`}>
                          {mod.title}
                        </h3>

                        {/* Content summary snippet */}
                        {mod.content && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                            {mod.content.replace(/#.*?\n/g, '').replace(/\[SRC.*?\]/g, '').substring(0, 100)}...
                          </p>
                        )}

                        <div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-purple-400 transition-colors">
                          <span className="flex items-center gap-1.5">
                            {mod.assessmentTemplateId && <Sparkles className="w-3 h-3 text-amber-500" />}
                            {mod.assessmentTemplateId ? 'Interaktif & Kuis' : 'Artikel'}
                          </span>
                          <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
