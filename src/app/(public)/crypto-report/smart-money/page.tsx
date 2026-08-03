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
import { Loader2, ArrowLeft, Eye, Target, Activity, Clock } from "lucide-react";

export default function SmartMoneyPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [latestReport, setLatestReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    if (!authLoading && role && role.startsWith("admin")) {
        const q = query(collection(db, "cryptoSmartMoney"), orderBy("createdAt", "desc"), limit(1));
        unsubscribe = onSnapshot(q, (snapshot) => {
           if (!snapshot.empty) {
               setLatestReport({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
           }
           setLoading(false);
        }, (err) => {
           console.error("Failed to fetch latest smart money data:", err);
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
    return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin h-10 w-10 text-purple-500" /></div>;
  }

  if (!user || !role?.startsWith("admin")) {
    return <div className="p-8 text-center bg-slate-950 min-h-screen text-white">Akses ditolak. Halaman khusus Executive.</div>;
  }

  if (!latestReport) {
    return <div className="p-8 text-center bg-slate-950 min-h-screen text-white">Belum ada data Smart Money Tracker hari ini.</div>;
  }

  const coins = latestReport.coins || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 selection:bg-purple-500/30 font-sans">
      
      {/* HEADER SECTION */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center gap-2">
                        <Eye className="w-6 h-6 text-purple-500" />
                        Smart Money Tracker
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Melacak akumulasi paus (Whale) sebelum breakout.</p>
                </div>
            </div>
            <div className="hidden sm:flex flex-col items-end">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                    <Activity className="w-3.5 h-3.5 mr-1.5" /> Live Radar
                </Badge>
                <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" /> {createdAt.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                </span>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
         
         <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20 text-slate-300">
            <h3 className="font-bold text-purple-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Apa itu Smart Money Tracker?
            </h3>
            <p className="text-sm leading-relaxed opacity-90">
                Fitur ini mendeteksi aset kripto yang mengalami lonjakan volume perdagangan drastis (Volume Anomaly) namun pergerakan harganya sengaja ditahan. Ini adalah indikasi kuat bahwa institusi keuangan besar atau paus sedang mengakumulasi aset secara perlahan sebelum pergerakan harga yang masif.
            </p>
         </div>

         <div className="space-y-6">
            {coins.map((coin: any, i: number) => (
                <Card key={i} className="group relative bg-slate-900/50 backdrop-blur-sm border-slate-800/60 overflow-hidden hover:border-purple-500/30 transition-all duration-500">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-white tracking-tight">{coin.symbol}</h2>
                                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">WHALE DETECTED</Badge>
                                </div>
                                <div className="text-2xl font-bold text-slate-300 font-mono tracking-wider">
                                    {coin.currentPrice}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <div className="flex items-center gap-2 text-sm bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-800">
                                    <Target className="w-4 h-4 text-purple-400" /> 
                                    <span className="text-slate-400">Breakout Target:</span>
                                    <span className="font-bold text-purple-300">{coin.breakoutTarget}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-purple-500" /> Analisis Akumulasi DeepSeek
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed font-medium bg-purple-950/20 p-4 rounded-xl border border-purple-900/30">
                                {coin.accumulationReason}
                            </p>
                        </div>
                    </div>
                </Card>
            ))}
         </div>

      </div>
    </div>
  );
}
