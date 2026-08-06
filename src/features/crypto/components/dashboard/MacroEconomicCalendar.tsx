"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Calendar, AlertCircle, RefreshCw, BarChart2, CheckCircle2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CryptoCard, CryptoBadge, CryptoLoadingState, CryptoEmptyState, CryptoPageHeader } from "../ui/CryptoUIKit";

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
  }, [refreshTrigger]);

  const getImpactColor = (impact: string) => {
    switch(impact.toLowerCase()) {
      case "high": return "bg-rose-500 text-slate-900 dark:text-white border-rose-500 shadow-rose-500/20";
      case "medium": return "bg-orange-500 text-slate-900 dark:text-white border-orange-500 shadow-orange-500/20";
      case "low": return "bg-yellow-400 text-slate-800 border-yellow-400 shadow-yellow-400/20";
      default: return "bg-slate-200 text-slate-600 border-slate-200 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
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
    return <CryptoLoadingState type="skeleton" rows={5} />;
  }

  if (error) {
    return (
      <CryptoEmptyState 
         icon={<AlertCircle />}
         title="Gagal Memuat"
         description={error}
      />
    );
  }

  if (events.length === 0) {
    return (
      <CryptoEmptyState 
         icon={<Globe />}
         title="Kalender Kosong"
         description="Tidak ada event makroekonomi yang terjadwal."
      />
    );
  }

  const selectedDayGroup = events.find(g => g.dateStr === selectedDateStr);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Compact Header: AI Forecast & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-start gap-4 pb-4">
        
        {/* AI Weekly Forecast (Compact) */}
        <CryptoCard variant="elevated" className="flex-1 overflow-hidden relative bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 dark:from-indigo-900/40 dark:to-slate-900 border-indigo-200 dark:border-indigo-800/50 p-4">
           <div className="absolute top-0 right-0 p-2 opacity-5">
              <BarChart2 className="w-24 h-24" />
           </div>
           <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Mingguan AI</h2>
                  <p className="text-[10px] font-bold text-slate-500">Macro Outlook</p>
                </div>
              </div>
              <div className="w-px h-10 bg-indigo-200 dark:bg-indigo-800/50 hidden sm:block"></div>
              <p className="text-slate-700 dark:text-indigo-100/80 text-xs sm:text-sm leading-relaxed line-clamp-2">
                 {weeklyReport?.reportData?.weeklyMacroCalendarForecast || 
                  weeklyReport?.reportData?.weeklyStrategy ||
                  "Menunggu rilis AI mingguan terbaru pada hari Senin berikutnya."}
              </p>
           </div>
        </CryptoCard>

        {/* Calendar Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={selectedDateStr || ""}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm h-full min-w-[200px]"
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
            className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center group shadow-sm h-full"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Calendar Table for Selected Day */}
      {selectedDayGroup && (
        <CryptoCard variant="default" className="mt-4">
           {/* Day Header */}
           <div className="bg-slate-100 dark:bg-slate-950/50 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50">
             <h3 className="font-bold text-slate-200">{selectedDayGroup.dateStr}</h3>
             {selectedDayGroup.rawDate.toDateString() === new Date().toDateString() && (
               <CryptoBadge variant="info">HARI INI</CryptoBadge>
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
                     <span className="font-medium text-slate-500 dark:text-slate-400 w-16">{timeStr}</span>
                     <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 uppercase">{event.country}</Badge>
                   </div>

                   <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                     <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                       <Badge className={`${getImpactColor(event.impact)} text-[10px] w-14 justify-center shadow-sm`}>
                         {getImpactLabel(event.impact)}
                       </Badge>
                       <span className={`font-semibold text-sm sm:text-base ${event.impact === 'High' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                         {event.title}
                       </span>
                     </div>

                     {event.impact !== "Holiday" && (
                       <div className="flex items-center gap-4 text-sm mt-2 sm:mt-0 sm:w-64 shrink-0 bg-slate-200 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                         <div className="flex flex-col w-1/3">
                           <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Act</span>
                           <span className={`font-bold ${event.actual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                             {event.actual || "-"}
                           </span>
                         </div>
                         <div className="flex flex-col w-1/3 border-l border-slate-200 dark:border-slate-800 pl-3">
                           <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Fcst</span>
                           <span className="text-slate-600 dark:text-slate-300">{event.forecast || "-"}</span>
                         </div>
                         <div className="flex flex-col w-1/3 border-l border-slate-200 dark:border-slate-800 pl-3">
                           <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Prev</span>
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
        </CryptoCard>
      )}
    </div>
  );
}
