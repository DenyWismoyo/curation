'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, ArrowRight, BookOpen, Clock, Share2, Check, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AiSparkIcon, AILensIcon, GlobalTargetIcon, BrainIcon } from '@/types';
import { shareOrCopy } from '@/lib/share';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  featured: boolean;
  iconName: string;
  imageUrl?: string;
  createdAt: string;
}

const CATEGORIES = ['Semua', 'Edukasi AI', 'Update Sistem', 'Studi Kasus', 'Praktik Terbaik'];

const getIconComponent = (iconName: string, className: string) => {
  switch (iconName) {
    case 'AILensIcon': return <AILensIcon size={64} className={className} />;
    case 'AiSparkIcon': return <AiSparkIcon size={64} className={className} />;
    case 'GlobalTargetIcon': return <GlobalTargetIcon size={64} className={className} />;
    case 'BrainIcon': return <BrainIcon size={64} className={className} />;
    case 'BookOpen': return <BookOpen size={64} className={className} />;
    default: return <BookOpen size={64} className={className} />;
  }
}

export default function ExplorePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'articles'), where('isPublished', '==', true), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Article[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Article));
      setArticles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCopyLink = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation(); 
    const link = `${window.location.origin}/explore/${id}`;
    try {
      const result = await shareOrCopy({
        title: `Explore Omnifit - ${title}`,
        text: `Baca insight terbaru dari Omnifit: ${title}`,
        url: link,
      });

      if (result === 'copied') {
        setCopiedId(id);
        toast.success('Tautan artikel berhasil disalin.');
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch {
      toast.error('Gagal membagikan tautan artikel.');
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesCategory = activeCategory === 'Semua' || article.category === activeCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = filteredArticles.find(a => a.featured) || filteredArticles[0];
  const regularArticles = filteredArticles.filter(a => a.id !== featuredArticle?.id);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24 selection:bg-indigo-100">
      
      {/* HERO SECTION */}
      <div className="bg-slate-900 pt-16 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-6">
            <BookOpen size={14} /> Pusat Wawasan
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl mb-6">
            Eksplorasi Wawasan, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
              Inovasi & Berita Terkini.
            </span>
          </h1>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari artikel, panduan, atau update sistem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/20 transition-all backdrop-blur-md font-medium"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        
        {/* TABS CATEGORY */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-10 w-fit max-w-full">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
            <p className="font-bold text-xs uppercase tracking-widest">Memuat Wawasan...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
            <Search size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-black text-slate-800">Artikel tidak ditemukan</h3>
            <p className="text-slate-500 font-medium mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <>
            {/* FEATURED ARTICLE (Cinematic Stacked Layout) */}
            {featuredArticle && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/explore/${featuredArticle.id}`)}
                className="bg-white rounded-[2rem] border border-slate-200 p-3 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-500 group mb-12 cursor-pointer relative flex flex-col"
              >
                <button 
                  onClick={(e) => handleCopyLink(e, featuredArticle.id, featuredArticle.title)}
                  className={`absolute top-6 sm:top-8 right-6 sm:right-8 z-20 p-3 rounded-xl shadow-sm transition-all ${copiedId === featuredArticle.id ? 'bg-emerald-500 text-white' : 'bg-white/80 backdrop-blur text-slate-600 hover:bg-indigo-600 hover:text-white'}`}
                  title="Bagikan Tautan"
                >
                  {copiedId === featuredArticle.id ? <Check size={18} /> : <Share2 size={18} />}
                </button>

                <div className="w-full aspect-[2/1] bg-slate-50 rounded-[1.5rem] relative overflow-hidden ring-1 ring-slate-100 mb-6 sm:mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:scale-105 transition-transform duration-700 z-10"></div>
                  {featuredArticle.imageUrl ? (
                    <img src={featuredArticle.imageUrl} alt={featuredArticle.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                      {getIconComponent(featuredArticle.iconName, "text-indigo-400/50")}
                    </div>
                  )}
                </div>

                <div className="px-2 sm:px-6 pb-4 max-w-4xl mx-auto w-full text-center">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {featuredArticle.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Calendar size={14} /> {new Date(featuredArticle.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.15] mb-5 group-hover:text-indigo-600 transition-colors text-balance mx-auto">
                    {featuredArticle.title}
                  </h2>
                  
                  <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed mb-8 max-w-3xl mx-auto line-clamp-3">
                    {featuredArticle.excerpt}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-6 border-t border-slate-100 w-full max-w-xl mx-auto">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Clock size={16} /> Estimasi baca {featuredArticle.readTime}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-bold text-indigo-600 group-hover:translate-x-2 transition-transform bg-indigo-50 px-5 py-2.5 rounded-xl">
                      Mulai Membaca <ArrowRight size={16} />
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    key={article.id}
                    onClick={() => router.push(`/explore/${article.id}`)}
                    className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col relative overflow-hidden"
                  >
                    <button 
                      onClick={(e) => handleCopyLink(e, article.id, article.title)}
                      className={`absolute top-4 right-4 z-20 p-2.5 rounded-xl shadow-sm transition-all ${copiedId === article.id ? 'bg-emerald-500 text-white' : 'bg-white/80 backdrop-blur text-slate-500 hover:bg-indigo-600 hover:text-white'}`}
                      title="Bagikan Tautan"
                    >
                      {copiedId === article.id ? <Check size={14} /> : <Share2 size={14} />}
                    </button>

                    <div className="w-full aspect-[2/1] bg-slate-50 relative overflow-hidden border-b border-slate-100 shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent group-hover:scale-110 transition-transform duration-700 z-10"></div>
                      {article.imageUrl ? (
                        <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                          {getIconComponent(article.iconName, "text-slate-300 group-hover:text-indigo-400 transition-colors")}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-md">
                          {article.category}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 text-balance">
                        {article.title}
                      </h3>
                      
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
                        {article.excerpt}
                      </p>
                      
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-[11px] font-bold text-slate-400">
                          {new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                          <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
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
    </div>
  );
}