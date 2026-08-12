"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useBundleLoader } from "@/hooks/useBundleLoader";
import { Calendar, ChevronRight, LayoutList, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function CryptoCalendar() {
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { data: reportsData, loading: reportsLoading, source } = useBundleLoader<any>(
    'bundles/crypto-reports.txt',
    ['crypto-daily-reports']
  );

  useEffect(() => {
    if (reportsLoading) return;
    
    if (source === 'bundle' && reportsData.length > 0) {
      setDailyReports([...reportsData].reverse()); // Urutkan dari terlama (kiri) ke terbaru (kanan)
      setLoading(false);
      return;
    }

    const fetchCalendarDataFallback = async () => {
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
        console.error("Failed to fetch calendar data fallback", error);
      }
      setLoading(false);
    }
    fetchCalendarDataFallback();
  }, [reportsLoading, source, reportsData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (dailyReports.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
          <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-sm font-bold tracking-tight text-foreground">Macro Calendar (7 Hari)</h2>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-5 snap-x hide-scrollbar px-1">
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
              className={`group snap-center shrink-0 w-[90px] md:w-[100px] rounded-2xl p-4 cursor-pointer transition-all duration-300 border relative overflow-hidden flex flex-col items-center justify-center
                ${isLatest 
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400/50 shadow-lg shadow-amber-500/30 -translate-y-1' 
                  : 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-md text-muted-foreground dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md hover:-translate-y-0.5'
                }
              `}
            >
              {isLatest && <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 blur-xl rounded-full translate-x-1/2 -translate-y-1/2"></div>}
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isLatest ? 'text-amber-100' : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400 transition-colors'}`}>
                {dayName}
              </div>
              <div className={`text-2xl font-black tracking-tighter mb-0.5 ${isLatest ? 'text-white' : 'text-foreground'}`}>
                {dayNum}
              </div>
              <div className={`text-[11px] font-bold tracking-widest uppercase ${isLatest ? 'text-amber-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {monthStr}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden bg-background text-foreground border border-slate-200 dark:border-slate-800 shadow-2xl">
          {selectedReport && (
            <>
              <div className="bg-amber-600 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Calendar className="w-32 h-32" />
                </div>
                <div className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-amber-500/20 text-white border-0 mb-3">
                  Daily Outlook
                </div>
                <DialogTitle className="text-xl font-black mb-1">
                  {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : "Laporan"}
                </DialogTitle>
                <DialogDescription className="text-amber-100/80 text-sm">
                  Ringkasan kalender makro dan perbandingan tren.
                </DialogDescription>
              </div>
              <div className="p-6 card-solid">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-amber-500">
                  <div className="flex items-center gap-2 mb-3 text-foreground font-bold text-base">
                    <LayoutList className="w-5 h-5 text-amber-500" /> Executive Summary
                  </div>
                  <div className="bg-muted text-muted-foreground p-4 rounded-2xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800/50">
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
