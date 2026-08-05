'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'
import { MarkdownContent } from '@/components/domain/public/MarkdownContent'

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
    fetchModule()
  }, [moduleId])

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
    // Route to the existing assessment engine
    router.push(`/assessment/${moduleData.assessmentTemplateId}?source=academy&moduleId=${moduleId}`)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
        <p className="font-bold text-xs uppercase tracking-widest text-slate-500">
          Memuat Modul...
        </p>
      </div>
    )
  }

  if (!moduleData) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center">
        <p className="text-slate-400 font-medium">Modul tidak ditemukan.</p>
        <button onClick={() => router.push('/crypto-academy')} className="mt-4 text-purple-400 hover:text-purple-300 font-bold">
          Kembali ke Academy
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32">
      <button 
        onClick={() => router.push('/crypto-academy')}
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kurikulum
      </button>

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300 mb-4">
          {levelName} • Modul {moduleData.moduleOrder}
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
          {moduleData.title}
        </h1>
      </div>

      <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-purple-400 prose-strong:text-slate-100">
        <MarkdownContent content={moduleData.content} />
      </div>

      <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/50 p-6 rounded-[2rem]">
        <div>
          <h3 className="text-xl font-black text-white mb-2">Selesai membaca?</h3>
          <p className="text-slate-400 text-sm">
            {moduleData.assessmentTemplateId 
              ? 'Lanjutkan ke kuis interaktif untuk menguji pemahaman Anda dan menandai modul ini sebagai selesai.' 
              : 'Tandai modul ini sebagai selesai untuk melanjutkan ke materi berikutnya.'}
          </p>
        </div>

        <div className="shrink-0 w-full md:w-auto flex flex-col gap-3">
          {moduleData.assessmentTemplateId ? (
            <button 
              onClick={handleTakeQuiz}
              className="w-full md:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
            >
              <Sparkles className="w-4 h-4" /> Mulai Kuis Interaktif
            </button>
          ) : (
            <button 
              onClick={handleMarkCompleted}
              disabled={completed || marking}
              className={`w-full md:w-auto h-12 px-8 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                completed 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {completed ? 'Modul Diselesaikan' : 'Tandai Selesai'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
