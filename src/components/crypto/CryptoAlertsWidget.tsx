"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BellRing, ExternalLink, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
          <Button variant="outline" size="icon" className="relative rounded-full bg-slate-900 shadow-lg shadow-slate-500/20 hover:bg-slate-100 hover:bg-slate-800 transition-transform hover:scale-110 w-12 h-12 border-slate-800">
            <BellRing className="w-5 h-5 text-slate-300" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white border-slate-900 animate-pulse"></span>
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col bg-slate-50 bg-slate-950 border-l border-slate-800 shadow-2xl">
        <SheetHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 relative z-10 shadow-sm">
          <SheetTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-white">
             <BellRing className="w-5 h-5 text-indigo-500" />
             Notification Center
          </SheetTitle>
          <SheetDescription className="text-slate-500 text-slate-400 text-sm">
            Riwayat peringatan sinyal scalping "Siap Meledak".
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden relative">
           <ScrollArea className="h-full px-6 py-4">
             {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
             ) : alerts.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 mt-20">
                 <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <BellRing className="w-8 h-8 text-slate-300 text-slate-600" />
                 </div>
                 <h4 className="font-bold text-slate-300 mb-1">Kosong</h4>
                 <p className="text-sm">Belum ada riwayat notifikasi scalping.</p>
               </div>
             ) : (
               <div className="space-y-4 pb-10">
                 {alerts.map((alert) => (
                   <div key={alert.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                     <div className="flex justify-between items-start mb-2 pl-2">
                       <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 bg-rose-900/30 text-rose-400 border-rose-800 uppercase text-[10px] tracking-wider font-bold">
                         <Zap className="w-3 h-3 mr-1" />
                         Alert
                       </Badge>
                       <span className="text-xs text-slate-400 font-medium">
                         {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ""}
                       </span>
                     </div>
                     <h3 className="font-bold text-white text-lg mb-1 pl-2">{alert.title}</h3>
                     <p className="text-sm text-slate-400 pl-2 whitespace-pre-wrap leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                       {alert.body}
                     </p>
                     
                     <div className="mt-4 pl-2 flex items-center justify-between">
                        <div className="flex gap-3 text-xs font-medium">
                           <span className="text-emerald-400">TP: {alert.targetPrice || '-'}</span>
                           <span className="text-rose-400">SL: {alert.stopLossPrice || '-'}</span>
                        </div>
                        <Link href={`/crypto-report/${alert.symbol.replace('USDT', '')}`} onClick={() => setIsOpen(false)}>
                           <Button variant="ghost" size="sm" className="h-7 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 hover:bg-indigo-900/30 text-xs px-2">
                              Lihat <ExternalLink className="w-3 h-3 ml-1" />
                           </Button>
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
