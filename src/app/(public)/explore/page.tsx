'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Calendar,
  ArrowRight,
  BookOpen,
  Clock,
  Share2,
  Check,
  Loader2,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AiSparkIcon, AILensIcon, GlobalTargetIcon, BrainIcon } from '@/types'
import { shareOrCopy } from '@/lib/share'
import { Input } from '@/components/ui/input'
import { PageShell } from '@/components/domain/public'

interface Article {
  id: string
  title: string
  excerpt: string
  category: string
  readTime: string
  featured: boolean
  iconName: string
  imageUrl?: string
  createdAt: string
}

const CATEGORIES = [
  'Semua',
  'Edukasi AI',
  'Update Sistem',
  'Studi Kasus',
  'Praktik Terbaik',
]

const getIconComponent = (iconName: string, className: string) => {
  switch (iconName) {
    case 'AILensIcon':
      return <AILensIcon size={64} className={className} />
    case 'AiSparkIcon':
      return <AiSparkIcon size={64} className={className} />
    case 'GlobalTargetIcon':
      return <GlobalTargetIcon size={64} className={className} />
    case 'BrainIcon':
      return <BrainIcon size={64} className={className} />
    case 'BookOpen':
      return <BookOpen size={64} className={className} />
    default:
      return <BookOpen size={64} className={className} />
  }
}

export default function ExplorePage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Article[] = []
      snapshot.forEach((doc) =>
        data.push({ id: doc.id, ...doc.data() } as Article)
      )
      setArticles(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleCopyLink = async (
    e: React.MouseEvent,
    id: string,
    title: string
  ) => {
    e.stopPropagation()
    const link = `${window.location.origin}/explore/${id}`
    try {
      const result = await shareOrCopy({
        title: `Explore Omnifit - ${title}`,
        text: `Baca insight terbaru dari Omnifit: ${title}`,
        url: link,
      })

      if (result === 'copied') {
        setCopiedId(id)
        toast.success('Tautan artikel berhasil disalin.')
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch {
      toast.error('Gagal membagikan tautan artikel.')
    }
  }

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      activeCategory === 'Semua' || article.category === activeCategory
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredArticle =
    filteredArticles.find((a) => a.featured) || filteredArticles[0]
  const regularArticles = filteredArticles.filter(
    (a) => a.id !== featuredArticle?.id
  )

  return (
    <PageShell size="xl" fullBleed>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-24 relative z-10">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
            <Input
              type="text"
              placeholder="Cari artikel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl font-medium"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar bg-white p-1.5 rounded-xl border border-slate-200 w-fit max-w-full">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeCategory === category
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
            <p className="font-bold text-xs uppercase tracking-widest text-slate-500">
              Memuat Wawasan...
            </p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Search size={40} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Artikel tidak ditemukan
            </h3>
            <p className="text-slate-500 font-medium mt-1">
              Coba gunakan kata kunci pencarian yang lain.
            </p>
          </div>
        ) : (
          <>
            {/* FEATURED ARTICLE (Cinematic Stacked Layout) */}
            {featuredArticle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/explore/${featuredArticle.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 group mb-12 cursor-pointer relative flex flex-col"
              >
                <button
                  onClick={(e) =>
                    handleCopyLink(e, featuredArticle.id, featuredArticle.title)
                  }
                  className={`absolute top-6 sm:top-8 right-6 sm:right-8 z-20 p-2.5 rounded-lg shadow-sm border transition-all ${copiedId === featuredArticle.id ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  title="Bagikan Tautan"
                >
                  {copiedId === featuredArticle.id ? (
                    <Check size={16} />
                  ) : (
                    <Share2 size={16} />
                  )}
                </button>

                <div className="w-full aspect-[2/1] bg-slate-50 rounded-lg relative overflow-hidden border border-slate-100 mb-6 sm:mb-8">
                  {featuredArticle.imageUrl ? (
                    <img
                      src={featuredArticle.imageUrl}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center transform group-hover:scale-[1.02] transition-transform duration-500">
                      {getIconComponent(
                        featuredArticle.iconName,
                        'text-slate-300'
                      )}
                    </div>
                  )}
                </div>

                <div className="px-2 sm:px-6 pb-4 max-w-4xl mx-auto w-full text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-200">
                      {featuredArticle.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Calendar size={14} />{' '}
                      {new Date(featuredArticle.createdAt).toLocaleDateString(
                        'id-ID',
                        { day: 'numeric', month: 'long', year: 'numeric' }
                      )}
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] mb-4 group-hover:text-indigo-600 transition-colors text-balance mx-auto">
                    {featuredArticle.title}
                  </h2>

                  <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed mb-8 max-w-3xl mx-auto line-clamp-3">
                    {featuredArticle.excerpt}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-6 border-t border-slate-100 w-full max-w-xl mx-auto">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                      <Clock size={16} /> Estimasi baca{' '}
                      {featuredArticle.readTime}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50">
                      Mulai Membaca{' '}
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* REGULAR ARTICLES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {regularArticles.map((article, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    key={article.id}
                    onClick={() => router.push(`/explore/${article.id}`)}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col relative overflow-hidden"
                  >
                    <button
                      onClick={(e) =>
                        handleCopyLink(e, article.id, article.title)
                      }
                      className={`absolute top-3 right-3 z-20 p-2 rounded-lg shadow-sm border transition-all ${copiedId === article.id ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-500 hover:bg-white hover:text-slate-900'}`}
                      title="Bagikan Tautan"
                    >
                      {copiedId === article.id ? (
                        <Check size={14} />
                      ) : (
                        <Share2 size={14} />
                      )}
                    </button>

                    <div className="w-full aspect-[2/1] bg-slate-50 relative overflow-hidden border-b border-slate-100 shrink-0">
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover transform group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center transform group-hover:scale-[1.03] transition-transform duration-300">
                          {getIconComponent(article.iconName, 'text-slate-300')}
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                          {article.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 text-balance">
                        {article.title}
                      </h3>

                      <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6 line-clamp-3">
                        {article.excerpt}
                      </p>

                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-[11px] font-medium text-slate-500">
                          {new Date(article.createdAt).toLocaleDateString(
                            'id-ID',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                        </span>
                        <div className="flex items-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <ArrowRight
                            size={16}
                            className="group-hover:translate-x-1 transition-transform"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}
