"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { BellRing, ExternalLink, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CryptoCard, CryptoBadge, CryptoButton, CryptoEmptyState, CryptoLoadingState } from "../ui/CryptoUIKit";
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="fixed bottom-[5.5rem] right-6 z-40">
          <button className="flex items-center justify-center relative rounded-full bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-slate-800 transition-transform hover:scale-110 w-12 h-12 border border-slate-200 dark:border-slate-800">
            <BellRing className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-200 dark:border-slate-900 animate-pulse"></span>
          </button>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl">
        <SheetHeader className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-10 shadow-sm">
          <SheetTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
             <BellRing className="w-5 h-5 text-indigo-500" />
             Notification Center
          </SheetTitle>
          <SheetDescription className="text-slate-500 text-slate-500 dark:text-slate-400 text-sm">
            Riwayat peringatan sinyal scalping "Siap Meledak".
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden relative">
           <ScrollArea className="h-full px-6 py-4">
             {loading ? (
                <CryptoLoadingState type="spinner" message="Memuat Notifikasi..." />
             ) : alerts.length === 0 ? (
                <CryptoEmptyState 
                  icon={<BellRing className="w-8 h-8" />} 
                  title="Kosong" 
                  description="Belum ada riwayat notifikasi scalping." 
                />
             ) : (
               <div className="space-y-4 pb-10">
                 {alerts.map((alert) => (
                   <CryptoCard key={alert.id} className="p-4 group">
                     <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                     <div className="flex justify-between items-start mb-2 pl-2">
                       <CryptoBadge variant="danger" className="text-[9px] gap-1 px-2 py-0.5">
                         <Zap className="w-3 h-3" />
                         Alert
                       </CryptoBadge>
                       <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                         {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ""}
                       </span>
                     </div>
                     <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 pl-2">{alert.title}</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400 pl-2 whitespace-pre-wrap leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                       {alert.body}
                     </p>
                     
                     <div className="mt-4 pl-2 flex items-center justify-between">
                        <div className="flex gap-3 text-xs font-medium">
                           <span className="text-emerald-400">TP: {alert.targetPrice || '-'}</span>
                           <span className="text-rose-400">SL: {alert.stopLossPrice || '-'}</span>
                        </div>
                        <Link href={`/crypto-report/${alert.symbol.replace('USDT', '')}`} onClick={() => setIsOpen(false)}>
                           <CryptoButton variant="ghost" size="sm" className="h-8 text-indigo-400 hover:text-indigo-300">
                              Lihat <ExternalLink className="w-3 h-3 ml-1" />
                           </CryptoButton>
                        </Link>
                     </div>
                   </CryptoCard>
                 ))}
               </div>
             )}
           </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
