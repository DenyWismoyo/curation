// src/app/(public)/explore/[id]/page.tsx
'use client'; 
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Calendar, Clock, Loader2, Share2, Check, BookOpen, Rocket } from 'lucide-react';
import { AiSparkIcon, AILensIcon, GlobalTargetIcon, BrainIcon } from '@/types';
import { toast } from 'sonner';

interface Article {
  title: string;
  content: string;
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
    case 'AILensIcon': return <AILensIcon size={64} className={className} />;
    case 'AiSparkIcon': return <AiSparkIcon size={64} className={className} />;
    case 'GlobalTargetIcon': return <GlobalTargetIcon size={64} className={className} />;
    case 'BrainIcon': return <BrainIcon size={64} className={className} />;
    case 'BookOpen': return <BookOpen size={64} className={className} />;
    default: return <BookOpen size={64} className={className} />;
  }
}

// -------------------------------------------------------------
// ADAPTASI FUNGSI PARSER DARI UniversalAssessmentView.tsx
// -------------------------------------------------------------
const parseInlineText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic font-medium text-slate-800">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-5 text-lg text-slate-700 leading-relaxed font-medium">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('### ')) {
          return <h3 key={bIdx} className="text-2xl font-black text-slate-900 mt-10 mb-4">{parseInlineText(trimmed.slice(4))}</h3>;
        } else if (trimmed.startsWith('## ')) {
          return <h2 key={bIdx} className="text-3xl font-black text-slate-900 mt-12 mb-6 border-b border-slate-100 pb-2">{parseInlineText(trimmed.slice(3))}</h2>;
        } else if (trimmed.startsWith('# ')) {
          return <h1 key={bIdx} className="text-4xl font-black text-slate-900 mt-12 mb-6">{parseInlineText(trimmed.slice(2))}</h1>;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(i => i.trim().length > 0);
          return (
            <ul key={bIdx} className="space-y-3 my-6">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-3">
                  <span className="text-indigo-500 mt-1.5 shrink-0 text-sm">●</span>
                  <span className="leading-relaxed">{parseInlineText(item.replace(/^[-*]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={bIdx}>{parseInlineText(trimmed)}</p>;
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Tautan berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold text-xs uppercase tracking-widest">Membuka Halaman...</p>
      </div>
    );
  }

  if (!article) return null;

  // KOMPONEN CTA BANNER DINAMIS
  const CTABanner = () => {
    if (!article.linkedTemplateId) return null;
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-6 sm:p-8 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 my-8 shadow-sm">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Implementasi Langsung</p>
          <h4 className="text-xl md:text-2xl font-black text-indigo-950 mb-1 leading-tight">Uji {article.linkedTemplateName || 'Kesiapan Anda'} Sekarang</h4>
          <p className="text-indigo-700/80 text-sm font-medium">Beralih dari wawasan menjadi tindakan dengan instrumen analitik kami.</p>
        </div>
        <button 
          onClick={() => router.push(`/katalog?buy=${article.linkedTemplateId}`)} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl whitespace-nowrap shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
        >
          <Rocket size={18} /> Mulai Asesmen
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 font-sans selection:bg-indigo-100">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <button 
          onClick={() => router.push('/explore')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors w-fit group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Eksplorasi
        </button>
      </div>

      <article className="max-w-3xl mx-auto px-6 mt-4">
        <div className="bg-white rounded-[2rem] p-6 md:p-12 shadow-sm ring-1 ring-slate-200">
          
          <div className="flex items-center justify-between mb-8">
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-lg">
              {article.category}
            </span>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
            >
              {copied ? <Check size={16} className="text-emerald-500"/> : <Share2 size={16}/>}
              {copied ? 'Tersalin' : 'Bagikan'}
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-10 pb-8 border-b border-slate-100">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> Waktu baca {article.readTime}</span>
          </div>

          <div className={`w-full bg-slate-50 rounded-3xl flex items-center justify-center mb-10 ring-1 ring-slate-100 overflow-hidden relative ${article.imageUrl ? 'aspect-[3/4] md:aspect-[16/9]' : 'h-48 md:h-64'}`}>
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-slate-50"></div>
             {article.imageUrl ? (
               <img src={article.imageUrl} alt={article.title} className="relative z-10 w-full h-full object-cover" />
             ) : (
               <div className="relative z-10">
                 {getIconComponent(article.iconName, "text-indigo-400 opacity-80")}
               </div>
             )}
          </div>

          {/* CTA Banner Atas */}
          <CTABanner />

          {/* Render Markdown Murni */}
          <div className="my-10">
            <MarkdownRenderer content={article.content} />
          </div>

          {/* CTA Banner Bawah */}
          <CTABanner />

        </div>
      </article>
    </div>
  );
}