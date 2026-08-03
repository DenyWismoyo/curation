"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, ChevronRight, LayoutList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
    return (
      <div className="w-full flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (dailyReports.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
          <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Macro Calendar (7 Hari)</h2>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-2 snap-x scrollbar-hide">
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
              className={`snap-center shrink-0 w-[120px] rounded-2xl p-4 cursor-pointer transition-all duration-300 border 
                ${isLatest ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 -translate-y-1 hover:-translate-y-2' : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}
              `}
            >
              <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isLatest ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                {dayName}
              </div>
              <div className="text-3xl font-black mb-1">
                {dayNum}
              </div>
              <div className={`text-sm font-medium ${isLatest ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>
                {monthStr}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
          {selectedReport && (
            <>
              <div className="bg-indigo-600 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Calendar className="w-32 h-32" />
                </div>
                <Badge className="bg-indigo-500/50 hover:bg-indigo-500/70 border-0 text-white mb-3">Daily Outlook</Badge>
                <DialogTitle className="text-2xl font-black mb-1">
                  {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : "Laporan"}
                </DialogTitle>
                <DialogDescription className="text-indigo-100">
                  Ringkasan kalender makro dan perbandingan tren.
                </DialogDescription>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-indigo-500">
                  <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-bold text-lg">
                    <LayoutList className="w-5 h-5 text-indigo-500" /> Executive Summary
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800">
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
