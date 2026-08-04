"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Flame, AlertTriangle, ShieldAlert, Clock, Skull } from "lucide-react";

export default function DangerZonePage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    if (!authLoading && role && role.startsWith("admin")) {
        const q = query(collection(db, "cryptoDangerZone"), orderBy("createdAt", "desc"), limit(14));
        unsubscribe = onSnapshot(q, (snapshot) => {
           const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           setReports(data);
           if (data.length > 0) {
               setSelectedReportId(prev => prev ? prev : data[0].id);
           }
           setLoading(false);
        }, (err) => {
           console.error("Failed to fetch latest danger zone data:", err);
           setLoading(false);
        });
    } else if (!authLoading) {
        setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authLoading, role]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen bg-black"><Loader2 className="animate-spin h-10 w-10 text-red-600" /></div>;
  }

  if (!user || !role?.startsWith("admin")) {
    return <div className="p-8 text-center bg-black min-h-screen text-white">Akses ditolak. Halaman khusus Executive.</div>;
  }

  const latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  if (!latestReport) {
    return <div className="p-8 text-center bg-black min-h-screen text-white">Belum ada data Danger Zone.</div>;
  }

  const coins = latestReport.coins || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <div className="w-full relative">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-950/40 backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="text-red-400 hover:text-white hover:bg-red-900/50 rounded-full transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500 flex items-center gap-2">
                        <Flame className="w-6 h-6 text-red-600" />
                        Danger Zone
                    </h1>
                    <p className="text-xs sm:text-sm text-red-400/70 font-medium">Radar token unlock dan potensi distribusi mematikan.</p>
                </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2">
                <Badge variant="outline" className="bg-red-950 text-red-500 border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.15)]">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> High Risk Radar
                </Badge>
                
                <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                  <SelectTrigger className="w-[200px] h-8 text-xs bg-slate-900 border-slate-800 text-slate-300 focus:ring-0 focus:ring-offset-0 rounded-lg">
                     <SelectValue placeholder="Pilih Waktu" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-300 rounded-lg">
                     {reports.map(r => {
                        const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                        const isLatest = r.id === reports[0]?.id;
                        return (
                           <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                              {d.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB {isLatest && "(Terbaru)"}
                           </SelectItem>
                        )
                     })}
                  </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
         
         <div className="mb-8 p-5 rounded-2xl bg-red-950/30 border border-red-900/50 text-red-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl"></div>
            <h3 className="font-bold text-red-500 mb-2 flex items-center gap-2 relative z-10">
                <ShieldAlert className="w-4 h-4" /> Mengapa aset masuk ke Danger Zone?
            </h3>
            <p className="text-sm leading-relaxed opacity-90 relative z-10 text-red-300/80">
                Aset yang masuk ke radar ini sedang menghadapi ancaman distribusi masif dari investor awal (*Token Unlock*), kelemahan makro/regulasi, atau menunjukkan momentum *downtrend* struktural yang sangat fatal. Jangan berinvestasi di aset ini, atau gunakan informasi ini untuk posisi *Short-Selling*.
            </p>
         </div>

         <div className="space-y-6">
            {coins.map((coin: any, i: number) => {
                const isShort = coin.action?.toUpperCase().includes("SHORT");
                
                return (
                <Card key={i} className="group relative bg-black/40 backdrop-blur-md border-red-900/40 overflow-hidden hover:border-red-600/50 transition-all duration-500">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-600 to-rose-900"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-red-900/30">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-white tracking-tight">{coin.symbol}</h2>
                                    {isShort ? (
                                        <Badge className="bg-rose-950 text-rose-400 border-rose-800">SHORT OPPORTUNITY</Badge>
                                    ) : (
                                        <Badge className="bg-red-950 text-red-500 border-red-900">AVOID (JAUHI)</Badge>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-red-300/80 font-mono tracking-wider">
                                    {coin.currentPrice}
                                </div>
                            </div>
                        </div>

                        {coin.quantitativeMetrics && (
                           <div className="grid grid-cols-3 gap-3 mb-6">
                              <div className="bg-red-950/30 p-3 rounded-lg border border-red-900/30">
                                 <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Token Unlock</div>
                                 <div className="text-sm font-black text-rose-400">{coin.quantitativeMetrics.unlockDate || 'N/A'}</div>
                              </div>
                              <div className="bg-red-950/30 p-3 rounded-lg border border-red-900/30">
                                 <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Drawdown</div>
                                 <div className="text-sm font-black text-rose-500">{coin.quantitativeMetrics.drawdownPct}%</div>
                              </div>
                              <div className="bg-red-950/30 p-3 rounded-lg border border-red-900/30">
                                 <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Vol Change</div>
                                 <div className="text-sm font-black text-red-400">{coin.quantitativeMetrics.volumeChangePct}%</div>
                              </div>
                           </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-red-500/80 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Skull className="w-4 h-4 text-red-600" /> Analisis Fatalitas (Red Flag)
                            </h4>
                            <p className="text-red-200 text-sm leading-relaxed font-medium bg-red-950/20 p-4 rounded-xl border border-red-900/30">
                                {coin.dangerReason}
                            </p>
                        </div>
                    </div>
                </Card>
            )})}
         </div>

      </div>
    </div>
  );
}
