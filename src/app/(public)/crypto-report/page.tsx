"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { Loader2, Activity, Bot, TrendingUp, Zap, Calendar, Clock, Target, ShieldAlert, BarChart3, LineChart, Anchor, Bell, BellRing, Globe } from "lucide-react";
import CryptoChat from "@/components/crypto/CryptoChat";
import CryptoSparkline from "@/components/crypto/CryptoSparkline";
import CryptoAlertsWidget from "@/components/crypto/CryptoAlertsWidget";
import CryptoCalendar from "@/components/crypto/CryptoCalendar";
import MacroEconomicCalendar from "@/components/crypto/MacroEconomicCalendar";
import { useFCMToken } from "@/hooks/useFCMToken";

export default function CryptoReportPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);

  const { fcmToken, notificationPermissionStatus, requestPermissionAndGetToken, loading: fcmLoading } = useFCMToken();

  useEffect(() => {
    async function fetchReports() {
      try {
        const q = query(collection(db, "cryptoReports"), orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setReports(data);
        
        // Set default chat context to latest report
        if (data.length > 0) {
           setChatContext(data[0].reportData);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading && role && role.startsWith("admin")) {
        fetchReports();
    } else if (!authLoading) {
        setLoading(false);
    }
  }, [authLoading, role]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (!role || !role.startsWith("admin")) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Akses Ditolak</h1>
        <p className="text-muted-foreground">Anda harus menjadi admin untuk melihat laporan AI.</p>
      </div>
    );
  }

  const groupedReports = reports.reduce((acc, report) => {
    const d = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
    const dateStr = d.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(report);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedReports);
  const defaultTab = dateKeys.length > 0 ? dateKeys[0] : "empty";

  const openCopilotForReport = (reportData: any) => {
     setChatContext(reportData);
     setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
      <div className="w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl">
                <Activity className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Market Intelligence</h1>
                <p className="text-muted-foreground text-sm md:text-base mt-1">
                  Analisis sentimen pasar kripto komprehensif, diperbarui setiap 4 jam.
                </p>
              </div>
            </div>
          </div>
          
          
          <div className="flex flex-col sm:flex-row gap-3">
             <CryptoAlertsWidget />
             
             {notificationPermissionStatus !== 'granted' && (
                <Button 
                  onClick={requestPermissionAndGetToken}
                  disabled={fcmLoading}
                  variant="outline"
                  className="rounded-2xl px-6 py-6 h-auto text-base font-bold bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                >
                  {fcmLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Bell className="w-5 h-5 mr-2" />}
                  Notifikasi Admin
                </Button>
             )}
             {notificationPermissionStatus === 'granted' && (
                <Button 
                  disabled
                  variant="outline"
                  className="rounded-2xl px-6 py-6 h-auto text-base font-bold bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 opacity-100"
                >
                  <BellRing className="w-5 h-5 mr-2" />
                  Notifikasi Aktif
                </Button>
             )}
             <Button 
               onClick={() => setIsChatOpen(true)}
               className="rounded-2xl px-8 py-6 h-auto text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all hover:-translate-y-1"
             >
               <Bot className="w-6 h-6 mr-3" />
               Tanya Hedge Fund Copilot
             </Button>
          </div>
        </div>

        <Tabs defaultValue="ai-reports" className="w-full">
          <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 mb-8 rounded-2xl flex w-fit max-w-full overflow-x-auto">
            <TabsTrigger 
              value="ai-reports"
              className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-indigo-400"
            >
              <Bot className="w-5 h-5 mr-2" />
              AI Market Reports
            </TabsTrigger>
            <TabsTrigger 
              value="macro-calendar"
              className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-indigo-400"
            >
              <Globe className="w-5 h-5 mr-2" />
              Global Economic Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-reports" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <CryptoCalendar />

        {reports.length === 0 ? (
          <Card className="border-dashed bg-transparent shadow-none border-2">
            <CardContent className="py-20 text-center text-muted-foreground flex flex-col items-center">
              <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg">Belum ada laporan yang di-generate.</p>
              <p className="text-sm">Laporan akan muncul setelah cron job berjalan.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
               <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                 <Calendar className="w-5 h-5 text-indigo-500" /> Riwayat Laporan
               </h2>
               <TabsList className="bg-white dark:bg-slate-900 border shadow-sm p-1 h-auto flex-wrap justify-start">
                 {dateKeys.map(date => (
                   <TabsTrigger 
                     key={date} 
                     value={date}
                     className="rounded-lg px-6 py-2.5 font-medium data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/50 dark:data-[state=active]:text-indigo-300"
                   >
                     {date}
                   </TabsTrigger>
                 ))}
               </TabsList>
            </div>

            {dateKeys.map(date => {
              const reportsForDate = groupedReports[date];
              const defaultHourTab = reportsForDate.length > 0 ? reportsForDate[0].id : "empty";

              return (
              <TabsContent key={date} value={date} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Tabs defaultValue={defaultHourTab} className="w-full">
                  <div className="mb-6 flex flex-wrap items-center gap-2 bg-white/40 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
                     <span className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-2 mr-2 flex items-center gap-1.5"><Clock className="w-4 h-4"/> Pilih Jam Laporan:</span>
                     <TabsList className="bg-transparent border-0 h-auto flex-wrap justify-start gap-1 p-0">
                       {reportsForDate.map((r: any) => {
                         const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
                         const timeStr = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " WIB";
                         return (
                           <TabsTrigger key={r.id} value={r.id} className="rounded-lg px-4 py-2 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white shadow-none transition-colors border border-transparent data-[state=active]:shadow-md">
                             {timeStr}
                           </TabsTrigger>
                         );
                       })}
                     </TabsList>
                  </div>

                  {reportsForDate.map((report: any, idx: number) => {
                    const data = report.reportData || {};
                    const sentimentColor = data.sentiment === "BULLISH" ? "bg-emerald-500" : data.sentiment === "BEARISH" ? "bg-rose-500" : "bg-slate-500";
                    const createdAt = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
                    const isLatest = date === dateKeys[0] && idx === 0;

                    return (
                      <TabsContent key={report.id} value={report.id} className="mt-0 outline-none">
                        <Card className={`overflow-hidden border-0 shadow-xl transition-all duration-300 ${isLatest ? 'bg-white/80 dark:bg-slate-900/80 ring-2 ring-indigo-500/50' : 'bg-white/60 dark:bg-slate-900/60'} backdrop-blur-xl`}>
                          
                          {/* CARD HEADER */}
                          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-gradient-to-br from-transparent to-slate-50/50 dark:to-slate-900/50 relative">
                            {isLatest && (
                               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                 {isLatest && <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 text-[10px] uppercase tracking-widest px-2 py-0.5">TERBARU</Badge>}
                                 {report.isDaily && <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 text-[10px] uppercase tracking-widest px-2 py-0.5">DAILY RECAP</Badge>}
                              </div>
                              <h3 className="font-black text-2xl md:text-3xl tracking-tight text-slate-900 dark:text-white mb-2 leading-tight">
                                {data.title || "Laporan Pasar"}
                              </h3>
                              <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                Pukul {createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-3 shrink-0">
                              {data.sentiment && (
                                <Badge className={`${sentimentColor} text-white px-5 py-2 text-sm uppercase tracking-widest font-black shadow-md border-0`}>
                                  {data.sentiment}
                                </Badge>
                              )}
                              <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={() => openCopilotForReport(data)}
                                 className="text-xs bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                              >
                                 <Bot className="w-3.5 h-3.5 mr-1.5" /> Tanya Laporan Ini
                              </Button>
                            </div>
                          </div>

                          {/* CARD CONTENT */}
                          <div className="p-6 md:p-8 space-y-8">
                            
                            {/* FUNDAMENTAL & MACRO INSIGHTS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               {/* Fear & Greed */}
                               {report.rawFundamental?.fearAndGreed && (
                                 <div className="bg-white/80 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                   <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 flex items-center gap-1"><LineChart className="w-3 h-3"/> Fear & Greed</div>
                                   <div className="font-black text-xl text-slate-800 dark:text-slate-200">{report.rawFundamental.fearAndGreed.value} - {report.rawFundamental.fearAndGreed.value_classification}</div>
                                 </div>
                               )}
                               
                               {/* Market Regime */}
                               {data.marketRegime && (
                                 <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
                                   <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Market Regime</div>
                                   <div className="font-black text-lg text-indigo-700 dark:text-indigo-400">{data.marketRegime}</div>
                                 </div>
                               )}

                               {/* Whale Activity */}
                               {data.whaleActivity && (
                                 <div className="bg-blue-50/80 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
                                   <div className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-1 flex items-center gap-1"><Anchor className="w-3 h-3"/> Whale Activity</div>
                                   <div className="font-black text-lg text-blue-700 dark:text-blue-400">{data.whaleActivity}</div>
                                 </div>
                               )}
                               
                               {/* Macro Insight (spans across) */}
                               {data.macroInsight && (
                                 <div className="col-span-2 md:col-span-4 bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                   <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Macro Insight</div>
                                   <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{data.macroInsight}</p>
                                 </div>
                               )}
                            </div>

                            {/* SUMMARY & PROJECTION */}
                            <div className="flex flex-col gap-6">
                              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                   Ringkasan
                                </h4>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                                  <ReactMarkdown>{data.summary || "Tidak ada ringkasan."}</ReactMarkdown>
                                </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                   Proyeksi
                                </h4>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                                  <ReactMarkdown>{data.projection || "Tidak ada proyeksi."}</ReactMarkdown>
                                </div>
                              </div>
                            </div>

                            {/* SCALPING RADAR (HIGHLIGHT) */}
                            {data.scalpingOpportunities && data.scalpingOpportunities.length > 0 && (
                              <div>
                                <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                  <Zap className="w-5 h-5 fill-current" /> Scalping Radar
                                </h4>
                                <div className="space-y-3">
                                  {data.scalpingOpportunities.map((scalp: any, i: number) => (
                                    <div key={i} className="bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden transition-colors hover:bg-orange-100/50">
                                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                       <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Link href={`/crypto-report/${scalp.symbol}`} className="font-black text-lg text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">
                                                {scalp.symbol}
                                             </Link>
                                             <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest text-orange-600 border-orange-300 bg-orange-100/50">HOT</Badge>
                                          </div>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-2 leading-relaxed">{scalp.momentum}</p>
                                       </div>
                                       <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs shrink-0 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-orange-100 dark:border-slate-800">
                                          <div className="text-slate-500">Entry: <span className="font-bold text-slate-900 dark:text-white">{scalp.entryPrice || scalp.entryZone}</span></div>
                                          <div className="text-slate-500">Alokasi: <span className="font-bold text-indigo-600 dark:text-indigo-400">{scalp.allocationPercentage || '-'}</span></div>
                                          <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Target className="w-3 h-3"/> {scalp.targetPrice || scalp.target}</div>
                                          <div className="text-rose-600 dark:text-rose-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {scalp.stopLossPrice || scalp.stopLoss}</div>
                                       </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* COIN ANALYSIS (NEW LIST LAYOUT) */}
                            {data.coinsAnalysis && data.coinsAnalysis.length > 0 && (
                              <div>
                                 <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Analisis Teknikal
                                 </h4>
                                 <div className="space-y-4">
                                   {data.coinsAnalysis.map((coin: any, i: number) => {
                                     const isBuy = coin.recommendation === "BUY";
                                     const isSell = coin.recommendation === "SELL";
                                     const recColor = isBuy ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900" 
                                       : isSell ? "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-900" 
                                       : "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/30 dark:border-slate-800";
                                     
                                     const strokeColor = isBuy ? "#10b981" : isSell ? "#f43f5e" : "#64748b";
                                     const klinesData = report.rawMarketData?.find((md: any) => md.symbol === coin.symbol)?.klines || [];

                                     return (
                                       <div key={i} className={`flex flex-col xl:flex-row xl:items-stretch justify-between gap-4 rounded-2xl border ${recColor} overflow-hidden shadow-sm p-4 md:p-5 relative transition-colors hover:shadow-md`}>
                                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-slate-500'}`}></div>
                                          
                                          {/* Left Section: Info & Text */}
                                          <div className="flex-1 flex flex-col justify-center pl-2">
                                             <div className="flex items-center gap-3 mb-2">
                                                <Link href={`/crypto-report/${coin.symbol}`} className="font-black text-xl text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">
                                                  {coin.symbol}
                                                </Link>
                                                <Badge variant="outline" className={`text-[11px] font-black tracking-widest uppercase bg-white/50 dark:bg-slate-950/50 border-current text-current shadow-sm`}>
                                                  {coin.recommendation}
                                                </Badge>
                                                {(() => {
                                                  const rawData = report.rawMarketData?.find((md: any) => md.symbol === coin.symbol);
                                                  if (rawData?.rsi14) {
                                                    const rsi = Math.round(rawData.rsi14);
                                                    return (
                                                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest ${rsi <= 30 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : rsi >= 70 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-700'}`}>
                                                        RSI: {rsi}
                                                      </Badge>
                                                    );
                                                  }
                                                  return null;
                                                })()}
                                             </div>
                                             <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                                                {coin.analysis}
                                             </p>
                                          </div>

                                          {/* Right Section: Metrics & Chart */}
                                          <div className="flex flex-col sm:flex-row xl:flex-col items-center xl:items-end justify-center gap-4 xl:w-64 shrink-0 border-t xl:border-t-0 xl:border-l border-current/10 pt-4 xl:pt-0 xl:pl-4">
                                             {(coin.supportLevel || coin.resistanceLevel || coin.takeProfit || coin.stopLoss) && (
                                                <div className="grid grid-cols-2 gap-2 text-xs w-full bg-white/80 dark:bg-slate-950/80 p-3 rounded-xl border border-current/20 shadow-inner text-left">
                                                   {coin.supportLevel && <div className="text-slate-500">Sup: <span className="font-bold text-foreground">{coin.supportLevel}</span></div>}
                                                   {coin.resistanceLevel && <div className="text-slate-500">Res: <span className="font-bold text-foreground">{coin.resistanceLevel}</span></div>}
                                                   {coin.takeProfit && <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Target className="w-3 h-3"/> TP: {coin.takeProfit}</div>}
                                                   {coin.stopLoss && <div className="text-rose-600 dark:text-rose-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> SL: {coin.stopLoss}</div>}
                                                </div>
                                             )}
                                             
                                             {klinesData.length > 0 && (
                                                <div className="w-full mt-auto">
                                                   <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1 text-center xl:text-right">Tren 4 Jam</div>
                                                   <div className="h-12 w-full">
                                                     <CryptoSparkline 
                                                        klines={klinesData} 
                                                        color={strokeColor} 
                                                        targetPrice={coin.takeProfit ? parseFloat(coin.takeProfit.toString().replace(/[^0-9.-]+/g, "")) : undefined}
                                                        stopLossPrice={coin.stopLoss ? parseFloat(coin.stopLoss.toString().replace(/[^0-9.-]+/g, "")) : undefined}
                                                      />
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                     );
                                   })}
                                 </div>
                              </div>
                            )}

                            {/* ACCOUNTABILITY JOURNAL */}
                            {data.previousScalpingEvaluation && data.previousScalpingEvaluation.length > 0 && (
                               <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden">
                                 <div className="absolute right-0 top-0 p-4 opacity-5"><Target className="w-32 h-32"/></div>
                                 <h4 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                   Jurnal Evaluasi AI
                                 </h4>
                                 <div className="space-y-2 relative z-10">
                                   {data.previousScalpingEvaluation.map((evalItem: any, idx: number) => {
                                      const isWin = evalItem.status?.toUpperCase().includes("WIN");
                                      const statusColor = isWin ? "text-emerald-400" : evalItem.status?.toUpperCase().includes("LOSS") ? "text-rose-400" : "text-amber-400";
                                      return (
                                        <div key={idx} className="flex items-start justify-between text-xs border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                                           <span className="font-bold text-slate-300 w-20 shrink-0">{evalItem.symbol}</span>
                                           <span className="text-slate-500 line-clamp-1 flex-1 px-2">{evalItem.reason}</span>
                                           <span className={`font-black tracking-wider ${statusColor}`}>{evalItem.status}</span>
                                        </div>
                                      );
                                   })}
                                 </div>
                               </div>
                            )}
                            
                          </div>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>
              );
            })}
          </Tabs>
        )}
        </TabsContent>

          <TabsContent value="macro-calendar" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <MacroEconomicCalendar />
          </TabsContent>
        </Tabs>
      </div>

      {/* Global Copilot Sheet */}
      <CryptoChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        reportContext={chatContext}
      />
    </div>
  );
}
