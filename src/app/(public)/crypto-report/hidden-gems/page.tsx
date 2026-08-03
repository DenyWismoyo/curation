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
import { Loader2, ArrowLeft, Diamond, Target, ShieldAlert, Activity, Clock, TrendingUp } from "lucide-react";

export default function HiddenGemsPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [latestReport, setLatestReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    if (!authLoading && role && role.startsWith("admin")) {
        const q = query(collection(db, "cryptoHiddenGems"), orderBy("createdAt", "desc"), limit(1));
        unsubscribe = onSnapshot(q, (snapshot) => {
           if (!snapshot.empty) {
               setLatestReport({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
           }
           setLoading(false);
        }, (err) => {
           console.error("Failed to fetch latest hidden gems:", err);
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
    return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin h-10 w-10 text-emerald-500" /></div>;
  }

  if (!user || !role?.startsWith("admin")) {
    return <div className="p-8 text-center bg-slate-950 min-h-screen text-white">Akses ditolak. Halaman khusus Executive.</div>;
  }

  if (!latestReport) {
    return <div className="p-8 text-center bg-slate-950 min-h-screen text-white">Belum ada data Hidden Gems hari ini.</div>;
  }

  const gems = latestReport.hiddenGems || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 selection:bg-emerald-500/30 font-sans">
      
      {/* HEADER NAVBAR */}
      <div className="sticky top-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Button onClick={() => router.back()} variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                 <ArrowLeft className="w-5 h-5" />
             </Button>
             <div>
                <div className="flex items-center gap-2">
                   <Diamond className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                   <h1 className="font-black text-xl text-white tracking-tight">Oversold Hidden Gems</h1>
                </div>
                <p className="text-xs font-medium text-slate-500">Medium-Term Reversal Finder</p>
             </div>
          </div>
          <div className="text-right hidden md:block">
             <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Last Scan</div>
             <div className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" /> {createdAt.toLocaleString("id-ID")} WIB
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12">
        
        {/* HERO SECTION */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/20 bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-black to-slate-900"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
          
          <div className="relative z-10 p-8 md:p-12">
             <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs uppercase tracking-widest font-black mb-6">
                SWING TRADING OPPORTUNITIES
             </Badge>
             <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
               Oversold <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Hidden Gems</span>
             </h2>
             <p className="text-slate-400 max-w-2xl text-lg leading-relaxed mb-8">
               Koin dengan RSI harian/H4 terendah yang dianalisis secara fundamental oleh DeepSeek-Reasoner untuk potensi pembalikan arah (reversal) menengah.
             </p>
             
             <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm max-w-3xl">
                <div className="flex items-start gap-4">
                   <div className="bg-emerald-500/20 p-3 rounded-xl">
                      <Activity className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                      <h4 className="text-white font-bold mb-1">Market Condition Summary</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{latestReport.marketCondition || "Tidak ada ringkasan kondisi pasar."}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* GEMS LIST */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
             <Diamond className="w-6 h-6 text-emerald-500" />
             <h3 className="text-2xl font-black text-white tracking-tight">Top Gems Today</h3>
          </div>

          {gems.length === 0 ? (
             <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
                <p className="text-slate-400">Tidak ada koin oversold yang lolos kriteria fundamental AI hari ini.</p>
             </Card>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gems.map((gem: any, idx: number) => (
                  <Card key={idx} className="bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 transition-all duration-300 overflow-hidden flex flex-col group shadow-xl">
                    <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-start">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-black text-white tracking-tight">{gem.symbol.replace("USDT", "")}</span>
                            <span className="text-xs font-bold text-slate-500">/USDT</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-400">
                             ${gem.currentPrice}
                          </div>
                       </div>
                       <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black">
                          RSI 1D: {gem.rsi1d}
                       </Badge>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                       <div className="mb-6 flex-1">
                         <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">DeepSeek Reasoning</div>
                         <p className="text-sm text-slate-300 leading-relaxed">
                            {gem.reasoning}
                         </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mt-auto">
                          <div className="bg-emerald-950/30 rounded-xl p-3 border border-emerald-900/50 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                                <TrendingUp className="w-8 h-8 text-emerald-500" />
                             </div>
                             <div className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Target className="w-3 h-3" /> Target (Mid-Term)
                             </div>
                             <div className="text-base font-black text-emerald-400">${gem.targetPrice}</div>
                          </div>
                          <div className="bg-rose-950/30 rounded-xl p-3 border border-rose-900/50 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                                <ShieldAlert className="w-8 h-8 text-rose-500" />
                             </div>
                             <div className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Invalidation
                             </div>
                             <div className="text-base font-black text-rose-400">${gem.stopLoss}</div>
                          </div>
                       </div>
                    </div>
                  </Card>
                ))}
             </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
