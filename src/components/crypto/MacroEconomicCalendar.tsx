"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, AlertCircle, RefreshCw, BarChart2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MacroEconomicCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Calendar via Proxy API untuk menghindari CORS dan 429
        const calRes = await fetch("/api/macro-calendar");
        if (!calRes.ok) throw new Error("Gagal mengambil data kalender makro");
        const calData = await calRes.json();
        
        // Group by Date
        const grouped = calData.reduce((acc: any, curr: any) => {
           // Skip holidays and low impact if you want, but user wants to see them.
           // Format date string to local
           const dateObj = new Date(curr.date);
           const dateStr = dateObj.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
           if (!acc[dateStr]) acc[dateStr] = [];
           acc[dateStr].push(curr);
           return acc;
        }, {});
        
        // Convert to array
        const groupedArr = Object.keys(grouped).map(k => ({
           dateStr: k,
           rawDate: new Date(grouped[k][0].date),
           events: grouped[k]
        }));
        
        groupedArr.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
        setEvents(groupedArr);

        // Fetch Weekly Report for AI Summary
        const q = query(
          collection(db, "cryptoReports"),
          where("isWeekly", "==", true),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setWeeklyReport(snapshot.docs[0].data());
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getImpactColor = (impact: string) => {
    switch(impact.toLowerCase()) {
      case "high": return "bg-rose-500 text-white border-rose-500 shadow-rose-500/20";
      case "medium": return "bg-orange-500 text-white border-orange-500 shadow-orange-500/20";
      case "low": return "bg-yellow-400 text-slate-800 border-yellow-400 shadow-yellow-400/20";
      default: return "bg-slate-200 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const getImpactLabel = (impact: string) => {
    switch(impact.toLowerCase()) {
      case "high": return "HIGH";
      case "medium": return "MED";
      case "low": return "LOW";
      default: return "HOLIDAY";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p className="font-medium animate-pulse">Menghubungkan ke server Forex Factory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-3xl border border-rose-100 dark:border-rose-900/50">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="font-bold text-lg mb-1">Gagal Memuat Kalender</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* AI Weekly Forecast */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-900 to-slate-900 overflow-hidden relative">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart2 className="w-48 h-48" />
         </div>
         <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                <Calendar className="w-6 h-6 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-black text-white">Outlook Makro Mingguan (AI)</h2>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
               <p className="text-indigo-100/90 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                 {weeklyReport?.reportData?.weeklyMacroCalendarForecast || 
                  weeklyReport?.reportData?.weeklyStrategy ||
                  "Menunggu rilis AI mingguan terbaru. Laporan macro forecast akan muncul otomatis pada siklus analisis AI hari Senin berikutnya."}
               </p>
            </div>
         </CardContent>
      </Card>

      {/* Calendar Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
         {events.map((dayGroup, idx) => (
           <div key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
             
             {/* Day Header */}
             <div className="bg-slate-50 dark:bg-slate-950/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-y border-slate-100 dark:border-slate-800/50 first:border-t-0">
               <h3 className="font-bold text-slate-800 dark:text-slate-200">{dayGroup.dateStr}</h3>
               {dayGroup.rawDate.toDateString() === new Date().toDateString() && (
                 <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-0">HARI INI</Badge>
               )}
             </div>

             {/* Events */}
             <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
               {dayGroup.events.map((event: any, eIdx: number) => {
                 const timeStr = new Date(event.date).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
                 const isPast = new Date(event.date) < new Date();
                 
                 return (
                   <div key={eIdx} className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${isPast ? 'opacity-60' : ''}`}>
                     
                     <div className="flex items-center gap-4 sm:w-48 shrink-0">
                       <span className="font-medium text-slate-600 dark:text-slate-400 w-16">{timeStr}</span>
                       <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 uppercase">{event.country}</Badge>
                     </div>

                     <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                       <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                         <Badge className={`${getImpactColor(event.impact)} text-[10px] w-14 justify-center shadow-sm`}>
                           {getImpactLabel(event.impact)}
                         </Badge>
                         <span className={`font-semibold text-sm sm:text-base ${event.impact === 'High' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                           {event.title}
                         </span>
                       </div>

                       {event.impact !== "Holiday" && (
                         <div className="flex items-center gap-4 text-sm mt-2 sm:mt-0 sm:w-64 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                           <div className="flex flex-col w-1/3">
                             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Act</span>
                             <span className="font-bold text-slate-900 dark:text-white">{event.actual || "-"}</span>
                           </div>
                           <div className="flex flex-col w-1/3 border-l border-slate-200 dark:border-slate-700 pl-3">
                             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Fcst</span>
                             <span className="text-slate-600 dark:text-slate-300">{event.forecast || "-"}</span>
                           </div>
                           <div className="flex flex-col w-1/3 border-l border-slate-200 dark:border-slate-700 pl-3">
                             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Prev</span>
                             <span className="text-slate-500 dark:text-slate-400">{event.previous || "-"}</span>
                           </div>
                         </div>
                       )}
                     </div>

                     {isPast && event.impact !== "Holiday" && (
                       <div className="hidden sm:flex shrink-0">
                         <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-50" />
                       </div>
                     )}

                   </div>
                 );
               })}
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}
