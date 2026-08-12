"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useBundleLoader } from "@/hooks/useBundleLoader";
import { Calendar, AlertCircle, RefreshCw, BarChart2, CheckCircle2, Globe, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MacroEconomicCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

        // Set default selected tab
        const todayStr = new Date().toDateString();
        const todayGroup = groupedArr.find(g => g.rawDate.toDateString() === todayStr);
        if (todayGroup) {
          setSelectedDateStr(todayGroup.dateStr);
        } else if (groupedArr.length > 0) {
          setSelectedDateStr(groupedArr[0].dateStr);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshTrigger]);

  const { data: reportsData, loading: reportsLoading, source } = useBundleLoader<any>(
    'bundles/crypto-reports.txt',
    ['crypto-weekly-report']
  );

  useEffect(() => {
    if (reportsLoading) return;
    
    if (source === 'bundle' && reportsData.length > 0) {
      setWeeklyReport(reportsData[0]);
      return;
    }

    // Fallback
    const fetchWeeklyFallback = async () => {
      try {
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
      } catch (error) {
        console.warn("Failed to fetch weekly fallback:", error);
      }
    };

    fetchWeeklyFallback();
  }, [reportsLoading, source, reportsData]);

  const getImpactColor = (impact: string) => {
    switch(impact.toLowerCase()) {
      case "high": return "bg-rose-500 text-foreground border-rose-500 shadow-rose-500/20";
      case "medium": return "bg-orange-500 text-foreground border-orange-500 shadow-orange-500/20";
      case "low": return "bg-yellow-400 text-foreground border-yellow-400 shadow-yellow-400/20";
      default: return "bg-slate-200 text-muted-foreground border-border bg-secondary text-secondary-foreground text-muted-foreground";
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
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl border-rose-200 dark:border-rose-800">
         <AlertCircle className="w-8 h-8 text-rose-500 mb-4" />
         <h3 className="text-lg font-bold text-foreground">Gagal Memuat</h3>
         <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
         <Globe className="w-8 h-8 text-muted-foreground mb-4" />
         <h3 className="text-lg font-bold text-foreground">Kalender Kosong</h3>
         <p className="text-muted-foreground">Tidak ada event makroekonomi yang terjadwal.</p>
      </div>
    );
  }

  const selectedDayGroup = events.find(g => g.dateStr === selectedDateStr);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Compact Header: AI Forecast & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-start gap-4 pb-4">
        
        {/* AI Weekly Forecast (Compact) */}
        <div className="card-solid flex-1 overflow-hidden relative bg-gradient-to-r from-amber-500/10 to-amber-500/5 dark:from-amber-900/40 dark:to-slate-900 border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl">
           <div className="absolute top-0 right-0 p-2 opacity-5">
              <BarChart2 className="w-24 h-24" />
           </div>
           <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Mingguan AI</h2>
                  <p className="text-[10px] font-bold text-muted-foreground">Macro Outlook</p>
                </div>
              </div>
              <div className="w-px h-10 bg-amber-200 dark:bg-amber-800/50 hidden sm:block"></div>
              <p className="text-slate-700 dark:text-amber-100/80 text-xs sm:text-sm leading-relaxed line-clamp-2">
                 {weeklyReport?.reportData?.weeklyMacroCalendarForecast || 
                  weeklyReport?.reportData?.weeklyStrategy ||
                  "Menunggu rilis AI mingguan terbaru pada hari Senin berikutnya."}
              </p>
           </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={selectedDateStr || ""}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="card-solid dark:bg-slate-800 text-foreground border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm h-full min-w-[200px]"
          >
            {events.map((dayGroup, idx) => {
              const isToday = dayGroup.rawDate.toDateString() === new Date().toDateString();
              return (
                <option key={idx} value={dayGroup.dateStr}>
                  {dayGroup.dateStr} {isToday ? "(Hari Ini)" : ""}
                </option>
              );
            })}
          </select>
          
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-4 card-solid dark:bg-slate-800 hover:bg-muted text-muted-foreground dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center group shadow-sm h-full"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5 text-muted-foreground group-hover:text-foreground dark:group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Calendar Table for Selected Day */}
      {selectedDayGroup && (
        <div className="mt-4 card-solid rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
           {/* Day Header */}
           <div className="bg-secondary text-secondary-foreground dark:bg-slate-950/50 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50">
             <h3 className="font-bold text-slate-200">{selectedDayGroup.dateStr}</h3>
             {selectedDayGroup.rawDate.toDateString() === new Date().toDateString() && (
               <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">HARI INI</span>
             )}
           </div>

           {/* Events */}
           <div className="divide-y divide-slate-800/50">
             {selectedDayGroup.events.map((event: any, eIdx: number) => {
               const timeStr = new Date(event.date).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
               const isPast = new Date(event.date) < new Date();
               
               return (
                 <div key={eIdx} className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:bg-slate-200 dark:bg-slate-800/20 ${isPast ? 'opacity-60' : ''}`}>
                   
                   <div className="flex items-center gap-4 sm:w-48 shrink-0">
                     <span className="font-medium text-muted-foreground w-16">{timeStr}</span>
                     <Badge className="bg-secondary text-secondary-foreground text-muted-foreground border-slate-200 dark:border-slate-800 uppercase">{event.country}</Badge>
                   </div>

                   <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                     <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                       <Badge className={`${getImpactColor(event.impact)} text-[10px] w-14 justify-center shadow-sm`}>
                         {getImpactLabel(event.impact)}
                       </Badge>
                       <span className={`font-semibold text-sm sm:text-base ${event.impact === 'High' ? 'text-foreground' : 'text-muted-foreground'}`}>
                         {event.title}
                       </span>
                     </div>

                     {event.impact !== "Holiday" && (
                       <div className="flex items-center gap-4 text-sm mt-2 sm:mt-0 sm:w-64 shrink-0 bg-slate-200 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                         <div className="flex flex-col w-1/3">
                           <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Act</span>
                           <span className={`font-bold ${event.actual ? 'text-foreground' : 'text-muted-foreground'}`}>
                             {event.actual || "-"}
                           </span>
                         </div>
                         <div className="flex flex-col w-1/3 border-l border-slate-200 dark:border-slate-800 pl-3">
                           <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Fcst</span>
                           <span className="text-muted-foreground">{event.forecast || "-"}</span>
                         </div>
                         <div className="flex flex-col w-1/3 border-l border-slate-200 dark:border-slate-800 pl-3">
                           <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Prev</span>
                           <span className="text-muted-foreground">{event.previous || "-"}</span>
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
      )}
    </div>
  );
}
