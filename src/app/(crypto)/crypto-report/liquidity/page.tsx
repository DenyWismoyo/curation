"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Radar, Target, Activity, Clock, Crosshair } from "lucide-react";
import { PremiumLockedWrapper } from '@/features/crypto/components/alerts/PremiumLockedWrapper';

export default function LiquidityHeatmapPage() {
  const router = useRouter();
  const { user, role, loading: authLoading, isPremium } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith("admin");
  const hasAccess = isAdmin || isPremium;

  useEffect(() => {
    let unsubscribe: () => void;

    if (!authLoading && hasAccess) {
        const q = query(collection(db, "cryptoLiquidity"), orderBy("createdAt", "desc"), limit(14));
        unsubscribe = onSnapshot(q, (snapshot) => {
           const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           setReports(data);
           if (data.length > 0) {
               setSelectedReportId(prev => prev ? prev : data[0].id);
           }
           setLoading(false);
        }, (err) => {
           console.error("Failed to fetch latest liquidity data:", err);
           setLoading(false);
        });
    } else if (!authLoading) {
        setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authLoading, hasAccess]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground flex-col gap-4">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Memuat Peta Likuiditas...</p>
      </div>
    );
  }

  let latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  // Dummy mock data for Free Tier blurred view
  if (!hasAccess && !latestReport) {
     latestReport = {
        id: "dummy-123",
        createdAt: new Date(),
        coins: [
           {
              symbol: "ETH",
              currentPrice: "$3,100.00",
              heatmapIntensity: "High",
              longLiquidationArea: "$3,000 - $3,050",
              shortLiquidationArea: "$3,200 - $3,250",
              aiLiquidityAnalysis: "Terdapat konsentrasi tinggi posisi long dengan leverage yang rentan terkena stop-loss hunting di area $3,050. Market maker kemungkinan besar akan memicu likuidasi di area tersebut sebelum melanjutkan tren naik.",
              quantitativeMetrics: { longShortRatio: "2.5", openInterestChange: "+15%" }
           }
        ]
     };
  }

  if (!latestReport) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-secondary text-secondary-foreground dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 text-muted-foreground border border-slate-200 dark:border-slate-800">
            <Radar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">Belum Ada Data</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Data Liquidity Heatmap belum tersedia.
          </p>
        </div>
      </div>
    );
  }

  const coins = latestReport.coins || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <PremiumLockedWrapper 
      hasAccess={hasAccess} 
      title="Liquidity Heatmap" 
      description="Peta likuiditas market untuk mengetahui area target harga dan manipulasi bandar eksklusif untuk pengguna Premium."
    >
      <div className="w-full relative min-h-screen bg-background text-foreground">
      
      {/* HEADER SECTION */}
      <div className="bg-background text-foreground backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
           <button 
               onClick={() => router.back()}
               className="mb-6 -ml-2 text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 h-9 px-4 py-2"
           >
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan
           </button>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/30">
                        <Radar className="w-5 h-5 text-cyan-500" />
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-gradient-to-r from-amber-500 to-orange-400 text-white border-0">Liquidity Hunter</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                    Liquidity Heatmap
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
                    Melacak titik likuidasi (Stop Loss) para trader ritel.
                  </p>
                </div>

               <div className="flex flex-col items-end gap-2 shrink-0">
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
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
         
         <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-900 border border-cyan-500/20 text-muted-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-2 relative z-10">
                <Radar className="w-4 h-4" /> Konsep Liquidity Sweep
            </h3>
            <p className="text-sm leading-relaxed opacity-90 relative z-10">
                Institusi dan algoritma (Market Makers) selalu menggerakkan harga menuju area dengan likuiditas tinggi (kumpulan pesanan *Stop Loss* ritel). Fitur ini menghitung zona-zona krusial tempat likuiditas tersebut bersarang menggunakan rentang volatilitas (ATR) agar Anda bisa bersiap melakukan *Counter-Trade*.
            </p>
         </div>

          <div className="space-y-6">
            {coins.map((coin: any, i: number) => (
                <div key={i} className="relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-foreground tracking-tight">{coin.symbol}</h2>
                                </div>
                                <div className="text-2xl font-bold text-muted-foreground font-mono tracking-wider">
                                    {coin.currentPrice}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Short Liquidity (Resistance) */}
                            <div className="bg-red-100 dark:bg-red-950/20 border border-red-300 dark:border-red-900/30 p-4 rounded-xl relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl"></div>
                                <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Crosshair className="w-3 h-3" /> Short Liquidity (Upper)
                                </div>
                                <div className="text-xl font-mono text-foreground font-bold">{coin.shortLiquidityZone}</div>
                                <div className="text-xs text-muted-foreground mt-2">Area Stop-Loss dari penjual (Shorts). Harga rawan melonjak ke titik ini.</div>
                            </div>

                            {/* Long Liquidity (Support) */}
                            <div className="bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/30 p-4 rounded-xl relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Crosshair className="w-3 h-3" /> Long Liquidity (Lower)
                                </div>
                                <div className="text-xl font-mono text-foreground font-bold">{coin.longLiquidityZone}</div>
                                <div className="text-xs text-muted-foreground mt-2">Area Stop-Loss dari pembeli (Longs). Harga rawan terperosok ke titik ini.</div>
                            </div>
                        </div>

                        {coin.quantitativeMetrics && (
                           <div className="grid grid-cols-3 gap-3 mb-6">
                              <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Open Interest</div>
                                 <div className="text-sm font-black text-cyan-400">
                                     {coin.quantitativeMetrics.openInterest ? (parseFloat(coin.quantitativeMetrics.openInterest) / 1000000).toFixed(2) + 'M' : 'N/A'}
                                 </div>
                              </div>
                              <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Volatility</div>
                                 <div className="text-sm font-black text-blue-400">{coin.quantitativeMetrics.volatilityPct}%</div>
                              </div>
                              <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Raw ATR</div>
                                 <div className="text-sm font-black text-emerald-400">{coin.quantitativeMetrics.atr}</div>
                              </div>
                           </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-cyan-500" /> Strategi Eksekusi Institusi
                            </h4>
                            <p className="text-muted-foreground text-sm leading-relaxed font-medium bg-slate-200 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-300 dark:border-slate-700/50">
                                {coin.hunterStrategy}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
    </PremiumLockedWrapper>
  );
}
