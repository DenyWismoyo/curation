// src/app/(public)/explore/[id]/page.tsx
'use client'; 
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { ArrowLeft, Calendar, Clock, Loader2, Share2, Check, BookOpen, Rocket } from 'lucide-react';
import { AiSparkIcon, AILensIcon, GlobalTargetIcon, BrainIcon } from '@/components/icon';
import { toast } from 'sonner';
import { shareOrCopy } from '@/services/share';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { FloatingCard } from '@/components/landing/FloatingCard';
import { useBundleLoader } from '@/hooks/useBundleLoader';
import { motion } from 'framer-motion';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  readTime: string;
  iconName: string;
  imageUrl?: string;
  createdAt: string;
  linkedTemplateId?: string;
  linkedTemplateName?: string;
}

const getIconComponent = (iconName: string, className: string) => {
  switch (iconName) {
    case 'AILensIcon': return <AILensIcon size={80} className={className} />;
    case 'AiSparkIcon': return <AiSparkIcon size={80} className={className} />;
    case 'GlobalTargetIcon': return <GlobalTargetIcon size={80} className={className} />;
    case 'BrainIcon': return <BrainIcon size={80} className={className} />;
    case 'BookOpen': return <BookOpen size={80} className={className} />;
    default: return <BookOpen size={80} className={className} />;
  }
}

