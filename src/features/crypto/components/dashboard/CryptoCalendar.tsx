"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Calendar, ChevronRight, LayoutList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CryptoCard, CryptoBadge, CryptoLoadingState } from "../ui/CryptoUIKit";

export default function CryptoCalendar() {
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalendarData() {
      try {
        const q = query(
          collection(db, "cryptoReports"),
          where("isDaily", "==", true),
          orderBy("createdAt", "desc"),
          limit(7)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDailyReports(data.reverse()); // Urutkan dari terlama (kiri) ke terbaru (kanan)
      } catch (error) {
        console.error("Failed to fetch calendar data", error);
      }
      setLoading(false);
    }
    fetchCalendarData();
  }, []);

  if (loading) {
    return <CryptoLoadingState type="spinner" />;
  }

  if (dailyReports.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Macro Calendar (7 Hari)</h2>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-4 snap-x no-scrollbar">
        {dailyReports.map((report, idx) => {
          const date = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
          const dayName = date.toLocaleDateString("id-ID", { weekday: 'short' });
          const dayNum = date.toLocaleDateString("id-ID", { day: '2-digit' });
          const monthStr = date.toLocaleDateString("id-ID", { month: 'short' });
          const isLatest = idx === dailyReports.length - 1;

          return (
            <div 
              key={report.id}
              onClick={() => { setSelectedReport(report); setIsOpen(true); }}
              className={`snap-center shrink-0 w-[100px] rounded-2xl p-4 cursor-pointer transition-all duration-300 border 
                ${isLatest 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 -translate-y-1' 
                  : 'bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                }
              `}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isLatest ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                {dayName}
              </div>
              <div className={`text-2xl font-black mb-0.5 ${isLatest ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                {dayNum}
              </div>
              <div className={`text-xs font-semibold ${isLatest ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-500'}`}>
                {monthStr}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
          {selectedReport && (
            <>
              <div className="bg-indigo-600 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Calendar className="w-32 h-32" />
                </div>
                <CryptoBadge variant="info" className="mb-3 bg-white/20 border-0 text-white">Daily Outlook</CryptoBadge>
                <DialogTitle className="text-xl font-black mb-1">
                  {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : "Laporan"}
                </DialogTitle>
                <DialogDescription className="text-indigo-100/80 text-sm">
                  Ringkasan kalender makro dan perbandingan tren.
                </DialogDescription>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-indigo-500">
                  <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-bold text-base">
                    <LayoutList className="w-5 h-5 text-indigo-500" /> Executive Summary
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800/50">
                    {selectedReport.reportData?.dailyCalendarSummary || 
                     selectedReport.reportData?.dailyRecap || 
                     "Laporan hari ini belum memiliki ringkasan kalender naratif khusus. Menunggu pembaruan siklus berikutnya."}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
