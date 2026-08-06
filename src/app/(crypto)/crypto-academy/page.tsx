'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, CheckCircle, ChevronRight, Sparkles, GraduationCap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppPageContainer } from '@/components/ui/app-layout'
import { CryptoCard, CryptoBadge, CryptoPageHeader, CryptoLoadingState, CryptoEmptyState } from '@/features/crypto/components/ui/CryptoUIKit'

interface CryptoModule {
  id: string
  level: string
  moduleOrder: number
  title: string
  assessmentTemplateId?: string
  content?: string
  description?: string
  estimatedMinutes?: number
  difficulty?: string
  keyLearnings?: string[]
  prerequisites?: string[]
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
    <AppPageContainer maxWidth="full" padding="md" className="relative z-10 pt-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <CryptoPageHeader 
          title="Evolusi Menjadi Smart Trader"
          subtitle="Pelajari fundamental kripto, analisis teknikal, hingga Smart Money Concepts. Semua materi di-generate oleh AI secara terstruktur."
          icon={<GraduationCap />}
          badge="Academy"
          badgeVariant="premium"
        />

        {totalModules > 0 && (
          <CryptoCard variant="elevated" className="w-full md:w-64 shrink-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Progress Belajar</span>
              <span className="text-sm font-black text-emerald-400">{progressPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
          </CryptoCard>
        )}
      </div>

      {loading ? (
        <CryptoLoadingState type="spinner" message="Menyiapkan Kurikulum..." />
      ) : totalModules === 0 ? (
        <CryptoEmptyState 
           icon={<BookOpen className="w-8 h-8" />}
           title="Belum Ada Modul"
           description="Materi edukasi sedang disiapkan oleh AI Agent. Silakan kembali lagi nanti."
        />
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedModules).map(([level, levelModules], idx) => {
            return (
              <div key={level} className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black">
                    {idx + 1}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{level}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-100 dark:from-slate-800 to-transparent" />
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
                      >
                        <CryptoCard 
                          variant={isCompleted ? "subtle" : "default"}
                          className={`p-5 cursor-pointer group ${isCompleted ? 'border-emerald-300 dark:border-emerald-900/50' : 'hover:border-slate-300 dark:border-slate-700 hover:-translate-y-1'}`}
                        >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            <CryptoBadge variant={isCompleted ? "bullish" : "neutral"}>
                              Bab {mod.moduleOrder}
                            </CryptoBadge>
                            {mod.difficulty && (
                              <CryptoBadge variant={
                                mod.difficulty === 'beginner' ? 'bullish' : 
                                mod.difficulty === 'intermediate' ? 'premium' : 'danger'
                              }>
                                {mod.difficulty}
                              </CryptoBadge>
                            )}
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>

                        <h3 className={`text-lg font-black leading-snug mb-2 transition-colors ${
                          isCompleted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-100 group-hover:text-indigo-400'
                        }`}>
                          {mod.title}
                        </h3>

                        {/* Content summary snippet */}
                        <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed h-8">
                          {mod.description || (mod.content ? mod.content.replace(/#.*?\n/g, '').replace(/\[SRC.*?\]/g, '').substring(0, 100) + '...' : '')}
                        </p>

                        {mod.keyLearnings && mod.keyLearnings.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {mod.keyLearnings.slice(0, 2).map((learning, idx) => (
                              <li key={idx} className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                                <span className="text-indigo-500 mt-0.5">•</span>
                                <span className="line-clamp-1">{learning}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-indigo-400 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              {mod.assessmentTemplateId && <Sparkles className="w-3 h-3 text-amber-500" />}
                              {mod.assessmentTemplateId ? 'Kuis' : 'Artikel'}
                            </span>
                            {mod.estimatedMinutes && (
                              <span className="text-slate-600 font-medium">
                                • {mod.estimatedMinutes} mnt
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                        </CryptoCard>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppPageContainer>
  )
}