// -------------------------------------------------------------
// FUNGSI PARSER MARKDOWN RESPONSIVE
// -------------------------------------------------------------
const parseInlineText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-foreground">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic font-medium text-foreground">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-6 text-[16px] sm:text-[18px] text-slate-700 leading-[1.85] font-medium">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('### ')) {
          return <h3 key={bIdx} className="text-xl sm:text-2xl font-black text-foreground mt-10 mb-4 leading-snug">{parseInlineText(trimmed.slice(4))}</h3>;
        } else if (trimmed.startsWith('## ')) {
          return <h2 key={bIdx} className="text-2xl sm:text-3xl font-black text-foreground mt-12 mb-6 border-b border-border pb-3 leading-snug">{parseInlineText(trimmed.slice(3))}</h2>;
        } else if (trimmed.startsWith('# ')) {
          return <h1 key={bIdx} className="text-3xl sm:text-4xl font-black text-foreground mt-12 mb-6 leading-tight">{parseInlineText(trimmed.slice(2))}</h1>;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(i => i.trim().length > 0);
          return (
            <ul key={bIdx} className="space-y-3 sm:space-y-4 my-8 card-base p-6 sm:p-10 rounded-[2rem] border border-border shadow-inner">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-3 sm:gap-4">
                  <span className="text-indigo-500 mt-[7px] sm:mt-[9px] shrink-0 text-[10px] sm:text-[12px]">●</span>
                  <span className="leading-relaxed flex-1 text-muted-foreground">{parseInlineText(item.replace(/^[-*]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={bIdx} className="text-left">{parseInlineText(trimmed)}</p>;
      })}
    </div>
  );
};
// -------------------------------------------------------------

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [otherArticles, setOtherArticles] = useState<Article[]>([]);
  const [otherLoading, setOtherLoading] = useState(true);

  const { data: bundleArticles, loading: bundleLoading, source } = useBundleLoader<Article>(
    'bundles/explore-articles.txt',
    ['explore-articles-latest']
  );

  useEffect(() => {
    if (bundleLoading) return;
    
    if (source === 'bundle' && bundleArticles.length > 0) {
      const filtered = bundleArticles.filter(a => a.id !== params.id).slice(0, 10);
      setOtherArticles(filtered);
      setOtherLoading(false);
      return;
    }

    // Fallback if bundle is empty or failed
    const fetchOtherArticlesFallback = async () => {
      try {
        const q = query(
          collection(db, 'articles'),
          where('isPublished', '==', true),
          orderBy('createdAt', 'desc'),
          limit(15)
        );
        const snapshot = await getDocs(q);
        const data: Article[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id !== params.id) {
            data.push({ id: docSnap.id, ...docSnap.data() } as Article);
          }
        });
        setOtherArticles(data.slice(0, 10));
      } catch (error) {
        console.error('Error fetching other articles:', error);
      } finally {
        setOtherLoading(false);
      }
    };
    fetchOtherArticlesFallback();
  }, [bundleArticles, bundleLoading, source, params.id]);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, 'articles', params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle(docSnap.data() as Article);
        } else {
          toast.error('Artikel tidak ditemukan.');
          router.push('/explore');
        }
      } catch (error) {
        console.error(error);
        toast.error('Gagal memuat artikel.');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [params.id, router]);

  const handleShare = async () => {
    if (!article) return;
    try {
      const result = await shareOrCopy({
        title: `Explore Omnifit - ${article.title}`,
        text: article.excerpt || 'Insight terbaru dari Omnifit Explore.',
        url: window.location.href,
      });
      if (result === 'copied') {
        setCopied(true);
        toast.success('Tautan berhasil disalin.');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error('Gagal membagikan tautan.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold text-xs uppercase tracking-widest">Membuka Halaman...</p>
      </div>
    );
  }

  if (!article) return null;

  // KOMPONEN CTA BANNER DINAMIS RESPONSIVE
  const CTABanner = () => {
    if (!article.linkedTemplateId) return null;
    return (
      <SpotlightCard className="p-6 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 my-10 sm:my-12 shadow-sm bg-gradient-to-br from-indigo-50/50 to-background dark:from-indigo-900/10 border-border">
        <div className="flex-1 text-center md:text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Implementasi Praktis</p>
          <h4 className="text-xl md:text-2xl font-black text-foreground mb-2 leading-tight text-balance">Uji {article.linkedTemplateName || 'Kesiapan Anda'} Sekarang</h4>
          <p className="text-muted-foreground text-sm font-medium">Beralih dari wawasan menjadi tindakan dengan instrumen analitik kami.</p>
        </div>
        <button 
          onClick={() => router.push(`/katalog?buy=${article.linkedTemplateId}`)} 
          className="btn-primary-rich py-3.5 sm:py-4 px-8 rounded-xl whitespace-nowrap flex items-center justify-center gap-2 hover:-translate-y-0.5 w-full md:w-auto text-sm sm:text-base animate-soft-pulse"
        >
          <Rocket size={18} /> Mulai Asesmen
        </button>
      </SpotlightCard>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-indigo-100">
      
      {/* Wrapper Luar: Layar penuh (max-w-[90rem]) */}
      <div className="max-w-[90rem] w-full mx-auto px-0 sm:px-6 md:px-8 pt-0 sm:pt-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">
          
          {/* KOLOM KIRI (Artikel Utama) - 3/5 */}
          <div className="lg:col-span-3 order-1">
            
            {/* Tombol Back */}
            <div className="px-5 sm:px-0 py-5 sm:pb-5">
              <button 
                onClick={() => router.push('/explore')}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-indigo-600 dark:text-indigo-400 transition-colors w-fit group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
              </button>
            </div>

            {/* Kartu Artikel: Edge-to-edge di mobile, rounded & shadow di desktop */}
            <SpotlightCard className="rounded-none sm:rounded-[2.5rem] md:rounded-[3rem] border-0 sm:border border-border bg-background shadow-lg overflow-hidden p-0 sm:p-1 lg:p-2 mb-10">
              <article className="rounded-none sm:rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-10 lg:p-12">
                
                <div className="flex items-center justify-between mb-8 sm:mb-10">
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg">
                    {article.category}
                  </span>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-muted-foreground hover:text-indigo-600 dark:text-indigo-400 bg-muted text-muted-foreground hover:bg-indigo-50 dark:bg-indigo-500/10 px-3 sm:px-4 py-2 rounded-xl transition-all ring-1 ring-border hover:ring-indigo-200 dark:ring-indigo-500/20"
                  >
                    {copied ? <Check size={14} className="text-emerald-500"/> : <Share2 size={14}/>}
                    {copied ? 'Tersalin' : 'Bagikan'}
                  </button>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-[1.15] mb-6 sm:mb-8 text-balance">
                  {article.title}
                </h1>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-8 sm:mb-12 pb-6 sm:pb-8 border-b border-border">
                  <span className="flex items-center gap-1.5"><Calendar size={14} className="mb-0.5" /> {new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} className="mb-0.5" /> Baca {article.readTime}</span>
                </div>

                {/* Gambar Artikel: Strict 2:1 */}
                <FloatingCard>
                  <div className="w-full aspect-[2/1] bg-muted text-muted-foreground rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-10 sm:mb-14 ring-1 ring-border overflow-hidden relative shadow-inner">
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-slate-50/50 dark:from-indigo-900/10 dark:to-transparent z-10 pointer-events-none mix-blend-overlay"></div>
                     {article.imageUrl ? (
                       <img src={article.imageUrl} alt={article.title} className="relative z-0 w-full h-full object-cover" />
                     ) : (
                       <div className="relative z-10">
                         {getIconComponent(article.iconName, "text-slate-300 opacity-80")}
                       </div>
                     )}
                  </div>
                </FloatingCard>

                {/* Wrapper Konten Internal (membatasi lebar maksimal bacaan agar mata tidak lelah) */}
                <div className="max-w-3xl mx-auto">
                  <CTABanner />
                  <div className="my-10 sm:my-14">
                    <MarkdownRenderer content={article.content} />
                  </div>
                  <CTABanner />
                </div>

              </article>
            </SpotlightCard>
          </div>
          
          {/* KOLOM KANAN (Artikel Lainnya) - 2/5 */}
          <div className="lg:col-span-2 order-2">
            <div className="sticky top-8 flex flex-col gap-6">
              <div className="px-5 sm:px-0 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-foreground tracking-tight">Artikel Lainnya</h3>
                 <button onClick={() => router.push('/explore')} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Lihat Semua</button>
              </div>
              
              <div className="flex flex-col gap-4 px-5 sm:px-0 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 pb-10 lg:pb-0">
                {otherArticles.map((otherArticle, idx) => (
                  <motion.div
                    key={otherArticle.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => router.push(`/explore/${otherArticle.id}`)}
                    className="cursor-pointer group"
                  >
                    <SpotlightCard className="p-4 rounded-2xl flex gap-4 bg-background hover:bg-muted/30 transition-colors border-border shadow-sm hover:shadow-md">
                       {/* Image */}
                       <div className="w-28 h-24 shrink-0 rounded-xl bg-muted overflow-hidden relative shadow-inner">
                         <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-slate-50/50 dark:from-indigo-900/10 dark:to-transparent z-10 pointer-events-none mix-blend-overlay"></div>
                         {otherArticle.imageUrl ? (
                           <img src={otherArticle.imageUrl} alt={otherArticle.title} className="relative z-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center relative z-10">
                             <BookOpen className="text-slate-400 opacity-80" />
                           </div>
                         )}
                       </div>
                       {/* Content */}
                       <div className="flex flex-col flex-1 py-1 justify-between">
                         <div>
                           <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20">{otherArticle.category}</span>
                           <h4 className="text-sm font-bold text-foreground mt-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">{otherArticle.title}</h4>
                         </div>
                         <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mt-2">
                           <span className="flex items-center gap-1"><Clock size={12}/> {otherArticle.readTime}</span>
                           <span>{new Date(otherArticle.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                         </div>
                       </div>
                    </SpotlightCard>
                  </motion.div>
                ))}
                
                {otherLoading && (
                  <div className="p-8 text-center text-muted-foreground card-solid rounded-2xl border border-dashed border-border">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-500" />
                    <p className="text-sm font-medium">Memuat artikel...</p>
                  </div>
                )}
                
                {!otherLoading && otherArticles.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground card-solid rounded-2xl border border-dashed border-border">
                    <p className="text-sm font-medium">Belum ada artikel lain.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}