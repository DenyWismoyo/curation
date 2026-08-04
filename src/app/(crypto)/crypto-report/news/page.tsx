"use client";

import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Newspaper } from "lucide-react";

export default function CryptoNewsPage() {
  const [newsReports, setNewsReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "cryptoNews"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNewsReports(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-muted-foreground font-medium">Memuat berita terbaru...</p>
      </div>
    );
  }

  if (newsReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <Card className="border-dashed bg-transparent shadow-none border-2 max-w-lg w-full">
          <CardContent className="py-20 text-center text-muted-foreground flex flex-col items-center">
            <Newspaper className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Belum ada berita yang di-generate.</p>
            <p className="text-sm mt-2">Agen AI berita belum berjalan.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-500" />
              News & Alpha
            </h1>
            <p className="text-slate-500 font-medium mt-2">Rangkuman berita aktual terkini oleh Crypto AI Editor.</p>
          </div>
        </div>

        {newsReports.map((report) => {
          const isBullish = report.marketSentiment === "BULLISH";
          const isBearish = report.marketSentiment === "BEARISH";
          const sentimentColor = isBullish ? "bg-emerald-500" : isBearish ? "bg-rose-500" : "bg-slate-500";
          const Icon = isBullish ? TrendingUp : isBearish ? TrendingDown : Minus;
          const createdAt = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();

          return (
            <Card key={report.id} className="overflow-hidden border-slate-200/60 dark:border-slate-800/60 shadow-lg">
              <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-8 opacity-5">
                  <Globe className="w-48 h-48" />
                </div>
                
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className={`${sentimentColor} text-white px-3 py-1 font-black shadow-sm uppercase tracking-widest text-xs flex items-center gap-1.5 border-0`}>
                      <Icon className="w-3.5 h-3.5" /> {report.marketSentiment} MARKET
                    </Badge>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 
                      {createdAt.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black leading-tight text-white mb-2">
                    {report.headlineSummary}
                  </h2>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                  <Newspaper className="w-4 h-4" /> Top News Highlights
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {report.newsItems?.map((item: any, idx: number) => {
                    const impactBullish = item.impact === "BULLISH";
                    const impactBearish = item.impact === "BEARISH";
                    const impactColor = impactBullish ? "text-emerald-600 dark:text-emerald-400" : impactBearish ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400";
                    const impactBg = impactBullish ? "bg-emerald-100 dark:bg-emerald-500/10" : impactBearish ? "bg-rose-100 dark:bg-rose-500/10" : "bg-slate-100 dark:bg-slate-800/50";
                    
                    return (
                      <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-all hover:shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                           <Badge variant="outline" className={`${impactColor} ${impactBg} border-0 text-[10px] font-black uppercase tracking-widest shadow-none`}>
                             {item.impact}
                           </Badge>
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white text-lg mb-2 leading-snug">
                           {item.title}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 flex-1">
                           {item.summary}
                        </p>
                        
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium italic mb-4">
                           {item.impactAnalysis}
                        </div>
                        
                        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                           <a href={item.originalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                             Baca Selengkapnya <ExternalLink className="w-3.5 h-3.5" />
                           </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
