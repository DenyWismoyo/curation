"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { Loader2, Activity, Bot, TrendingUp, Zap, Calendar, Clock, Target, ShieldAlert, BarChart3, LineChart, Anchor, Bell, BellRing, Globe, Sunrise, RotateCcw, Sun, CalendarDays, Diamond, Eye, Radar, Flame } from "lucide-react";
import CryptoChat from "@/components/crypto/CryptoChat";
import CryptoCandlestick from "@/components/crypto/CryptoCandlestick";
import CryptoLiveTicker from "@/components/crypto/CryptoLiveTicker";
import CryptoAlertsWidget from "@/components/crypto/CryptoAlertsWidget";
import CryptoCalendar from "@/components/crypto/CryptoCalendar";
import MacroEconomicCalendar from "@/components/crypto/MacroEconomicCalendar";
import { useFCMToken } from "@/hooks/useFCMToken";

let cachedReports: any[] = [];
let isReportsCached = false;

export default function CryptoReportPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>(cachedReports);
  const [loading, setLoading] = useState(!isReportsCached);
  
  // State untuk chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);

  const { fcmToken, notificationPermissionStatus, requestPermissionAndGetToken, loading: fcmLoading } = useFCMToken();

  useEffect(() => {
    let unsubscribe: () => void;

    if (!authLoading && role && role.startsWith("admin")) {
        const q = query(collection(db, "cryptoReports"), orderBy("createdAt", "desc"), limit(20));
        unsubscribe = onSnapshot(q, (snapshot) => {
           const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
           cachedReports = data;
           isReportsCached = true;
           setReports(data);
           
           if (data.length > 0) {
              setChatContext(data[0].reportData);
           }
           setLoading(false);
        }, (err) => {
           console.error("Failed to fetch reports:", err);
           setLoading(false);
        });
    } else if (!authLoading) {
        setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authLoading, role]);

  // Removed full-page loading block to preserve layout and scroll position during navigation

  if (authLoading) {
    // Let it render the shell below to preserve scroll position
  } else if (!role || !role.startsWith("admin")) {
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
          
          
          <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap">
             <CryptoAlertsWidget />
             
             {notificationPermissionStatus !== 'granted' && (
                <Button 
                  onClick={requestPermissionAndGetToken}
                  disabled={fcmLoading}
                  variant="outline"
                  className="rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all shrink-0"
                >
                  {fcmLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                  Notifikasi
                </Button>
             )}
             {notificationPermissionStatus === 'granted' && (
                <Button 
                  disabled
                  variant="outline"
                  className="rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 opacity-100 shrink-0"
                >
                  <BellRing className="w-4 h-4 mr-2" />
                  Notifikasi Aktif
                </Button>
             )}
             <Link href="/crypto-report/smart-money" className="shrink-0">
               <Button 
                 className="w-full rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 transition-all hover:-translate-y-0.5"
               >
                 <Eye className="w-4 h-4 mr-2" />
                 Smart Money
               </Button>
             </Link>
             <Link href="/crypto-report/liquidity" className="shrink-0">
               <Button 
                 className="w-full rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
               >
                 <Radar className="w-4 h-4 mr-2" />
                 Liquidity Heatmap
               </Button>
             </Link>
             <Link href="/crypto-report/danger-zone" className="shrink-0">
               <Button 
                 className="w-full rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-md shadow-red-500/20 hover:shadow-red-500/40 transition-all hover:-translate-y-0.5"
               >
                 <Flame className="w-4 h-4 mr-2" />
                 Danger Zone
               </Button>
             </Link>
             <Link href="/crypto-report/hidden-gems" className="shrink-0">
               <Button 
                 className="w-full rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5"
               >
                 <Diamond className="w-4 h-4 mr-2 fill-current" />
                 Hidden Gems
               </Button>
             </Link>
             <Link href="/crypto-report/scalping-radar" className="shrink-0">
               <Button 
                 className="w-full rounded-xl px-4 py-2.5 h-auto text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5"
               >
                 <Zap className="w-4 h-4 mr-2 fill-current" />
                 Scalping Radar
               </Button>
             </Link>
             <Button 
               onClick={() => setIsChatOpen(true)}
               className="rounded-xl px-5 py-2.5 h-auto text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all hover:-translate-y-0.5 shrink-0"
             >
               <Bot className="w-4 h-4 mr-2" />
               Hedge Fund Copilot
             </Button>
          </div>
        </div>

        <CryptoLiveTicker />

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

        {(loading || authLoading) ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-muted-foreground font-medium">Memuat laporan terbaru...</p>
          </div>
        ) : reports.length === 0 ? (
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
               <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                   <Calendar className="w-5 h-5 text-indigo-500" /> Riwayat Laporan
                 </h2>
                 <Link href="/crypto-report/performance">
                   <Button variant="outline" size="sm" className="hidden sm:flex text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900/50 dark:hover:bg-indigo-900/30">
                     <TrendingUp className="w-4 h-4 mr-2" /> Scalping Analytics
                   </Button>
                 </Link>
               </div>
               
               <div className="flex flex-col gap-2">
                 <Link href="/crypto-report/performance" className="sm:hidden">
                   <Button variant="outline" size="sm" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900/50 dark:hover:bg-indigo-900/30">
                     <TrendingUp className="w-4 h-4 mr-2" /> Scalping Analytics
                   </Button>
                 </Link>
                 <div className="w-full overflow-x-auto no-scrollbar pb-1">
                   <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-800/60 shadow-[0_4px_12px_rgb(0,0,0,0.02)] p-1.5 h-auto inline-flex justify-start rounded-xl">
                     {dateKeys.map(date => (
                     <TabsTrigger 
                       key={date} 
                       value={date}
                       className="rounded-lg px-5 py-2 text-sm font-semibold whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all"
                     >
                       {date}
                     </TabsTrigger>
                   ))}
                   </TabsList>
                 </div>
               </div>
            </div>

            {dateKeys.map(date => {
              const reportsForDate = groupedReports[date];
              const defaultHourTab = reportsForDate.length > 0 ? reportsForDate[0].id : "empty";

              return (
              <TabsContent key={date} value={date} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Tabs defaultValue={defaultHourTab} className="w-full">
                  <div className="mb-6 flex items-center gap-3 bg-white/30 dark:bg-slate-900/30 p-2 rounded-xl border border-white/30 dark:border-slate-800/50 backdrop-blur-md overflow-x-auto no-scrollbar shadow-[0_4px_12px_rgb(0,0,0,0.02)]">
                     <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1.5 shrink-0"><Clock className="w-3.5 h-3.5"/> Waktu:</span>
                     <TabsList className="bg-transparent border-0 h-auto inline-flex justify-start gap-1.5 p-0">
                       {reportsForDate.map((r: any) => {
                         const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
                         const timeStr = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " WIB";
                         return (
                           <TabsTrigger key={r.id} value={r.id} className="rounded-lg px-4 py-1.5 text-xs font-bold whitespace-nowrap bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 data-[state=active]:bg-indigo-600 dark:data-[state=active]:bg-indigo-500 data-[state=active]:text-white shadow-none transition-all border border-transparent data-[state=active]:shadow-md">
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
                            
                            {/* EXECUTIVE DAILY BRIEFING (Exclusive for 7 AM) */}
                            {report.isDaily && (data.dailyRecap || data.dailyProjection || data.dailyCalendarSummary) && (
                              <div className="mb-8 relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 dark:border-slate-700/30">
                                {/* Background Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950"></div>
                                <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                                
                                <div className="relative z-10 p-6 md:p-8">
                                   <div className="flex items-center gap-4 mb-6">
                                      <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                                         <Sunrise className="w-7 h-7" />
                                      </div>
                                      <div>
                                         <h3 className="font-black text-2xl text-white tracking-tight">Executive Daily Briefing</h3>
                                         <p className="text-sm font-medium text-indigo-200 mt-0.5">Kilas balik & insight eksklusif hari ini</p>
                                      </div>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      {data.dailyRecap && (
                                         <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
                                            <h4 className="flex items-center gap-2 text-indigo-300 font-bold text-sm uppercase tracking-widest mb-3">
                                               <RotateCcw className="w-4 h-4"/> Recap Kemarin
                                            </h4>
                                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{data.dailyRecap}</p>
                                         </div>
                                      )}
                                      
                                      {data.dailyProjection && (
                                         <div className="bg-amber-950/30 backdrop-blur-md rounded-2xl p-5 border border-amber-900/50 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                                            <h4 className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-widest mb-3 relative z-10">
                                               <Sun className="w-4 h-4"/> Insight Hari Ini
                                            </h4>
                                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap relative z-10">{data.dailyProjection}</p>
                                         </div>
                                      )}
                                      
                                      {data.dailyCalendarSummary && (
                                         <div className="lg:col-span-2 bg-gradient-to-r from-indigo-950/50 to-slate-900/50 backdrop-blur-md rounded-2xl p-5 border border-indigo-900/50">
                                            <h4 className="flex items-center gap-2 text-indigo-300 font-bold text-sm uppercase tracking-widest mb-3">
                                               <CalendarDays className="w-4 h-4"/> Kalender Makro & Naratif
                                            </h4>
                                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{data.dailyCalendarSummary}</p>
                                         </div>
                                      )}
                                   </div>
                                </div>
                              </div>
                            )}
                            
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
                                    <div key={i} className="group relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/40 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-rose-500"></div>
                                       <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                       <div className="flex-1 relative z-10">
                                          <div className="flex items-center gap-3 mb-1.5">
                                             <Link href={`/crypto-report/${scalp.symbol}`} className="font-black text-lg text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-rose-500 transition-all">
                                                {scalp.symbol}
                                             </Link>
                                             <div className="relative flex items-center justify-center">
                                                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest text-orange-600 border-orange-300/50 bg-orange-100/50 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30 shadow-sm relative z-10">HOT</Badge>
                                                <div className="absolute inset-0 bg-orange-500/40 blur-md rounded-full animate-pulse"></div>
                                             </div>
                                          </div>
                                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-2 leading-relaxed">{scalp.momentum}</p>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs shrink-0 bg-white/60 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner relative z-10">
                                          <div className="text-slate-500">Entry: <span className="font-bold text-slate-900 dark:text-white text-sm">{scalp.entryPrice || scalp.entryZone}</span></div>
                                          <div className="text-slate-500">Alokasi: <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{scalp.allocationPercentage || '-'}</span></div>
                                          <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold mt-1"><Target className="w-3.5 h-3.5"/> {scalp.targetPrice || scalp.target}</div>
                                          <div className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold mt-1"><ShieldAlert className="w-3.5 h-3.5"/> {scalp.stopLossPrice || scalp.stopLoss}</div>
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
                                     const recColor = isBuy ? "from-emerald-500/10 to-transparent border-emerald-200/50 dark:border-emerald-900/50" 
                                       : isSell ? "from-rose-500/10 to-transparent border-rose-200/50 dark:border-rose-900/50" 
                                       : "from-slate-500/10 to-transparent border-slate-200/50 dark:border-slate-800/50";
                                     
                                     const strokeColor = isBuy ? "#10b981" : isSell ? "#f43f5e" : "#64748b";
                                     const klinesData = report.rawMarketData?.find((md: any) => md.symbol === coin.symbol)?.klines || [];
                                     const gradientLine = isBuy ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : isSell ? 'bg-gradient-to-b from-rose-400 to-rose-600' : 'bg-gradient-to-b from-slate-400 to-slate-600';

                                     return (
                                       <div key={i} className={`group flex flex-col xl:flex-row xl:items-stretch justify-between gap-5 rounded-2xl border bg-gradient-to-br bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm ${recColor} overflow-hidden shadow-sm p-5 md:p-6 relative transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${gradientLine}`}></div>
                                          
                                          {/* Left Section: Info & Text */}
                                          <div className="flex-1 flex flex-col justify-center pl-2 relative z-10">
                                             <div className="flex items-center gap-3 mb-3">
                                                <Link href={`/crypto-report/${coin.symbol}`} className={`font-black text-xl text-slate-900 dark:text-white transition-all ${isBuy ? 'group-hover:text-emerald-500' : isSell ? 'group-hover:text-rose-500' : 'group-hover:text-slate-500'}`}>
                                                  {coin.symbol}
                                                </Link>
                                                <Badge variant="outline" className={`text-[11px] font-black tracking-widest uppercase bg-white/60 dark:bg-slate-950/60 border-current shadow-sm ${isBuy ? 'text-emerald-600 dark:text-emerald-400' : isSell ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                  {coin.recommendation}
                                                </Badge>
                                                {(() => {
                                                  const rawData = report.rawMarketData?.find((md: any) => md.symbol === coin.symbol);
                                                  if (rawData?.rsi14) {
                                                    const rsi = Math.round(rawData.rsi14);
                                                    return (
                                                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest ${rsi <= 30 ? 'bg-emerald-100/50 text-emerald-800 border-emerald-300/50 dark:bg-emerald-500/10 dark:text-emerald-400' : rsi >= 70 ? 'bg-rose-100/50 text-rose-800 border-rose-300/50 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-100/50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300'}`}>
                                                        RSI: {rsi}
                                                      </Badge>
                                                    );
                                                  }
                                                  return null;
                                                })()}
                                             </div>
                                             <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {coin.analysis}
                                             </p>
                                          </div>

                                          {/* Right Section: Metrics & Chart */}
                                          <div className="flex flex-col sm:flex-row xl:flex-col items-center xl:items-end justify-center gap-4 xl:w-[22rem] shrink-0 border-t xl:border-t-0 xl:border-l border-slate-200/50 dark:border-slate-700/50 pt-5 xl:pt-0 xl:pl-5">
                                             {(coin.supportLevel || coin.resistanceLevel || coin.takeProfit || coin.stopLoss) && (
                                                <div className="grid grid-cols-2 gap-3 text-xs w-full bg-white/70 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner text-left relative z-10">
                                                   {coin.supportLevel && <div className="text-slate-500">Sup: <span className="font-bold text-slate-900 dark:text-white">{coin.supportLevel}</span></div>}
                                                   {coin.resistanceLevel && <div className="text-slate-500">Res: <span className="font-bold text-slate-900 dark:text-white">{coin.resistanceLevel}</span></div>}
                                                   {coin.takeProfit && <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold"><Target className="w-3.5 h-3.5"/> TP: {coin.takeProfit}</div>}
                                                   {coin.stopLoss && <div className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold"><ShieldAlert className="w-3.5 h-3.5"/> SL: {coin.stopLoss}</div>}
                                                </div>
                                             )}
                                             
                                             {klinesData.length > 0 && (
                                                <div className="w-full mt-auto relative z-10">
                                                   <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 text-center xl:text-right">Tren 4 Jam</div>
                                                   <div className="w-full shadow-[0_4px_12px_rgb(0,0,0,0.03)] rounded-xl overflow-hidden border border-slate-100/50 dark:border-slate-800/50">
                                                     <CryptoCandlestick 
                                                        symbol={coin.symbol}
                                                        klines={klinesData} 
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
