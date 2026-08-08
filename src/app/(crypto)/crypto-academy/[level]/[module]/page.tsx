'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'
import { MarkdownContent } from '@/components/domain/public/MarkdownContent'
import { CryptoModuleQuizModal } from '@/features/crypto/components/academy/CryptoModuleQuizModal'
import { CryptoTableOfContents } from '@/features/crypto/components/navigation/CryptoTableOfContents'
import { CryptoLearningRecommendations } from '@/features/crypto/components/academy/CryptoLearningRecommendations'
import { CryptoLearningPath } from '@/features/crypto/components/academy/CryptoLearningPath'
import { Progress } from '@/components/ui/progress'

interface CryptoModule {
  id: string
  level: string
  moduleOrder: number
  title: string
  content: string
  assessmentTemplateId?: string
}

export default function CryptoAcademyModulePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const [moduleData, setModuleData] = useState<CryptoModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [siblingModules, setSiblingModules] = useState<CryptoModule[]>([])
  const [nextModuleId, setNextModuleId] = useState<string | undefined>(undefined)

  const [quizOpen, setQuizOpen] = useState(false)
  const [quizResult, setQuizResult] = useState<any>(null)

  const moduleId = params.module as string
  const levelName = decodeURIComponent(params.level as string)

  useEffect(() => {
    if (!moduleId) return
    const fetchModule = async () => {
      try {
        const docRef = doc(db, 'cryptoEducation', moduleId)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setModuleData({ id: snap.id, ...snap.data() } as CryptoModule)
        }
      } catch (error) {
        console.error('Error fetching module:', error)
      } finally {
        setLoading(false)
      }
    }
    const fetchSiblingModules = async () => {
      try {
        const q = query(
          collection(db, 'cryptoEducation'),
          where('level', '==', levelName),
          orderBy('moduleOrder', 'asc')
        )
        const snapshot = await getDocs(q)
        const mods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CryptoModule))
        setSiblingModules(mods)
        
        // Find next module
        const currentIndex = mods.findIndex(m => m.id === moduleId)
        if (currentIndex !== -1 && currentIndex < mods.length - 1) {
          setNextModuleId(mods[currentIndex + 1].id)
        }
      } catch (error) {
        console.error('Error fetching sibling modules:', error)
      }
    }
    
    fetchModule()
    fetchSiblingModules()
  }, [moduleId, levelName])

  useEffect(() => {
    if (!user || !moduleId) return
    const fetchProgress = async () => {
      const snap = await getDoc(doc(db, 'userProgress', user.uid, 'modules', moduleId))
      if (snap.exists() && snap.data().completed) {
        setCompleted(true)
      }
    }
    fetchProgress()
  }, [user, moduleId])

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMarkCompleted = async () => {
    if (!user || !moduleId) return
    setMarking(true)
    try {
      await setDoc(doc(db, 'userProgress', user.uid, 'modules', moduleId), {
        completed: true,
        completedAt: serverTimestamp(),
        level: moduleData?.level
      }, { merge: true })
      setCompleted(true)
    } catch (error) {
      console.error('Error marking completed:', error)
    } finally {
      setMarking(false)
    }
  }

  const handleTakeQuiz = () => {
    if (!moduleData?.assessmentTemplateId) return
    setQuizOpen(true)
  }

  const handleQuizComplete = async (resultData: any) => {
    setQuizOpen(false)
    setMarking(true)
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/firebase');
      const saveQuiz = httpsCallable(functions, 'saveCryptoQuizResult');
      
      const passed = (resultData.score || 0) >= 70;
      
      const res = await saveQuiz({
        moduleId,
        score: resultData.score || 0,
        quizResultId: resultData.id || null,
        passed,
        timeSpentSeconds: 0
      }) as any;
      
      setCompleted(passed);
      
      setQuizResult({
        score: resultData.score || 0,
        passed,
        xpEarned: res.data?.xpEarned || 0,
        newBadges: res.data?.newBadges || [],
        recommendations: resultData.actionPlan?.map((p: any) => p.title) || [],
      });
      
    } catch (error) {
      console.error('Error saving quiz result:', error)
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
        <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
          Memuat Modul...
        </p>
      </div>
    )
  }

  if (!moduleData) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center">
        <p className="text-muted-foreground font-medium">Modul tidak ditemukan.</p>
        <button onClick={() => router.push('/crypto-academy')} className="mt-4 text-purple-400 hover:text-purple-300 font-bold">
          Kembali ke Academy
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={scrollProgress} className="h-1.5 rounded-none bg-secondary text-secondary-foreground" />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-32">
        <button 
        onClick={() => router.push('/crypto-academy')}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-slate-200 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kurikulum
      </button>

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground border border-slate-300 dark:border-slate-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-4">
          {levelName} • Modul {moduleData.moduleOrder}
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
          {moduleData.title}
        </h1>
      </div>


      <div className="flex flex-col lg:flex-row gap-12">
        {/* Konten Utama */}
        <div id="module-content" className="flex-1 prose prose-invert prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-purple-400 prose-strong:text-slate-100">
          <MarkdownContent content={moduleData.content} />
        </div>
        
        {/* Sidebar Table of Contents & Learning Path */}
        <div className="hidden lg:block w-64 shrink-0 space-y-6">
          <CryptoTableOfContents />
          <CryptoLearningPath currentModuleId={moduleId} level={levelName} />
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 card-solid/50 dark:bg-slate-900/50 p-6 rounded-[2rem] text-center">
        {!quizResult ? (
          <>
            <h3 className="text-xl font-bold text-foreground mb-2">Selesai Belajar?</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Tandai modul ini sebagai selesai untuk melanjutkan perjalanan belajarmu, atau kerjakan kuis evaluasi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {moduleData.assessmentTemplateId ? (
                <button
                  onClick={handleTakeQuiz}
                  disabled={marking}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-foreground font-bold px-8 py-3 rounded-full hover:from-purple-400 hover:to-indigo-400 transition-all shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                >
                  {marking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {completed ? 'Ulangi Kuis' : 'Mulai Kuis Evaluasi'}
                </button>
              ) : (
                <button
                  onClick={handleMarkCompleted}
                  disabled={marking || completed}
                  className="flex items-center gap-2 bg-secondary text-secondary-foreground text-foreground font-bold px-8 py-3 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {marking ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {completed ? 'Telah Diselesaikan' : 'Tandai Selesai'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-left max-w-2xl mx-auto">
            <CryptoLearningRecommendations
              score={quizResult.score}
              passed={quizResult.passed}
              xpEarned={quizResult.xpEarned}
              newBadges={quizResult.newBadges}
              recommendations={quizResult.recommendations}
              nextModuleId={nextModuleId}
              onClose={() => setQuizResult(null)}
            />
          </div>
        )}
      </div>

      {quizOpen && moduleData.assessmentTemplateId && (
        <CryptoModuleQuizModal
          templateId={moduleData.assessmentTemplateId}
          moduleId={moduleData.id}
          moduleTitle={moduleData.title}
          moduleLevel={moduleData.level}
          onComplete={handleQuizComplete}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </div>
    </>
  )
}
