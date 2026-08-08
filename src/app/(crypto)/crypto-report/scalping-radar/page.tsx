"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Zap, Target, ShieldAlert, ChevronRight, Activity, BarChart3, Clock, AlertTriangle } from "lucide-react";
import { PremiumLockedWrapper } from '@/features/crypto/components/alerts/PremiumLockedWrapper';
import CryptoDisclaimer from "@/features/crypto/components/shared/CryptoDisclaimer";

export default function ScalpingRadarPage() {
  const router = useRouter();
  const { user, role, loading: authLoading, isPremium } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith("admin");
  const hasAccess = isAdmin || isPremium;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        if (authLoading) return;
        
        if (!hasAccess) {
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
                const parsedData = json.data.map((item: any) => ({
                    ...item,
                    createdAt: {
                       toDate: () => new Date(item.createdAt)
                    }
                }));
                setReports(parsedData);
                if (parsedData.length > 0) {
                    setSelectedReportId(prev => prev ? prev : parsedData[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch latest report:", err);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, hasAccess, user]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen bg-background text-foreground"><Loader2 className="animate-spin h-10 w-10 text-orange-500" /></div>;
  }

  let latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  // Dummy mock data for Free Tier blurred view
  if (!hasAccess && !latestReport) {
     latestReport = {
        id: "dummy-123",
        createdAt: new Date(),
        rawScalpingData: [
           {
              symbol: "SOL",
              price: "$145.20",
              action: "Buy",
              timeframe: "1h",
              target: "$152.00",
              stopLoss: "$140.00",
              riskRewardRatio: 1.5,
              successProbability: "75%",
              reason: "Terdeteksi pola bullish pennant pada timeframe 1 jam disertai lonjakan volume pembelian agresif.",
              status: "ACTIVE"
           }
        ]
     };
  }

  if (!latestReport) {
    return <div className="p-8 text-center bg-background text-foreground min-h-screen text-foreground">Belum ada data Volatility Scanner.</div>;
  }

  const scalpingData = latestReport.rawScalpingData || [];
  const data = latestReport.reportData;
  const scalps = data?.scalpingOpportunities || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <PremiumLockedWrapper 
      hasAccess={hasAccess} 
      title="Volatility Scanner" 
      description="Analisis momentum harian dan deteksi volatilitas aset kripto potensial. Eksklusif untuk pengguna Premium."
    >
      <div className="w-full relative min-h-screen bg-background text-foreground">
      
      {/* HEADER SECTION */}
      <div className="bg-background text-foreground backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Button onClick={() => router.back()} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary text-secondary-foreground dark:hover:bg-secondary text-secondary-foreground rounded-full">
                 <ArrowLeft className="w-5 h-5" />
             </Button>
             <div>
                <div className="flex items-center gap-2">
                   <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                   <h1 className="font-black text-xl text-foreground tracking-tight">Volatility Command Center</h1>
                </div>
                <p className="text-xs font-medium text-muted-foreground">Multi-Agent AI Vetted Analysis</p>
             </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
             <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 hidden md:flex">
                <Clock className="w-3.5 h-3.5 text-orange-500" /> Riwayat Scan
             </div>
             
             <Select value={selectedReportId} onValueChange={setSelectedReportId}>
               <SelectTrigger className="w-[180px] sm:w-[220px] h-9 card-solid border-slate-200 dark:border-slate-800 text-muted-foreground focus:ring-0 focus:ring-offset-0 rounded-xl">
                  <SelectValue placeholder="Pilih Waktu" />
               </SelectTrigger>
               <SelectContent className="card-solid border-slate-200 dark:border-slate-800 text-muted-foreground rounded-xl max-h-[300px]">
                  {reports.map(r => {
                     const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                     const isLatest = r.id === reports[0]?.id;
                     return (
                        <SelectItem key={r.id} value={r.id} className="text-xs sm:text-sm cursor-pointer py-2">
                           {d.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB {isLatest && "(Terbaru)"}
                        </SelectItem>
                     )
                  })}
               </SelectContent>
             </Select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12">
        
        {/* HERO SECTION */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-orange-500/20 bg-muted text-muted-foreground dark:bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 dark:from-orange-950/40 via-black to-slate-200 dark:to-slate-900"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]"></div>
          
          <div className="relative z-10 p-8 md:p-12">
             <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 text-xs uppercase tracking-widest font-black mb-6">
                HIGH CONVICTION SETUPS
             </Badge>
             <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-4 tracking-tight">
               AI-Verified <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">Volatility Scanner</span>
             </h2>
             <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed mb-8">
               Data scan di bawah ini telah melewati penjurian matematika ketat (Screener 3.0) dan divalidasi silang oleh Agen Risiko AI terhadap kondisi makro terbaru.
             </p>
             
             <div className="flex flex-wrap items-center gap-4">
                <div className="bg-secondary text-secondary-foreground dark:card-solid/5 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/5 flex items-center gap-4">
                   <Activity className="w-8 h-8 text-orange-400" />
                   <div>
                     <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Active Setups</div>
                     <div className="text-2xl font-black text-foreground">{scalps.length}</div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* LIST OF SETUPS */}
        <div className="space-y-6">
           {scalps.length === 0 ? (
             <div className="text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold text-muted-foreground">Tidak ada setup yang lolos uji risiko saat ini.</h3>
             </div>
           ) : (
             scalps.map((scalp: any, idx: number) => (
               <Card key={idx} className="card-solid/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 backdrop-blur-md overflow-hidden transition-all duration-500 hover:border-orange-500/30 hover:card-solid/80 dark:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(249,115,22,0.05)] group">
                 <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                   
                   {/* LEFT: TARGET & PRICING */}
                   <div className="lg:w-1/3 flex flex-col justify-between relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
                      
                      <div className="relative z-10">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-900 flex items-center justify-center border border-slate-300 dark:border-slate-700 shadow-inner">
                              <span className="font-black text-lg text-foreground">{scalp.symbol.replace("USDT", "")}</span>
                            </div>
                            <div>
                               <h3 className="text-2xl font-black text-foreground">{scalp.symbol}</h3>
                               <div className="flex flex-wrap gap-2 mt-2">
                                 <Badge className={`border text-[10px] uppercase font-bold tracking-widest ${scalp.direction === 'SHORT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                   {scalp.direction === 'SHORT' ? '🔴 SHORT' : '🟢 LONG'}
                                 </Badge>
                                 <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase font-bold tracking-widest">
                                   {scalp.confidenceScore} CONVICTION
                                 </Badge>
                               </div>
                            </div>
                         </div>
                         
                         {(() => {
                            const rawData = latestReport.rawScalpingData?.find((r: any) => r.symbol === scalp.symbol);
                            const lastPrice = rawData?.klines?.[rawData.klines.length - 1]?.close ? parseFloat(rawData.klines[rawData.klines.length - 1].close) : null;
                            const vwap = rawData?.vwap;
                            const vwapDev = (lastPrice && vwap) ? (((lastPrice - vwap) / vwap) * 100).toFixed(2) : null;
                            
                            return (
                               <div className="grid grid-cols-2 gap-2 mb-6">
                                  {vwapDev && (
                                     <div className="bg-muted text-muted-foreground dark:bg-black/30 p-2 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold">VWAP Dev</div>
                                        <div className={`text-xs font-bold ${parseFloat(vwapDev) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{parseFloat(vwapDev) > 0 ? '+' : ''}{vwapDev}%</div>
                                     </div>
                                  )}
                                  {rawData?.openInterest && (
                                     <div className="bg-muted text-muted-foreground dark:bg-black/30 p-2 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Open Interest</div>
                                        <div className="text-xs font-bold text-muted-foreground">{(rawData.openInterest / 1000000).toFixed(2)}M</div>
                                     </div>
                                  )}
                                  {rawData?.adx?.adx && (
                                     <div className="bg-muted text-muted-foreground dark:bg-black/30 p-2 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold">ADX Trend</div>
                                        <div className={`text-xs font-bold ${rawData.adx.adx > 25 ? 'text-orange-400' : 'text-muted-foreground'}`}>{rawData.adx.adx.toFixed(1)}</div>
                                     </div>
                                  )}
                                  {rawData?.fundingRate && (
                                     <div className="bg-muted text-muted-foreground dark:bg-black/30 p-2 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Funding</div>
                                        <div className={`text-xs font-bold ${rawData.fundingRate < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(rawData.fundingRate * 100).toFixed(3)}%</div>
                                     </div>
                                  )}
                               </div>
                            );
                         })()}
                         
                         <div className="space-y-4 mb-6">
                            <div className="bg-muted text-muted-foreground dark:bg-black/40 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                               <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Entry Target</span>
                               <span className="font-mono text-lg font-bold text-foreground">${scalp.entryPrice}</span>
                            </div>
                            <div className="bg-emerald-100 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-300 dark:border-emerald-900/30 flex justify-between items-center">
                               <span className="text-xs text-emerald-500/70 font-bold uppercase tracking-wider flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Take Profit</span>
                               <span className="font-mono text-lg font-bold text-emerald-400">${scalp.targetPrice}</span>
                            </div>
                            <div className="bg-rose-100 dark:bg-rose-950/20 rounded-xl p-4 border border-rose-900/30 flex justify-between items-center">
                               <span className="text-xs text-rose-500/70 font-bold uppercase tracking-wider flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5"/> Stop Loss</span>
                               <span className="font-mono text-lg font-bold text-rose-400">${scalp.stopLossPrice}</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/50 flex justify-between items-center relative z-10">
                         <div className="text-xs text-muted-foreground font-medium">Risk/Reward</div>
                         <div className="text-sm font-black text-muted-foreground bg-slate-200 dark:bg-slate-800/50 px-3 py-1 rounded-md">{scalp.riskRewardRatio}</div>
                      </div>
                   </div>

                   {/* RIGHT: DEEP THESIS */}
                   <div className="lg:w-2/3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800/50 pt-6 lg:pt-0 lg:pl-8 flex flex-col">
                      <div className="mb-6 flex items-center gap-2">
                         <BarChart3 className="w-5 h-5 text-indigo-400" />
                         <h4 className="text-lg font-bold text-foreground tracking-tight">AI Multi-Agent Thesis</h4>
                      </div>
                      <div className="bg-muted text-muted-foreground dark:bg-black/20 rounded-2xl p-6 border border-white/5 flex-1 shadow-inner">
                         <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap">
                           {scalp.momentum}
                         </p>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Alokasi yang disarankan: <span className="font-bold text-muted-foreground">{scalp.allocationPercentage}</span>
                         </div>
                         <Link href={`/crypto-report/${scalp.symbol}`} className="flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-widest">
                           Cek Chart <ChevronRight className="w-4 h-4" />
                         </Link>
                      </div>
                   </div>
                   
                 </div>
               </Card>
             ))
           )}
         </div>
         <CryptoDisclaimer />
      </div>
    </div>
    </PremiumLockedWrapper>
  );
}
