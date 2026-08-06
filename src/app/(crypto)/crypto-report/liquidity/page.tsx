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
import { CryptoCard, CryptoBadge, CryptoPageHeader, CryptoLoadingState, CryptoEmptyState, CryptoButton } from "@/features/crypto/components/ui/CryptoUIKit";

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
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <CryptoLoadingState type="spinner" message="Memuat Peta Likuiditas..." />
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
      <div className="p-8 flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <CryptoEmptyState 
           icon={<Radar className="w-8 h-8" />}
           title="Belum Ada Data"
           description="Data Liquidity Heatmap belum tersedia."
        />
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
      <div className="w-full relative min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-50 dark:bg-slate-950/40 backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
           <CryptoButton 
               variant="ghost" 
               size="sm" 
               onClick={() => router.back()}
               className="mb-6 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
           >
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan
           </CryptoButton>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <CryptoPageHeader 
                   title="Liquidity Heatmap"
                   subtitle="Melacak titik likuidasi (Stop Loss) para trader ritel."
                   icon={<Radar className="text-cyan-500" />}
                   badge="Liquidity Hunter"
                   badgeVariant="premium"
               />

               <div className="flex flex-col items-end gap-2 shrink-0">
                   <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                     <SelectTrigger className="w-[200px] h-9 text-xs bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-slate-800 transition-colors">
                        <SelectValue placeholder="Pilih Waktu" />
                     </SelectTrigger>
                     <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-xl shadow-black/50">
                        {reports.map(r => {
                           const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                           const isLatest = r.id === reports[0]?.id;
                           return (
                              <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer focus:bg-slate-100 dark:bg-slate-800 focus:text-slate-900 dark:text-white">
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
         
         <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-900 border border-cyan-500/20 text-slate-600 dark:text-slate-300 relative overflow-hidden">
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
                <CryptoCard key={i} variant="glow-cyan" className="group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{coin.symbol}</h2>
                                </div>
                                <div className="text-2xl font-bold text-slate-600 dark:text-slate-300 font-mono tracking-wider">
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
                                <div className="text-xl font-mono text-slate-900 dark:text-white font-bold">{coin.shortLiquidityZone}</div>
                                <div className="text-xs text-slate-500 mt-2">Area Stop-Loss dari penjual (Shorts). Harga rawan melonjak ke titik ini.</div>
                            </div>

                            {/* Long Liquidity (Support) */}
                            <div className="bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/30 p-4 rounded-xl relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Crosshair className="w-3 h-3" /> Long Liquidity (Lower)
                                </div>
                                <div className="text-xl font-mono text-slate-900 dark:text-white font-bold">{coin.longLiquidityZone}</div>
                                <div className="text-xs text-slate-500 mt-2">Area Stop-Loss dari pembeli (Longs). Harga rawan terperosok ke titik ini.</div>
                            </div>
                        </div>

                        {coin.quantitativeMetrics && (
                           <div className="grid grid-cols-3 gap-3 mb-6">
                              <div className="bg-slate-50 dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Open Interest</div>
                                 <div className="text-sm font-black text-cyan-400">
                                     {coin.quantitativeMetrics.openInterest ? (parseFloat(coin.quantitativeMetrics.openInterest) / 1000000).toFixed(2) + 'M' : 'N/A'}
                                 </div>
                              </div>
                              <div className="bg-slate-50 dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Volatility</div>
                                 <div className="text-sm font-black text-blue-400">{coin.quantitativeMetrics.volatilityPct}%</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Raw ATR</div>
                                 <div className="text-sm font-black text-emerald-400">{coin.quantitativeMetrics.atr}</div>
                              </div>
                           </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-cyan-500" /> Strategi Eksekusi Institusi
                            </h4>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium bg-slate-200 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-300 dark:border-slate-700/50">
                                {coin.hunterStrategy}
                            </p>
                        </div>
                    </div>
                </CryptoCard>
            ))}
         </div>
      </div>
    </div>
    </PremiumLockedWrapper>
  );
}
