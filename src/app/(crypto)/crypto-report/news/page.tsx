"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Globe, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Newspaper, ArrowLeft } from "lucide-react";

import { useRouter } from "next/navigation";

export default function CryptoNewsPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [newsReports, setNewsReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchNews() {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/crypto/news', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
           const errJson = await res.json().catch(() => ({}));
           throw new Error(`Failed to fetch: ${res.status} ${errJson.details || res.statusText}`);
        }
        
        const json = await res.json();
        if (isMounted && json.data) {
          // Parse string ISO date back to Date object for UI compatibility
          const parsedData = json.data.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          }));
          setNewsReports(parsedData);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchNews();

    return () => {
       isMounted = false;
    };
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground flex-col gap-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Memuat berita terbaru...</p>
      </div>
    );
  }

  if (newsReports.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-secondary text-secondary-foreground dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 text-muted-foreground border border-slate-200 dark:border-slate-800">
            <Newspaper className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">Belum Ada Berita</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Agen AI berita belum berjalan atau tidak ada berita terbaru.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 px-4 sm:px-6 lg:px-8">
      
      {/* HEADER SECTION */}
      <div className="bg-background text-foreground backdrop-blur-md border-b border-white/5 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto py-4">
           <button 
               onClick={() => router.back()}
               className="mb-6 -ml-2 text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 h-9 px-4 py-2"
           >
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan
           </button>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-500/30">
                        <Globe className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">AI Curation</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                    News & Alpha
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
                    Rangkuman berita aktual terkini oleh Crypto AI Editor.
                  </p>
                </div>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">

        {newsReports.map((report) => {
          const isBullish = report.marketSentiment === "BULLISH";
          const isBearish = report.marketSentiment === "BEARISH";
          const sentimentColor = isBullish ? "bg-emerald-500" : isBearish ? "bg-rose-500" : "bg-muted text-muted-foreground0";
          const Icon = isBullish ? TrendingUp : isBearish ? TrendingDown : Minus;
          const createdAt = report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt);

          return (
            <div key={report.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="card-solid/60 dark:bg-slate-900/60 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
                <div className="absolute right-0 top-0 p-8 opacity-5">
                  <Globe className="w-48 h-48" />
                </div>
                
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 ${isBullish ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : isBearish ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' : 'bg-secondary text-secondary-foreground dark:bg-muted text-muted-foreground border border-slate-200 dark:border-slate-500/20'}`}>
                      <Icon className="w-3.5 h-3.5" /> {report.marketSentiment} MARKET
                    </span>
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 
                      {createdAt.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black leading-tight text-foreground mb-2">
                    {report.headlineSummary}
                  </h2>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                  <Newspaper className="w-4 h-4" /> Top News Highlights
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {report.newsItems?.map((item: any, idx: number) => {
                    const impactBullish = item.impact === "BULLISH";
                    const impactBearish = item.impact === "BEARISH";
                    const impactColor = impactBullish ? "text-emerald-600 dark:text-emerald-400" : impactBearish ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground";
                    const impactBg = impactBullish ? "bg-emerald-100 dark:bg-emerald-500/10" : impactBearish ? "bg-rose-100 dark:bg-rose-500/10" : "bg-secondary text-secondary-foreground/50";
                    
                    return (
                      <div key={idx} className="card-solid/40 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-all hover:border-slate-300 dark:border-slate-700">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                           <span className={`text-[10px] inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-black uppercase tracking-widest shadow-sm ${impactBullish ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : impactBearish ? 'bg-rose-600 text-white border-0' : 'bg-secondary text-secondary-foreground dark:bg-muted text-muted-foreground border border-slate-200 dark:border-slate-500/20'}`}>
                             {item.impact}
                           </span>
                           {item.impactLevel && (
                             <span className={`text-[10px] inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-black uppercase tracking-widest shadow-sm ${item.impactLevel === 'HIGH' ? 'bg-rose-600 text-white border-0' : item.impactLevel === 'MEDIUM' ? 'bg-secondary text-secondary-foreground dark:bg-muted text-muted-foreground border border-slate-200 dark:border-slate-500/20' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'}`}>
                               {item.impactLevel} IMPACT
                             </span>
                           )}
                           {item.affectedCoins && item.affectedCoins.map((coin: string, i: number) => (
                             <span key={i} className="text-[10px] inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-black uppercase tracking-widest shadow-sm bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                               #{coin}
                             </span>
                           ))}
                           {item.sentimentScore !== undefined && (
                             <span className={`text-[10px] inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-black uppercase tracking-widest shadow-sm ${item.sentimentScore > 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : item.sentimentScore < 0 ? 'bg-rose-600 text-white border-0' : 'bg-secondary text-secondary-foreground dark:bg-muted text-muted-foreground border border-slate-200 dark:border-slate-500/20'}`}>
                               SCORE: {item.sentimentScore > 0 ? '+' : ''}{item.sentimentScore}
                             </span>
                           )}
                        </div>
                        <h4 className="font-black text-foreground text-lg mb-2 leading-snug">
                           {item.title}
                        </h4>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
                           {item.summary}
                        </p>
                        
                        <div className="bg-background text-foreground p-3 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs text-muted-foreground font-medium italic mb-2">
                           <span className="font-bold block mb-1 text-muted-foreground">Actionable Insight:</span>
                           {item.impactAnalysis}
                        </div>

                        {item.historicalCorrelation && (
                           <div className="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/30 text-xs text-indigo-400 font-medium italic mb-4">
                             <span className="font-bold block mb-1">Historical Data:</span>
                             {item.historicalCorrelation}
                           </div>
                        )}
                        
                        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                           <a href={item.originalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                             Baca Selengkapnya <ExternalLink className="w-3.5 h-3.5" />
                           </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
