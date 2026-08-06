"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, TrendingUp, Target, ShieldAlert, Activity, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CryptoPerformancePage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({ totalWins: 0, totalLosses: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      
      if (!role || ((role as string) !== "admin_csrs" && (role as string) !== "admin")) {
        setLoading(false);
        return;
      }

      try {
        // Fetch global stats
        const statsDoc = await getDoc(doc(db, "cryptoPerformanceMetrics", "global_stats"));
        if (statsDoc.exists()) {
           const data = statsDoc.data();
           setGlobalStats({
             totalWins: data.totalWins || 0,
             totalLosses: data.totalLosses || 0
           });
        }

        // Fetch reports for history (dari Active Trades yang persisten)
        const q = query(collection(db, "cryptoActiveTrades"), orderBy("createdAt", "desc"), limit(20));
        const snap = await getDocs(q);
        
        const allEvals: any[] = [];
        snap.forEach(docSnap => {
           const data = docSnap.data();
           const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString("id-ID") : "Unknown Date";
           
           let reason = "";
           if (data.status === 'WIN') reason = `Harga menyentuh target ${data.targetPrice}`;
           else if (data.status === 'LOSS') reason = `Harga mengenai Stop Loss ${data.stopLossPrice}`;
           else reason = `Sedang berjalan (Target: ${data.targetPrice} | SL: ${data.stopLossPrice})`;
           
           allEvals.push({
             symbol: data.symbol,
             status: data.status,
             reason: reason,
             date,
             pnlPercent: data.pnlPercent || 0
           });
        });

        setHistory(allEvals);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch performance data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, role]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-indigo-500" /></div>;
  }

  if (!role || ((role as string) !== "admin_csrs" && (role as string) !== "admin")) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-500">
        <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk melihat laporan ini.</p>
      </div>
    );
  }

  const totalFinished = globalStats.totalWins + globalStats.totalLosses;
  const winRate = totalFinished > 0 ? ((globalStats.totalWins / totalFinished) * 100).toFixed(1) : "0.0";

  const filteredHistory = history.filter(item => filter === "ALL" || item.status === filter);

  let totalProfit = 0;
  let totalLoss = 0;
  let winCount = 0;
  let lossCount = 0;
  history.forEach(t => {
     if (t.pnlPercent) {
        if (t.pnlPercent > 0) {
           totalProfit += parseFloat(t.pnlPercent);
           winCount++;
        } else {
           totalLoss += Math.abs(parseFloat(t.pnlPercent));
           lossCount++;
        }
     }
  });

  const avgProfit = winCount > 0 ? (totalProfit / winCount).toFixed(2) : "0.00";
  const avgLoss = lossCount > 0 ? (totalLoss / lossCount).toFixed(2) : "0.00";
  const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : "N/A";

  // Calculate Breakdown per Koin
  const coinStats: Record<string, { win: number; loss: number; total: number }> = {};
  history.forEach(t => {
     if (t.status === 'WIN' || t.status === 'LOSS') {
        const coin = t.symbol.replace("USDT", "");
        if (!coinStats[coin]) coinStats[coin] = { win: 0, loss: 0, total: 0 };
        coinStats[coin].total++;
        if (t.status === 'WIN') coinStats[coin].win++;
        if (t.status === 'LOSS') coinStats[coin].loss++;
     }
  });
  
  const topCoins = Object.entries(coinStats)
     .sort((a, b) => b[1].total - a[1].total)
     .slice(0, 6);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl mt-16">
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 text-slate-100 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-500" /> Volatility Analytics
          </h1>
          <p className="text-slate-500 font-medium mt-1">Dashboard evaluasi akurasi analisis probabilitas momentum AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-indigo-600 border-none shadow-lg text-slate-900 dark:text-white">
          <CardContent className="p-8">
            <div className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">Win Rate</div>
            <div className="text-5xl font-black">{winRate}%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 bg-emerald-100 dark:bg-emerald-950/20 border-emerald-100 border-emerald-300 dark:border-emerald-900/30">
          <CardContent className="p-8 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
               <Target className="w-5 h-5" /> Total WIN
            </div>
            <div className="text-4xl font-black text-slate-800 text-slate-100">{globalStats.totalWins} <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">analisis</span></div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 bg-rose-100 dark:bg-rose-950/20 border-rose-100 border-rose-900/30">
          <CardContent className="p-8 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
               <ShieldAlert className="w-5 h-5" /> Total LOSS
            </div>
            <div className="text-4xl font-black text-slate-800 text-slate-100">{globalStats.totalLosses} <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">analisis</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Profit</div>
            <div className="text-3xl font-black text-emerald-400">+{avgProfit}%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Loss</div>
            <div className="text-3xl font-black text-rose-400">-{avgLoss}%</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Profit Factor</div>
            <div className="text-3xl font-black text-indigo-400">{profitFactor}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-10">
         <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-6">
            <Target className="w-5 h-5 text-emerald-500" /> Breakdown Akurasi per Koin
         </h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topCoins.length === 0 ? (
               <div className="col-span-4 text-slate-500 text-sm italic">Belum ada data cukup untuk breakdown koin.</div>
            ) : (
               topCoins.map(([coin, stats], idx) => {
                  const coinWinRate = ((stats.win / stats.total) * 100).toFixed(0);
                  return (
                     <Card key={idx} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex justify-between items-center mb-2">
                           <span className="font-black text-slate-900 dark:text-white">{coin}</span>
                           <Badge className="bg-indigo-500/10 text-indigo-400 border-0">{stats.total} Trades</Badge>
                        </div>
                        <div className="flex items-end gap-2">
                           <span className={`text-2xl font-black ${parseFloat(coinWinRate) >= 60 ? 'text-emerald-400' : parseFloat(coinWinRate) >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {coinWinRate}%
                           </span>
                           <span className="text-slate-500 text-xs mb-1">Win Rate</span>
                        </div>
                     </Card>
                  )
               })
            )}
         </div>
      </div>

      <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Riwayat Analisis Terakhir
          </h2>
          <div className="flex gap-2">
              <Button size="sm" variant={filter === "ALL" ? "default" : "outline"} onClick={() => setFilter("ALL")}>Semua</Button>
              <Button size="sm" variant={filter === "WIN" ? "default" : "outline"} onClick={() => setFilter("WIN")} className={filter === "WIN" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>WIN</Button>
              <Button size="sm" variant={filter === "LOSS" ? "default" : "outline"} onClick={() => setFilter("LOSS")} className={filter === "LOSS" ? "bg-rose-600 hover:bg-rose-700" : ""}>LOSS</Button>
              <Button size="sm" variant={filter === "PENDING" ? "default" : "outline"} onClick={() => setFilter("PENDING")} className={filter === "PENDING" ? "bg-amber-600 hover:bg-amber-700" : ""}>PENDING</Button>
          </div>
      </div>

      {history.length === 0 ? (
         <div className="text-center py-20 bg-slate-200 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
            Belum ada riwayat evaluasi analisis.
         </div>
      ) : (
         <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-200 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Tanggal</th>
                        <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Pair</th>
                        <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Status</th>
                        <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Keterangan</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                     {filteredHistory.map((item, i) => (
                        <tr key={i} className={`hover:bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900/30 transition-colors ${item.status === 'WIN' ? 'bg-emerald-100 dark:bg-emerald-950/10' : item.status === 'LOSS' ? 'bg-rose-100 dark:bg-rose-950/10' : ''}`}>
                           <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{item.date}</td>
                           <td className="p-4 font-bold text-slate-900 text-slate-100">{item.symbol}</td>
                           <td className="p-4">
                              {item.status === 'WIN' ? (
                                 <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 font-black">WIN {item.pnlPercent ? `(+${item.pnlPercent}%)` : ''}</Badge>
                              ) : item.status === 'LOSS' ? (
                                 <Badge className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-0 font-black">LOSS {item.pnlPercent ? `(${item.pnlPercent}%)` : ''}</Badge>
                              ) : item.status === 'EXPIRED' ? (
                                 <Badge className="bg-slate-500/20 text-slate-500 dark:text-slate-400 border-0 font-black">EXPIRED {item.pnlPercent ? `(${item.pnlPercent > 0 ? '+' : ''}${item.pnlPercent}%)` : ''}</Badge>
                              ) : (
                                 <Badge variant="outline" className="text-amber-600 border-amber-300">PENDING</Badge>
                              )}
                           </td>
                           <td className="p-4 text-sm text-slate-500 dark:text-slate-400 max-w-md">{item.reason}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}
    </div>
  );
}
