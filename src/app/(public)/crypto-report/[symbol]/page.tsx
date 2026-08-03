"use client";

import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { Loader2, ArrowLeft, Target, ShieldAlert, Clock, TrendingUp, Zap, History } from "lucide-react";
import CryptoSparkline from "@/components/crypto/CryptoSparkline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function CoinHistoryPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : "KOIN";

  useEffect(() => {
    async function fetchCoinHistory() {
      try {
        const q = query(collection(db, "cryptoReports"), orderBy("createdAt", "desc"), limit(30));
        const snapshot = await getDocs(q);
        
        const coinHistory: any[] = [];
        
        snapshot.docs.forEach(doc => {
          const report = doc.data();
          const data = report.reportData || {};
          const createdAt = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
          
          let coinData = null;
          let type = "";
          
          // Check in scalping
          const scalpMatch = data.scalpingOpportunities?.find((s: any) => s.symbol === symbol);
          if (scalpMatch) {
            coinData = scalpMatch;
            type = "SCALPING";
          } else {
            // Check in technical analysis
            const techMatch = data.coinsAnalysis?.find((c: any) => c.symbol === symbol);
            if (techMatch) {
              coinData = techMatch;
              type = "TECHNICAL";
            }
          }
          
          if (coinData) {
            // Also grab market data if available for charts
            const klines = report.rawMarketData?.find((md: any) => md.symbol === symbol)?.klines || 
                           report.rawScalpingData?.find((md: any) => md.symbol === symbol)?.klines || [];
                           
            coinHistory.push({
              reportId: doc.id,
              date: createdAt,
              type,
              data: coinData,
              klines,
              title: data.title
            });
          }
        });
        
        setHistory(coinHistory);
      } catch (err) {
        console.error("Failed to fetch coin history:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading && role && role.startsWith("admin")) {
        fetchCoinHistory();
    } else if (!authLoading) {
        setLoading(false);
    }
  }, [authLoading, role, symbol]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (!role || !role.startsWith("admin")) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Akses Ditolak</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
      <div className="w-full max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="mb-8">
          <Button variant="ghost" className="mb-4 text-slate-500 hover:text-indigo-600" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan Utama
          </Button>
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
             <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
               <History className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
               <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                 Riwayat Aset: <span className="text-indigo-600 dark:text-indigo-400">{symbol}</span>
               </h1>
               <p className="text-muted-foreground text-sm md:text-base mt-1">
                 Jejak rekam analisis dan sinyal trading dari Hedge Fund Copilot untuk koin ini.
               </p>
             </div>
          </div>
        </div>

        {history.length === 0 ? (
           <Card className="border-dashed bg-transparent shadow-none border-2">
             <CardContent className="py-20 text-center text-muted-foreground flex flex-col items-center">
               <History className="w-12 h-12 mb-4 opacity-20" />
               <p className="text-lg">Belum ada riwayat laporan untuk koin {symbol}.</p>
             </CardContent>
           </Card>
        ) : (
           <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900 ml-4 md:ml-8 space-y-12 pb-8">
             {history.map((item, idx) => {
               const isScalp = item.type === "SCALPING";
               const isBuy = item.data.recommendation === "BUY";
               const isSell = item.data.recommendation === "SELL";
               
               let cardColor = "bg-slate-50 border-slate-200";
               let iconColor = "bg-slate-200 text-slate-500";
               let badgeColor = "bg-slate-200 text-slate-700";
               
               if (isScalp) {
                  cardColor = "bg-orange-50/50 border-orange-200";
                  iconColor = "bg-orange-500 text-white shadow-orange-200";
                  badgeColor = "bg-orange-100 text-orange-700 border-orange-300";
               } else if (isBuy) {
                  cardColor = "bg-emerald-50/50 border-emerald-200";
                  iconColor = "bg-emerald-500 text-white shadow-emerald-200";
                  badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-300";
               } else if (isSell) {
                  cardColor = "bg-rose-50/50 border-rose-200";
                  iconColor = "bg-rose-500 text-white shadow-rose-200";
                  badgeColor = "bg-rose-100 text-rose-700 border-rose-300";
               }

               return (
                 <div key={idx} className="relative pl-8 md:pl-12">
                    {/* TIMELINE DOT */}
                    <div className={`absolute -left-[17px] top-4 w-8 h-8 rounded-full ${iconColor} flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-950 z-10`}>
                       {isScalp ? <Zap className="w-3.5 h-3.5 fill-current" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    </div>

                    <Card className={`overflow-hidden shadow-md transition-shadow hover:shadow-lg ${cardColor} dark:bg-slate-900/60 dark:border-slate-800`}>
                       <div className="p-5 md:p-6 bg-white/50 dark:bg-slate-950/50 border-b border-current/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${badgeColor}`}>
                                 {isScalp ? "SCALPING RADAR" : item.data.recommendation || "ANALYSIS"}
                               </Badge>
                               <span className="text-xs text-slate-500 font-medium bg-white/60 dark:bg-slate-900 px-2 py-0.5 rounded-full border">
                                  {item.date.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                               </span>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white mt-2 line-clamp-1">{item.title}</h3>
                         </div>
                       </div>
                       
                       <div className="p-5 md:p-6 bg-white/30 dark:bg-slate-900/30">
                          <p className="text-sm md:text-base font-medium text-slate-800 dark:text-slate-300 mb-6 leading-relaxed whitespace-pre-wrap">
                             {isScalp ? item.data.momentum : item.data.analysis}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-6 bg-white/80 dark:bg-slate-950/80 p-4 rounded-xl border border-current/20 shadow-inner">
                             {isScalp ? (
                               <>
                                 <div className="text-slate-500">Entry: <span className="font-bold text-slate-900 dark:text-white text-sm">{item.data.entryPrice || item.data.entryZone}</span></div>
                                 <div className="text-slate-500">Alokasi: <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{item.data.allocationPercentage || '-'}</span></div>
                               </>
                             ) : (
                               <>
                                 <div className="text-slate-500">Support: <span className="font-bold text-slate-900 dark:text-white text-sm">{item.data.supportLevel || '-'}</span></div>
                                 <div className="text-slate-500">Resist: <span className="font-bold text-slate-900 dark:text-white text-sm">{item.data.resistanceLevel || '-'}</span></div>
                               </>
                             )}
                             <div className="text-emerald-600 dark:text-emerald-400 flex flex-col justify-center">
                                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold mb-0.5"><Target className="w-3 h-3"/> Target</span>
                                <span className="font-bold text-sm">{item.data.takeProfit || item.data.targetPrice || item.data.target || '-'}</span>
                             </div>
                             <div className="text-rose-600 dark:text-rose-400 flex flex-col justify-center">
                                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold mb-0.5"><ShieldAlert className="w-3 h-3"/> Stop Loss</span>
                                <span className="font-bold text-sm">{item.data.stopLoss || item.data.stopLossPrice || '-'}</span>
                             </div>
                          </div>

                          {item.klines && item.klines.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-current/10">
                               <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Grafik Riwayat Pergerakan (Saat Laporan Dibuat)</div>
                               <CryptoSparkline 
                                 klines={item.klines} 
                                 color={isScalp ? "#f97316" : isBuy ? "#10b981" : isSell ? "#f43f5e" : "#64748b"} 
                                 targetPrice={(item.data.takeProfit || item.data.targetPrice || item.data.target) ? parseFloat((item.data.takeProfit || item.data.targetPrice || item.data.target).toString().replace(/[^0-9.-]+/g, "")) : undefined}
                                 stopLossPrice={(item.data.stopLoss || item.data.stopLossPrice) ? parseFloat((item.data.stopLoss || item.data.stopLossPrice).toString().replace(/[^0-9.-]+/g, "")) : undefined}
                               />
                            </div>
                          )}
                       </div>
                    </Card>
                 </div>
               );
             })}
           </div>
        )}
      </div>
    </div>
  );
}
