"use client";

import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { Loader2, ArrowLeft, Target, ShieldAlert, Clock, TrendingUp, Zap, History } from "lucide-react";
import CryptoCandlestick from "@/components/crypto/CryptoCandlestick";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CryptoDisclaimer from "@/components/shared/CryptoDisclaimer";

export default function CoinHistoryPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : "KOIN";

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        if (authLoading) return;
        
        if (!role || !role.startsWith("admin")) {
            if (isMounted) setLoading(false);
            return;
        }

        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error("No token");

            const res = await fetch('/api/crypto/reports', {
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
                const coinHistory: any[] = [];
                
                json.data.forEach((doc: any) => {
                    const report = doc;
                    const data = report.reportData || {};
                    const createdAt = new Date(report.createdAt);
                    
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
            }
        } catch (err) {
            console.error("Failed to fetch coin history:", err);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, role, symbol, user]);

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
    <div className="w-full relative pb-20">
      <div className="w-full mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* HEADER */}
        <div className="mb-8">
          <Button variant="ghost" className="mb-4 text-slate-500 hover:text-indigo-600" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan Utama
          </Button>
          <div className="flex items-center gap-4 bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-800">
             <div className="p-4 bg-indigo-900/50 rounded-full">
               <History className="w-8 h-8 text-indigo-400" />
             </div>
             <div>
               <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                 Riwayat Aset: <span className="text-indigo-400">{symbol}</span>
               </h1>
               <p className="text-muted-foreground text-sm md:text-base mt-1">
                 Jejak rekam analisis dari Hedge Fund Copilot untuk koin ini.
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
           <div className="relative ml-4 md:ml-8 space-y-12 pb-8">
             {/* Gradient Timeline Line */}
             <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent opacity-30"></div>
             
             {history.map((item, idx) => {
               const isScalp = item.type === "SCALPING";
               const isBuy = item.data.recommendation === "BUY";
               const isSell = item.data.recommendation === "SELL";
               
               let cardColor = "from-slate-500/10 to-transparent border-slate-800/50";
               let iconColor = "bg-slate-500 text-white shadow-slate-200/50";
               let badgeColor = "bg-slate-100/50 text-slate-700 border-slate-300/50 bg-slate-800/50 text-slate-300";
               let glowColor = "bg-slate-500/20";
               
               if (isScalp) {
                  cardColor = "from-orange-500/10 to-transparent border-orange-200/50 border-orange-900/50";
                  iconColor = "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/30";
                  badgeColor = "bg-orange-100/50 text-orange-700 border-orange-300/50 bg-orange-500/10 text-orange-400";
                  glowColor = "bg-orange-500/30";
               } else if (isBuy) {
                  cardColor = "from-emerald-500/10 to-transparent border-emerald-200/50 border-emerald-900/50";
                  iconColor = "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30";
                  badgeColor = "bg-emerald-100/50 text-emerald-700 border-emerald-300/50 bg-emerald-500/10 text-emerald-400";
                  glowColor = "bg-emerald-500/30";
               } else if (isSell) {
                  cardColor = "from-rose-500/10 to-transparent border-rose-200/50 border-rose-900/50";
                  iconColor = "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/30";
                  badgeColor = "bg-rose-100/50 text-rose-700 border-rose-300/50 bg-rose-500/10 text-rose-400";
                  glowColor = "bg-rose-500/30";
               }

               return (
                 <div key={idx} className="relative pl-10 md:pl-14 group">
                    {/* TIMELINE DOT */}
                    <div className="absolute left-0 top-5 flex items-center justify-center w-8 h-8 -ml-0.5 z-20">
                       <div className={`absolute inset-0 rounded-full blur-md ${glowColor} group-hover:scale-150 transition-transform duration-500`}></div>
                       <div className={`relative w-8 h-8 rounded-full ${iconColor} flex items-center justify-center shadow-lg border-2 border-white border-slate-950 z-10`}>
                          {isScalp ? <Zap className="w-3.5 h-3.5 fill-current" /> : <TrendingUp className="w-3.5 h-3.5" />}
                       </div>
                    </div>

                    <Card className={`overflow-hidden rounded-2xl border bg-gradient-to-br bg-slate-900/40 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${cardColor}`}>
                       <div className="p-5 md:p-6 border-b border-current/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 relative">
                         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current opacity-20 to-transparent"></div>
                         <div className="relative z-10">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                               <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${badgeColor} shadow-sm`}>
                                 {isScalp ? "VOLATILITY SCANNER" : item.data.recommendation || "ANALYSIS"}
                               </Badge>
                               <span className="text-xs text-slate-500 text-slate-400 font-medium flex items-center gap-1.5 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-800/50 shadow-sm">
                                  <Clock className="w-3 h-3" />
                                  {item.date.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                               </span>
                            </div>
                            <h3 className="font-bold text-white text-lg mt-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                         </div>
                       </div>
                       
                       <div className="p-5 md:p-6 flex flex-col xl:flex-row xl:items-stretch justify-between gap-6 relative z-10">
                           {/* LEFT SECTION: TEXT */}
                           <div className="flex-1">
                             <p className="text-sm font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {isScalp ? item.data.momentum : item.data.analysis}
                             </p>
                           </div>

                           {/* RIGHT SECTION: METRICS & CHART */}
                           <div className="flex flex-col sm:flex-row xl:flex-col items-center xl:items-end justify-center gap-4 xl:w-[28rem] shrink-0 border-t xl:border-t-0 xl:border-l border-current/10 pt-6 xl:pt-0 xl:pl-6">
                              <div className="grid grid-cols-2 gap-3 text-xs w-full bg-slate-900/80 p-4 rounded-xl border border-current/20 shadow-inner text-left">
                                 {isScalp ? (
                                   <>
                                     <div className="text-slate-500">Entry: <span className="font-bold text-white text-sm">{item.data.entryPrice || item.data.entryZone}</span></div>
                                     <div className="text-slate-500">Alokasi: <span className="font-bold text-indigo-400 text-sm">{item.data.allocationPercentage || '-'}</span></div>
                                   </>
                                 ) : (
                                   <>
                                     <div className="text-slate-500">Support: <span className="font-bold text-white text-sm">{item.data.supportLevel || '-'}</span></div>
                                     <div className="text-slate-500">Resist: <span className="font-bold text-white text-sm">{item.data.resistanceLevel || '-'}</span></div>
                                   </>
                                 )}
                                 <div className="text-emerald-400 flex flex-col justify-center">
                                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold mb-0.5"><Target className="w-3 h-3"/> Target</span>
                                    <span className="font-bold text-sm">{item.data.takeProfit || item.data.targetPrice || item.data.target || '-'}</span>
                                 </div>
                                 <div className="text-rose-400 flex flex-col justify-center">
                                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold mb-0.5"><ShieldAlert className="w-3 h-3"/> Stop Loss</span>
                                    <span className="font-bold text-sm">{item.data.stopLoss || item.data.stopLossPrice || '-'}</span>
                                 </div>
                              </div>
                              
                              {item.klines && item.klines.length > 0 && (
                                <div className="w-full mt-auto">
                                   <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 text-center xl:text-right">Grafik Riwayat Pergerakan</div>
                                   <div className="w-full">
                                     <CryptoCandlestick 
                                        symbol={symbol}
                                        klines={item.klines} 
                                        targetPrice={(item.data.takeProfit || item.data.targetPrice || item.data.target) ? parseFloat((item.data.takeProfit || item.data.targetPrice || item.data.target).toString().replace(/[^0-9.-]+/g, "")) : undefined} 
                                        stopLossPrice={(item.data.stopLoss || item.data.stopLossPrice) ? parseFloat((item.data.stopLoss || item.data.stopLossPrice).toString().replace(/[^0-9.-]+/g, "")) : undefined}
                                     />
                                   </div>
                                </div>
                              )}
                           </div>
                       </div>
                    </Card>
                 </div>
               );
             })}
           </div>
        )}
        <CryptoDisclaimer />
      </div>
    </div>
  );
}
