'use client'

import React, { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import {
  CheckCircle2,
  Loader2,
  CircleDashed,
  Rocket,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageShell, ContentCard } from '@/components/domain/public'

interface RoadmapItem {
  id: string
  quarter: string
  title: string
  description: string
  status: 'planned' | 'in-progress' | 'completed'
  order: number
}

export default function PublicRoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'roadmaps'), orderBy('order', 'asc'))
    
    const fetchRoadmaps = async () => {
      try {
        const snapshot = await getDocs(q)
        const data: RoadmapItem[] = []
        snapshot.forEach((doc) =>
          data.push({ id: doc.id, ...doc.data() } as RoadmapItem)
        )
        setRoadmaps(data)
      } catch (error) {
        console.error('Error fetching roadmaps:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoadmaps()
  }, [])

  return (
    <PageShell size="md" fullBleed>
      <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-8 pb-24 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Roadmap Omnifit AI
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground font-medium max-w-2xl mx-auto">
            Kami terus berevolusi. Ikuti perjalanan kami dalam membangun
            infrastruktur analitik dan asesmen kecerdasan buatan yang adaptif
            dan paling presisi.
          </p>
        </div>
        <ContentCard padding="lg" className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
              <p className="font-bold text-xs uppercase tracking-widest">
                Membaca Rencana AI...
              </p>
            </div>
          ) : roadmaps.length === 0 ? (
            <div className="text-center py-20">
              <Rocket
                size={56}
                className="mx-auto text-slate-200 mb-6 grayscale opacity-50"
              />
              <h3 className="text-xl font-black text-foreground mb-2">
                Rencana Sedang Disusun
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                Tim kami sedang meracik pembaruan selanjutnya.
              </p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8 relative">
              {/* Garis Vertikal Timeline */}
              <div className="absolute left-6 sm:left-7 top-4 bottom-8 w-px bg-secondary text-secondary-foreground hidden sm:block"></div>

              <AnimatePresence>
                {roadmaps.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group"
                  >
                    {/* Ikon Status */}
                    <div className="flex items-center gap-4 sm:gap-0 z-10 shrink-0">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-[6px] border-white shadow-sm ring-1 ring-border transition-transform group-hover:scale-110 ${
                          item.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-500'
                            : item.status === 'in-progress'
                              ? 'bg-indigo-100 text-indigo-600 dark:text-indigo-400'
                              : 'bg-muted text-muted-foreground text-slate-400'
                        }`}
                      >
                        {item.status === 'completed' ? (
                          <CheckCircle2 size={20} />
                        ) : item.status === 'in-progress' ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <CircleDashed size={20} />
                        )}
                      </div>

                      {/* Quarter Badge for Mobile (Muncul di sebelah ikon pada HP) */}
                      <div className="sm:hidden">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md inline-block ${
                            item.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100'
                              : item.status === 'in-progress'
                                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100'
                                : 'bg-muted text-muted-foreground text-muted-foreground ring-1 ring-border'
                          }`}
                        >
                          {item.quarter}
                        </span>
                      </div>
                    </div>

                    {/* Konten Timeline */}
                    <div
                      className={`flex-1 pt-1 pb-6 sm:pb-8 ${idx !== roadmaps.length - 1 ? 'border-b border-border/70' : ''}`}
                    >
                      {/* Quarter Badge for Desktop (Muncul di atas judul pada PC) */}
                      <span
                        className={`hidden sm:inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-3 ring-1 ${
                          item.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-100'
                            : item.status === 'in-progress'
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-100'
                              : 'bg-muted text-muted-foreground text-muted-foreground ring-slate-200'
                        }`}
                      >
                        {item.quarter}
                      </span>

                      <h3 className="text-xl sm:text-2xl font-black text-foreground mb-2 sm:mb-3 leading-tight group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ContentCard>
      </div>
    </PageShell>
  )
}
