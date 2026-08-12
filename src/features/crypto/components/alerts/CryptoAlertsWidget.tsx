"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { BellRing, ExternalLink, Zap, X, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

export default function CryptoAlertsWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "cryptoAlerts"), orderBy("createdAt", "desc"), limit(20));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(data);
    } catch (e) {
      console.error("Failed to fetch alerts", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    if (e.targetTouches[0].clientX - touchStart > 75) {
      setIsOpen(false);
      setTouchStart(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-secondary text-secondary-foreground text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          <BellRing className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-background"></span>
        </button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[400px] p-0 flex flex-col bg-background text-foreground border-l border-slate-200 dark:border-slate-800 shadow-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <SheetHeader className="px-6 py-5 card-solid border-b border-slate-200 dark:border-slate-800 relative z-10 shadow-sm">
          <div className="flex justify-between items-start">
            <SheetTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
               <BellRing className="w-5 h-5 text-indigo-500" />
               Notification Center
            </SheetTitle>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <SheetDescription className="text-muted-foreground text-muted-foreground text-sm">
            Riwayat peringatan sinyal scalping "Siap Meledak".
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden relative">
           <ScrollArea className="h-full px-6 py-4">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-muted-foreground text-sm">Memuat Notifikasi...</p>
                </div>
             ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
                  <BellRing className="w-8 h-8 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold text-foreground">Kosong</h3>
                  <p className="text-muted-foreground">Belum ada riwayat notifikasi scalping.</p>
                </div>
             ) : (
               <div className="space-y-4 pb-10">
                 {alerts.map((alert) => (
                   <div key={alert.id} className="card-solid relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 p-4 group hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                     <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                     <div className="flex justify-between items-start mb-2 pl-2">
                       <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-rose-500/20 text-rose-500 border-0 gap-1">
                         <Zap className="w-3 h-3" />
                         Alert
                       </span>
                       <span className="text-xs text-muted-foreground font-medium">
                         {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ""}
                       </span>
                     </div>
                     <h3 className="font-bold text-foreground text-lg mb-1 pl-2">{alert.title}</h3>
                     <p className="text-sm text-muted-foreground pl-2 whitespace-pre-wrap leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                       {alert.body}
                     </p>
                     
                     <div className="mt-4 pl-2 flex items-center justify-between">
                        <div className="flex gap-3 text-xs font-medium">
                           <span className="text-emerald-400">TP: {alert.targetPrice || '-'}</span>
                           <span className="text-rose-400">SL: {alert.stopLossPrice || '-'}</span>
                        </div>
                        <Link href={`/crypto-report/${alert.symbol.replace('USDT', '')}`} onClick={() => setIsOpen(false)}>
                           <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3 text-amber-500 hover:text-amber-400">
                               Lihat <ExternalLink className="w-3 h-3 ml-1" />
                           </button>
                        </Link>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
