"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Eye, Target, Activity, Clock, Zap } from "lucide-react";

export default function SmartMoneyPage() {
  const router = useRouter();
  const { user, role, loading: authLoading, isPremium } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith("admin");
  const hasAccess = isAdmin || isPremium;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        if (authLoading) return;
        
        if (!hasAccess) {
            if (isMounted) setLoading(false);
            return;
        }

        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error("No token");

            const res = await fetch('/api/crypto/smart-money', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(`Failed to fetch: ${res.status} ${errJson.details || res.statusText}`);
            }

            const json = await res.json();
            if (isMounted && json.data) {
                const parsedData = json.data.map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                }));
                setReports(parsedData);
                if (parsedData.length > 0) {
                    setSelectedReportId(prev => prev ? prev : parsedData[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch latest smart money data:", err);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, hasAccess, user]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground flex-col gap-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Memuat Radar Smart Money...</p>
      </div>
    );
  }

  if (!user || !role?.startsWith("admin")) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-secondary text-secondary-foreground dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 text-muted-foreground border border-slate-200 dark:border-slate-800">
            <Eye className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">Akses Ditolak</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Halaman khusus Executive. Silakan upgrade paket Anda.
          </p>
        </div>
      </div>
    );
  }

  const latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  if (!latestReport) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-secondary text-secondary-foreground dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 text-muted-foreground border border-slate-200 dark:border-slate-800">
            <Eye className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">Belum Ada Data</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Menunggu radar Smart Money berikutnya dari AI.
          </p>
        </div>
      </div>
    );
  }

  const coins = latestReport.coins || [];

  return (
    <div className="w-full relative">
      
      {/* HEADER SECTION */}
      <div className="bg-background text-foreground backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                <Target className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-gradient-to-r from-amber-500 to-orange-400 text-white border-0">EXECUTIVE ONLY</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
            Smart Money Radar
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
            Melacak aliran dana besar institusi dan whale. Data bersifat sangat konfidensial.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/crypto-report">
            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 h-11 px-6">
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </button>
          </Link>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2 shrink-0 mb-6">
        <Select value={selectedReportId} onValueChange={setSelectedReportId}>
            <SelectTrigger className="w-[200px] h-9 text-xs bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-muted-foreground rounded-xl">
            <SelectValue placeholder="Pilih Waktu" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-muted-foreground rounded-xl shadow-xl">
            {reports.map(r => {
                const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                const isLatest = r.id === reports[0]?.id;
                return (
                <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
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
         
         {/* Narrative / AI Report */}
         <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
                <Target className="w-6 h-6 text-amber-500" />
                <h2 className="text-2xl font-black text-foreground">Analisis Pergerakan Whale</h2>
            </div>
            <div className="p-6 sm:p-8 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed relative z-10 whitespace-pre-wrap font-medium">
                    {latestReport.reportData?.smartMoneyNarrative || "Tidak ada detail narrative yang disertakan dalam laporan ini."}
                </div>
            </div>
         </div>

          <div className="space-y-6">
            {coins.map((coin: any, i: number) => (
                <div key={i} className="relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-foreground tracking-tight">{coin.symbol}</h2>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">WHALE DETECTED</span>
                                </div>
                                <div className="text-2xl font-bold text-muted-foreground font-mono tracking-wider">
                                    {coin.currentPrice}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <div className="flex items-center gap-2 text-sm bg-background text-foreground px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <Target className="w-4 h-4 text-purple-400" /> 
                                    <span className="text-muted-foreground">Breakout Target:</span>
                                    <span className="font-bold text-purple-300">{coin.breakoutTarget}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-purple-500" /> Analisis Akumulasi DeepSeek
                            </h4>
                            
                            {coin.quantitativeMetrics && (
                               <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Vol Spike</div>
                                     <div className="text-sm font-black text-orange-400">{coin.quantitativeMetrics.volumeSpikeRatio}x</div>
                                  </div>
                                  <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">OBV Trend</div>
                                     <div className="text-sm font-black text-purple-400">{coin.quantitativeMetrics.obvTrend?.replace('_', ' ')}</div>
                                  </div>
                                  <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Price Change</div>
                                     <div className={`text-sm font-black ${parseFloat(coin.quantitativeMetrics.priceChangePct) > 0 ? 'text-emerald-400' : parseFloat(coin.quantitativeMetrics.priceChangePct) < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                                         {parseFloat(coin.quantitativeMetrics.priceChangePct) > 0 ? '+' : ''}{coin.quantitativeMetrics.priceChangePct}%
                                     </div>
                                  </div>
                               </div>
                            )}
                            
                            <p className="text-muted-foreground text-sm leading-relaxed font-medium bg-purple-950/20 p-4 rounded-xl border border-purple-900/30">
                                {coin.accumulationReason}
                            </p>
                        </div>
                    </div>
                    </div>
            ))}
         </div>

      </div>
    </div>
  );
}
